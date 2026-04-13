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

export function CloseButton({ onClick, 'aria-label': ariaLabel = 'Close', size = 32 }: CloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="close-trigger"
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'transparent',
        border: 'none',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 15,
        lineHeight: 1,
        flexShrink: 0,
        cursor: 'pointer',
      }}
    >
      <span style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--tint)',
        border: '1px solid var(--edge)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>x</span>
    </button>
  )
}

// ── ConfirmSheet ──────────────────────────────────────────────────────
// HIG-standard destructive action confirmation.

interface ConfirmSheetProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  if (!open) return null
  return (
    <div className="hig-confirm-backdrop" onClick={onCancel}>
      <div className="hig-confirm-sheet" onClick={e => e.stopPropagation()}>
        <h3 style={{
          margin: '0 0 8px',
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}>{title}</h3>
        <p style={{
          margin: '0 0 24px',
          fontSize: 15,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.45,
        }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              border: '1px solid var(--edge-strong)',
              background: 'var(--tint)',
              color: 'var(--color-text-primary)',
              fontSize: 15,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
              minHeight: 44,
            }}
          >{cancelLabel}</button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              border: 'none',
              background: destructive ? '#FF3B30' : 'var(--color-brand)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              minHeight: 44,
            }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
