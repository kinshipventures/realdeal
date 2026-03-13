import { avatarHue, initials } from '../lib/utils'

// ── Spinner ───────────────────────────────────────────────────────────────────
// Conic gradient sweep-fade — matches glass orb aesthetic.
// CSS animation in globals.css (.spinner / @keyframes orb-spin).

interface SpinnerProps {
  size?: number
  padding?: number  // wrapper padding for centering in panels
}

export function Spinner({ size = 20, padding = 40 }: SpinnerProps) {
  return (
    <div style={{ padding: `${padding}px 24px`, textAlign: 'center' }}>
      <div className="spinner" style={{ width: size, height: size, margin: '0 auto' }} />
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
// Initials-based avatar with deterministic hue from contact name.
// 'subtle' variant: muted background for dense list contexts (Dashboard OverdueRow).

interface AvatarProps {
  name: string
  size?: number
  variant?: 'default' | 'subtle'
}

export function Avatar({ name, size = 32, variant = 'default' }: AvatarProps) {
  const hue = avatarHue(name)
  const text = initials(name) || '?'
  const fontSize = size <= 32 ? 11 : 14

  const bg = variant === 'subtle'
    ? `hsla(${hue}, 55%, 70%, 0.35)`
    : `hsla(${hue}, 40%, 88%, 0.9)`

  const border = variant === 'subtle'
    ? 'none'
    : `1px solid hsla(${hue}, 30%, 78%, 0.5)`

  const color = variant === 'subtle'
    ? `hsla(${hue}, 45%, 30%, 0.85)`
    : `hsla(${hue}, 40%, 30%, 0.85)`

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: bg,
      border,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize,
      fontWeight: 600,
      color,
      flexShrink: 0,
      letterSpacing: '0.03em',
    }}>
      {text}
    </div>
  )
}

// ── CloseButton ───────────────────────────────────────────────────────────────
// Circular dismiss button. type="button" prevents accidental form submission.

interface CloseButtonProps {
  onClick: () => void
  'aria-label'?: string
  size?: number
}

export function CloseButton({ onClick, 'aria-label': ariaLabel = 'Close', size = 26 }: CloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="close-trigger"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.08)',
        color: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      ×
    </button>
  )
}
