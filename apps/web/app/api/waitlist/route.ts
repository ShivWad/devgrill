import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { waitlist } from '@/lib/schema'
import { routeLogger } from '@/lib/logger'

export async function POST(req: Request) {
  const log = routeLogger({ route: 'POST /api/waitlist' })

  let body: { email?: unknown; tier?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, tier } = body

  if (!email || !tier || !['pro', 'payg'].includes(tier as string)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email as string)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  try {
    await db.insert(waitlist).values({ email: (email as string).trim().toLowerCase(), tier: tier as string })
    log.info('Waitlist signup recorded', { tier })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Waitlist DB insert failed', { err: error.message, stack: error.stack })
    return NextResponse.json({ error: 'Failed to join waitlist. Please try again.' }, { status: 500 })
  }
}
