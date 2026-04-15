import { useState } from 'react'
import { MapChromeButton } from './MapPrimitives'

const LEGEND_KEY = 'realdeal:map-legend-dismissed'

const HEALTH_ITEMS = [
  { label: 'Thriving', color: 'var(--health-thriving)' },
  { label: 'Steady', color: 'var(--health-steady)' },
  { label: 'Cooling', color: 'var(--health-cooling)' },
  { label: 'Fading', color: 'var(--health-fading)' },
]

export function MapLegend() {
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(LEGEND_KEY))
  const [open, setOpen] = useState(!dismissed)

  function dismiss() {
    setOpen(false)
    setDismissed(true)
    localStorage.setItem(LEGEND_KEY, '1')
  }

  if (!open) {
    return (
      <MapChromeButton
        onClick={() => setOpen(true)}
        title="Show map guide"
        shape="circle"
        tone="tertiary"
        style={{
          position: 'absolute', bottom: 24, left: 24, zIndex: 20,
          fontSize: 14, fontWeight: 600,
        }}
      >
        ?
      </MapChromeButton>
    )
  }

  return (
    <div style={{
      position: 'absolute', bottom: 24, left: 24, zIndex: 20,
      maxWidth: 260,
      padding: '14px 16px',
      borderRadius: 12,
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--edge)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
      animation: 'modal-fade-in 0.3s ease-out',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em',
        }}>
          Reading the map
        </span>
        <button
          type="button"
          onClick={dismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-tertiary)', padding: 0,
            fontSize: 14, lineHeight: 1,
          }}
          aria-label="Dismiss guide"
        >
          x
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
          Each orb is a <strong>pod</strong> - a group of people you care about.
        </p>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
          The ring around each orb shows relationship health.
        </p>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
          Click any orb to see who's inside.
        </p>
      </div>

      <div style={{
        marginTop: 10, paddingTop: 8,
        borderTop: '1px solid var(--edge)',
        display: 'flex', flexWrap: 'wrap', gap: 6,
      }}>
        {HEALTH_ITEMS.map(h => (
          <span key={h.label} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 10, color: 'var(--color-text-tertiary)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: h.color, flexShrink: 0,
            }} />
            {h.label}
          </span>
        ))}
      </div>
    </div>
  )
}
