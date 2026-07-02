'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Nav } from '@/components/interview/Nav'
import type { ATSResult } from '@devgrill/shared'

type View = 'setup' | 'loading' | 'results'

const ATS_LOADING_MSGS = [
  'Reading your resume...',
  'Scanning the job description...',
  'Matching keywords...',
  'Identifying skill gaps...',
  'Scoring your sections...',
  'Analyzing experience depth...',
  'Checking ATS compatibility...',
  'Finding missing requirements...',
  'Evaluating skills section...',
  'Calculating your fit score...',
  'Almost done...',
]

const STYLES = `
  @keyframes breathe { 0%, 100% { transform: scale(0.7); opacity: 0; } 50% { transform: scale(1); opacity: 1; } }
  @keyframes breatheCore { 0%, 100% { box-shadow: 0 0 10px 2px var(--accent-line); } 50% { box-shadow: 0 0 28px 8px var(--accent-line); } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @media (max-width: 640px) {
    .ats-kw-cols { grid-template-columns: 1fr !important; }
    .ats-cta-row { flex-direction: column !important; }
  }
`

const field: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-strong)',
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 14,
  color: 'var(--fg-2)',
  fontFamily: 'inherit',
  outline: 'none',
  resize: 'vertical',
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--fg-muted)',
  marginBottom: 8,
  display: 'block',
}

function overallColor(score: number): string {
  if (score >= 75) return '#22c55e'
  if (score >= 50) return '#eab308'
  return '#ef4444'
}

function sectionColor(score: number): string {
  if (score >= 8) return '#22c55e'
  if (score >= 5) return '#eab308'
  return '#ef4444'
}

// ── Setup ──────────────────────────────────────────────────────────────────────

function SetupView({
  resumeText,
  jdText,
  error,
  onResumeText,
  onJdText,
  onAnalyze,
}: {
  resumeText: string
  jdText: string
  error: string | null
  onResumeText: (v: string) => void
  onJdText: (v: string) => void
  onAnalyze: () => void
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <style>{STYLES}</style>
      <Nav right={<UserButton />} />
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '48px 24px 80px' }}>
        <div style={{ width: '100%', maxWidth: 620 }}>
          <div style={{
            display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '.12em',
            textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12,
            fontFamily: "'Geist Mono', monospace",
          }}>
            ATS Resume Score
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--fg)', marginBottom: 6 }}>
            Check your resume fit
          </h1>
          <p style={{ fontSize: 15, color: 'var(--fg-muted)', marginBottom: 20, lineHeight: 1.5 }}>
            See how your resume scores against a job description — keywords, section gaps, and specific fixes.
          </p>
          <div style={{
            padding: '10px 14px', borderRadius: 9, marginBottom: 28,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            fontSize: 12.5, color: 'var(--fg-dim)', lineHeight: 1.6,
          }}>
            This score reflects keyword and phrasing alignment — not your actual ability to do the job.
            ATS systems are imperfect, and a low score often just means your resume is phrased differently
            than the JD, not that you&apos;re underqualified.
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>
              Resume <span style={{ color: '#f97316' }}>*</span>
            </label>
            <textarea
              style={{ ...field, minHeight: 180 }}
              placeholder="Paste your resume text here…"
              value={resumeText}
              onChange={(e) => onResumeText(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>
              Job Description <span style={{ color: '#f97316' }}>*</span>
            </label>
            <textarea
              style={{ ...field, minHeight: 140 }}
              placeholder="Paste the job description here…"
              value={jdText}
              onChange={(e) => onJdText(e.target.value)}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 9,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: 13, marginBottom: 18,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={onAnalyze}
            style={{
              width: '100%', background: 'var(--accent)', color: '#0a0a0a',
              fontSize: 15, fontWeight: 600, padding: '14px', borderRadius: 11,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 10px 28px -10px var(--accent-line)', transition: 'opacity 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Analyze Resume →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Loading ────────────────────────────────────────────────────────────────────

function LoadingView() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    let fadeOut: ReturnType<typeof setTimeout>
    const tick = setInterval(() => {
      setVisible(false)
      fadeOut = setTimeout(() => {
        setIdx((i) => (i + 1) % ATS_LOADING_MSGS.length)
        setVisible(true)
      }, 350)
    }, 2800)
    return () => {
      clearInterval(tick)
      clearTimeout(fadeOut)
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <style>{STYLES}</style>
      <Nav right={<UserButton />} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '40px 24px' }}>
        <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent-soft)', animation: 'breathe 2.4s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'var(--accent-soft)', animation: 'breathe 2.4s ease-in-out infinite 0.4s' }} />
          <div style={{ position: 'relative', width: 14, height: 14, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 20px 4px var(--accent-line)', animation: 'breatheCore 2.4s ease-in-out infinite' }} />
        </div>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <p style={{
            fontSize: 16, fontWeight: 500, color: 'var(--fg-2)', lineHeight: 1.5,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
          }}>
            {ATS_LOADING_MSGS[idx]}
          </p>
          <p style={{ fontSize: 13, color: 'var(--fg-dim)', marginTop: 8 }}>
            Analysis usually takes 10–20 seconds.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Results ────────────────────────────────────────────────────────────────────

function ResultsView({
  result,
  onPractice,
  onReset,
}: {
  result: ATSResult
  onPractice: () => void
  onReset: () => void
}) {
  const scoreClr = overallColor(result.overallScore)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <style>{STYLES}</style>
      <Nav right={<UserButton />} />
      <div style={{ flex: 1, padding: '48px 24px 80px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 32, animation: 'fadeUp 0.4s ease' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6, fontFamily: "'Geist Mono', monospace" }}>
                ATS Resume Score
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--fg)' }}>
                Your results
              </h1>
            </div>

            {/* Score circle */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 84, height: 84, borderRadius: '50%',
                border: `3px solid ${scoreClr}`,
                background: `${scoreClr}18`,
                boxShadow: `0 0 28px -10px ${scoreClr}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: scoreClr, letterSpacing: '-0.03em' }}>
                  {result.overallScore}
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--fg-dim)', fontFamily: "'Geist Mono', monospace" }}>
                / 100
              </span>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            padding: '10px 14px', borderRadius: 9, marginBottom: 20,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderLeft: '2px solid rgba(234,179,8,0.4)',
            fontSize: 12.5, color: 'var(--fg-dim)', lineHeight: 1.6,
            animation: 'fadeUp 0.4s ease 0.03s both',
          }}>
            This score measures keyword and phrasing match — not your actual ability to do the job.
            A low score often just means your resume is worded differently than the JD, not that you&apos;re underqualified.
            Use this as a phrasing guide, not a verdict.
          </div>

          {/* Keywords */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 14, animation: 'fadeUp 0.4s ease 0.06s both' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 16 }}>Keyword Analysis</h2>
            <div className="ats-kw-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#22c55e', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Found ({result.keywordAnalysis.present.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.keywordAnalysis.present.map((kw) => (
                    <span key={kw} style={{
                      fontSize: 12, padding: '3px 9px', borderRadius: 6,
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                      color: '#22c55e', fontFamily: "'Geist Mono', monospace",
                    }}>
                      {kw}
                    </span>
                  ))}
                  {result.keywordAnalysis.present.length === 0 && (
                    <span style={{ fontSize: 13, color: 'var(--fg-dim)' }}>None detected</span>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#eab308', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Missing ({result.keywordAnalysis.missing.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.keywordAnalysis.missing.map((kw) => (
                    <span key={kw} style={{
                      fontSize: 12, padding: '3px 9px', borderRadius: 6,
                      background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)',
                      color: '#eab308', fontFamily: "'Geist Mono', monospace",
                    }}>
                      {kw}
                    </span>
                  ))}
                  {result.keywordAnalysis.missing.length === 0 && (
                    <span style={{ fontSize: 13, color: 'var(--fg-dim)' }}>None — great match!</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section scores */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 14, animation: 'fadeUp 0.4s ease 0.12s both' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 16 }}>Section Scores</h2>
            {(
              [
                { key: 'summary', label: 'Summary / Objective' },
                { key: 'experience', label: 'Experience' },
                { key: 'skills', label: 'Skills' },
              ] as const
            ).map(({ key, label }) => {
              const score = result.sectionScores[key]
              const clr = sectionColor(score)
              return (
                <div key={key} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: clr, fontFamily: "'Geist Mono', monospace" }}>
                      {score}/10
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(score / 10) * 100}%`, background: clr, borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Top gaps */}
          {result.topGaps.length > 0 && (
            <div style={{ marginBottom: 14, animation: 'fadeUp 0.4s ease 0.18s both' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 10 }}>Top Gaps &amp; Fixes</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.topGaps.map((item, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderLeft: '2px solid rgba(239,68,68,0.45)',
                    borderRadius: 12, padding: '16px 20px',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 8 }}>
                      {item.gap}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--fg-dim)', lineHeight: 1.6 }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Fix: </span>
                      {item.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {result.strengths.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 24, animation: 'fadeUp 0.4s ease 0.24s both' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 12 }}>What&apos;s Working</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.strengths.map((s, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', marginTop: 5, flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5, color: 'var(--fg-muted)', lineHeight: 1.6 }}>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTAs */}
          <div className="ats-cta-row" style={{ display: 'flex', gap: 12, animation: 'fadeUp 0.4s ease 0.3s both' }}>
            <button
              onClick={onPractice}
              style={{
                flex: 1, minWidth: 200, background: 'var(--accent)', color: '#0a0a0a',
                fontSize: 14, fontWeight: 600, padding: '13px 20px', borderRadius: 11,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 10px 28px -10px var(--accent-line)', transition: 'opacity 0.15s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.88')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Practice this gap with Mr. Grill →
            </button>
            <button
              onClick={onReset}
              style={{
                padding: '13px 20px', background: 'transparent',
                border: '1px solid var(--border-strong)', borderRadius: 11,
                fontSize: 14, color: 'var(--fg-muted)', cursor: 'pointer',
                transition: 'opacity 0.15s', whiteSpace: 'nowrap',
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.7')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Analyze another
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ATSPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('setup')
  const [resumeText, setResumeText] = useState('')
  const [jdText, setJdText] = useState('')
  const [result, setResult] = useState<ATSResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill from ATS results page when navigating to interview
  useEffect(() => {
    const storedResume = sessionStorage.getItem('dg_ats_resume')
    const storedJD = sessionStorage.getItem('dg_ats_jd')
    if (storedResume) { setResumeText(storedResume); sessionStorage.removeItem('dg_ats_resume') }
    if (storedJD) { setJdText(storedJD); sessionStorage.removeItem('dg_ats_jd') }
  }, [])

  async function analyze() {
    if (!resumeText.trim()) { setError('Resume is required.'); return }
    if (!jdText.trim()) { setError('Job description is required.'); return }
    setError(null)
    setView('loading')

    try {
      const res = await fetch('/api/ats/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jdText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
      setResult(data as ATSResult)
      setView('results')
    } catch (e) {
      setError(String(e))
      setView('setup')
    }
  }

  function practiceWithGrill() {
    sessionStorage.setItem('dg_ats_resume', resumeText)
    sessionStorage.setItem('dg_ats_jd', jdText)
    router.push('/interview')
  }

  if (view === 'loading') return <LoadingView />

  if (view === 'results' && result) {
    return (
      <ResultsView
        result={result}
        onPractice={practiceWithGrill}
        onReset={() => { setView('setup'); setResult(null) }}
      />
    )
  }

  return (
    <SetupView
      resumeText={resumeText}
      jdText={jdText}
      error={error}
      onResumeText={setResumeText}
      onJdText={setJdText}
      onAnalyze={analyze}
    />
  )
}
