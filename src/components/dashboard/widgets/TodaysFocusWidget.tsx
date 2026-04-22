import type { Contact, FocusItem } from '../../../lib/types'
import { daysSinceContact } from '../../../lib/equity'
import { Avatar } from '../../ui'
import { WidgetHeading } from './WidgetHeading'

const PANEL: React.CSSProperties = {
  background: 'var(--surface-panel)',
  backdropFilter: 'var(--panel-blur)',
  WebkitBackdropFilter: 'var(--panel-blur)',
  border: 'var(--surface-panel-border)',
  borderRadius: 'var(--panel-radius)',
}

function FocusLead({ item, onClick }: { item: FocusItem; onClick: () => void }) {
  const days = daysSinceContact(item.contact)
  const reason = item.reason === 'overdue'
    ? days === null
      ? `You haven't reached out yet.`
      : `It's been ${days} days. That's not like you.`
    : `Might be a good time to check in.`
  const tagLabel = item.reason === 'overdue' ? 'reach out' : 'check in'

  return (
    <button
      type="button"
      onClick={onClick}
      className="widget-card focus-card-featured"
      style={{
        width: '100%',
        padding: '22px 24px',
        background: 'rgba(37,180,57,0.04)',
        border: 'none',
        borderBottom: '1px solid var(--divider)',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Avatar name={item.contact.name} size={40} variant="subtle" />
        <span style={{ fontSize: 21, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)', flex: 1, letterSpacing: '-0.02em' }}>
          {item.contact.name}
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-brand)',
          background: 'rgba(37,180,57,0.08)',
          padding: '4px 12px',
          borderRadius: 999,
          whiteSpace: 'nowrap',
        }}>
          {tagLabel}
        </span>
      </div>
      <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.55, maxWidth: '42ch' }}>
        {reason}
      </div>
      {item.pod && (
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {item.pod.name}
        </div>
      )}
    </button>
  )
}

function FocusRow({ item, onClick }: { item: FocusItem; onClick: () => void }) {
  const days = daysSinceContact(item.contact)
  const summary = item.reason === 'overdue'
    ? days === null
      ? 'No first touch yet'
      : `${days}d since last touch`
    : 'Ready for a check-in'

  return (
    <button
      type="button"
      onClick={onClick}
      className="interactive-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '14px 24px',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--divider)',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <Avatar name={item.contact.name} size={30} variant="subtle" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
          {item.contact.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
          {summary}
          {item.pod ? ` - ${item.pod.name}` : ''}
        </div>
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
        Open
      </span>
    </button>
  )
}

interface TodaysFocusWidgetProps {
  items: FocusItem[]
  onContactClick: (contact: Contact) => void
}

export function TodaysFocusWidget({ items, onContactClick }: TodaysFocusWidgetProps) {
  if (items.length === 0) return null

  const [lead, ...rest] = items

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <WidgetHeading title="today's focus" />
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {items.length} people worth your attention
        </span>
      </div>
      <div style={{ ...PANEL, overflow: 'hidden' }}>
        <FocusLead item={lead} onClick={() => onContactClick(lead.contact)} />
        {rest.map(item => (
          <FocusRow key={item.contact.id} item={item} onClick={() => onContactClick(item.contact)} />
        ))}
      </div>
    </div>
  )
}
