import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const AGENT = process.env.AGENT_URL ?? 'http://localhost:3001'

export async function GET() {
  const { userId, getToken } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await getToken()
  const res = await fetch(`${AGENT}/graph/active-session`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
