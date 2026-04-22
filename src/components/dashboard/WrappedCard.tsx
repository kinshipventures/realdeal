export interface WrappedInsight {
  type: 'people-reached' | 'top-pod' | 'most-connected'
  stat: string
  label: string
  sub: string
  color: string
  shiftColor: string
}

export function WrappedCard({ insights }: { insights: WrappedInsight[] }) {
  // Empty state — no interactions in the 7-day window
  if (insights.length === 0) {
    return (
      <div
        style={{
          borderRadius: 16,
          padding: '24px 20px',
          textAlign: 'center',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 24,
          background: 'linear-gradient(135deg, #25B439 0%, #00BFA5 100%)',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.12) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 18,
          position: 'relative', zIndex: 1,
        }}>
          Your week is quiet
        </div>
        <div style={{
          fontSize: 12, opacity: 0.70, marginTop: 8,
          position: 'relative', zIndex: 1,
        }}>
          Log an interaction to start your weekly dashboard.
        </div>
      </div>
    )
  }

  const current = insights[0]

  return (
    <div
      style={{
        borderRadius: 16,
        padding: '24px 20px',
        textAlign: 'center',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 24,
        background: `linear-gradient(135deg, ${current.color} 0%, ${current.shiftColor} 100%)`,
      }}
    >
      {/* Radial highlight overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.12) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* Big stat */}
      <div style={{
        fontFamily: 'var(--font-sans)', fontWeight: 900,
        fontSize: current.stat.length > 10 ? 32 : 48,
        letterSpacing: '-0.04em', lineHeight: 1,
        position: 'relative', zIndex: 1,
      }}>
        {current.stat}
      </div>

      {/* Label */}
      <div style={{
        fontSize: 12, fontWeight: 500, opacity: 0.75, marginTop: 8,
        position: 'relative', zIndex: 1,
      }}>
        {current.label}
      </div>

      {/* Sub-label */}
      <div style={{
        fontSize: 10, opacity: 0.50, marginTop: 4,
        position: 'relative', zIndex: 1,
      }}>
        {current.sub}
      </div>
    </div>
  )
}
