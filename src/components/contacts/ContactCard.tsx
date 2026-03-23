import type { Contact } from '../../lib/types'
import { formatRelativeTime } from '../../lib/utils'
import { isOverdue } from '../../lib/airtable'
import { Avatar } from '../ui'

interface ContactCardProps {
  contact: Contact
  onClick: () => void
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  const overdue = isOverdue(contact)
  const lastSeen = formatRelativeTime(contact.last_contacted_at)

  return (
    <button
      type="button"
      onClick={onClick}
      className="interactive-row"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 20px',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <Avatar name={contact.name} size={34} />

      {/* Name + company */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {contact.name}
        </div>
        {contact.company && (
          <div style={{
            fontSize: 11,
            color: 'var(--color-text-secondary)',
            marginTop: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {contact.company}
          </div>
        )}
      </div>

      {/* Last contacted */}
      <div style={{
        fontSize: 10,
        fontWeight: 500,
        color: overdue ? '#D93025' : 'rgba(0,0,0,0.28)',
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}>
        {lastSeen}
      </div>

      {/* Overdue dot */}
      {overdue && (
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#FF3B30',
          flexShrink: 0,
          boxShadow: '0 0 6px rgba(255,59,48,0.45)',
        }} />
      )}
    </button>
  )
}
