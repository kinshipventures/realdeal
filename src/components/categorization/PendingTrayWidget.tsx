import type { Contact } from '../../lib/types'

const PANEL: React.CSSProperties = {
  background: 'var(--surface-panel)',
  backdropFilter: 'var(--panel-blur)',
  WebkitBackdropFilter: 'var(--panel-blur)',
  border: 'var(--surface-panel-border)',
  borderRadius: 'var(--panel-radius)',
  padding: '16px 20px',
  marginBottom: 16,
}

interface PendingTrayWidgetProps {
  pendingContacts: Contact[]
  onReview: () => void
}

export function PendingTrayWidget({ pendingContacts, onReview }: PendingTrayWidgetProps) {
  const count = pendingContacts.length
  const previewNames = pendingContacts.slice(0, 3).map(c => c.name)

  return (
    <div style={PANEL}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 900,
            fontSize: 48,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: count === 0 ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
          }}>
            {count}
          </div>
          <div style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            marginTop: 4,
            textTransform: 'lowercase',
            letterSpacing: '0.01em',
          }}>
            intake tray
          </div>
          {previewNames.length > 0 && (
            <div style={{
              marginTop: 10,
              fontSize: 13,
              color: 'var(--color-text-tertiary)',
              lineHeight: 1.4,
            }}>
              {previewNames.join(', ')}
              {count > 3 && ` +${count - 3} more`}
            </div>
          )}
        </div>

        {count > 0 && (
          <button
            type="button"
            onClick={onReview}
            style={{
              background: 'var(--color-brand)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              minHeight: 44,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.01em',
              flexShrink: 0,
              alignSelf: 'center',
            }}
          >
            Review intake
          </button>
        )}
      </div>
    </div>
  )
}
