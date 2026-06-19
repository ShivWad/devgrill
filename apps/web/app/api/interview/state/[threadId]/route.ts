import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { routeLogger } from '@/lib/logger'

const AGENT = process.env.AGENT_URL ?? 'http://localhost:3001'

export async function GET(_req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const log = routeLogger({ route: 'GET /api/interview/state', threadId })

  const { userId, getToken } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const token = await getToken()
    const res = await fetch(`${AGENT}/graph/state/${encodeURIComponent(threadId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (res.status === 404) {
      log.warn('Session not found on state fetch', { userId })
    } else if (!res.ok) {
      log.warn('Agent returned error on state fetch', { userId, status: res.status })
    }
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Agent proxy request failed on state fetch', { userId, err: error.message, stack: error.stack })
    return NextResponse.json({ error: 'Failed to reach interview service' }, { status: 502 })
  }
}
