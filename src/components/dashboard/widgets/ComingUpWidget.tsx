import type { Contact, Pod } from '../../../lib/types'
import { WidgetHeading } from './WidgetHeading'
import { SectionDivider } from './RadarWidget'

const PANEL: React.CSSProperties = {
  background: 'var(--surface-panel)',
  backdropFilter: 'var(--panel-blur)',
  WebkitBackdropFilter: 'var(--panel-blur)',
  border: 'var(--surface-panel-border)',
  borderRadius: 'var(--panel-radius)',
}

type UpcomingItem = { type: 'birthday' | 'follow-up'; contact: Contact; pod: Pod | null; daysUntil: number; label: string; sublabel: string; isOverdue?: boolean }

function UpcomingRow({ item, onClick }: { item: UpcomingItem; onClick: () => void }) {
  const isBirthday = item.type === 'birthday'
  const isToday = item.daysUntil === 0

  const rowBg = item.isOverdue
    ? 'hsla(0, 70%, 50%, 0.04)'
    : isBirthday
      ? 'hsla(30, 80%, 55%, 0.05)'
      : isToday ? 'hsla(150, 60%, 45%, 0.04)' : 'none'

  const timeColor = item.isOverdue
    ? '#DC2626'
    : isToday
      ? isBirthday ? 'hsla(30, 80%, 55%, 0.90)' : 'var(--color-accent)'
      : 'var(--color-text-tertiary)'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`interactive-row${isBirthday ? ' coming-up-birthday' : ''}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '12px 24px',
        background: rowBg,
        border: 'none',
        borderBottom: '1px solid var(--divider)',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      {/* Icon: cake for birthdays, dot for follow-ups */}
      {isBirthday ? (
        <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1 }} aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsla(30, 80%, 50%, 0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/>
            <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/>
            <path d="M2 21h20"/>
            <path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/>
            <path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/>
          </svg>
        </span>
      ) : (
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: item.isOverdue ? '#DC2626' : 'var(--color-accent)',
        }} />
      )}
      <div style={{
        fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)',
        flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
      }}>
        {item.contact.name}
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.label}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 500, flexShrink: 0, minWidth: 32, textAlign: 'right',
        color: timeColor,
      }}>
        {item.sublabel}
      </span>
      {item.pod && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--color-text-tertiary)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: item.pod.color ?? 'var(--color-text-tertiary)' }} />
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
  if (items.length === 0) return null

  // Sort overdue items to top, then by daysUntil ascending
  const sorted = [...items].sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1
    if (!a.isOverdue && b.isOverdue) return 1
    return a.daysUntil - b.daysUntil
  })

  return (
    <div style={{ marginBottom: 0 }}>
      <SectionDivider title="Coming Up" />
      <div style={{ ...PANEL, overflow: 'hidden' }}>
        {sorted.map((item, i) => (
          <UpcomingRow key={`${item.type}-${item.contact.id}-${i}`} item={item} onClick={() => onContactClick(item.contact)} />
        ))}
      </div>
    </div>
  )
}
