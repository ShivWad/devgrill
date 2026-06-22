import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { interviews } from '@/lib/schema'
import { routeLogger } from '@/lib/logger'
import { GUEST_COOKIE, GUEST_TRIAL_LIMIT, getGuestTrialCount, newGuestId } from '@/lib/guest'
import { eq, gt, count, and } from 'drizzle-orm'

const AGENT = process.env.AGENT_URL ?? 'http://localhost:3001'
const RATE_LIMIT_PER_HOUR = 10
const MAX_RESUME_CHARS = 50_000
const MAX_JD_CHARS = 20_000

export async function POST(req: NextRequest) {
  const log = routeLogger({ route: 'POST /api/technical-interview/invoke' })

  let userId: string | null
  let getToken: (() => Promise<string | null>) | null = null

  try {
    const authResult = await auth()
    userId = authResult.userId
    getToken = authResult.getToken
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Auth check failed', { err: error.message })
    return NextResponse.json({ error: 'Authentication error' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.resumeText === 'string' && body.resumeText.length > MAX_RESUME_CHARS)
    return NextResponse.json({ error: `resumeText exceeds ${MAX_RESUME_CHARS} character limit` }, { status: 400 })
  if (typeof body.jdText === 'string' && body.jdText.length > MAX_JD_CHARS)
    return NextResponse.json({ error: `jdText exceeds ${MAX_JD_CHARS} character limit` }, { status: 400 })

  // ── Signed-in path ────────────────────────────────────────────────────────────
  if (userId && getToken) {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const [{ cnt }] = await db
        .select({ cnt: count() })
        .from(interviews)
        .where(and(eq(interviews.userId, userId), gt(interviews.createdAt, oneHourAgo)))

      if (cnt >= RATE_LIMIT_PER_HOUR) {
        log.warn('Rate limit reached', { userId, cnt })
        return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      log.error('Rate limit DB check failed', { userId, err: error.message })
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }

    log.info('Starting technical interview', { userId })

    try {
      const token = await getToken()
      const res = await fetch(`${AGENT}/technical-graph/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) log.warn('Agent error on tech invoke', { userId, status: res.status })
      else log.info('Technical interview invoked', { userId })
      return NextResponse.json(data, { status: res.status })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      log.error('Agent proxy failed on tech invoke', { userId, err: error.message })
      return NextResponse.json({ error: 'Failed to reach interview service' }, { status: 502 })
    }
  }

  // ── Guest path ────────────────────────────────────────────────────────────────
  const jar = await cookies()
  const existingGuestId = jar.get(GUEST_COOKIE)?.value
  const guestId = existingGuestId ?? newGuestId()

  try {
    const trialCount = await getGuestTrialCount(guestId)
    if (trialCount >= GUEST_TRIAL_LIMIT) {
      log.info('Guest trial limit reached', { guestId, trialCount })
      return NextResponse.json({ error: 'trial_limit' }, { status: 403 })
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Guest trial count check failed', { guestId, err: error.message })
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
  }

  log.info('Starting guest technical interview', { guestId })

  try {
    const res = await fetch(`${AGENT}/technical-graph/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.AGENT_INTERNAL_SECRET!,
        'X-Guest-Id': guestId,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      log.warn('Agent error on guest tech invoke', { guestId, status: res.status })
      return NextResponse.json(data, { status: res.status })
    }

    log.info('Guest technical interview invoked', { guestId })
    const nextRes = NextResponse.json(data, { status: res.status })
    nextRes.cookies.set(GUEST_COOKIE, guestId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return nextRes
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Agent proxy failed on guest tech invoke', { guestId, err: error.message })
    return NextResponse.json({ error: 'Failed to reach interview service' }, { status: 502 })
  }
}
