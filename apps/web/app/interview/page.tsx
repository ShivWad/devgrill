'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

import type { Phase, RubricScores, PhaseFeedback } from '@devgrill/shared'

const GLOBAL_STYLES = `
  @keyframes breathe {
    0%, 100% { transform: scale(0.7); opacity: 0; }
    50% { transform: scale(1); opacity: 1; }
  }
  @keyframes breatheCore {
    0%, 100% { box-shadow: 0 0 10px 2px var(--accent-line); }
    50% { box-shadow: 0 0 28px 8px var(--accent-line); }
  }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes dotPulse { 0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
  @media (max-width: 640px) {
    .phase-pip--hidden-mobile { display: none !important; }
    .chat-messages-inner { padding: 16px 12px !important; }
    .chat-input-bar { padding: 10px 12px !important; }
    .setup-role-grid { grid-template-columns: 1fr !important; }
    .chat-nav-right { gap: 4px !important; }
    .question-nav-btn { display: none !important; }
  }
`

type View = 'setup' | 'loading' | 'chat' | 'complete'

type TurnResponse = {
  phase: Phase
  turnCount: number
  openingMessage: string | null
  interviewerMessage: string | null
  interviewComplete: boolean
  questionTitle?: string | null
  scores?: RubricScores | null
  phaseFeedback?: PhaseFeedback[]
  reportMarkdown?: string | null
}

type Msg = { role: 'interviewer' | 'candidate'; content: string }

const PHASES: Phase[] = ['requirements', 'design', 'deep_dive', 'scale']
const PHASE_LABEL: Record<Phase, string> = {
  requirements: 'Requirements',
  design: 'Design',
  deep_dive: 'Deep Dive',
  scale: 'Scale',
}

const LOADING_MSGS = [
  "Reading your resume...",
  "Scanning the job description...",
  "Finding skill gaps...",
  "Picking the right challenge...",
  "Matching your experience...",
  "Building a realistic scenario...",
  "Designing an interview question...",
  "Tailoring the interviewer...",
  "Looking for weak spots...",
  "Preparing follow-ups...",
  "Setting the difficulty...",
  "Crafting deep-dive questions...",
  "Simulating a real interview...",
  "Calibrating for the target role...",
  "Building your interview plan...",
  "Almost ready...",
  "One last check...",
  "Generating your challenge...",
  "Preparing your interviewer...",
  "Let's see what you've got..."
];

// ── Shared header ─────────────────────────────────────────────────────────────

function Nav({ right }: { right?: React.ReactNode }) {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '18px 28px',
      borderBottom: '1px solid #181818',
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 12px var(--accent-line)' }} />
        <span style={{ fontSize: 16, fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em' }}>DevGrill</span>
      </Link>
      {right}
    </nav>
  )
}

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingView({ resuming = false }: { resuming?: boolean }) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (resuming) return
    let fadeOut: ReturnType<typeof setTimeout>
    const tick = setInterval(() => {
      setVisible(false)
      fadeOut = setTimeout(() => {
        setIdx(i => (i + 1) % LOADING_MSGS.length)
        setVisible(true)
      }, 350)
    }, 3000)
    return () => { clearInterval(tick); clearTimeout(fadeOut) }
  }, [resuming])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <style>{GLOBAL_STYLES}</style>
      <Nav right={<UserButton />} />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: '40px 24px',
      }}>
        <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* outer aura rings */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            background: 'var(--accent-soft)',
            animation: 'breathe 2.4s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 8,
            borderRadius: '50%',
            background: 'var(--accent-soft)',
            animation: 'breathe 2.4s ease-in-out infinite 0.4s',
          }} />
          {/* core dot */}
          <div style={{
            position: 'relative',
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 20px 4px var(--accent-line)',
            animation: 'breatheCore 2.4s ease-in-out infinite',
          }} />
        </div>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          {resuming ? (
            <>
              <p style={{ fontSize: 16, fontWeight: 500, color: '#e0e0e0', lineHeight: 1.5 }}>
                Calling Mr. Grill back…
              </p>
              <p style={{ fontSize: 13, color: '#555', marginTop: 8 }}>
                Restoring your session.
              </p>
            </>
          ) : (
            <>
              <p style={{
                fontSize: 16,
                fontWeight: 500,
                color: '#e0e0e0',
                lineHeight: 1.5,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 0.35s ease, transform 0.35s ease',
              }}>
                {LOADING_MSGS[idx]}
              </p>
              <p style={{ fontSize: 13, color: '#555', marginTop: 8 }}>
                Question generation usually takes 20–40 s.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Setup form ────────────────────────────────────────────────────────────────

interface SetupProps {
  resumeTab: 'paste' | 'upload'
  resumeText: string
  jdText: string
  targetRole: string
  targetCompany: string
  error: string | null
  onResumeTabChange: (t: 'paste' | 'upload') => void
  onResumeText: (v: string) => void
  onJdText: (v: string) => void
  onTargetRole: (v: string) => void
  onTargetCompany: (v: string) => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onStart: () => void
  pdfParsing: boolean
}

function SetupView(p: SetupProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const field: React.CSSProperties = {
    width: '100%',
    background: '#111',
    border: '1px solid #252525',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    color: '#e8e8e8',
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'vertical',
  }

  const label: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: '#9a9a9a',
    marginBottom: 8,
    display: 'block',
  }

  const tab = (active: boolean): React.CSSProperties => ({
    fontSize: 13,
    fontWeight: 500,
    padding: '6px 14px',
    borderRadius: 7,
    border: 'none',
    cursor: 'pointer',
    background: active ? '#1e1e1e' : 'transparent',
    color: active ? '#e8e8e8' : '#666',
    transition: 'background 0.15s, color 0.15s',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <style>{GLOBAL_STYLES}</style>
      <Nav right={<UserButton />} />
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '48px 24px 80px' }}>
        <div style={{ width: '100%', maxWidth: 620 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', color: '#fafafa', marginBottom: 6 }}>
            Set up your interview
          </h1>
          <p style={{ fontSize: 15, color: '#7a7a7a', marginBottom: 36, lineHeight: 1.5 }}>
            Your resume and JD are never stored — they're used only to generate your question.
          </p>

          {/* Resume */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ ...label, margin: 0 }}>Resume <span style={{ color: '#f97316' }}>*</span></label>
              <div style={{ display: 'flex', gap: 2, background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 9, padding: 3 }}>
                <button style={tab(p.resumeTab === 'paste')} onClick={() => p.onResumeTabChange('paste')}>Paste</button>
                <button style={tab(p.resumeTab === 'upload')} onClick={() => { p.onResumeTabChange('upload'); setTimeout(() => fileRef.current?.click(), 50) }}>Upload file</button>
              </div>
            </div>
            {p.resumeTab === 'paste' ? (
              <textarea
                style={{ ...field, minHeight: 160 }}
                placeholder="Paste your resume text here…"
                value={p.resumeText}
                onChange={e => p.onResumeText(e.target.value)}
              />
            ) : (
              <div
                style={{
                  ...field,
                  minHeight: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  color: '#555',
                  resize: 'none',
                }}
                onClick={() => fileRef.current?.click()}
              >
                {p.pdfParsing ? (
                  <span style={{ fontSize: 13, color: '#888' }}>Parsing PDF…</span>
                ) : (
                  <>
                    <span style={{ fontSize: 22 }}>↑</span>
                    <span style={{ fontSize: 14 }}>Click to upload a PDF or .txt file</span>
                    {p.resumeText && (
                      <span style={{ fontSize: 12, color: '#5a8a5a' }}>✓ File loaded ({p.resumeText.length.toLocaleString()} chars)</span>
                    )}
                  </>
                )}
              </div>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.txt,.md" style={{ display: 'none' }} onChange={p.onFileUpload} />
          </div>

          {/* JD */}
          <div style={{ marginBottom: 22 }}>
            <label style={label}>Job Description <span style={{ color: '#f97316' }}>*</span></label>
            <textarea
              style={{ ...field, minHeight: 130 }}
              placeholder="Paste the job description here…"
              value={p.jdText}
              onChange={e => p.onJdText(e.target.value)}
            />
          </div>

          {/* Role + Company */}
          <div className="setup-role-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
            <div>
              <label style={label}>Target role <span style={{ color: '#555', fontWeight: 400 }}>(optional)</span></label>
              <input
                style={{ ...field, resize: 'none' } as React.CSSProperties}
                placeholder="e.g. Senior Software Engineer"
                value={p.targetRole}
                onChange={e => p.onTargetRole(e.target.value)}
              />
            </div>
            <div>
              <label style={label}>Target company <span style={{ color: '#555', fontWeight: 400 }}>(optional)</span></label>
              <input
                style={{ ...field, resize: 'none' } as React.CSSProperties}
                placeholder="e.g. Stripe"
                value={p.targetCompany}
                onChange={e => p.onTargetCompany(e.target.value)}
              />
            </div>
          </div>

          {p.error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 9,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171',
              fontSize: 13,
              marginBottom: 18,
            }}>
              {p.error}
            </div>
          )}

          <button
            onClick={p.onStart}
            style={{
              width: '100%',
              background: 'var(--accent)',
              color: '#0a0a0a',
              fontSize: 15,
              fontWeight: 600,
              padding: '14px',
              borderRadius: 11,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 10px 28px -10px var(--accent-line)',
              transition: 'opacity 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            Start Interview →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Chat view ─────────────────────────────────────────────────────────────────

interface ChatProps {
  msgs: Msg[]
  phase: Phase
  sending: boolean
  autoLoading: boolean
  input: string
  error: string | null
  isComplete: boolean
  questionText: string | null
  questionOpen: boolean
  scrollRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  onInput: (v: string) => void
  onSend: () => void
  onAutoAnswer: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onToggleQuestion: () => void
}

function ChatView(p: ChatProps) {
  const phaseIdx = PHASES.indexOf(p.phase)

  return (
    <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <style>{GLOBAL_STYLES}</style>

      {/* header */}
      <Nav right={
        <div className="chat-nav-right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {p.questionText && (
            <button
              className="question-nav-btn"
              onClick={p.onToggleQuestion}
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 6,
                background: p.questionOpen ? 'var(--accent-soft)' : '#111',
                border: `1px solid ${p.questionOpen ? 'var(--accent-line)' : '#2a2a2a'}`,
                color: p.questionOpen ? 'var(--accent)' : '#777',
                cursor: 'pointer',
                marginRight: 6,
                transition: 'all 0.15s',
              }}
            >
              Question ↗
            </button>
          )}
          {PHASES.map((ph, i) => (
            <div
              key={ph}
              className={`phase-pip${i !== phaseIdx ? ' phase-pip--hidden-mobile' : ''}`}
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 6,
                background: i === phaseIdx ? 'var(--accent-soft)' : 'transparent',
                border: `1px solid ${i === phaseIdx ? 'var(--accent-line)' : 'transparent'}`,
                color: i === phaseIdx ? 'var(--accent)' : i < phaseIdx ? '#4a4a4a' : '#555',
                fontWeight: i === phaseIdx ? 600 : 400,
                transition: 'all 0.2s',
              }}
            >
              {i < phaseIdx ? '✓ ' : ''}{PHASE_LABEL[ph]}
            </div>
          ))}
          <div style={{ marginLeft: 4 }}>
            <UserButton />
          </div>
        </div>
      } />

      {/* messages */}
      <div
        ref={p.scrollRef}
        style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}
      >
        <div
          className="chat-messages-inner"
          style={{
            maxWidth: 740,
            margin: '0 auto',
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
        {p.msgs.map((m, i) => {
          const you = m.role === 'candidate'
          const isQuestion = i === 0 && m.role === 'interviewer'
          return (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: you ? 'flex-end' : 'flex-start',
              gap: 4,
              animation: 'fadeUp .3s ease both',
              maxWidth: '100%',
            }}>
              <span style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 10,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: you ? 'var(--accent)' : isQuestion ? 'var(--accent)' : '#4e4e4e',
                padding: '0 4px',
              }}>
                {you ? 'You' : isQuestion ? 'Question' : 'Mr. Grill'}
              </span>
              <div style={{
                maxWidth: isQuestion ? '100%' : 'min(680px, 88%)',
                width: isQuestion ? '100%' : undefined,
                padding: isQuestion ? '18px 22px' : '13px 17px',
                fontSize: 14.5,
                lineHeight: 1.7,
                borderRadius: you ? '16px 16px 5px 16px' : '16px 16px 16px 5px',
                background: isQuestion ? 'rgba(var(--accent-rgb, 100,200,150), 0.04)' : you ? 'var(--accent)' : '#141414',
                color: you ? '#0a0a0a' : '#dcdcdc',
                border: isQuestion ? '1px solid var(--accent-line)' : you ? 'none' : '1px solid #222',
                fontWeight: you ? 500 : 400,
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            </div>
          )
        })}

        {/* typing indicator */}
        {p.sending && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, animation: 'fadeUp .3s ease both' }}>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#4e4e4e', padding: '0 4px' }}>Mr. Grill</span>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '14px 18px', borderRadius: 16, background: '#141414', border: '1px solid #222' }}>
              {[0, 0.15, 0.3].map((delay, i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#666', display: 'inline-block', animation: `dotPulse 1.1s infinite ${delay}s` }} />
              ))}
            </div>
          </div>
        )}

        {p.isComplete && (
          <div style={{ padding: '12px 4px', animation: 'fadeUp .4s ease both' }}>
            <p style={{ fontSize: 13, color: '#555', textAlign: 'center' }}>Interview complete — loading your report…</p>
          </div>
        )}

        <div style={{ height: 1 }} />
        </div>
      </div>

      {/* error banner */}
      {p.error && (
        <div style={{ maxWidth: 740, margin: '0 auto', width: '100%', padding: '0 24px 8px' }}>
          <div style={{
            padding: '9px 14px',
            borderRadius: 9,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#f87171',
            fontSize: 13,
          }}>
            {p.error}
          </div>
        </div>
      )}

      {/* input bar */}
      {!p.isComplete && (
        <div className="chat-input-bar" style={{ borderTop: '1px solid #181818', padding: '14px 24px', background: '#0a0a0a' }}>
        <div style={{
          maxWidth: 740,
          margin: '0 auto',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
        }}>
          <textarea
            ref={p.inputRef}
            rows={1}
            style={{
              flex: 1,
              background: '#111',
              border: '1px solid #252525',
              borderRadius: 11,
              padding: '11px 14px',
              fontSize: 14.5,
              color: '#e8e8e8',
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'none',
              lineHeight: 1.55,
              maxHeight: 160,
              overflowY: 'auto',
            }}
            placeholder="Your answer… (Enter to send, Shift+Enter for newline)"
            value={p.input}
            onChange={e => {
              p.onInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
            }}
            onKeyDown={p.onKeyDown}
            disabled={p.sending || p.autoLoading}
          />
          <button
            onClick={p.onAutoAnswer}
            disabled={p.sending || p.autoLoading}
            title="Generate an AI answer and send it automatically"
            style={{
              background: '#111',
              color: p.sending || p.autoLoading ? '#444' : '#777',
              border: '1px solid #252525',
              borderRadius: 11,
              padding: '11px 14px',
              fontSize: 13,
              fontWeight: 500,
              cursor: p.sending || p.autoLoading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            {p.autoLoading ? '…' : 'Auto'}
          </button>
          <button
            onClick={p.onSend}
            disabled={p.sending || p.autoLoading || !p.input.trim()}
            style={{
              background: p.sending || p.autoLoading || !p.input.trim() ? '#1e1e1e' : 'var(--accent)',
              color: p.sending || p.autoLoading || !p.input.trim() ? '#444' : '#0a0a0a',
              border: 'none',
              borderRadius: 11,
              padding: '11px 18px',
              fontSize: 14,
              fontWeight: 600,
              cursor: p.sending || p.autoLoading || !p.input.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {p.sending ? '…' : 'Send'}
          </button>
        </div>
        </div>
      )}
    </div>
  )
}

// ── Report view ──────────────────────────────────────────────────────────────

const RUBRIC_KEYS: { key: keyof RubricScores; label: string }[] = [
  { key: 'requirementsGathering', label: 'Requirements Gathering' },
  { key: 'apiDesign', label: 'API Design' },
  { key: 'dataModeling', label: 'Data Modeling' },
  { key: 'systemComponents', label: 'System Components' },
  { key: 'scalability', label: 'Scalability' },
  { key: 'tradeoffs', label: 'Tradeoffs' },
  { key: 'communication', label: 'Communication' },
]

const PHASE_FULL: Record<Phase, string> = {
  requirements: 'Requirements Gathering',
  design: 'High-Level Design',
  deep_dive: 'Deep Dive',
  scale: 'Scale & Tradeoffs',
}

function scoreColor(score: number, max = 5) {
  const pct = score / max
  if (pct >= 0.8) return 'var(--accent)'
  if (pct >= 0.6) return '#eab308'
  return '#ef4444'
}

interface ReportProps {
  scores: RubricScores
  phaseFeedback: PhaseFeedback[]
  questionTitle: string
  targetRole: string
  targetCompany: string
}

function ReportView({ scores, phaseFeedback, questionTitle, targetRole, targetCompany }: ReportProps) {
  const card: React.CSSProperties = {
    background: '#111',
    border: '1px solid #1e1e1e',
    borderRadius: 14,
    padding: '22px 24px',
  }

  const sectionLabel: React.CSSProperties = {
    fontFamily: "'Geist Mono', monospace",
    fontSize: 11,
    letterSpacing: '.1em',
    textTransform: 'uppercase' as const,
    color: '#444',
    marginBottom: 14,
    display: 'block',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <Nav right={<UserButton />} />
      <div style={{ flex: 1, maxWidth: 780, margin: '0 auto', padding: '48px 24px 80px', width: '100%' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent-line)' }} />
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)' }}>Interview Complete</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#fafafa', marginBottom: 6 }}>{questionTitle}</h1>
          {(targetRole || targetCompany) && (
            <p style={{ fontSize: 14, color: '#555' }}>{[targetRole, targetCompany].filter(Boolean).join(' · ')}</p>
          )}
        </div>

        {/* Score + assessment */}
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14, marginBottom: 32 }}>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', color: scoreColor(scores.overall, 100), lineHeight: 1 }}>
              {scores.overall}
            </span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: '#444' }}>/ 100</span>
          </div>
          <div style={card}>
            <div style={{ marginBottom: 16 }}>
              <span style={sectionLabel}>Level Assessment</span>
              <p style={{ fontSize: 14, color: '#d8d8d8', lineHeight: 1.6, margin: 0 }}>{scores.levelAssessment}</p>
            </div>
            <div>
              <span style={sectionLabel}>Role Readiness</span>
              <p style={{ fontSize: 14, color: '#d8d8d8', lineHeight: 1.6, margin: 0 }}>{scores.roleReadiness}</p>
            </div>
          </div>
        </div>

        {/* Rubric */}
        <div style={{ marginBottom: 32 }}>
          <span style={sectionLabel}>Rubric Breakdown</span>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {RUBRIC_KEYS.map(({ key, label }) => {
              const score = scores[key] as number
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontSize: 13.5, color: '#bbb' }}>{label}</span>
                    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: scoreColor(score) }}>{score}/5</span>
                  </div>
                  <div style={{ height: 4, background: '#1e1e1e', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${(score / 5) * 100}%`, background: scoreColor(score), borderRadius: 2 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Phase feedback */}
        {phaseFeedback.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <span style={sectionLabel}>Phase Feedback</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {phaseFeedback.map(fb => (
                <div key={fb.phase} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0' }}>{PHASE_FULL[fb.phase]}</span>
                    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 13, color: scoreColor(fb.score) }}>{fb.score}/5</span>
                  </div>
                  {fb.strengths.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ ...sectionLabel, marginBottom: 8 }}>Strengths</span>
                      {fb.strengths.map((s, i) => (
                        <p key={i} style={{ fontSize: 13, color: '#999', lineHeight: 1.55, marginBottom: 4, paddingLeft: 10, borderLeft: '2px solid #2a2a2a' }}>{s}</p>
                      ))}
                    </div>
                  )}
                  {fb.gaps.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ ...sectionLabel, marginBottom: 8 }}>Gaps</span>
                      {fb.gaps.map((g, i) => (
                        <p key={i} style={{ fontSize: 13, color: '#999', lineHeight: 1.55, marginBottom: 4, paddingLeft: 10, borderLeft: '2px solid #2a2a2a' }}>{g}</p>
                      ))}
                    </div>
                  )}
                  {fb.specificQuotes.length > 0 && (
                    <div>
                      <span style={{ ...sectionLabel, marginBottom: 8 }}>Evidence</span>
                      {fb.specificQuotes.map((q, i) => (
                        <p key={i} style={{ fontSize: 12, color: '#666', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 6 }}>"{q}"</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gap analysis + Resume advice */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 40 }}>
          <div>
            <span style={sectionLabel}>Gap Analysis</span>
            <div style={card}>
              <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.75, margin: 0 }}>{scores.gapAnalysis}</p>
            </div>
          </div>
          <div>
            <span style={sectionLabel}>Resume Advice</span>
            <div style={card}>
              <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.75, margin: 0 }}>{scores.resumeAdvice}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link href="/interview" style={{
            background: 'var(--accent)',
            color: '#0a0a0a',
            fontSize: 14,
            fontWeight: 600,
            padding: '12px 28px',
            borderRadius: 10,
            textDecoration: 'none',
          }}>
            Start another interview →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function InterviewPage() {
  const [view, setView] = useState<View>('setup')
  const [resumingSession, setResumingSession] = useState(false)
  const [resumeTab, setResumeTab] = useState<'paste' | 'upload'>('paste')
  const [resumeText, setResumeText] = useState('')
  const [jdText, setJdText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [targetCompany, setTargetCompany] = useState('')
  const [threadId, setThreadId] = useState(() => crypto.randomUUID())

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [phase, setPhase] = useState<Phase>('requirements')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [autoLoading, setAutoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfParsing, setPdfParsing] = useState(false)
  const [questionText, setQuestionText] = useState<string | null>(null)
  const [questionTitle, setQuestionTitle] = useState('')
  const [questionOpen, setQuestionOpen] = useState(false)
  const [scores, setScores] = useState<RubricScores | null>(null)
  const [phaseFeedback, setPhaseFeedback] = useState<PhaseFeedback[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const searchParams = useSearchParams()

  // If ?threadId= is in the URL (navigated from /profile), restore that session.
  useEffect(() => {
    const resumeId = searchParams.get('threadId')
    if (!resumeId) return

    setResumingSession(true)
    setView('loading')

    async function restoreSession(id: string) {
      try {
        const stateRes = await fetch(`/api/interview/state/${id}`)
        if (!stateRes.ok) { setView('setup'); return }
        const s = await stateRes.json()

        setThreadId(id)
        const restored: Msg[] = (s.messages ?? []).map((m: { role: string; content: string }) => ({
          role: m.role as 'interviewer' | 'candidate',
          content: m.content,
        }))
        const firstInterviewer = restored.find(m => m.role === 'interviewer')
        if (firstInterviewer) setQuestionText(firstInterviewer.content)
        if (s.question?.title) setQuestionTitle(s.question.title)
        setMsgs(restored)
        setPhase(s.phase ?? 'requirements')

        if (s.interviewComplete) {
          if (s.scores) setScores(s.scores)
          if (s.phaseFeedback) setPhaseFeedback(s.phaseFeedback)
          setView('complete')
        } else {
          setView('chat')
        }
      } catch {
        setView('setup')
      }
    }
    restoreSession(resumeId)
  }, [searchParams])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [msgs, sending])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setPdfParsing(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/parse-pdf', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to parse PDF')
        setResumeText(data.text)
        setResumeTab('paste')
      } catch {
        setError('Could not parse the PDF. Try pasting the text instead.')
        setResumeTab('paste')
      } finally {
        setPdfParsing(false)
      }
      return
    }

    const reader = new FileReader()
    reader.onload = ev => {
      setResumeText((ev.target?.result as string) ?? '')
      setResumeTab('paste')
    }
    reader.readAsText(file)
  }

  async function startInterview() {
    if (!resumeText.trim()) { setError('Resume is required.'); return }
    if (!jdText.trim()) { setError('Job description is required.'); return }
    setError(null)
    setView('loading')

    try {
      const res = await fetch('/api/interview/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, resumeText, jdText, targetRole, targetCompany }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to start interview')

      const turn = data as TurnResponse
      if (turn.openingMessage) setQuestionText(turn.openingMessage)
      if (turn.questionTitle) setQuestionTitle(turn.questionTitle)
      const initialMsgs: Msg[] = []
      if (turn.openingMessage) initialMsgs.push({ role: 'interviewer', content: turn.openingMessage })
      if (turn.interviewerMessage) initialMsgs.push({ role: 'interviewer', content: turn.interviewerMessage })
      setMsgs(initialMsgs)
      setPhase(turn.phase)
      setView('chat')
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch (e) {
      setError(String(e))
      setView('setup')
    }
  }

  async function sendMessage(overrideAnswer?: string) {
    const answer = overrideAnswer ?? input.trim()
    if (!answer || sending) return
    if (!overrideAnswer) setInput('')
    setMsgs(prev => [...prev, { role: 'candidate', content: answer }])
    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/interview/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, candidateAnswer: answer }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send message')

      const turn = data as TurnResponse
      setPhase(turn.phase)
      if (turn.interviewerMessage) {
        setMsgs(prev => [...prev, { role: 'interviewer', content: turn.interviewerMessage! }])
      }
      if (turn.interviewComplete) {
        if (turn.scores) setScores(turn.scores)
        if (turn.phaseFeedback) setPhaseFeedback(turn.phaseFeedback)
        setView('complete')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  async function autoAnswer() {
    if (sending || autoLoading) return
    setAutoLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/interview/auto-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate answer')
      await sendMessage(data.candidateAnswer)
    } catch (e) {
      setError(String(e))
    } finally {
      setAutoLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (view === 'loading') return <LoadingView resuming={resumingSession} />

  if (view === 'complete' && scores) {
    return (
      <ReportView
        scores={scores}
        phaseFeedback={phaseFeedback}
        questionTitle={questionTitle || 'System Design Interview'}
        targetRole={targetRole}
        targetCompany={targetCompany}
      />
    )
  }

  if (view === 'chat' || view === 'complete') {
    return (
      <ChatView
        msgs={msgs}
        phase={phase}
        sending={sending}
        autoLoading={autoLoading}
        input={input}
        error={error}
        isComplete={view === 'complete'}
        questionText={questionText}
        questionOpen={questionOpen}
        scrollRef={scrollRef}
        inputRef={inputRef}
        onInput={setInput}
        onSend={sendMessage}
        onAutoAnswer={autoAnswer}
        onKeyDown={handleKeyDown}
        onToggleQuestion={() => setQuestionOpen(o => !o)}
      />
    )
  }

  return (
    <SetupView
      resumeTab={resumeTab}
      resumeText={resumeText}
      jdText={jdText}
      targetRole={targetRole}
      targetCompany={targetCompany}
      error={error}
      onResumeTabChange={setResumeTab}
      onResumeText={setResumeText}
      onJdText={setJdText}
      onTargetRole={setTargetRole}
      onTargetCompany={setTargetCompany}
      onFileUpload={handleFileUpload}
      onStart={startInterview}
      pdfParsing={pdfParsing}
    />
  )
}

export default function InterviewPageWrapper() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes breathe { 0%, 100% { transform: scale(0.7); opacity: 0; } 50% { transform: scale(1); opacity: 1; } }
          @keyframes breatheCore { 0%, 100% { box-shadow: 0 0 10px 2px var(--accent-line); } 50% { box-shadow: 0 0 28px 8px var(--accent-line); } }
        `}</style>
        <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent-soft)', animation: 'breathe 2.4s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'var(--accent-soft)', animation: 'breathe 2.4s ease-in-out infinite 0.4s' }} />
          <div style={{ position: 'relative', width: 14, height: 14, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 20px 4px var(--accent-line)', animation: 'breatheCore 2.4s ease-in-out infinite' }} />
        </div>
      </div>
    }>
      <InterviewPage />
    </Suspense>
  )
}
