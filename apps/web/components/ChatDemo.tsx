'use client'

import { useEffect, useRef, useState } from 'react'

const SCRIPT = [
  { role: 'ai', text: "Let's begin. Design a URL shortener — start with the data model." },
  { role: 'you', text: "Map a short code to the long URL. I'd Base62-encode an auto-increment ID for compact codes." },
  { role: 'ai', text: "How do you avoid collisions once you're at scale?" },
  { role: 'you', text: "The ID is unique by construction, so its Base62 form is too — no collision check needed." },
  { role: 'ai', text: "Good. Now 10k writes a second hit the database. What breaks first?" },
  { role: 'you', text: "The single primary. I'd shard by code and front reads with a cache." },
  { role: 'ai', text: "Solid instinct. Walk me through how that cache stays consistent." },
]

export default function ChatDemo() {
  const [visible, setVisible] = useState(0)
  const [typing, setTyping] = useState(false)

  const visibleRef = useRef(0)
  const stoppedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    stoppedRef.current = false

    const step = () => {
      if (stoppedRef.current) return
      if (visibleRef.current >= SCRIPT.length) {
        setTyping(false)
        timerRef.current = setTimeout(() => {
          if (stoppedRef.current) return
          visibleRef.current = 0
          setVisible(0)
          timerRef.current = setTimeout(typeNext, 650)
        }, 2600)
        return
      }
      typeNext()
    }

    const typeNext = () => {
      if (stoppedRef.current) return
      setTyping(true)
      const dur = SCRIPT[visibleRef.current].role === 'you' ? 720 : 1050
      timerRef.current = setTimeout(() => {
        if (stoppedRef.current) return
        visibleRef.current += 1
        setVisible(v => v + 1)
        setTyping(false)
        timerRef.current = setTimeout(step, 1250)
      }, dur)
    }

    timerRef.current = setTimeout(step, 750)

    return () => {
      stoppedRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const shown = SCRIPT.slice(0, visible)
  const nextRole = visible < SCRIPT.length ? SCRIPT[visible].role : 'ai'
  const isYouTyping = nextRole === 'you'

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 36px 8px' }}>
      <div style={{
        width: '100%',
        maxWidth: 580,
        background: 'linear-gradient(180deg,#121212,#0d0d0d)',
        border: '1px solid #242424',
        borderRadius: 18,
        boxShadow: '0 30px 60px -30px rgba(0,0,0,.8)',
        overflow: 'hidden',
      }}>
        {/* header bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid #1d1d1d',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: 12,
              color: '#9a9a9a',
              letterSpacing: '.04em',
            }}>
              live session · system design
            </span>
          </div>
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: '#555' }}>28:14</span>
        </div>

        {/* messages */}
        <div style={{
          height: 330,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          gap: 13,
          overflow: 'hidden',
        }}>
          {shown.map((m, i) => {
            const you = m.role === 'you'
            return (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: you ? 'flex-end' : 'flex-start',
                gap: 5,
                animation: 'fadeUp .35s ease both',
              }}>
                <span style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 10.5,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: you ? 'var(--accent)' : '#6b6b6b',
                  padding: '0 4px',
                }}>
                  {you ? 'You' : 'DevGrill'}
                </span>
                <div style={{
                  maxWidth: '82%',
                  padding: '11px 15px',
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  borderRadius: you ? '15px 15px 5px 15px' : '15px 15px 15px 5px',
                  background: you ? 'var(--accent)' : '#181818',
                  color: you ? 'var(--accent-ink)' : '#dcdcdc',
                  border: you ? 'none' : '1px solid #2a2a2a',
                  fontWeight: you ? 500 : 400,
                }}>
                  {m.text}
                </div>
              </div>
            )
          })}

          {typing && (
            <div style={{
              display: 'flex',
              justifyContent: isYouTyping ? 'flex-end' : 'flex-start',
              animation: 'fadeUp .3s ease both',
            }}>
              <div style={{
                display: 'flex',
                gap: 4,
                alignItems: 'center',
                padding: '13px 16px',
                borderRadius: 15,
                background: isYouTyping ? 'var(--accent-soft)' : '#181818',
                border: `1px solid ${isYouTyping ? 'var(--accent-line)' : '#2a2a2a'}`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#999', display: 'inline-block', animation: 'dotPulse 1s infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#999', display: 'inline-block', animation: 'dotPulse 1s infinite 0.15s' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#999', display: 'inline-block', animation: 'dotPulse 1s infinite 0.3s' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
