import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { db } from '@/lib/db'
import { subscriptions } from '@/lib/schema'
import { routeLogger } from '@/lib/logger'

type ClerkUserCreatedEvent = {
  type: 'user.created'
  data: { id: string }
}

export async function POST(req: Request) {
  const log = routeLogger({ route: 'POST /api/webhooks/clerk' })

  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    log.error('CLERK_WEBHOOK_SECRET is not set — webhook endpoint misconfigured')
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }

  const headerMap = await headers()
  const svixId        = headerMap.get('svix-id')
  const svixTimestamp = headerMap.get('svix-timestamp')
  const svixSignature = headerMap.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    log.warn('Webhook request missing svix headers')
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const payload = await req.text()
  const wh = new Webhook(secret)

  let event: ClerkUserCreatedEvent
  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserCreatedEvent
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.warn('Webhook signature verification failed', { err: error.message })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'user.created') {
    try {
      await db.insert(subscriptions).values({
        userId: event.data.id,
        plan: 'free',
      }).onConflictDoNothing()
      log.info('User subscription row created', { userId: event.data.id })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      log.error('Failed to create subscription row on user.created', { userId: event.data.id, err: error.message, stack: error.stack })
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
