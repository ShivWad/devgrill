import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { routeLogger } from '@/lib/logger'

const AGENT = process.env.AGENT_URL ?? 'http://localhost:3001'

export async function POST(req: NextRequest) {
  const log = routeLogger({ route: 'POST /api/interview/auto-candidate' })

  const { userId, getToken } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const threadId = body.threadId as string | undefined
  log.debug('Requesting auto-candidate answer', { userId, threadId })

  try {
    const token = await getToken()
    const res = await fetch(`${AGENT}/graph/auto-candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      log.warn('Agent returned error on auto-candidate', { userId, threadId, status: res.status })
    }
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Agent proxy request failed on auto-candidate', { userId, threadId, err: error.message, stack: error.stack })
    return NextResponse.json({ error: 'Failed to reach interview service' }, { status: 502 })
  }
}
