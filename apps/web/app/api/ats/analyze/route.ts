import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { routeLogger } from '@/lib/logger'
import { GUEST_COOKIE, newGuestId } from '@/lib/guest'

const AGENT = process.env.AGENT_URL ?? 'http://localhost:3001'
const MAX_RESUME_CHARS = 50_000
const MAX_JD_CHARS = 20_000

export async function POST(req: NextRequest) {
  const log = routeLogger({ route: 'POST /api/ats/analyze' })

  let userId: string | null
  let getToken: (() => Promise<string | null>) | null = null

  try {
    const authResult = await auth()
    userId = authResult.userId
    getToken = authResult.getToken
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Auth check failed', { err: error.message, stack: error.stack })
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
    log.info('ATS analysis requested', { userId })
    try {
      const token = await getToken()
      const res = await fetch(`${AGENT}/ats/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) log.warn('Agent error on ATS analyze', { userId, status: res.status })
      else log.info('ATS analysis complete', { userId })
      return NextResponse.json(data, { status: res.status })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      log.error('Agent proxy failed on ATS analyze', { userId, err: error.message, stack: error.stack })
      return NextResponse.json({ error: 'Failed to reach analysis service' }, { status: 502 })
    }
  }

  // ── Guest path ────────────────────────────────────────────────────────────────
  const jar = await cookies()
  const existingGuestId = jar.get(GUEST_COOKIE)?.value
  const guestId = existingGuestId ?? newGuestId()

  log.info('Guest ATS analysis requested', { guestId })

  try {
    const res = await fetch(`${AGENT}/ats/analyze`, {
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
      log.warn('Agent error on guest ATS analyze', { guestId, status: res.status })
      return NextResponse.json(data, { status: res.status })
    }
    log.info('Guest ATS analysis complete', { guestId })
    const nextRes = NextResponse.json(data, { status: res.status })
    if (!existingGuestId) {
      nextRes.cookies.set(GUEST_COOKIE, guestId, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })
    }
    return nextRes
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Agent proxy failed on guest ATS analyze', { guestId, err: error.message, stack: error.stack })
    return NextResponse.json({ error: 'Failed to reach analysis service' }, { status: 502 })
  }
}
