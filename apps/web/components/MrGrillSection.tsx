const STYLES = `
  @keyframes mrgFadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
  @keyframes mrgBlobDrift {
    0%   { transform: translate(0px,   0px)  scale(1);    opacity: 0.55; }
    25%  { transform: translate(16px, -12px) scale(1.07); opacity: 0.75; }
    50%  { transform: translate(-8px,  18px) scale(0.95); opacity: 0.60; }
    75%  { transform: translate(-16px, -8px) scale(1.10); opacity: 0.80; }
    100% { transform: translate(0px,   0px)  scale(1);    opacity: 0.55; }
  }
  @keyframes mrgBlobDrift2 {
    0%   { transform: translate(0px,   0px)   scale(1);    opacity: 0.30; }
    33%  { transform: translate(-14px, 14px)  scale(1.05); opacity: 0.50; }
    66%  { transform: translate(12px, -16px)  scale(0.93); opacity: 0.38; }
    100% { transform: translate(0px,   0px)   scale(1);    opacity: 0.30; }
  }
  @keyframes mrgPing {
    0%   { box-shadow: 0 0 0 0   rgba(34,197,94,0.55); }
    70%  { box-shadow: 0 0 0 7px rgba(34,197,94,0);    }
    100% { box-shadow: 0 0 0 0   rgba(34,197,94,0);    }
  }

  .mrg-section      { animation: mrgFadeUp 0.65s ease both; }
  .mrg-glow-blob    { animation: mrgBlobDrift  7s ease-in-out infinite; }
  .mrg-glow-blob-2  { animation: mrgBlobDrift2 9s ease-in-out infinite; }
  .mrg-online-dot   { animation: mrgPing 2.2s ease-in-out infinite; }

  .mrg-chip {
    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
    cursor: default;
  }
  .mrg-chip:hover {
    background:    rgba(249,115,22,0.10) !important;
    border-color:  rgba(249,115,22,0.35) !important;
    color: var(--fg-2) !important;
  }

  .mrg-avatar-outer:hover .mrg-glow-blob,
  .mrg-avatar-outer:hover .mrg-glow-blob-2 {
    animation-play-state: paused;
    opacity: 1;
  }

  @media (max-width: 820px) {
    .mrg-grid        { grid-template-columns: 1fr !important; gap: 48px !important; }
    .mrg-avatar-col  { align-items: center !important; }
    .mrg-heading     { font-size: 26px !important; line-height: 1.25 !important; }
    .mrg-chips       { justify-content: flex-start !important; }
    .mrg-callout     { max-width: 100% !important; }
  }
`

const FEATURES = ['Resume-Aware', 'Adaptive Follow-ups', 'Company-Specific Interviews']

function AvatarIllustration() {
  return (
    <svg
      viewBox="0 0 210 210"
      width="210"
      height="210"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="mrg-bg" cx="50%" cy="34%" r="65%">
          <stop offset="0%"   stopColor="#1e1e1e" />
          <stop offset="100%" stopColor="#080808" />
        </radialGradient>
        <radialGradient id="mrg-face-glow" cx="50%" cy="34%" r="48%">
          <stop offset="0%"   stopColor="rgba(249,115,22,0.06)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <linearGradient id="mrg-vignette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#080808" stopOpacity="0" />
          <stop offset="100%" stopColor="#080808" stopOpacity="0.92" />
        </linearGradient>
        <pattern id="mrg-grid" x="0" y="0" width="21" height="21" patternUnits="userSpaceOnUse">
          <path d="M 21 0 L 0 0 0 21" fill="none" stroke="#181818" strokeWidth="0.55" />
        </pattern>
        <clipPath id="mrg-clip">
          <circle cx="105" cy="105" r="105" />
        </clipPath>
      </defs>

      {/* Base fill */}
      <circle cx="105" cy="105" r="105" fill="url(#mrg-bg)" />

      {/* Grid overlay */}
      <rect x="0" y="0" width="210" height="210" fill="url(#mrg-grid)" clipPath="url(#mrg-clip)" />

      {/* Warm glow overlay */}
      <circle cx="105" cy="105" r="105" fill="url(#mrg-face-glow)" />

      {/* Suit / body */}
      <path
        d="M -8 218 L 40 154 Q 58 138 76 132 L 105 122 L 134 132 Q 152 138 170 154 L 218 218 Z"
        fill="#111111"
        clipPath="url(#mrg-clip)"
      />

      {/* Collar / tie hint */}
      <path
        d="M 92 132 L 105 122 L 118 132 L 110 150 L 105 143 L 100 150 Z"
        fill="#181818"
      />
      <path
        d="M 105 143 L 102 158 L 105 162 L 108 158 Z"
        fill="#1e1e1e"
      />

      {/* Head */}
      <circle cx="105" cy="84" r="41" fill="#181818" />

      {/* Face inner tone */}
      <ellipse cx="105" cy="81" rx="27" ry="30" fill="#1e1e1e" opacity="0.55" />

      {/* Glasses — left lens */}
      <rect x="74" y="76" width="21" height="9" rx="3.5" fill="none" stroke="#2e2e2e" strokeWidth="1.5" />
      {/* Glasses — right lens */}
      <rect x="115" y="76" width="21" height="9" rx="3.5" fill="none" stroke="#2e2e2e" strokeWidth="1.5" />
      {/* Glasses — bridge */}
      <line x1="95" y1="80.5" x2="115" y2="80.5" stroke="#2e2e2e" strokeWidth="1.5" />
      {/* Glasses — left arm */}
      <line x1="74" y1="80.5" x2="66" y2="80.5" stroke="#2e2e2e" strokeWidth="1.5" />
      {/* Glasses — right arm */}
      <line x1="136" y1="80.5" x2="144" y2="80.5" stroke="#2e2e2e" strokeWidth="1.5" />

      {/* Mouth — neutral, composed */}
      <path
        d="M 94 99 Q 105 104 116 99"
        stroke="#292929"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Accent ring on head */}
      <circle
        cx="105" cy="84" r="41"
        fill="none"
        stroke="rgba(249,115,22,0.16)"
        strokeWidth="1.5"
      />

      {/* Dashed arc — decorative technical detail */}
      <path
        d="M 76 60 A 41 41 0 0 1 134 60"
        fill="none"
        stroke="rgba(249,115,22,0.32)"
        strokeWidth="1"
        strokeDasharray="3 5"
        strokeLinecap="round"
      />

      {/* Bottom vignette */}
      <rect x="0" y="148" width="210" height="62" fill="url(#mrg-vignette)" clipPath="url(#mrg-clip)" />
    </svg>
  )
}

export default function MrGrillSection() {
  return (
    <>
      <style>{STYLES}</style>

      <section
        className="mrg-section"
        style={{
          padding: '96px 24px',
          borderTop: '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle ambient blob behind the section */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: 420,
            height: 320,
            background: 'var(--accent-soft)',
            filter: 'blur(100px)',
            borderRadius: '50%',
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: 1140, margin: '0 auto', position: 'relative' }}>
          <div
            className="mrg-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 3fr',
              gap: '72px',
              alignItems: 'center',
            }}
          >

            {/* ── Left: Avatar ──────────────────────────────────────── */}
            <div
              className="mrg-avatar-col"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 22,
              }}
            >
              {/* Portrait */}
              <div className="mrg-avatar-outer" style={{ position: 'relative' }}>
                {/* Outer drifting glow */}
                <div
                  className="mrg-glow-blob"
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: -36,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(249,115,22,0.28) 0%, rgba(249,115,22,0.06) 70%)',
                    filter: 'blur(22px)',
                    pointerEvents: 'none',
                  }}
                />
                {/* Inner tighter glow — drifts on a different phase */}
                <div
                  className="mrg-glow-blob-2"
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: -12,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(249,115,22,0.22) 0%, rgba(249,115,22,0.0) 65%)',
                    filter: 'blur(14px)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Circle frame */}
                <div
                  style={{
                    position: 'relative',
                    width: 210,
                    height: 210,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '1px solid var(--border-strong)',
                    boxShadow: '0 0 0 1px var(--border), 0 28px 64px -16px rgba(0,0,0,0.85)',
                  }}
                >
                  <AvatarIllustration />
                </div>

                {/* Online indicator */}
                <div
                  className="mrg-online-dot"
                  aria-label="Online"
                  style={{
                    position: 'absolute',
                    bottom: 14,
                    right: 14,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#22c55e',
                    border: '2.5px solid var(--bg)',
                  }}
                />
              </div>

              {/* Role badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '7px 14px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    flexShrink: 0,
                    boxShadow: '0 0 8px var(--accent-line)',
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--fg-dim)',
                    letterSpacing: '0.05em',
                  }}
                >
                  Senior System Design Interviewer
                </span>
              </div>

              {/* Name + status row */}
              <div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--fg-2)',
                    letterSpacing: '-0.025em',
                  }}
                >
                  Mr. Grill
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    marginTop: 6,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#22c55e',
                      boxShadow: '0 0 6px rgba(34,197,94,0.7)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12.5, color: 'var(--fg-dim)', letterSpacing: '0.01em' }}>
                    Online — Ready to interview
                  </span>
                </div>
              </div>
            </div>

            {/* ── Right: Content ─────────────────────────────────────── */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 28,
              }}
            >
              {/* Eyebrow */}
              <div
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 11,
                  letterSpacing: '.2em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                }}
              >
                Meet Mr. Grill
              </div>

              {/* Heading */}
              <h2
                className="mrg-heading"
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  lineHeight: 1.18,
                  letterSpacing: '-0.03em',
                  color: 'var(--fg-2)',
                  maxWidth: 510,
                }}
              >
                &ldquo;I&rsquo;m not here to test what you&rsquo;ve memorized.
                <br />
                I&rsquo;m here to understand how you think.&rdquo;
              </h2>

              {/* Body copy */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  maxWidth: 520,
                }}
              >
                <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--fg-muted)' }}>
                  Mr. Grill is DevGrill&rsquo;s AI interviewer, built to simulate the
                  experience of a senior engineer conducting a real technical interview.
                </p>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--fg-muted)' }}>
                  He reads your resume, understands the role you&rsquo;re applying for,
                  and generates interview questions tailored to your background&mdash;not
                  generic question banks. Throughout the interview, he&rsquo;ll challenge
                  assumptions, probe design decisions, and push deeper whenever an answer
                  feels incomplete.
                </p>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--fg-dim)', fontWeight: 500 }}>
                  No hints. No easy passes. Just honest practice.
                </p>
              </div>

              {/* Feature chips */}
              <div
                className="mrg-chips"
                style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}
              >
                {FEATURES.map((label) => (
                  <div
                    key={label}
                    className="mrg-chip"
                    style={{
                      padding: '7px 15px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: 'var(--fg-muted)',
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Callout card */}
              <div
                className="mrg-callout"
                style={{
                  padding: '20px 24px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderLeft: '2px solid rgba(249,115,22,0.45)',
                  borderRadius: 12,
                  maxWidth: 480,
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: 'var(--fg-dim)',
                    fontStyle: 'italic',
                    letterSpacing: '-0.005em',
                  }}
                >
                  &ldquo;The best interviews don&rsquo;t test memory.
                  <br />
                  They reveal how you think.&rdquo;
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  )
}
