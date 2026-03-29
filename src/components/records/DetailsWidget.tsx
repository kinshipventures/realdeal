import { useState } from 'react'
import type { Contact } from '../../lib/types'

const WIDGET_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.92)',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 12,
  padding: '16px 20px',
  marginBottom: 12,
}

interface DetailsWidgetProps {
  contact: Contact
  onUpdate: (data: Partial<Contact>) => void
}

export function DetailsWidget({ contact, onUpdate }: DetailsWidgetProps) {
  const [editingField, setEditingField] = useState<keyof Contact | null>(null)

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
  }

  function handleBlur(key: keyof Contact, val: string) {
    const trimmed = val.trim()
    const current = (contact[key] as string | null) ?? ''
    setEditingField(null)
    if (trimmed !== current) {
      onUpdate({ [key]: trimmed || null } as Partial<Contact>)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, key: keyof Contact) {
    if (e.key === 'Enter' && e.currentTarget.tagName === 'INPUT') {
      e.currentTarget.blur()
    }
    if (e.key === 'Enter' && e.currentTarget.tagName === 'TEXTAREA' && (e.metaKey || e.ctrlKey)) {
      e.currentTarget.blur()
    }
    if (e.key === 'Escape') {
      const current = (contact[key] as string | null) ?? ''
      e.currentTarget.value = current
      e.currentTarget.blur()
      e.stopPropagation()
    }
  }

  function field(key: keyof Contact, label: string, multi = false) {
    const val = (contact[key] as string | null | undefined) ?? null
    const editing = editingField === key

    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: 'rgba(0,0,0,0.45)',
          letterSpacing: '0.02em',
          marginBottom: 3,
          textTransform: 'uppercase',
        }}>
          {label}
        </div>
        {editing ? (
          multi ? (
            <textarea
              autoFocus
              defaultValue={val ?? ''}
              onBlur={e => handleBlur(key, e.target.value)}
              onKeyDown={e => onKeyDown(e, key)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          ) : (
            <input
              autoFocus
              type="text"
              defaultValue={val ?? ''}
              onBlur={e => handleBlur(key, e.target.value)}
              onKeyDown={e => onKeyDown(e, key)}
              style={inputStyle}
            />
          )
        ) : (
          <div
            onClick={() => setEditingField(key)}
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: val ? 'rgba(0,0,0,0.82)' : 'rgba(0,0,0,0.28)',
              cursor: 'text',
              minHeight: 20,
              lineHeight: '20px',
            }}
          >
            {val ?? '\u2014'}
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
        color: 'rgba(0,0,0,0.82)',
        marginBottom: 14,
      }}>
        Details
      </div>

      {contact.type === 'Contact' && (
        <>
          {field('birthday', 'Birthday')}
          {field('gender', 'Gender')}
          {field('location', 'Location')}
          {field('linkedin', 'LinkedIn')}
          {field('country', 'Country')}
          {field('global_region', 'Region')}
          {field('contact_frequency', 'Contact Frequency')}
        </>
      )}

      {contact.type === 'Company' && (
        <>
          {field('stage', 'Stage')}
          {field('ticker', 'Ticker')}
          {field('domain', 'Domain')}
          {field('industry', 'Industry')}
        </>
      )}

      {field('website', 'Website')}
      {field('notes', 'Notes', true)}
    </div>
  )
}
