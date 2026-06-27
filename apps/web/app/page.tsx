import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import ChatDemo from '@/components/ChatDemo'
import MrGrillSection from '@/components/MrGrillSection'
import { LandingNav } from '@/components/LandingNav'
import { ScrollRevealInit } from '@/components/ScrollRevealInit'

export default async function HomePage() {
  const { userId } = await auth()
  const cookieStore = await cookies()
  const isTeal = cookieStore.get('dg_last_type')?.value === 'technical'
  return (
    <div className={isTeal ? 'theme-teal' : ''} style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <ScrollRevealInit />
      <LandingNav userId={userId} />

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

          <h1
            className="hero-h1"
            style={{
              position: 'relative',
              fontSize: 62,
              lineHeight: 1.04,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--fg)',
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
              color: 'var(--fg-muted)',
              maxWidth: 520,
              marginTop: 24,
              textWrap: 'pretty' as never,
            }}
          >
            A relentless AI interviewer that follows up, pushes back, and scores you honestly — tailored to your resume and the role.
          </p>

          {/* Interview type cards */}
          <div style={{ display: 'flex', gap: 13, marginTop: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/interview" style={{ textDecoration: 'none' }}>
              <div className="interview-card-orange" style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
                borderRadius: 14, padding: '20px 24px', width: 220, textAlign: 'left',
                cursor: 'pointer',
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>System Design</div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-dim)', lineHeight: 1.5 }}>Architecture, scale, and trade-offs across all four phases.</div>
                <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: '#f97316' }}>Start →</div>
              </div>
            </Link>

            <Link href="/technical" style={{ textDecoration: 'none' }}>
              <div className="interview-card-teal" style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
                borderRadius: 14, padding: '20px 24px', width: 220, textAlign: 'left',
                cursor: 'pointer',
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#14b8a6' }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>Technical</div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-dim)', lineHeight: 1.5 }}>Language internals, OOP, CS fundamentals, and hands-on coding.</div>
                <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: '#14b8a6' }}>Start →</div>
              </div>
            </Link>
          </div>

          {userId && (
            <Link
              href="/profile"
              className="hero-sessions-btn"
              style={{
                marginTop: 16, fontSize: 13, fontWeight: 500, color: 'var(--fg-dim)',
                textDecoration: 'none', position: 'relative',
              }}
            >
              My sessions →
            </Link>
          )}
        </section>

        {/* ── Chat demo card ── */}
        <div data-reveal data-reveal-delay="0">
          <ChatDemo />
        </div>

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
                delay: 0,
              },
              {
                title: 'The whole stack',
                body: 'Sharding, caching, queues, consistency — the trade-offs that decide the round.',
                delay: 80,
              },
              {
                title: 'Honest scorecard',
                body: 'A clear breakdown of where you cracked, after every round.',
                delay: 160,
              },
            ].map(pill => (
              <div
                key={pill.title}
                data-reveal
                data-reveal-delay={pill.delay}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
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
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 7 }}>
                  {pill.title}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--fg-muted)' }}>
                  {pill.body}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ borderTop: '1px solid var(--bg-elevated)', padding: '88px 24px 80px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>

          {/* Section header */}
          <div data-reveal style={{ marginBottom: 52 }}>
            <div style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: 12,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: 18,
            }}>
              How it works
            </div>
            <h2 className="how-it-works-h2" style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--fg-2)',
              marginBottom: 18,
              lineHeight: 1.12,
            }}>
              Three steps. One honest session.
            </h2>
            {/* Differentiation callout */}
            <p style={{
              fontSize: 14.5,
              lineHeight: 1.7,
              color: 'var(--fg-dim)',
              maxWidth: 620,
              padding: '14px 18px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderLeft: '2px solid rgba(249,115,22,0.4)',
              borderRadius: 10,
            }}>
              Unlike generic mock interviews, DevGrill generates a question that sits at the
              intersection of what you know and what the JD requires — every time.
            </p>
          </div>

          {/* Step cards */}
          <div className="how-it-works-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

            {/* Step 1 */}
            <div data-reveal data-reveal-delay="0" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '26px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: 'var(--accent-soft)', border: '1px solid var(--accent-line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 1v8M4.5 4L7.5 1l3 3M2 10v3a1 1 0 001 1h9a1 1 0 001-1v-3" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: 'var(--fg-faint)', letterSpacing: '.08em' }}>Step 01</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 10, letterSpacing: '-0.01em' }}>
                Upload your resume and job description
              </h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--fg-dim)' }}>
                Paste the JD you applied to and upload your resume. DevGrill reads both and
                identifies exactly where your experience falls short of what the role requires.
              </p>
            </div>

            {/* Step 2 */}
            <div data-reveal data-reveal-delay="100" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '26px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: 'var(--accent-soft)', border: '1px solid var(--accent-line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M2 2h11a1 1 0 011 1v7a1 1 0 01-1 1H8l-3 2v-2H2a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: 'var(--fg-faint)', letterSpacing: '.08em' }}>Step 02</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 10, letterSpacing: '-0.01em' }}>
                Get grilled by Mr. Grill
              </h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--fg-dim)' }}>
                A personalized system design interview based on your actual skill gaps — not
                generic questions. Four phases: requirements, design, deep dive, and scale.
                Mr. Grill doesn&rsquo;t let you off easy.
              </p>
            </div>

            {/* Step 3 */}
            <div data-reveal data-reveal-delay="200" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '26px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: 'var(--accent-soft)', border: '1px solid var(--accent-line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <rect x="1" y="9" width="3" height="5" rx="1" fill="var(--accent)" opacity=".5"/>
                    <rect x="6" y="5" width="3" height="9" rx="1" fill="var(--accent)" opacity=".75"/>
                    <rect x="11" y="1" width="3" height="13" rx="1" fill="var(--accent)"/>
                  </svg>
                </div>
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: 'var(--fg-faint)', letterSpacing: '.08em' }}>Step 03</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 10, letterSpacing: '-0.01em' }}>
                See your honest score
              </h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--fg-dim)' }}>
                A detailed report with phase-by-phase scores, specific quotes from your answers
                as evidence, gap analysis, and resume advice tailored to the role you&rsquo;re targeting.
              </p>
            </div>

          </div>

          {/* Footer note */}
          <p data-reveal style={{ marginTop: 28, fontSize: 13.5, color: 'var(--fg-faint)', textAlign: 'center', lineHeight: 1.6 }}>
            The whole interview takes 20–30 minutes. The feedback tells you exactly what to work on before the real thing.
          </p>

        </div>
      </section>

      {/* ── Mr. Grill introduction ── */}
      <MrGrillSection />

      {/* ── Footer ── */}
      <footer className="lp-footer" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14,
        padding: '24px 36px',
        borderTop: '1px solid var(--border)',
        maxWidth: 1140,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)' }}>DevGrill</span>
          <span style={{ fontSize: 13, color: 'var(--fg-dim)', marginLeft: 6 }}>Get grilled. Get hired.</span>
        </div>
        <div style={{ display: 'flex', gap: 22, fontSize: 13, color: 'var(--fg-dim)' }}>
          <Link href="/pricing" style={{ color: 'var(--fg-dim)', textDecoration: 'none' }} className="nav-link">Pricing</Link>
          <Link href="/why" style={{ color: 'var(--fg-dim)', textDecoration: 'none' }} className="nav-link">Why I built this</Link>
          <span style={{ color: 'var(--fg-faint)' }}>© 2026</span>
        </div>
      </footer>
    </div>
  )
}
