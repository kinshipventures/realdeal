import type { Contact, Interaction } from '../../../lib/types'
import { TYPE_ICONS } from '../../contacts/InteractionSection'
import { formatRelativeTime } from '../../../lib/utils'
import { SectionDivider } from './RadarWidget'
import type { WrappedInsight } from '../WrappedCard'

const PANEL: React.CSSProperties = {
  background: 'var(--surface-panel)',
  backdropFilter: 'var(--panel-blur)',
  WebkitBackdropFilter: 'var(--panel-blur)',
  border: 'var(--surface-panel-border)',
  borderRadius: 'var(--panel-radius)',
}

function ActivityRow({ interaction, contact, onClick }: { interaction: Interaction; contact: Contact; onClick: () => void }) {
  const icon = TYPE_ICONS[interaction.type] ?? null
  const summary = interaction.summary || interaction.notes || null
  return (
    <button
      type="button"
      onClick={onClick}
      className="interactive-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', minHeight: 40, padding: '10px 16px',
        background: 'none', border: 'none',
        borderTop: '1px solid var(--divider)',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div style={{ width: 12, height: 12, flexShrink: 0, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
          {contact.name}
        </div>
        {summary && (
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {summary}
          </div>
        )}
      </div>
      <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
        {formatRelativeTime(interaction.date)}
      </span>
    </button>
  )
}

interface ThisWeekWidgetProps {
  insights: WrappedInsight[]
  activity: Array<{ interaction: Interaction; contact: Contact }>
  onContactClick: (contact: Contact) => void
}

export function ThisWeekWidget({ insights, activity, onContactClick }: ThisWeekWidgetProps) {
  if (insights.length === 0 && activity.length === 0) return null
  const topInsights = insights.slice(0, 2)

  return (
    <div>
      <SectionDivider title="This Week" />
      <div style={{ ...PANEL, overflow: 'hidden' }}>
        {topInsights.length > 0 && (
          <div style={{ display: 'flex', borderBottom: activity.length > 0 ? '1px solid var(--divider)' : 'none' }}>
            {topInsights.map((ins, i) => (
              <div key={ins.type} style={{ flex: 1, minWidth: 0, padding: '14px 16px', borderRight: i < topInsights.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                <div style={{
                  fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)',
                  color: 'var(--color-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {ins.stat}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)',
                  letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4,
                }}>
                  {ins.label}
                </div>
              </div>
            ))}
          </div>
        )}
        {activity.slice(0, 5).map(({ interaction, contact }) => (
          <ActivityRow key={interaction.id} interaction={interaction} contact={contact} onClick={() => onContactClick(contact)} />
        ))}
      </div>
    </div>
  )
}
