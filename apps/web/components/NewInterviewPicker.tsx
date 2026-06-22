'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

export function NewInterviewPicker() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontSize: 13.5, color: 'var(--fg-muted)', background: 'none',
          border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
        }}
      >
        New interview
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
          borderRadius: 10, padding: '6px', minWidth: 190,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 50,
        }}>
          <Link href="/interview" onClick={() => setOpen(false)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 7, textDecoration: 'none',
            color: 'var(--fg-2)', fontSize: 13.5, fontWeight: 500,
          }}
            className="picker-option"
          >
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316' }} />
            </div>
            System Design
          </Link>

          <Link href="/technical" onClick={() => setOpen(false)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 7, textDecoration: 'none',
            color: 'var(--fg-2)', fontSize: 13.5, fontWeight: 500,
          }}
            className="picker-option"
          >
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#14b8a6' }} />
            </div>
            Technical
          </Link>
        </div>
      )}
    </div>
  )
}
