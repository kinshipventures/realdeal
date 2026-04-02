import type { Contact, Interaction, Pod } from '../../lib/types'
import { contactEquityScore, scoreLabel } from '../../lib/equity'

const LABEL_COLORS: Record<string, string> = {
  Thriving: '#1A8A2A',
  Steady: '#25B439',
  Cooling: '#CC7700',
  Fading: '#FF3B30',
}

const WIDGET_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.92)',
  border: '1px solid var(--edge)',
  borderRadius: 12,
  padding: '16px 20px',
  marginBottom: 12,
}

interface HealthWidgetProps {
  contact: Contact
  interactions: Interaction[]
  pods: Pod[]
  upcomingBirthday?: { daysUntil: number; date: string } | null
  missingFieldCount?: number
}

export function HealthWidget({ interactions, upcomingBirthday, missingFieldCount }: HealthWidgetProps) {
  const score = contactEquityScore(interactions)
  const label = scoreLabel(score)
  const color = LABEL_COLORS[label] ?? LABEL_COLORS.Fading

  const size = 64
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference

  return (
    <div style={WIDGET_STYLE}>
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginBottom: 14,
      }}>
        Relationship Health
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--tint)" strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>

        <div>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            lineHeight: 1,
          }}>
            {score}
          </div>
          <div style={{ fontSize: 13, fontWeight: 400, color, marginTop: 4 }}>
            {label}
          </div>
        </div>
      </div>

      {(upcomingBirthday || (missingFieldCount != null && missingFieldCount > 0)) && (
        <div style={{ borderTop: '1px solid var(--divider)', marginTop: 12, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {upcomingBirthday && upcomingBirthday.daysUntil <= 14 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#25B439' }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx={12} cy={7} r={4} />
                <path d="M12 3v2M8 3l1 2M16 3l-1 2" />
              </svg>
              {upcomingBirthday.daysUntil === 0 ? 'Birthday today' : `Birthday ${upcomingBirthday.date}`}
            </div>
          )}
          {missingFieldCount != null && missingFieldCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1={12} y1={9} x2={12} y2={13} />
                <line x1={12} y1={17} x2={12.01} y2={17} />
              </svg>
              {missingFieldCount} required field{missingFieldCount > 1 ? 's' : ''} missing
            </div>
          )}
        </div>
      )}
    </div>
  )
}
