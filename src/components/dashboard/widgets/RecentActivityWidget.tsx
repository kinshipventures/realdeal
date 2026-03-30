import type { Contact, Interaction } from '../../../lib/types'
import { TYPE_ICONS } from '../../contacts/InteractionSection'
import { formatRelativeTime } from '../../../lib/utils'

const PANEL: React.CSSProperties = {
  background: 'var(--surface-panel)',
  backdropFilter: 'var(--panel-blur)',
  WebkitBackdropFilter: 'var(--panel-blur)',
  border: 'var(--surface-panel-border)',
  borderRadius: 'var(--panel-radius)',
}

function RecentActivityRow({ interaction, contact, onClick }: { interaction: Interaction; contact: Contact; onClick: () => void }) {
  const icon = TYPE_ICONS[interaction.type] ?? null
  const summary = interaction.summary || interaction.notes || null

  return (
    <button
      type="button"
      onClick={onClick}
      className="interactive-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '12px 24px',
        background: 'none', border: 'none',
        borderBottom: '1px solid var(--divider)',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div style={{ width: 14, height: 14, flexShrink: 0, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
          {contact.name}
        </div>
        {summary && (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {summary}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {formatRelativeTime(interaction.date)}
        </span>
        {interaction.source && (
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.04)', color: 'var(--color-text-tertiary)' }}>
            {interaction.source}
          </span>
        )}
      </div>
    </button>
  )
}

interface RecentActivityWidgetProps {
  items: Array<{ interaction: Interaction; contact: Contact }>
  onContactClick: (contact: Contact) => void
}

export function RecentActivityWidget({ items, onContactClick }: RecentActivityWidgetProps) {
  if (items.length === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em', margin: 0, marginBottom: 12 }}>
        recent activity
      </h2>
      <div style={{ ...PANEL, overflow: 'hidden' }}>
        {items.map(({ interaction, contact }) => (
          <RecentActivityRow key={interaction.id} interaction={interaction} contact={contact} onClick={() => onContactClick(contact)} />
        ))}
      </div>
    </div>
  )
}
