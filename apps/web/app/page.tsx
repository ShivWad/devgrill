import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import ChatDemo from '@/components/ChatDemo'

export default async function HomePage() {
  const { userId } = await auth()
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {/* ── Nav ── */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '22px 36px',
        borderBottom: '1px solid #181818',
        maxWidth: 1140,
        margin: '0 auto',
        width: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 14px var(--accent-line)',
          }} />
          <span style={{ fontSize: 17, fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em' }}>
            DevGrill
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div className="nav-links" style={{ display: 'flex', gap: 26, fontSize: 14, color: '#8f8f8f' }}>
            <span className="nav-link">Product</span>
            <span className="nav-link">How it works</span>
            <span className="nav-link">Pricing</span>
            {!userId && (
              <Link href="/sign-in" style={{ color: '#8f8f8f', textDecoration: 'none' }} className="nav-link">
                Sign in
              </Link>
            )}
          </div>
          {userId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link href="/profile" style={{
                fontSize: 13.5, fontWeight: 500, color: '#fafafa',
                border: '1px solid #2e2e2e', borderRadius: 9, padding: '8px 15px',
                textDecoration: 'none',
              }}>
                My sessions
              </Link>
              <UserButton />
            </div>
          ) : (
            <Link href="/sign-in" className="btn-nav" style={{
              fontSize: 13.5, fontWeight: 500, color: '#fafafa',
              border: '1px solid #2e2e2e', borderRadius: 9, padding: '8px 15px',
              textDecoration: 'none',
            }}>
              Start free
            </Link>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 24px' }}>
        {/* ── Hero ── */}
        <section style={{
          position: 'relative',
          padding: '74px 12px 30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}>
          {/* glow blob */}
          <div style={{
            position: 'absolute',
            top: -40,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 560,
            height: 300,
            background: 'var(--accent-soft)',
            filter: 'blur(90px)',
            borderRadius: '50%',
            animation: 'glow 6s ease-in-out infinite',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'relative',
            fontFamily: "'Geist Mono', monospace",
            fontSize: 12.5,
            letterSpacing: '.2em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 22,
          }}>
            System design interviews
          </div>

          <h1
            className="hero-h1"
            style={{
              position: 'relative',
              fontSize: 62,
              lineHeight: 1.04,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#fafafa',
              maxWidth: 760,
              textWrap: 'balance' as never,
            }}
          >
            Get grilled before<br />the real thing.
          </h1>

          <p
            className="hero-subtitle"
            style={{
              position: 'relative',
              fontSize: 18,
              lineHeight: 1.6,
              color: '#a0a0a0',
              maxWidth: 520,
              marginTop: 24,
              textWrap: 'pretty' as never,
            }}
          >
            A relentless AI interviewer that probes your architecture, follows up, and pushes back — so the real system design round feels easy.
          </p>

          <div
            className="cta-group"
            style={{ position: 'relative', display: 'flex', gap: 13, marginTop: 34 }}
          >
            <Link
              href="/interview"
              className="btn-primary"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                fontSize: 15,
                fontWeight: 600,
                padding: '14px 24px',
                borderRadius: 11,
                boxShadow: '0 14px 30px -10px var(--accent-line)',
                textDecoration: 'none',
              }}
            >
              Start a mock interview
            </Link>
            <div
              className="btn-secondary"
              style={{
                background: '#161616',
                color: '#e5e5e5',
                fontSize: 15,
                fontWeight: 500,
                padding: '14px 24px',
                borderRadius: 11,
                border: '1px solid #2a2a2a',
              }}
            >
              Watch a 2-min session
            </div>
          </div>
        </section>

        {/* ── Chat demo card ── */}
        <ChatDemo />

        {/* ── Feature pills ── */}
        <section style={{ padding: '40px 0 12px' }}>
          <div
            className="feature-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
          >
            {[
              {
                title: 'Adaptive grilling',
                body: 'Follow-ups that bend to your answers — exactly like a real panel.',
              },
              {
                title: 'The whole stack',
                body: 'Sharding, caching, queues, consistency — the trade-offs that decide the round.',
              },
              {
                title: 'Honest scorecard',
                body: 'A clear breakdown of where you cracked, after every round.',
              },
            ].map(pill => (
              <div
                key={pill.title}
                style={{
                  background: '#111',
                  border: '1px solid #1f1f1f',
                  borderRadius: 14,
                  padding: 22,
                }}
              >
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: 'var(--accent-soft)',
                  border: '1px solid var(--accent-line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 15,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#f0f0f0', marginBottom: 7 }}>
                  {pill.title}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: '#8c8c8c' }}>
                  {pill.body}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* ── Footer ── */}
      <footer style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14,
        padding: '24px 36px',
        borderTop: '1px solid #181818',
        maxWidth: 1140,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#cfcfcf' }}>DevGrill</span>
          <span style={{ fontSize: 13, color: '#5a5a5a', marginLeft: 6 }}>Get grilled. Get hired.</span>
        </div>
        <div style={{ display: 'flex', gap: 22, fontSize: 13, color: '#6e6e6e' }}>
          <span className="nav-link">Product</span>
          <span className="nav-link">Pricing</span>
          <span className="nav-link">Docs</span>
          <span style={{ color: '#4a4a4a' }}>© 2026</span>
        </div>
      </footer>
    </div>
  )
}
