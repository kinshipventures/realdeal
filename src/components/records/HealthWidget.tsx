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
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 12,
  padding: '16px 20px',
  marginBottom: 12,
}

interface HealthWidgetProps {
  contact: Contact
  interactions: Interaction[]
  pods: Pod[]
}

export function HealthWidget({ interactions }: HealthWidgetProps) {
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
        color: 'rgba(0,0,0,0.82)',
        marginBottom: 14,
      }}>
        Relationship Health
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth}
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
            color: 'rgba(0,0,0,0.82)',
            lineHeight: 1,
          }}>
            {score}
          </div>
          <div style={{ fontSize: 13, fontWeight: 400, color, marginTop: 4 }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  )
}
