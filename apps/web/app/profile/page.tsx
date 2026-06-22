import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { db } from '@/lib/db'
import { interviews } from '@/lib/schema'
import { eq, isNull, isNotNull, desc, and } from 'drizzle-orm'
import { NewInterviewPicker } from '@/components/NewInterviewPicker'

function TypeBadge({ type }: { type: string | null }) {
  const isTech = type === 'technical'
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: 4,
      background: isTech ? 'rgba(20,184,166,0.12)' : 'rgba(249,115,22,0.10)',
      color: isTech ? '#14b8a6' : '#f97316',
      border: `1px solid ${isTech ? 'rgba(20,184,166,0.3)' : 'rgba(249,115,22,0.25)'}`,
      fontFamily: "'Geist Mono', monospace", flexShrink: 0,
    }}>
      {isTech ? 'Technical' : 'System Design'}
    </span>
  )
}

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [active, completed] = await Promise.all([
    db
      .select({
        id: interviews.id,
        thread_id: interviews.threadId,
        question_title: interviews.questionTitle,
        target_role: interviews.targetRole,
        target_company: interviews.targetCompany,
        interview_type: interviews.interviewType,
        created_at: interviews.createdAt,
      })
      .from(interviews)
      .where(and(eq(interviews.userId, userId), isNull(interviews.scores)))
      .orderBy(desc(interviews.createdAt))
      .limit(20),

    db
      .select({
        id: interviews.id,
        thread_id: interviews.threadId,
        question_title: interviews.questionTitle,
        target_role: interviews.targetRole,
        target_company: interviews.targetCompany,
        interview_type: interviews.interviewType,
        scores: interviews.scores,
        created_at: interviews.createdAt,
      })
      .from(interviews)
      .where(and(eq(interviews.userId, userId), isNotNull(interviews.scores)))
      .orderBy(desc(interviews.createdAt))
      .limit(50),
  ])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      <nav className="inner-nav" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 32px', borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)' }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>DevGrill</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <NewInterviewPicker />
          <UserButton />
        </div>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>

        {/* ── Active sessions ── */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-dim)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 16 }}>
            Active sessions
          </h2>

          {active.length === 0 ? (
            <div style={{
              border: '1px dashed var(--border-strong)', borderRadius: 12, padding: '32px 24px',
              textAlign: 'center', color: 'var(--fg-dim)', fontSize: 14,
            }}>
              No active interviews.{' '}
              <Link href="/interview" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                Start one →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {active.map(row => {
                const date = new Date(row.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })
                const continueHref = row.interview_type === 'technical'
                  ? `/technical?threadId=${row.thread_id}`
                  : `/interview?threadId=${row.thread_id}`
                return (
                  <div key={row.id} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 12,
                    padding: '16px 20px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 16,
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <TypeBadge type={row.interview_type} />
                      </div>
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {row.question_title ?? 'Interview in progress'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg-dim)' }}>
                        {[row.target_role, row.target_company].filter(Boolean).join(' · ')} · {date}
                      </div>
                    </div>
                    <Link href={continueHref} style={{
                      flexShrink: 0, fontSize: 13, fontWeight: 500,
                      background: 'var(--accent)', color: 'var(--accent-ink)',
                      padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}>
                      Continue →
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Completed interviews ── */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-dim)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 16 }}>
            Past interviews
          </h2>

          {completed.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--fg-dim)' }}>No completed interviews yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {completed.map(row => {
                const score = (row.scores as { overall?: number } | null)?.overall ?? null
                const date = new Date(row.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })
                return (
                  <Link key={row.id} href={`/profile/${row.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
                      padding: '16px 20px', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: 16,
                    }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <TypeBadge type={row.interview_type} />
                        </div>
                        <div style={{
                          fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {row.question_title ?? 'Untitled question'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--fg-dim)' }}>
                          {[row.target_role, row.target_company].filter(Boolean).join(' · ')} · {date}
                        </div>
                      </div>
                      {score !== null && (
                        <div style={{
                          flexShrink: 0, fontSize: 18, fontWeight: 700,
                          color: score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : '#f87171',
                        }}>
                          {score}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--fg-dim)', marginLeft: 2 }}>/100</span>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
