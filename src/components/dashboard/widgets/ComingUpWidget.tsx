import { useNavigate } from 'react-router'
import type { Contact, Pod } from '../../../lib/types'
import { WidgetHeading } from './WidgetHeading'

const PANEL: React.CSSProperties = {
  background: 'var(--surface-panel)',
  backdropFilter: 'var(--panel-blur)',
  WebkitBackdropFilter: 'var(--panel-blur)',
  border: 'var(--surface-panel-border)',
  borderRadius: 'var(--panel-radius)',
}

type UpcomingItem = { type: 'birthday' | 'follow-up'; contact: Contact; pod: Pod | null; daysUntil: number; label: string; sublabel: string; isOverdue?: boolean }

function UpcomingRow({ item, onClick }: { item: UpcomingItem; onClick: () => void }) {
  const dotColor = item.isOverdue ? '#DC2626' : item.type === 'birthday' ? 'hsla(30, 80%, 55%, 0.9)' : 'var(--color-brand)'
  const isToday = item.daysUntil === 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="interactive-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '12px 24px',
        background: item.isOverdue ? 'hsla(0, 70%, 50%, 0.04)' : isToday ? 'hsla(30, 80%, 55%, 0.06)' : 'none',
        border: 'none',
        borderBottom: '1px solid var(--divider)',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: dotColor }} />
      <div style={{
        fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)',
        flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.contact.name}
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.label}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 500, flexShrink: 0, minWidth: 32, textAlign: 'right',
        color: item.isOverdue ? '#DC2626' : isToday ? 'hsla(30, 80%, 55%, 0.90)' : 'var(--color-text-tertiary)',
      }}>
        {item.sublabel}
      </span>
      {item.pod && (
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {item.pod.name}
        </span>
      )}
    </button>
  )
}

interface ComingUpWidgetProps {
  items: UpcomingItem[]
  onContactClick: (contact: Contact) => void
}

export function ComingUpWidget({ items, onContactClick }: ComingUpWidgetProps) {
  const navigate = useNavigate()
  if (items.length === 0) return null

  // Sort overdue items to top, then by daysUntil ascending
  const sorted = [...items].sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1
    if (!a.isOverdue && b.isOverdue) return 1
    return a.daysUntil - b.daysUntil
  })

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <WidgetHeading title="coming up" tooltip="Upcoming birthdays and follow-ups in the next 14 days so you never miss a moment." />
        <button
          type="button"
          onClick={() => navigate('/pulse/nurturing?filter=dates')}
          className="see-all-link"
        >
          See all
        </button>
      </div>
      <div style={{ ...PANEL, overflow: 'hidden' }}>
        {sorted.map((item, i) => (
          <UpcomingRow key={`${item.type}-${item.contact.id}-${i}`} item={item} onClick={() => onContactClick(item.contact)} />
        ))}
      </div>
    </div>
  )
}
