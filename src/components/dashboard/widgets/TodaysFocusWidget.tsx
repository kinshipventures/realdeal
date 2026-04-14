import { useNavigate } from 'react-router'
import type { Contact, FocusItem } from '../../../lib/types'
import { daysSinceContact } from '../../../lib/equity'
import { Avatar } from '../../ui'
import { WidgetHeading } from './WidgetHeading'

function FocusCard({ item, onClick, featured }: { item: FocusItem; onClick: () => void; featured?: boolean }) {
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
      className={`widget-card${featured ? ' focus-card-featured' : ''}`}
      style={{
        flex: featured ? '1 1 100%' : 1,
        padding: featured ? '20px 22px' : '16px 18px',
        background: 'var(--surface-panel)',
        border: '1px solid var(--edge)',
        borderRadius: 14,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: featured ? 12 : 10, marginBottom: featured ? 10 : 8 }}>
        <Avatar name={item.contact.name} size={featured ? 36 : 28} variant="subtle" />
        <span style={{ fontSize: featured ? 17 : 14, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', flex: 1, letterSpacing: '-0.01em' }}>
          {item.contact.name}
        </span>
        <span style={{
          fontSize: featured ? 11 : 10, fontWeight: 600, color: 'var(--color-brand)',
          background: 'rgba(37,180,57,0.08)', padding: featured ? '4px 12px' : '3px 10px', borderRadius: 12, whiteSpace: 'nowrap',
        }}>
          {tagLabel}
        </span>
      </div>
      <div style={{ fontSize: featured ? 13 : 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
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
    <div style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <WidgetHeading title="today's focus" tooltip="Who you should reach out to today -- the people who'd most appreciate hearing from you." />
        <button
          type="button"
          onClick={() => navigate('/dashboard/nurturing?filter=focus')}
          className="see-all-link"
        >
          See all
        </button>
      </div>
      <div className="focus-cards" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {items.map((item, i) => (
          <FocusCard key={item.contact.id} item={item} onClick={() => onContactClick(item.contact)} featured={i === 0} />
        ))}
      </div>
    </div>
  )
}
