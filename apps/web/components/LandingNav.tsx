'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

export function LandingNav({ userId }: { userId: string | null }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <nav className="lp-nav" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '22px 36px',
        borderBottom: open ? 'none' : '1px solid #181818',
        maxWidth: 1140,
        margin: '0 auto',
        width: '100%',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--accent)', boxShadow: '0 0 14px var(--accent-line)',
          }} />
          <span style={{ fontSize: 17, fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em' }}>
            DevGrill
          </span>
        </Link>

        {/* Right cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

          {/* Desktop nav links (hidden on mobile via globals.css) */}
          <div className="nav-links" style={{ display: 'flex', gap: 26, fontSize: 14 }}>
            <a href="#how-it-works" style={{ color: '#8f8f8f', textDecoration: 'none' }} className="nav-link">How it works</a>
            <Link href="/pricing" style={{ color: '#8f8f8f', textDecoration: 'none' }} className="nav-link">Pricing</Link>
            {!userId && (
              <Link href="/sign-in" style={{ color: '#8f8f8f', textDecoration: 'none' }} className="nav-link">Sign in</Link>
            )}
          </div>

          {/* Desktop CTA (hidden on mobile via globals.css) */}
          {userId ? (
            <div className="nav-desktop-cta" style={{ gap: 12 }}>
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
            <Link href="/sign-in" className="btn-nav nav-desktop-cta" style={{
              fontSize: 13.5, fontWeight: 500, color: '#fafafa',
              border: '1px solid #2e2e2e', borderRadius: 9, padding: '8px 15px',
              textDecoration: 'none',
            }}>
              Start free
            </Link>
          )}

          {/* Mobile: user avatar shown on mobile via globals.css */}
          {userId && (
            <div className="mobile-auth" style={{ gap: 10 }}>
              <UserButton />
            </div>
          )}

          {/* Hamburger (shown on mobile via globals.css) */}
          <button
            className={`hamburger-btn${open ? ' open' : ''}`}
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="mobile-menu" onClick={() => setOpen(false)}>
          <a href="#how-it-works">How it works</a>
          <Link href="/pricing">Pricing</Link>
          {userId ? (
            <Link href="/profile">My sessions</Link>
          ) : (
            <>
              <Link href="/sign-in">Sign in</Link>
              <Link href="/sign-in" className="mobile-menu-cta">Start free →</Link>
            </>
          )}
        </div>
      )}
    </>
  )
}
