'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import type { Phase, RubricScores, PhaseFeedback } from '@devgrill/shared'

import { LoadingView } from '@/components/interview/LoadingView'
import { SetupView } from '@/components/interview/SetupView'
import { ChatView } from '@/components/interview/ChatView'
import { ReportView } from '@/components/interview/ReportView'
import { GLOBAL_STYLES, type Msg, type TurnResponse, type View } from '@/components/interview/types'

// ── State ─────────────────────────────────────────────────────────────────────

function InterviewPage() {
  const { isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isSignedIn) return
    fetch('/api/interview/claim', { method: 'POST' })
      .then(r => r.json())
      .then(({ threadId }) => {
        if (threadId && view === 'setup') {
          router.replace(`/interview?threadId=${threadId}`)
        }
      })
      .catch(() => {})
  }, [isSignedIn])

  // View state
  const [view, setView] = useState<View>('setup')
  const [resumingSession, setResumingSession] = useState(false)

  // Setup form fields
  const [resumeText, setResumeText] = useState('')
  const [jdText, setJdText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [targetCompany, setTargetCompany] = useState('')

  // Interview session
  const [threadId, setThreadId] = useState(() => crypto.randomUUID())
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [phase, setPhase] = useState<Phase>('requirements')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [autoLoading, setAutoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questionText, setQuestionText] = useState<string | null>(null)
  const [questionTitle, setQuestionTitle] = useState('')
  const [questionOpen, setQuestionOpen] = useState(false)

  // Report
  const [scores, setScores] = useState<RubricScores | null>(null)
  const [phaseFeedback, setPhaseFeedback] = useState<PhaseFeedback[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const searchParams = useSearchParams()

  // ── Session restore ─────────────────────────────────────────────────────────
  // If ?threadId= is in the URL (navigated from /profile), restore that session.
  useEffect(() => {
    const resumeId = searchParams.get('threadId')
    if (!resumeId) return

    setThreadId(resumeId)
    setResumingSession(true)
    setView('loading')

    async function restoreSession(id: string) {
      try {
        const stateRes = await fetch(`/api/interview/state/${id}`)
        if (!stateRes.ok) { setView('setup'); return }
        const s = await stateRes.json()

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [msgs, sending])

  // ── Handlers ────────────────────────────────────────────────────────────────

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
      if (res.status === 403 && data.error === 'trial_limit') { setView('trial_gate'); return }
      if (res.status === 429) throw new Error("You've started too many interviews this hour. Take a break and try again shortly.")
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

  // ── Render ───────────────────────────────────────────────────────────────────

  if (view === 'trial_gate') return <TrialGateView />

  if (view === 'loading') return <LoadingView resuming={resumingSession} />

  if (view === 'complete' && scores) {
    return (
      <>
        {!isSignedIn && <SignupBanner />}
        <ReportView
          scores={scores}
          phaseFeedback={phaseFeedback}
          questionTitle={questionTitle || 'System Design Interview'}
          targetRole={targetRole}
          targetCompany={targetCompany}
        />
      </>
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
        onSend={() => sendMessage()}
        onAutoAnswer={autoAnswer}
        onKeyDown={handleKeyDown}
        onToggleQuestion={() => setQuestionOpen(o => !o)}
      />
    )
  }

  return (
    <SetupView
      resumeText={resumeText}
      jdText={jdText}
      targetRole={targetRole}
      targetCompany={targetCompany}
      error={error}
      onResumeText={setResumeText}
      onJdText={setJdText}
      onTargetRole={setTargetRole}
      onTargetCompany={setTargetCompany}
      onStart={startInterview}
    />
  )
}

// ── Guest UI components ───────────────────────────────────────────────────────

function TrialGateView() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#fafafa',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 22,
        }}>
          🔥
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
          You&rsquo;ve used your free interviews
        </h1>
        <p style={{ fontSize: 15, color: '#666', lineHeight: 1.65, marginBottom: 32 }}>
          You&rsquo;ve completed 2 guest interviews. Sign up for free to keep going — no credit card required.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/sign-up?redirect_url=/interview" style={{
            display: 'inline-block', padding: '11px 24px',
            background: 'var(--accent)', color: 'var(--accent-ink)',
            borderRadius: 9, fontSize: 14, fontWeight: 600, textDecoration: 'none',
            boxShadow: '0 8px 20px -8px var(--accent-line)',
          }}>
            Sign up free →
          </Link>
          <Link href="/sign-in?redirect_url=/interview" style={{
            display: 'inline-block', padding: '11px 24px',
            background: '#161616', border: '1px solid #2a2a2a',
            color: '#ccc', borderRadius: 9, fontSize: 14, fontWeight: 500, textDecoration: 'none',
          }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

function SignupBanner() {
  return (
    <div style={{
      background: '#0f0f0f',
      borderBottom: '1px solid rgba(249,115,22,0.2)',
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 16, flexWrap: 'wrap', textAlign: 'center',
    }}>
      <span style={{ fontSize: 14, color: '#888' }}>
        Sign up to track progress, compare scores, and save all your interviews.
      </span>
      <Link href="/sign-up?redirect_url=/interview" style={{
        padding: '7px 16px',
        background: 'var(--accent)', color: 'var(--accent-ink)',
        borderRadius: 7, fontSize: 13, fontWeight: 600, textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}>
        Create free account →
      </Link>
    </div>
  )
}

// ── Suspense boundary required for useSearchParams() ─────────────────────────

const SUSPENSE_SPINNER = `
  @keyframes breathe { 0%, 100% { transform: scale(0.7); opacity: 0; } 50% { transform: scale(1); opacity: 1; } }
  @keyframes breatheCore { 0%, 100% { box-shadow: 0 0 10px 2px var(--accent-line); } 50% { box-shadow: 0 0 28px 8px var(--accent-line); } }
`

function SuspenseFallback() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{SUSPENSE_SPINNER}</style>
      <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent-soft)', animation: 'breathe 2.4s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'var(--accent-soft)', animation: 'breathe 2.4s ease-in-out infinite 0.4s' }} />
        <div style={{ position: 'relative', width: 14, height: 14, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 20px 4px var(--accent-line)', animation: 'breatheCore 2.4s ease-in-out infinite' }} />
      </div>
    </div>
  )
}

export default function InterviewPageWrapper() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <InterviewPage />
    </Suspense>
  )
}
