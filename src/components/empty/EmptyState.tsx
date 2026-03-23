interface EmptyStateProps {
  icon: React.ReactNode
  heading: string
  subtext?: string
  ctaLabel?: string
  onCta?: () => void
  orbColor?: string
  ghosts?: number
}

export function EmptyState({
  icon,
  heading,
  subtext,
  ctaLabel,
  onCta,
  orbColor = 'var(--color-brand)',
  ghosts = 0,
}: EmptyStateProps) {
  // orbColor may be a CSS var string or a hex value
  // For inline bg we use the hex path; CSS vars need a different approach
  const isVar = orbColor.startsWith('var(')
  const orbBg = isVar
    ? `color-mix(in srgb, ${orbColor} 12%, transparent)`
    : `${orbColor}1F`  // 12% opacity in hex (~0x1F = 31 ≈ 12%)

  const glowColor = isVar
    ? `color-mix(in srgb, ${orbColor} 12%, transparent)`
    : `${orbColor}20`

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '40px 20px',
        minHeight: 200,
        textAlign: 'center',
      }}
    >
      {/* Orb illustration */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: orbBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isVar ? orbColor : orbColor,
          boxShadow: `0 0 20px ${glowColor}`,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      {/* Heading */}
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: '-0.01em',
          color: 'var(--color-text-primary)',
          lineHeight: 1.3,
        }}
      >
        {heading}
      </div>

      {/* Subtext */}
      {subtext && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
            maxWidth: 260,
          }}
        >
          {subtext}
        </div>
      )}

      {/* Ghost hint cards */}
      {ghosts > 0 && (
        <div
          style={{
            width: '100%',
            maxWidth: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            margin: '4px 0',
          }}
        >
          {Array.from({ length: ghosts }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 44,
                border: '1px dashed rgba(0,0,0,0.10)',
                borderRadius: 10,
                background: 'rgba(0,0,0,0.02)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
                gap: 10,
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.04)', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ height: 7, borderRadius: 4, background: 'rgba(0,0,0,0.04)', width: `${55 + i * 12}%` }} />
                <div style={{ height: 7, borderRadius: 4, background: 'rgba(0,0,0,0.04)', width: `${35 + i * 8}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA button */}
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            borderRadius: 10,
            background: 'var(--color-brand)',
            color: 'white',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            transition: 'background 0.15s, transform 0.15s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'var(--color-brand-dark)'
            el.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'var(--color-brand)'
            el.style.transform = 'none'
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
