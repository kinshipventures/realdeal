import { useNavigate } from 'react-router'
import type { Contact } from '../../lib/types'
import { Avatar } from '../ui'

interface ContactCardProps {
  contact: Contact
  onClick?: () => void
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  const navigate = useNavigate()

  const subtitle = contact.type === 'Company'
    ? contact.industry
    : contact.role

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation()
    navigate(`/record/${contact.id}`)
  }

  return (
    <div
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 20px',
        borderBottom: '1px solid var(--divider)',
        minHeight: 44,
        cursor: onClick ? 'pointer' : 'default',
        boxSizing: 'border-box',
      }}
    >
      <Avatar name={contact.name} size={34} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 400,
          color: 'rgba(0,0,0,0.82)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {contact.name}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 11,
            color: 'rgba(0,0,0,0.45)',
            marginTop: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {subtitle}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleOpen}
        style={{
          background: 'none',
          border: 'none',
          padding: '4px 0',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 700,
          color: '#25B439',
          fontFamily: 'inherit',
          flexShrink: 0,
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        Open
      </button>
    </div>
  )
}
