import { useState, useMemo } from 'react'
import type { Contact, Interaction, Pod } from '../../lib/types'
import { contactEquityScore, scoreLabel } from '../../lib/equity'
import { WIDGET_STYLE } from './shared'

const RING_STYLE = `
@keyframes ringDraw {
  from { stroke-dashoffset: 161.79; }
  to { stroke-dashoffset: var(--ring-offset, 161.79); }
}
@keyframes scoreFadeUp {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.equity-ring-fill {
  stroke-dasharray: 161.79;
  stroke-dashoffset: var(--ring-offset, 161.79);
  animation: ringDraw 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.equity-score-num {
  animation: scoreFadeUp 0.5s 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
`

const LABEL_COLORS: Record<string, string> = {
  Thriving: '#1A8A2A',
  Steady: '#2563eb',
  Cooling: '#CC7700',
  Fading: '#FF3B30',
}

interface Props {
  contact: Contact
  interactions: Interaction[]
  pods: Pod[]
  onUpdate: (data: Partial<Contact>) => void
}

export function RelationshipWidget({ contact, interactions, pods, onUpdate }: Props) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [showScoreTooltip, setShowScoreTooltip] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--tint)',
    border: '1px solid var(--edge-strong)',
    borderRadius: 6,
    color: 'var(--color-text-primary)',
    fontSize: 13,
    padding: '6px 10px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    resize: 'vertical',
  }

  function handleBlur(key: keyof Contact, val: string) {
    const trimmed = val.trim()
    const current = (contact[key] as string | null) ?? ''
    setEditingField(null)
    if (trimmed !== current) {
      onUpdate({ [key]: trimmed || null } as Partial<Contact>)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, key: keyof Contact) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.blur()
    if (e.key === 'Escape') {
      e.currentTarget.value = (contact[key] as string | null) ?? ''
      e.currentTarget.blur()
      e.stopPropagation()
    }
  }

  function textField(key: keyof Contact, label: string, placeholder: string) {
    const val = (contact[key] as string | null) ?? ''
    const editing = editingField === key

    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 2, padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
        <span
          onClick={() => setEditingField(key)}
          style={{
            fontSize: 13, fontWeight: 400,
            color: 'var(--color-text-secondary)',
            width: 100, flexShrink: 0,
            paddingTop: editing ? 7 : 0,
            cursor: 'text',
          }}
        >
          {label}
        </span>
        <div style={{ flex: 1 }}>
          {editing ? (
            <textarea
              autoFocus
              defaultValue={val}
              onBlur={e => handleBlur(key, e.target.value)}
              onKeyDown={e => onKeyDown(e, key)}
              rows={3}
              style={inputStyle}
              placeholder={placeholder}
            />
          ) : (
            <div
              onClick={() => setEditingField(key)}
              style={{
                fontSize: 13,
                color: val ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                cursor: 'text',
                minHeight: 20,
                lineHeight: '20px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {val || placeholder}
            </div>
          )}
        </div>
      </div>
    )
  }

  const score = contactEquityScore(interactions)
  const label = scoreLabel(score)
  const color = LABEL_COLORS[label] ?? LABEL_COLORS.Fading

  const scoreTooltip = useMemo(() => {
    const humanInteractions = interactions.filter(i => !['note', 'pod_change', 'field_update', 'categorization', 'pipeline_event', 'project_event', 'merge_event'].includes(i.type))
    const lastDate = humanInteractions.length > 0
      ? humanInteractions.reduce((a, b) => a.date > b.date ? a : b).date
      : null
    const pod = contact.list_ids.length > 0 ? pods.find(p => p.id === contact.primary_list_id || p.id === contact.list_ids[0]) : null
    const cadenceLabel = contact.cadence_override ?? pod?.cadence ?? 'monthly'
    const cadenceDays: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30, quarterly: 90 }
    const targetDays = cadenceDays[cadenceLabel] ?? 30
    if (!lastDate) return `No interactions yet. Target: every ${targetDays} days.`
    const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
    const overdue = daysSince > targetDays
    return `Last contact: ${daysSince === 0 ? 'today' : daysSince === 1 ? 'yesterday' : `${daysSince} days ago`}. ${overdue ? `Overdue by ${daysSince - targetDays}d` : `${targetDays - daysSince}d until due`} (${cadenceLabel} cadence).`
  }, [interactions, contact, pods])

  const ringSize = 56
  const strokeWidth = 4.5
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference

  const ringOffset = circumference - filled

  return (
    <div style={WIDGET_STYLE}>
      <style>{RING_STYLE}</style>
      {/* Health score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div
          style={{ position: 'relative', flexShrink: 0, cursor: 'default' }}
          onMouseEnter={() => setShowScoreTooltip(true)}
          onMouseLeave={() => setShowScoreTooltip(false)}
        >
        {showScoreTooltip && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-text-primary)', color: 'var(--bg)',
            fontSize: 11, fontWeight: 400, lineHeight: 1.5,
            padding: '7px 10px', borderRadius: 7,
            whiteSpace: 'nowrap', pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10,
            animation: 'tooltipFadeIn 120ms ease-out',
          }}>
            {scoreTooltip}
          </div>
        )}
        <svg
          width={ringSize} height={ringSize}
          style={{ transform: 'rotate(-90deg)', display: 'block', '--ring-offset': ringOffset } as React.CSSProperties}
        >
          <circle
            cx={ringSize / 2} cy={ringSize / 2} r={radius}
            fill="none" stroke="var(--tint)" strokeWidth={strokeWidth}
          />
          <circle
            className="equity-ring-fill"
            cx={ringSize / 2} cy={ringSize / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </svg>
        </div>
        <div>
          <div
            className="equity-score-num"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1,
            }}
          >
            {score}
          </div>
          <div style={{ fontSize: 13, fontWeight: 400, color, marginTop: 3 }}>
            {label}
          </div>
        </div>
      </div>

      {/* Relationship notes */}
      <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 8 }}>
        {textField('relationship_context', 'Context', 'How you know them, shared history...')}
        {textField('intel_notes', 'Intel', 'Personal notes, life events, things to remember...')}
        {textField('communication_preferences', 'Reach', 'Text only, prefers WhatsApp, never reads email...')}
      </div>
    </div>
  )
}
