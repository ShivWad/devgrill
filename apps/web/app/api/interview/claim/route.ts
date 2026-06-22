import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { interviews } from '@/lib/schema'
import { eq, isNull, desc, and } from 'drizzle-orm'
import { routeLogger } from '@/lib/logger'
import { GUEST_COOKIE } from '@/lib/guest'

export async function POST() {
  const log = routeLogger({ route: 'POST /api/interview/claim' })

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jar = await cookies()
  const guestId = jar.get(GUEST_COOKIE)?.value
  if (!guestId) return NextResponse.json({ claimed: 0, threadId: null, interviewType: null })

  // Find the most recent incomplete interview before re-attributing
  const incomplete = await db
    .select({ threadId: interviews.threadId, interviewType: interviews.interviewType })
    .from(interviews)
    .where(and(eq(interviews.userId, guestId), isNull(interviews.scores)))
    .orderBy(desc(interviews.createdAt))
    .limit(1)

  const resumeThreadId = incomplete[0]?.threadId ?? null
  const resumeInterviewType = incomplete[0]?.interviewType ?? 'system_design'

  const result = await db
    .update(interviews)
    .set({ userId })
    .where(eq(interviews.userId, guestId))
    .returning({ id: interviews.id })

  log.info('Guest interviews claimed', { userId, guestId, count: result.length, resumeThreadId, resumeInterviewType })

  const res = NextResponse.json({ claimed: result.length, threadId: resumeThreadId, interviewType: resumeInterviewType })
  res.cookies.delete(GUEST_COOKIE)
  return res
}
