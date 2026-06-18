import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { db } from '@/lib/db'
import { subscriptions } from '@/lib/schema'

type ClerkUserCreatedEvent = {
  type: 'user.created'
  data: { id: string }
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    console.error('CLERK_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }

  // Verify the webhook signature
  const headerMap = await headers()
  const svixId        = headerMap.get('svix-id')
  const svixTimestamp = headerMap.get('svix-timestamp')
  const svixSignature = headerMap.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
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
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'user.created') {
    await db.insert(subscriptions).values({
      userId: event.data.id,
      plan: 'free',
    }).onConflictDoNothing()
  }

  return NextResponse.json({ ok: true })
}
