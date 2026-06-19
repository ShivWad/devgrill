import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { waitlist } from '@/lib/schema'

export async function POST(req: Request) {
  const { email, tier } = await req.json()

  if (!email || !tier || !['pro', 'payg'].includes(tier)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  await db.insert(waitlist).values({ email: email.trim().toLowerCase(), tier })

  return NextResponse.json({ ok: true })
}
