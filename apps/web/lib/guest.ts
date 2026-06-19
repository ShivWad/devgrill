import { db } from './db'
import { interviews } from './schema'
import { eq, count } from 'drizzle-orm'

export const GUEST_COOKIE = 'dg_guest_id'
export const GUEST_TRIAL_LIMIT = 2

export function newGuestId(): string {
  return `guest_${crypto.randomUUID()}`
}

export async function getGuestTrialCount(guestId: string): Promise<number> {
  const [{ cnt }] = await db
    .select({ cnt: count() })
    .from(interviews)
    .where(eq(interviews.userId, guestId))
  return Number(cnt)
}
