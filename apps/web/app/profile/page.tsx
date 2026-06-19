import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { db } from '@/lib/db'
import { interviews } from '@/lib/schema'
import { eq, isNull, isNotNull, desc, and } from 'drizzle-orm'


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
        scores: interviews.scores,
        created_at: interviews.createdAt,
      })
      .from(interviews)
      .where(and(eq(interviews.userId, userId), isNotNull(interviews.scores)))
      .orderBy(desc(interviews.createdAt))
      .limit(50),
  ])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fafafa' }}>
      <nav className="inner-nav" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 32px', borderBottom: '1px solid #1a1a1a',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)' }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: '#fafafa' }}>DevGrill</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/interview" style={{ fontSize: 13.5, color: '#8f8f8f', textDecoration: 'none' }}>
            New interview
          </Link>
          <UserButton />
        </div>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>

        {/* ── Active sessions ── */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#555', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 16 }}>
            Active sessions
          </h2>

          {active.length === 0 ? (
            <div style={{
              border: '1px dashed #2a2a2a', borderRadius: 12, padding: '32px 24px',
              textAlign: 'center', color: '#555', fontSize: 14,
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
                return (
                  <div key={row.id} style={{
                    background: '#111', border: '1px solid #252525', borderRadius: 12,
                    padding: '16px 20px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 16,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: '#f0f0f0', marginBottom: 3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {row.question_title ?? 'Interview in progress'}
                      </div>
                      <div style={{ fontSize: 12, color: '#555' }}>
                        {[row.target_role, row.target_company].filter(Boolean).join(' · ')} · {date}
                      </div>
                    </div>
                    <Link href={`/interview?threadId=${row.thread_id}`} style={{
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
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#555', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 16 }}>
            Past interviews
          </h2>

          {completed.length === 0 ? (
            <p style={{ fontSize: 14, color: '#555' }}>No completed interviews yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {completed.map(row => {
                const score = row.scores?.overall ?? null
                const date = new Date(row.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })
                return (
                  <Link key={row.id} href={`/profile/${row.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: '#111', border: '1px solid #1e1e1e', borderRadius: 12,
                      padding: '16px 20px', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: 16,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 600, color: '#f0f0f0', marginBottom: 3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {row.question_title ?? 'Untitled question'}
                        </div>
                        <div style={{ fontSize: 12, color: '#555' }}>
                          {[row.target_role, row.target_company].filter(Boolean).join(' · ')} · {date}
                        </div>
                      </div>
                      {score !== null && (
                        <div style={{
                          flexShrink: 0, fontSize: 18, fontWeight: 700,
                          color: score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : '#f87171',
                        }}>
                          {score}<span style={{ fontSize: 11, fontWeight: 400, color: '#555', marginLeft: 2 }}>/100</span>
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
