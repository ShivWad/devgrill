import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import sql from '@/lib/db'
import type { RubricScores, PhaseFeedback } from '@devgrill/shared'

type InterviewRow = {
  id: string
  question_title: string | null
  question_description: string | null
  scores: RubricScores | null
  phase_feedback: PhaseFeedback[] | null
  report_markdown: string | null
  target_role: string | null
  target_company: string | null
  created_at: string
}

function ScoreBar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100
  const color = pct >= 80 ? '#4ade80' : pct >= 60 ? '#facc15' : '#f87171'
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#aaa' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}/{max}</span>
      </div>
      <div style={{ height: 4, background: '#222', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
    </div>
  )
}

const RUBRIC_LABELS: [string, keyof RubricScores][] = [
  ['Requirements gathering', 'requirementsGathering'],
  ['API design', 'apiDesign'],
  ['Data modeling', 'dataModeling'],
  ['System components', 'systemComponents'],
  ['Scalability', 'scalability'],
  ['Trade-offs', 'tradeoffs'],
  ['Communication', 'communication'],
]

export default async function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { id } = await params
  const rows = (await sql`
    SELECT id, question_title, question_description, scores, phase_feedback,
           report_markdown, target_role, target_company, created_at
    FROM interviews
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `) as InterviewRow[]

  if (rows.length === 0) notFound()
  const row = rows[0]

  const scores: RubricScores | null = row.scores
  const phaseFeedback: PhaseFeedback[] = row.phase_feedback ?? []
  const date = new Date(row.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fafafa' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 32px', borderBottom: '1px solid #1a1a1a',
      }}>
        <Link href="/profile" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>
          ← Past interviews
        </Link>
        <UserButton />
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 10, fontFamily: 'monospace', letterSpacing: '.1em', textTransform: 'uppercase' }}>
            {[row.target_role, row.target_company].filter(Boolean).join(' · ')}{' · '}{date}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
            {row.question_title ?? 'Interview report'}
          </h1>
          {row.question_description && (
            <p style={{ fontSize: 14, color: '#888', marginTop: 12, lineHeight: 1.6 }}>
              {row.question_description}
            </p>
          )}
        </div>

        {scores && (
          <>
            {/* Overall score */}
            <div style={{
              background: '#111', border: '1px solid #1e1e1e', borderRadius: 12,
              padding: '24px 28px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 24,
            }}>
              <div>
                <div style={{
                  fontSize: 52, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1,
                  color: scores.overall >= 80 ? '#4ade80' : scores.overall >= 60 ? '#facc15' : '#f87171',
                }}>
                  {scores.overall}
                </div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>out of 100</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0', marginBottom: 4 }}>
                  {scores.levelAssessment}
                </div>
                <div style={{ fontSize: 13, color: '#777', lineHeight: 1.5 }}>{scores.roleReadiness}</div>
              </div>
            </div>

            {/* Rubric bars */}
            <div style={{
              background: '#111', border: '1px solid #1e1e1e', borderRadius: 12,
              padding: '24px 28px', marginBottom: 20,
            }}>
              <h2 style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Breakdown
              </h2>
              {RUBRIC_LABELS.map(([label, key]) => {
                const val = scores[key]
                if (typeof val !== 'number') return null
                return <ScoreBar key={key} label={label} value={val} max={5} />
              })}
            </div>

            {/* Gap analysis */}
            {scores.gapAnalysis && (
              <div style={{
                background: '#111', border: '1px solid #1e1e1e', borderRadius: 12,
                padding: '24px 28px', marginBottom: 20,
              }}>
                <h2 style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Gap analysis
                </h2>
                <p style={{ fontSize: 14, color: '#bbb', lineHeight: 1.65 }}>{scores.gapAnalysis}</p>
              </div>
            )}

            {/* Resume advice */}
            {scores.resumeAdvice && (
              <div style={{
                background: '#111', border: '1px solid #1e1e1e', borderRadius: 12,
                padding: '24px 28px', marginBottom: 20,
              }}>
                <h2 style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Resume advice
                </h2>
                <p style={{ fontSize: 14, color: '#bbb', lineHeight: 1.65 }}>{scores.resumeAdvice}</p>
              </div>
            )}
          </>
        )}

        {/* Phase feedback */}
        {phaseFeedback.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              Phase breakdown
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {phaseFeedback.map((pf, i) => (
                <div key={i} style={{
                  background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '18px 22px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
                      {String(pf.phase).replace('_', ' ')}
                    </span>
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: pf.score >= 4 ? '#4ade80' : pf.score >= 3 ? '#facc15' : '#f87171',
                    }}>
                      {pf.score}/5
                    </span>
                  </div>
                  {pf.strengths.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: '#4ade80', marginBottom: 4, letterSpacing: '.06em', textTransform: 'uppercase' }}>Strengths</div>
                      {pf.strengths.map((s, j) => (
                        <div key={j} style={{ fontSize: 13, color: '#999', paddingLeft: 8, marginBottom: 2 }}>· {s}</div>
                      ))}
                    </div>
                  )}
                  {pf.gaps.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: '#f87171', marginBottom: 4, letterSpacing: '.06em', textTransform: 'uppercase' }}>Gaps</div>
                      {pf.gaps.map((g, j) => (
                        <div key={j} style={{ fontSize: 13, color: '#999', paddingLeft: 8, marginBottom: 2 }}>· {g}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
