'use client'

export default function LoadingScreen({ message, subtext }: { message?: string; subtext?: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(0.7); opacity: 0; }
          50% { transform: scale(1); opacity: 1; }
        }
        @keyframes breatheCore {
          0%, 100% { box-shadow: 0 0 10px 2px var(--accent-line); }
          50% { box-shadow: 0 0 28px 8px var(--accent-line); }
        }
      `}</style>
      <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          background: 'var(--accent-soft)',
          animation: 'breathe 2.4s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 8,
          borderRadius: '50%',
          background: 'var(--accent-soft)',
          animation: 'breathe 2.4s ease-in-out infinite 0.4s',
        }} />
        <div style={{
          position: 'relative',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'var(--accent)',
          boxShadow: '0 0 20px 4px var(--accent-line)',
          animation: 'breatheCore 2.4s ease-in-out infinite',
        }} />
      </div>
      {message && (
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#e0e0e0', lineHeight: 1.5, margin: 0 }}>
            {message}
          </p>
          {subtext && (
            <p style={{ fontSize: 13, color: '#555', marginTop: 8, marginBottom: 0 }}>
              {subtext}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
