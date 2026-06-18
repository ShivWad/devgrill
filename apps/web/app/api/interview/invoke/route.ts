import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { interviews } from '@/lib/schema'
import { eq, gt, count, and } from 'drizzle-orm'

const AGENT = process.env.AGENT_URL ?? 'http://localhost:3001'
const RATE_LIMIT_PER_HOUR = 10
const MAX_RESUME_CHARS = 50_000
const MAX_JD_CHARS = 20_000

export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const [{ cnt }] = await db
    .select({ cnt: count() })
    .from(interviews)
    .where(and(eq(interviews.userId, userId), gt(interviews.createdAt, oneHourAgo)))

  if (cnt >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const body = await req.json()

  if (typeof body.resumeText === 'string' && body.resumeText.length > MAX_RESUME_CHARS)
    return NextResponse.json({ error: `resumeText exceeds ${MAX_RESUME_CHARS} character limit` }, { status: 400 })
  if (typeof body.jdText === 'string' && body.jdText.length > MAX_JD_CHARS)
    return NextResponse.json({ error: `jdText exceeds ${MAX_JD_CHARS} character limit` }, { status: 400 })

  const token = await getToken()
  const res = await fetch(`${AGENT}/graph/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
