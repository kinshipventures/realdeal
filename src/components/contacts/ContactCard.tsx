import type { Contact } from '../../lib/types'
import { formatRelativeTime, avatarHue, initials } from '../../lib/utils'
import { isOverdue } from '../../lib/airtable'

interface ContactCardProps {
  contact: Contact
  onClick: () => void
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  const overdue = isOverdue(contact)
  const lastSeen = formatRelativeTime(contact.last_contacted_at)
  const hue = avatarHue(contact.name)

  return (
    <button
      onClick={onClick}
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
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
    >
      {/* Avatar initials */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: `hsla(${hue}, 40%, 88%, 0.9)`,
          border: `1px solid hsla(${hue}, 30%, 78%, 0.5)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: `hsla(${hue}, 40%, 30%, 0.85)`,
          flexShrink: 0,
          letterSpacing: '0.03em',
        }}
      >
        {initials(contact.name)}
      </div>

      {/* Name + company */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'rgba(0,0,0,0.82)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {contact.name}
        </div>
        {contact.company && (
          <div style={{
            fontSize: 11,
            color: 'rgba(0,0,0,0.38)',
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
      <div
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: overdue ? '#D93025' : 'rgba(0,0,0,0.28)',
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
        }}
      >
        {lastSeen}
      </div>

      {/* Overdue dot */}
      {overdue && (
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#FF3B30',
            flexShrink: 0,
            boxShadow: '0 0 6px rgba(255,59,48,0.45)',
          }}
        />
      )}
    </button>
  )
}
