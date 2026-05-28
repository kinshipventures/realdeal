import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import type { Contact } from '../../lib/types'
import { getContactsByType } from '../../lib/data'
import { WIDGET_STYLE } from './shared'

interface Props {
  contact: Contact  // the Person record
}

export function AssociatedCompanyWidget({ contact }: Props) {
  const navigate = useNavigate()
  const [company, setCompany] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contact.company_record_id) { setLoading(false); return }
    getContactsByType('Company').then(all => {
      setCompany(all.find(c => c.id === contact.company_record_id) ?? null)
      setLoading(false)
    })
  }, [contact.company_record_id])

  if (!contact.company_record_id) return null

  return (
    <div style={WIDGET_STYLE}>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginBottom: 12,
      }}>
        Company
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '4px 0' }}>Loading...</div>
      ) : company ? (
        <div
          onClick={() => navigate(`/contact/${company.id}`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minHeight: 44,
            cursor: 'pointer',
            borderRadius: 8,
            padding: '4px 0',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--tint)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'rgba(37,180,57,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: '#1A8A2A',
            flexShrink: 0,
          }}>
            {company.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {company.name}
            </div>
            {company.industry && (
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{company.industry}</div>
            )}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '8px 0 4px' }}>
          {contact.company ?? 'Company not found'}
        </p>
      )}
    </div>
  )
}
