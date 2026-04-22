import type { Contact, FocusItem } from '../../../lib/types'
import { daysSinceContact } from '../../../lib/equity'
import { Avatar } from '../../ui'
import { SectionDivider } from './RadarWidget'

const PANEL: React.CSSProperties = {
  background: 'var(--surface-panel)',
  backdropFilter: 'var(--panel-blur)',
  WebkitBackdropFilter: 'var(--panel-blur)',
  border: 'var(--surface-panel-border)',
  borderRadius: 'var(--panel-radius)',
}

// Status badge - enov.one "IMPAIRED" / "STOP" style
function StatusBadge({ status }: { status: 'overdue' | 'check-in' }) {
  const isOverdue = status === 'overdue'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 10, fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: isOverdue ? '#dc2626' : 'var(--color-text-tertiary)',
      marginBottom: 6,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: isOverdue ? '#dc2626' : 'var(--color-text-tertiary)',
        flexShrink: 0,
      }} />
      {isOverdue ? 'Overdue' : 'Check in'}
    </div>
  )
}

// Sparkle "Ask & Explore" style button
function AskButton({ label = 'Log interaction', onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '10px 16px',
        background: 'var(--tint)',
        border: '1px solid var(--edge)',
        borderRadius: 10,
        fontSize: 12, fontWeight: 500,
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        fontFamily: 'inherit',
        transition: 'background 0.12s, border-color 0.12s',
        marginTop: 14,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(37,180,57,0.06)'
        e.currentTarget.style.borderColor = 'rgba(37,180,57,0.25)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--tint)'
        e.currentTarget.style.borderColor = 'var(--edge)'
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3L9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5z"/>
      </svg>
      {label}
    </button>
  )
}

function FocusLead({ item, onClick }: { item: FocusItem; onClick: () => void }) {
  const days = daysSinceContact(item.contact)
  const reason = item.reason === 'overdue'
    ? days === null
      ? `You haven't reached out yet.`
      : `It's been ${days} days. That's not like you.`
    : `Might be a good time to check in.`

  return (
    <div style={{
      padding: '20px 24px 0',
      borderBottom: '1px solid var(--divider)',
    }}>
      <StatusBadge status={item.reason === 'overdue' ? 'overdue' : 'check-in'} />
      <button
        type="button"
        onClick={onClick}
        style={{
          width: '100%', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Avatar name={item.contact.name} size={36} variant="subtle" />
          <span style={{ fontSize: 19, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', flex: 1, letterSpacing: '-0.02em' }}>
            {item.contact.name}
          </span>
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.55, maxWidth: '46ch', marginBottom: 10 }}>
          {reason}
        </div>
        {/* Based on tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          {item.pod && (
            <span style={{
              fontSize: 11, padding: '3px 9px', borderRadius: 999,
              background: 'var(--tint)', border: '1px solid var(--edge)',
              color: 'var(--color-text-secondary)', fontWeight: 500,
            }}>
              {item.pod.name}
            </span>
          )}
          {days !== null && (
            <span style={{
              fontSize: 11, padding: '3px 9px', borderRadius: 999,
              background: 'var(--tint)', border: '1px solid var(--edge)',
              color: 'var(--color-text-secondary)', fontWeight: 500,
            }}>
              {days}d since last touch
            </span>
          )}
        </div>
      </button>
      <AskButton label="Log interaction" onClick={onClick} />
      <div style={{ height: 20 }} />
    </div>
  )
}

function FocusRow({ item, onClick }: { item: FocusItem; onClick: () => void }) {
  const days = daysSinceContact(item.contact)

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
        padding: '13px 24px',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--divider)',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <Avatar name={item.contact.name} size={28} variant="subtle" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
          {item.contact.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.45 }}>
          {days !== null ? `${days}d` : 'No touch'}{item.pod ? ` - ${item.pod.name}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: item.reason === 'overdue' ? '#ef4444' : '#f59e0b',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
          {item.reason === 'overdue' ? 'Overdue' : 'Check in'}
        </span>
      </div>
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
      <SectionDivider title="Today's Focus" />
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          {items.length} people worth your attention
        </span>
      </div>
      <div style={{ ...PANEL, overflow: 'hidden' }}>
        <FocusLead item={lead} onClick={() => onContactClick(lead.contact)} />
        {rest.slice(0, 4).map(item => (
          <FocusRow key={item.contact.id} item={item} onClick={() => onContactClick(item.contact)} />
        ))}
      </div>
    </div>
  )
}
