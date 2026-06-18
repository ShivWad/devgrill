import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

const AGENT = process.env.AGENT_URL ?? 'http://localhost:3001'

export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await getToken()
  const body = await req.json()
  const res = await fetch(`${AGENT}/graph/auto-candidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
