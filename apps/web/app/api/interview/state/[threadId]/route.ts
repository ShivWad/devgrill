import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { routeLogger } from '@/lib/logger'
import { GUEST_COOKIE } from '@/lib/guest'

const AGENT = process.env.AGENT_URL ?? 'http://localhost:3001'

export async function GET(_req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const log = routeLogger({ route: 'GET /api/interview/state', threadId })

  const { userId, getToken } = await auth()

  // ── Signed-in path ────────────────────────────────────────────────────────────
  if (userId) {
    try {
      const token = await getToken()
      const res = await fetch(`${AGENT}/graph/state/${encodeURIComponent(threadId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.status === 404) log.warn('Session not found', { userId })
      else if (!res.ok) log.warn('Agent error on state fetch', { userId, status: res.status })
      return NextResponse.json(data, { status: res.status })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      log.error('Agent proxy failed on state fetch', { userId, err: error.message, stack: error.stack })
      return NextResponse.json({ error: 'Failed to reach interview service' }, { status: 502 })
    }
  }

  // ── Guest path ────────────────────────────────────────────────────────────────
  const jar = await cookies()
  const guestId = jar.get(GUEST_COOKIE)?.value
  if (!guestId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const res = await fetch(`${AGENT}/graph/state/${encodeURIComponent(threadId)}`, {
      headers: {
        'X-Internal-Secret': process.env.AGENT_INTERNAL_SECRET!,
        'X-Guest-Id': guestId,
      },
    })
    const data = await res.json()
    if (!res.ok) log.warn('Agent error on guest state fetch', { guestId, status: res.status })
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Agent proxy failed on guest state fetch', { guestId, err: error.message, stack: error.stack })
    return NextResponse.json({ error: 'Failed to reach interview service' }, { status: 502 })
  }
}
