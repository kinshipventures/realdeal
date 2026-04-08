import { useState } from 'react'
import type { Contact } from '../../lib/types'
import { WIDGET_STYLE } from './shared'

interface Props {
  contact: Contact
  onUpdate: (data: Partial<Contact>) => void
}

const COMM_TAGS = ['Text only', 'Email OK', 'Voice notes', 'WhatsApp', 'Call preferred', 'No calls'] as const

export function RelationshipWidget({ contact, onUpdate }: Props) {
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

  // Parse existing comm preferences into tags
  const currentPrefs = (contact.communication_preferences ?? '').toLowerCase()
  const activeTags = COMM_TAGS.filter(t => currentPrefs.includes(t.toLowerCase()))
  const freeformPref = (contact.communication_preferences ?? '')
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(s => !COMM_TAGS.some(t => t.toLowerCase() === s.toLowerCase()))
    .join(', ')

  function toggleTag(tag: string) {
    const parts = (contact.communication_preferences ?? '')
      .split(/[,;]/)
      .map(s => s.trim())
      .filter(Boolean)

    const exists = parts.some(p => p.toLowerCase() === tag.toLowerCase())
    const next = exists
      ? parts.filter(p => p.toLowerCase() !== tag.toLowerCase())
      : [...parts, tag]

    onUpdate({ communication_preferences: next.join(', ') || null })
  }

  function textField(key: keyof Contact, label: string, placeholder: string) {
    const val = (contact[key] as string | null) ?? ''
    const editing = editingField === key

    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--color-text-secondary)',
          letterSpacing: '0.02em',
          marginBottom: 4,
          textTransform: 'uppercase',
        }}>
          {label}
        </div>
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
    )
  }

  return (
    <div style={WIDGET_STYLE}>
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginBottom: 14,
      }}>
        Relationship
      </div>

      {textField('relationship_context', 'Context', 'How you know them, shared history...')}
      {textField('intel_notes', 'Intel', 'Personal notes - life events, preferences, things to remember...')}

      {/* Communication preferences as tappable tags */}
      <div style={{ marginBottom: 8 }}>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--color-text-secondary)',
          letterSpacing: '0.02em',
          marginBottom: 6,
          textTransform: 'uppercase',
        }}>
          How to reach them
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {COMM_TAGS.map(tag => {
            const active = activeTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                style={{
                  fontSize: 12, fontWeight: 500,
                  padding: '4px 12px', borderRadius: 100,
                  border: active ? '1px solid var(--color-brand)' : '1px solid var(--edge)',
                  background: active ? 'rgba(37,180,57,0.08)' : 'transparent',
                  color: active ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.12s ease',
                }}
              >
                {tag}
              </button>
            )
          })}
        </div>
        {/* Freeform note below tags */}
        {editingField === 'comm_freeform' ? (
          <textarea
            autoFocus
            defaultValue={freeformPref}
            onBlur={e => {
              setEditingField(null)
              const tags = activeTags.join(', ')
              const free = e.target.value.trim()
              const combined = [tags, free].filter(Boolean).join(', ')
              if (combined !== (contact.communication_preferences ?? '')) {
                onUpdate({ communication_preferences: combined || null })
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.blur()
              if (e.key === 'Escape') { e.currentTarget.blur(); e.stopPropagation() }
            }}
            rows={2}
            style={{ ...inputStyle, marginTop: 8 }}
            placeholder="Other notes - e.g. 'bullet-point texts only', 'never reads email'..."
          />
        ) : (
          <div
            onClick={() => setEditingField('comm_freeform')}
            style={{
              fontSize: 12,
              color: freeformPref ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              cursor: 'text',
              marginTop: 8,
              lineHeight: '18px',
            }}
          >
            {freeformPref || 'Add notes...'}
          </div>
        )}
      </div>
    </div>
  )
}
