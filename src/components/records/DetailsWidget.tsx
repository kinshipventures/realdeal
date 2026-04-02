import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import type { Contact } from '../../lib/types'

const WIDGET_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.92)',
  border: '1px solid var(--edge)',
  borderRadius: 12,
  padding: '16px 20px',
  marginBottom: 12,
}

interface DetailsWidgetProps {
  contact: Contact
  onUpdate: (data: Partial<Contact>) => void
  requiredFieldKeys?: Set<string>
}

export function DetailsWidget({ contact, onUpdate, requiredFieldKeys }: DetailsWidgetProps) {
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
    const isRequired = requiredFieldKeys?.has(key as string) ?? false
    const isMissingRequired = isRequired && !val

    const displayStyle: React.CSSProperties = isMissingRequired
      ? {
          fontSize: 13,
          fontWeight: 400,
          color: 'var(--text-muted)',
          cursor: 'text',
          minHeight: 20,
          lineHeight: '20px',
          borderBottom: '1px dashed var(--color-text-tertiary)',
          display: 'inline-block',
        }
      : {
          fontSize: 13,
          fontWeight: 400,
          color: val ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
          cursor: 'text',
          minHeight: 20,
          lineHeight: '20px',
        }

    function renderValue() {
      if (key === 'website' && val) {
        const href = val.startsWith('http') ? val : `https://${val}`
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ color: 'var(--color-text-primary)', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              {val}
            </a>
            <ExternalLink size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        )
      }
      if (isMissingRequired) return 'Add...'
      return val ?? '\u2014'
    }

    return (
      <div style={{ marginBottom: 14 }}>
        <div
          onClick={() => { if (key !== 'website' || !val) setEditingField(key) }}
          style={{
            fontSize: 11, fontWeight: 700,
            color: 'var(--color-text-secondary)',
            letterSpacing: '0.02em',
            marginBottom: 3,
            textTransform: 'uppercase',
            cursor: 'text',
          }}
        >
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
            style={displayStyle}
          >
            {renderValue()}
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

      {field('email', 'Email')}
      {field('email_2', 'Email 2')}
      {field('email_3', 'Email 3')}
      {field('website', 'Website')}
      {field('notes', 'Notes', true)}
    </div>
  )
}
