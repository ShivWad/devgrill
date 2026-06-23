'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import type { TechPhase, TechRubricScores, TechPhaseFeedback } from '@devgrill/shared'

import { TechLoadingView } from '@/components/technical-interview/LoadingView'
import { TechSetupView } from '@/components/technical-interview/SetupView'
import { TechChatView } from '@/components/technical-interview/ChatView'
import { TechReportView } from '@/components/technical-interview/ReportView'
import { TECH_GLOBAL_STYLES, type TechMsg, type TechTurnResponse, type TechView } from '@/components/technical-interview/types'

function TechnicalInterviewPage() {
  const { isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isSignedIn) return
    fetch('/api/interview/claim', { method: 'POST' })
      .then(r => r.json())
      .then(({ threadId, interviewType }) => {
        if (threadId && view === 'setup') {
          if (interviewType === 'system_design' || !interviewType) {
            router.replace(`/interview?threadId=${threadId}`)
          } else {
            router.replace(`/technical?threadId=${threadId}`)
          }
        }
      })
      .catch(() => {})
  }, [isSignedIn])

  const [view, setView] = useState<TechView>('setup')
  const [resumingSession, setResumingSession] = useState(false)

  const [resumeText, setResumeText] = useState('')
  const [jdText, setJdText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [targetCompany, setTargetCompany] = useState('')

  const [threadId, setThreadId] = useState(() => crypto.randomUUID())
  const [msgs, setMsgs] = useState<TechMsg[]>([])
  const [phase, setPhase] = useState<TechPhase>('warm_up')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questionText, setQuestionText] = useState<string | null>(null)
  const [questionTitle, setQuestionTitle] = useState('')
  const [questionOpen, setQuestionOpen] = useState(false)

  const [scores, setScores] = useState<TechRubricScores | null>(null)
  const [phaseFeedback, setPhaseFeedback] = useState<TechPhaseFeedback[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const resumeId = searchParams.get('threadId')
    if (!resumeId) return

    setThreadId(resumeId)
    setResumingSession(true)
    setView('loading')

    async function restoreSession(id: string) {
      try {
        const stateRes = await fetch(`/api/technical-interview/state/${id}`)
        if (!stateRes.ok) { setView('setup'); return }
        const s = await stateRes.json()

        const restored: TechMsg[] = (s.messages ?? []).map((m: { role: string; content: string }) => ({
          role: m.role as 'interviewer' | 'candidate',
          content: m.content,
        }))
        const firstInterviewer = restored.find(m => m.role === 'interviewer')
        if (firstInterviewer) setQuestionText(firstInterviewer.content)
        if (s.question?.title) setQuestionTitle(s.question.title)
        setMsgs(restored)
        setPhase(s.phase ?? 'warm_up')

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

  async function startInterview() {
    if (!resumeText.trim()) { setError('Resume is required.'); return }
    if (!jdText.trim()) { setError('Job description is required.'); return }
    setError(null)
    setView('loading')

    try {
      const res = await fetch('/api/technical-interview/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, resumeText, jdText, targetRole, targetCompany }),
      })
      const data = await res.json()
      if (res.status === 403 && data.error === 'trial_limit') { setView('trial_gate'); return }
      if (res.status === 429) throw new Error("You've started too many interviews this hour. Take a break and try again shortly.")
      if (!res.ok) throw new Error(data.error ?? 'Failed to start interview')

      const turn = data as TechTurnResponse
      if (turn.openingMessage) setQuestionText(turn.openingMessage)
      if (turn.questionTitle) setQuestionTitle(turn.questionTitle)

      const initialMsgs: TechMsg[] = []
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
      const res = await fetch('/api/technical-interview/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, candidateAnswer: answer }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send message')

      const turn = data as TechTurnResponse
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (view === 'trial_gate') return <TechTrialGateView />

  if (view === 'loading') return <TechLoadingView resuming={resumingSession} />

  if (view === 'complete' && scores) {
    return (
      <>
        {!isSignedIn && <TechSignupBanner />}
        <div className="theme-teal">
          <TechReportView
            scores={scores}
            phaseFeedback={phaseFeedback}
            questionTitle={questionTitle || 'Technical Interview'}
            targetRole={targetRole}
            targetCompany={targetCompany}
          />
        </div>
      </>
    )
  }

  if (view === 'chat' || view === 'complete') {
    return (
      <div className="theme-teal">
        <TechChatView
          msgs={msgs}
          phase={phase}
          sending={sending}
          input={input}
          error={error}
          isComplete={view === 'complete'}
          questionText={questionText}
          questionOpen={questionOpen}
          scrollRef={scrollRef}
          inputRef={inputRef}
          onInput={setInput}
          onSend={sendMessage}
          onKeyDown={handleKeyDown}
          onToggleQuestion={() => setQuestionOpen(o => !o)}
        />
      </div>
    )
  }

  return (
    <div className="theme-teal">
      <style>{TECH_GLOBAL_STYLES}</style>
      <TechSetupView
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
    </div>
  )
}

function TechTrialGateView() {
  return (
    <div className="theme-teal" style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#fafafa',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)',
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
          <Link href="/sign-up?redirect_url=/technical" style={{
            display: 'inline-block', padding: '11px 24px',
            background: 'var(--accent)', color: 'var(--accent-ink)',
            borderRadius: 9, fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
            Sign up free →
          </Link>
          <Link href="/sign-in?redirect_url=/technical" style={{
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

function TechSignupBanner() {
  return (
    <div className="theme-teal" style={{
      background: '#0f0f0f', borderBottom: '1px solid rgba(20,184,166,0.2)',
      padding: '14px 24px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 16, flexWrap: 'wrap', textAlign: 'center',
    }}>
      <span style={{ fontSize: 14, color: '#888' }}>
        Sign up to track progress, compare scores, and save all your interviews.
      </span>
      <Link href="/sign-up?redirect_url=/technical" style={{
        padding: '7px 16px', background: 'var(--accent)', color: 'var(--accent-ink)',
        borderRadius: 7, fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
      }}>
        Create free account →
      </Link>
    </div>
  )
}

const SUSPENSE_SPINNER = `
  @keyframes breathe { 0%, 100% { transform: scale(0.7); opacity: 0; } 50% { transform: scale(1); opacity: 1; } }
  @keyframes breatheCore { 0%, 100% { box-shadow: 0 0 10px 2px var(--accent-line); } 50% { box-shadow: 0 0 28px 8px var(--accent-line); } }
`

function SuspenseFallback() {
  return (
    <div className="theme-teal" style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{SUSPENSE_SPINNER}</style>
      <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent-soft)', animation: 'breathe 2.4s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'var(--accent-soft)', animation: 'breathe 2.4s ease-in-out infinite 0.4s' }} />
        <div style={{ position: 'relative', width: 14, height: 14, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 20px 4px var(--accent-line)', animation: 'breatheCore 2.4s ease-in-out infinite' }} />
      </div>
    </div>
  )
}

export default function TechnicalInterviewPageWrapper() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <TechnicalInterviewPage />
    </Suspense>
  )
}
