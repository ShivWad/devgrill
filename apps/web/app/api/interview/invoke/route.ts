import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { interviews } from '@/lib/schema'
import { routeLogger } from '@/lib/logger'
import { eq, gt, count, and } from 'drizzle-orm'

const AGENT = process.env.AGENT_URL ?? 'http://localhost:3001'
const RATE_LIMIT_PER_HOUR = 10
const MAX_RESUME_CHARS = 50_000
const MAX_JD_CHARS = 20_000

export async function POST(req: NextRequest) {
  const log = routeLogger({ route: 'POST /api/interview/invoke' })

  let userId: string | null
  let getToken: () => Promise<string | null>
  try {
    const authResult = await auth()
    userId = authResult.userId
    getToken = authResult.getToken
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Auth check failed', { err: error.message, stack: error.stack })
    return NextResponse.json({ error: 'Authentication error' }, { status: 500 })
  }

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    log.error('Rate limit DB check failed', { userId, err: error.message, stack: error.stack })
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
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

  log.info('Starting interview', { userId, threadId: body.threadId as string })

  try {
    const token = await getToken()
    const res = await fetch(`${AGENT}/graph/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      log.warn('Agent returned error on invoke', { userId, status: res.status, threadId: body.threadId as string })
    } else {
      log.info('Interview invoked successfully', { userId, threadId: body.threadId as string })
    }
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Agent proxy request failed on invoke', { userId, err: error.message, stack: error.stack })
    return NextResponse.json({ error: 'Failed to reach interview service' }, { status: 502 })
  }
}
