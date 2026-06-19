import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { routeLogger } from '@/lib/logger'

const AGENT = process.env.AGENT_URL ?? 'http://localhost:3001'

export async function GET() {
  const log = routeLogger({ route: 'GET /api/interview/active-session' })

  const { userId, getToken } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const token = await getToken()
    const res = await fetch(`${AGENT}/graph/active-session`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) {
      log.warn('Agent returned error on active-session', { userId, status: res.status })
    }
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Agent proxy request failed on active-session', { userId, err: error.message, stack: error.stack })
    return NextResponse.json({ error: 'Failed to reach interview service' }, { status: 502 })
  }
}
