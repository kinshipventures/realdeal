import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Contact, Pod } from '../../lib/types'

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'rgba(37,180,57,0.12)', color: '#1A8A2A' },
  Pending: { bg: 'rgba(255,149,0,0.12)', color: '#CC7700' },
  Archived: { bg: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.45)' },
}

const PILL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 100,
  padding: '2px 10px',
  display: 'inline-block',
  lineHeight: '18px',
}

interface RecordHeaderProps {
  contact: Contact
  pods: Pod[]
  onUpdate: (data: Partial<Contact>) => void
}

export function RecordHeader({ contact, onUpdate }: RecordHeaderProps) {
  const navigate = useNavigate()
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(contact.name)

  const status = contact.status ?? 'Active'
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.Active

  function handleNameBlur(val: string) {
    const trimmed = val.trim()
    setEditingName(false)
    if (trimmed && trimmed !== contact.name) {
      setNameVal(trimmed)
      onUpdate({ name: trimmed })
    } else {
      setNameVal(contact.name)
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'Escape') {
      setNameVal(contact.name)
      setEditingName(false)
    }
  }

  const companySubtitle = contact.type === 'Contact' && (contact.role || contact.company) ? (
    <span>
      {contact.role && <span>{contact.role}</span>}
      {contact.role && contact.company && <span style={{ color: 'rgba(0,0,0,0.28)' }}> @ </span>}
      {contact.company && (
        contact.company_record_id ? (
          <span
            style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(0,0,0,0.2)' }}
            onClick={() => navigate(`/record/${contact.company_record_id}`)}
          >
            {contact.company}
          </span>
        ) : (
          <span>{contact.company}</span>
        )
      )}
    </span>
  ) : contact.type === 'Company' && (contact.industry || contact.domain) ? (
    <span>
      {contact.industry && <span>{contact.industry}</span>}
      {contact.industry && contact.domain && <span style={{ color: 'rgba(0,0,0,0.28)' }}> · </span>}
      {contact.domain && <span>{contact.domain}</span>}
    </span>
  ) : null

  const contactMethods = [
    contact.email ? { label: contact.email, href: `mailto:${contact.email}` } : null,
    contact.phone ? { label: contact.phone, href: `tel:${contact.phone}` } : null,
    contact.linkedin ? { label: 'LinkedIn', href: contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`, external: true } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; external?: boolean }>

  return (
    <div style={{
      background: 'rgba(255,255,255,0.92)',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      padding: '28px 32px 24px',
    }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 400,
          color: 'rgba(0,0,0,0.45)',
          fontFamily: 'inherit',
          marginBottom: 12,
          display: 'block',
        }}
      >
        ← Back
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        {editingName ? (
          <input
            autoFocus
            type="text"
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={e => handleNameBlur(e.target.value)}
            onKeyDown={handleNameKeyDown}
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: 'rgba(0,0,0,0.82)',
              background: 'var(--tint)',
              border: '1px solid var(--edge-strong)',
              borderRadius: 6,
              outline: 'none',
              padding: '2px 8px',
              minWidth: 200,
            }}
          />
        ) : (
          <div
            onClick={() => setEditingName(true)}
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: 'rgba(0,0,0,0.82)',
              cursor: 'text',
            }}
          >
            {nameVal}
          </div>
        )}

        <span style={{
          ...PILL_STYLE,
          background: 'rgba(0,0,0,0.06)',
          color: 'rgba(0,0,0,0.45)',
        }}>
          {contact.type}
        </span>

        <span style={{
          ...PILL_STYLE,
          background: statusStyle.bg,
          color: statusStyle.color,
        }}>
          {status}
        </span>
      </div>

      {companySubtitle && (
        <div style={{ fontSize: 13, fontWeight: 400, color: 'rgba(0,0,0,0.45)', marginBottom: 10 }}>
          {companySubtitle}
        </div>
      )}

      {contactMethods.length > 0 && (
        <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
          {contactMethods.map((m, i) => (
            <span key={m.href}>
              {i > 0 && <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.28)', padding: '0 6px' }}>·</span>}
              <a
                href={m.href}
                target={m.external ? '_blank' : undefined}
                rel={m.external ? 'noopener noreferrer' : undefined}
                style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', textDecoration: 'none' }}
              >
                {m.label}
              </a>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
