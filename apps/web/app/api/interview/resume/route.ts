import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { routeLogger } from '@/lib/logger'
import { GUEST_COOKIE } from '@/lib/guest'

const AGENT = process.env.AGENT_URL ?? 'http://localhost:3001'

export async function POST(req: NextRequest) {
  const log = routeLogger({ route: 'POST /api/interview/resume' })

  const { userId, getToken } = await auth()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const threadId = body.threadId as string | undefined

  // ── Signed-in path ────────────────────────────────────────────────────────────
  if (userId) {
    log.debug('Resuming interview', { userId, threadId })
    try {
      const token = await getToken()
      const res = await fetch(`${AGENT}/graph/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) log.warn('Agent error on resume', { userId, threadId, status: res.status })
      return NextResponse.json(data, { status: res.status })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      log.error('Agent proxy failed on resume', { userId, threadId, err: error.message, stack: error.stack })
      return NextResponse.json({ error: 'Failed to reach interview service' }, { status: 502 })
    }
  }

  // ── Guest path ────────────────────────────────────────────────────────────────
  const jar = await cookies()
  const guestId = jar.get(GUEST_COOKIE)?.value
  if (!guestId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  log.debug('Resuming guest interview', { guestId, threadId })

  try {
    const res = await fetch(`${AGENT}/graph/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.AGENT_INTERNAL_SECRET!,
        'X-Guest-Id': guestId,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) log.warn('Agent error on guest resume', { guestId, threadId, status: res.status })
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Agent proxy failed on guest resume', { guestId, threadId, err: error.message, stack: error.stack })
    return NextResponse.json({ error: 'Failed to reach interview service' }, { status: 502 })
  }
}
