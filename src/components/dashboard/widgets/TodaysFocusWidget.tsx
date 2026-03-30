import { useNavigate } from 'react-router'
import type { Contact, FocusItem } from '../../../lib/types'
import { daysSinceContact } from '../../../lib/equity'
import { Avatar } from '../../ui'

function FocusCard({ item, onClick }: { item: FocusItem; onClick: () => void }) {
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
      style={{
        flex: 1,
        padding: '16px 18px',
        background: 'rgba(37,180,57,0.04)',
        borderRadius: 14,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: '0 1px 3px var(--divider)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px var(--divider)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px var(--divider)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Avatar name={item.contact.name} size={28} variant="subtle" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', flex: 1 }}>
          {item.contact.name}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: 'var(--color-brand)',
          background: 'rgba(37,180,57,0.08)', padding: '3px 10px', borderRadius: 12, whiteSpace: 'nowrap',
        }}>
          {tagLabel}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
        {reason}
      </div>
      {item.pod && (
        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {item.pod.name}
        </div>
      )}
    </button>
  )
}

interface TodaysFocusWidgetProps {
  items: FocusItem[]
  onContactClick: (contact: Contact) => void
}

export function TodaysFocusWidget({ items, onContactClick }: TodaysFocusWidgetProps) {
  const navigate = useNavigate()
  if (items.length === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
          today's focus
        </h2>
        <button
          type="button"
          onClick={() => navigate('/pulse/nurturing?filter=focus')}
          style={{ fontSize: 12, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
        >
          See all
        </button>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {items.map(item => (
          <FocusCard key={item.contact.id} item={item} onClick={() => onContactClick(item.contact)} />
        ))}
      </div>
    </div>
  )
}
