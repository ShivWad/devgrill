'use client'

import { useState } from 'react'
import Link from 'next/link'

const STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .pricing-card { animation: fadeUp 0.5s ease both; }
  .pricing-card:nth-child(2) { animation-delay: 0.08s; }
  .pricing-card:nth-child(3) { animation-delay: 0.16s; }

  .notify-input:focus { outline: none; border-color: rgba(249,115,22,0.4) !important; }

  @media (max-width: 860px) {
    .pricing-grid { grid-template-columns: 1fr !important; max-width: 420px !important; }
  }
`

const FEATURES = [
  'Overall score (0–100)',
  'Level assessment',
  'Phase-by-phase feedback',
  'Transcript evidence per feedback',
  'Resume advice per interview',
  'Gap analysis',
]

const CHECK = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
    <circle cx="6.5" cy="6.5" r="6.5" fill="rgba(249,115,22,0.12)" />
    <path d="M3.5 6.5L5.5 8.5L9.5 4.5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function Feature({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 10 }}>
      {CHECK}
      <span style={{ fontSize: 13.5, color: '#8a8a8a', lineHeight: 1.5 }}>{text}</span>
    </div>
  )
}

function NotifyInput({ tier }: { tier: string }) {
  const key = `dg_notify_${tier}`
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem(key)
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    localStorage.setItem(key, email.trim())
    setDone(true)
  }

  if (done) {
    return (
      <div style={{
        padding: '10px 14px',
        background: 'rgba(249,115,22,0.07)',
        border: '1px solid rgba(249,115,22,0.2)',
        borderRadius: 8,
        fontSize: 13,
        color: '#888',
      }}>
        You&rsquo;re on the list.
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 7 }}>
      <input
        type="email"
        className="notify-input"
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        style={{
          flex: 1,
          minWidth: 0,
          padding: '9px 12px',
          background: '#0d0d0d',
          border: '1px solid #252525',
          borderRadius: 7,
          color: '#d0d0d0',
          fontSize: 13,
          transition: 'border-color 0.15s ease',
        }}
      />
      <button type="submit" style={{
        padding: '9px 14px',
        background: '#161616',
        border: '1px solid #2a2a2a',
        borderRadius: 7,
        color: '#b0b0b0',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        Notify me
      </button>
    </form>
  )
}

export default function PricingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fafafa' }}>
      <style>{STYLES}</style>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '22px 36px', borderBottom: '1px solid #181818',
        maxWidth: 1140, margin: '0 auto',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 14px var(--accent-line)' }} />
          <span style={{ fontSize: 17, fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em' }}>DevGrill</span>
        </Link>
        <div style={{ display: 'flex', gap: 24, fontSize: 14, color: '#8f8f8f' }}>
          <Link href="/" style={{ color: '#8f8f8f', textDecoration: 'none' }}>Home</Link>
          <Link href="/interview" style={{ color: '#8f8f8f', textDecoration: 'none' }}>Start interview</Link>
          <Link href="/sign-in" style={{ color: '#8f8f8f', textDecoration: 'none' }}>Sign in</Link>
        </div>
      </nav>

      {/* Header */}
      <section style={{ textAlign: 'center', padding: '72px 24px 56px' }}>
        <div style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: 12,
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginBottom: 20,
        }}>
          Pricing
        </div>
        <h1 style={{
          fontSize: 46,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1.08,
          color: '#fafafa',
          marginBottom: 16,
        }}>
          Simple, honest pricing.
        </h1>
        <p style={{ fontSize: 16, color: '#666', maxWidth: 420, margin: '0 auto', lineHeight: 1.65 }}>
          Start free. Upgrade when you need more.
        </p>
      </section>

      {/* Cards */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 96px' }}>
        <div
          className="pricing-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}
        >

          {/* ── Free ── */}
          <div className="pricing-card" style={{
            background: '#0f0f0f',
            border: '1px solid #1f1f1f',
            borderRadius: 16,
            padding: '28px 26px 30px',
          }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 10 }}>Free</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.04em', color: '#efefef' }}>₹0</span>
                <span style={{ fontSize: 13, color: '#555' }}>/month</span>
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <Feature text="3 interviews per month" />
              {FEATURES.map(f => <Feature key={f} text={f} />)}
            </div>

            <Link href="/sign-up" style={{
              display: 'block',
              textAlign: 'center',
              padding: '11px 20px',
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 8px 20px -8px var(--accent-line)',
            }}>
              Get started free
            </Link>
          </div>

          {/* ── Pro ── */}
          <div className="pricing-card" style={{
            background: '#0f0f0f',
            border: '1px solid rgba(249,115,22,0.28)',
            borderRadius: 16,
            padding: '28px 26px 30px',
            position: 'relative',
          }}>
            {/* Featured badge */}
            <div style={{
              position: 'absolute',
              top: -11,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              padding: '3px 12px',
              borderRadius: 20,
              whiteSpace: 'nowrap',
            }}>
              Most popular
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 10 }}>Pro</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.04em', color: '#efefef' }}>₹399</span>
                <span style={{ fontSize: 13, color: '#555' }}>/month</span>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <Feature text="Unlimited interviews" />
              {FEATURES.map(f => <Feature key={f} text={f} />)}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 10.5,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: '#444',
                marginBottom: 10,
              }}>
                Coming soon — get notified
              </div>
              <NotifyInput tier="pro" />
            </div>
          </div>

          {/* ── Pay as you go ── */}
          <div className="pricing-card" style={{
            background: '#0f0f0f',
            border: '1px solid #1f1f1f',
            borderRadius: 16,
            padding: '28px 26px 30px',
          }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 10 }}>Pay as you go</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.04em', color: '#efefef' }}>₹29</span>
                <span style={{ fontSize: 13, color: '#555' }}>/interview</span>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <Feature text="Pay per interview, no subscription" />
              {FEATURES.map(f => <Feature key={f} text={f} />)}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 10.5,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: '#444',
                marginBottom: 10,
              }}>
                Coming soon — get notified
              </div>
              <NotifyInput tier="payg" />
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 14,
        padding: '24px 36px', borderTop: '1px solid #181818',
        maxWidth: 1140, margin: '0 auto',
        fontSize: 13, color: '#6e6e6e',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
          <span style={{ fontWeight: 600, color: '#cfcfcf' }}>DevGrill</span>
          <span style={{ marginLeft: 6 }}>Get grilled. Get hired.</span>
        </div>
        <div style={{ display: 'flex', gap: 22 }}>
          <Link href="/" style={{ color: '#6e6e6e', textDecoration: 'none' }}>Home</Link>
          <Link href="/pricing" style={{ color: '#6e6e6e', textDecoration: 'none' }}>Pricing</Link>
          <span style={{ color: '#4a4a4a' }}>© 2026</span>
        </div>
      </footer>
    </div>
  )
}
