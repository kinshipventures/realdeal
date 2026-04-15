import { useState } from 'react'
import type { Contact, Interaction, Pod } from '../../lib/types'
import { contactEquityScore, scoreLabel } from '../../lib/equity'
import { WIDGET_STYLE } from './shared'

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

  const ringSize = 56
  const strokeWidth = 4.5
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference

  return (
    <div style={WIDGET_STYLE}>
      {/* Health score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
          <circle
            cx={ringSize / 2} cy={ringSize / 2} r={radius}
            fill="none" stroke="var(--tint)" strokeWidth={strokeWidth}
          />
          <circle
            cx={ringSize / 2} cy={ringSize / 2} r={radius}
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
