import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { LandingNav } from '@/components/LandingNav'

export const metadata = {
  title: 'Why I Built DevGrill',
  description: 'The story behind DevGrill — a mock interview tool built to make real interviews feel familiar.',
}

export default async function WhyPage() {
  const { userId } = await auth()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <LandingNav userId={userId} />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '72px 24px 120px' }}>

        {/* Label */}
        <div style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: 11,
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginBottom: 28,
        }}>
          Why I built this
        </div>

        {/* Opening */}
        <p style={{
          fontSize: 17,
          lineHeight: 1.75,
          color: 'var(--fg-muted)',
          marginBottom: 28,
        }}>
          I&rsquo;ve spent months preparing for system design interviews.
        </p>

        <p style={{
          fontSize: 17,
          lineHeight: 1.75,
          color: 'var(--fg-muted)',
          marginBottom: 28,
        }}>
          I&rsquo;ve read the books, watched countless videos, and practiced designing systems on my own.
          But every time an actual interview came up, there was still that familiar anxiety.
        </p>

        <p style={{
          fontSize: 17,
          lineHeight: 1.75,
          color: 'var(--fg-muted)',
          marginBottom: 36,
        }}>
          Not because I didn&rsquo;t know the concepts — but because I didn&rsquo;t know how I&rsquo;d perform under pressure.
        </p>

        {/* Questions block */}
        <div style={{
          borderLeft: '2px solid rgba(249,115,22,0.35)',
          paddingLeft: 22,
          marginBottom: 36,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          {[
            'Would I freeze when asked a follow-up?',
            'Would I be able to justify my decisions?',
            'Would I know what to say when the interviewer challenged my design?',
          ].map((q) => (
            <p key={q} style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: 'var(--fg-2)',
              fontStyle: 'italic',
            }}>
              {q}
            </p>
          ))}
        </div>

        <p style={{
          fontSize: 17,
          lineHeight: 1.75,
          color: 'var(--fg-muted)',
          marginBottom: 40,
        }}>
          Reading and watching videos can&rsquo;t answer those questions.
        </p>

        {/* Pivot */}
        <h2 style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'var(--fg)',
          lineHeight: 1.2,
          marginBottom: 32,
        }}>
          That&rsquo;s why I built DevGrill.
        </h2>

        <p style={{
          fontSize: 17,
          lineHeight: 1.75,
          color: 'var(--fg-muted)',
          marginBottom: 28,
        }}>
          The goal isn&rsquo;t just to teach system design. It&rsquo;s to recreate the pressure of a real interview
          so that when the actual day comes, it feels familiar instead of intimidating.
        </p>

        <p style={{
          fontSize: 17,
          lineHeight: 1.75,
          color: 'var(--fg-muted)',
          marginBottom: 56,
        }}>
          If DevGrill can make your real interview feel like just another practice session,
          then it&rsquo;s done its job.
        </p>

        {/* CTA */}
        <Link href="/interview" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--accent)',
          textDecoration: 'none',
          border: '1px solid var(--accent-line)',
          borderRadius: 10,
          padding: '11px 20px',
          background: 'var(--accent-soft)',
          transition: 'opacity 0.15s',
        }}>
          Start a practice session →
        </Link>

      </div>

      {/* Footer */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 13, color: 'var(--fg-dim)' }}>
          <Link href="/pricing" style={{ color: 'var(--fg-dim)', textDecoration: 'none' }} className="nav-link">Pricing</Link>
          <Link href="/why" style={{ color: 'var(--fg-dim)', textDecoration: 'none' }} className="nav-link">Why I built this</Link>
          <a
            href="https://github.com/ShivWad/devgrill"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', color: 'var(--fg-dim)' }}
            className="nav-link"
            aria-label="GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-faint)' }}>
            Made by{' '}
            <a href="https://shivwad.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-dim)', textDecoration: 'none' }} className="nav-link">
              ShivWad
            </a>
            <a
              href="mailto:shivwad2k@gmail.com"
              style={{ display: 'flex', alignItems: 'center', color: 'var(--fg-dim)' }}
              className="nav-link"
              aria-label="Email"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M2 4l6 5 6-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </span>
          <span style={{ color: 'var(--fg-faint)' }}>© 2026</span>
        </div>
      </footer>
    </div>
  )
}
