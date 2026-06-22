import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { routeLogger } from '@/lib/logger'
import { GUEST_COOKIE } from '@/lib/guest'

const AGENT = process.env.AGENT_URL ?? 'http://localhost:3001'

export async function GET(_req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const log = routeLogger({ route: 'GET /api/technical-interview/state', threadId })

  const { userId, getToken } = await auth()

  if (userId) {
    try {
      const token = await getToken()
      const res = await fetch(`${AGENT}/technical-graph/state/${encodeURIComponent(threadId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) log.warn('Agent error on tech state fetch', { userId, status: res.status })
      return NextResponse.json(data, { status: res.status })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      log.error('Agent proxy failed on tech state fetch', { userId, err: error.message })
      return NextResponse.json({ error: 'Failed to reach interview service' }, { status: 502 })
    }
  }

  const jar = await cookies()
  const guestId = jar.get(GUEST_COOKIE)?.value
  if (!guestId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const res = await fetch(`${AGENT}/technical-graph/state/${encodeURIComponent(threadId)}`, {
      headers: {
        'X-Internal-Secret': process.env.AGENT_INTERNAL_SECRET!,
        'X-Guest-Id': guestId,
      },
    })
    const data = await res.json()
    if (!res.ok) log.warn('Agent error on guest tech state fetch', { guestId, status: res.status })
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Agent proxy failed on guest tech state fetch', { guestId, err: error.message })
    return NextResponse.json({ error: 'Failed to reach interview service' }, { status: 502 })
  }
}
