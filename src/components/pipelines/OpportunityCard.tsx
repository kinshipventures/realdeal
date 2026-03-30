import { Archive } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import type { Contact, Opportunity, OpportunityPriority } from '../../lib/types'
import { Avatar } from '../ui'

interface Props {
  opportunity: Opportunity
  contacts: Contact[]
  onPriorityChange: (id: string, priority: OpportunityPriority) => void
  onArchive: (id: string) => void
  onClick: () => void
  isDragOverlay?: boolean
}

const PRIORITY_STYLES: Record<OpportunityPriority, { bg: string; color: string; label: string }> = {
  high: { bg: 'hsla(0, 70%, 50%, 0.15)', color: 'hsla(0, 70%, 45%, 1)', label: 'High' },
  medium: { bg: 'hsla(40, 80%, 50%, 0.15)', color: 'hsla(40, 80%, 40%, 1)', label: 'Med' },
  low: { bg: 'hsla(210, 60%, 50%, 0.12)', color: 'hsla(210, 60%, 45%, 1)', label: 'Low' },
}

const PRIORITY_CYCLE: Record<OpportunityPriority, OpportunityPriority> = {
  low: 'medium',
  medium: 'high',
  high: 'low',
}

export function OpportunityCard({ opportunity, contacts, onPriorityChange, onArchive, onClick, isDragOverlay }: Props) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opportunity.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isDragOverlay ? 0.4 : 1,
  }

  const cardContacts = contacts.filter(c => opportunity.relationship_ids.includes(c.id))
  const displayContacts = cardContacts.slice(0, 3)
  const overflow = cardContacts.length - displayContacts.length

  function handlePriorityClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!opportunity.priority) {
      onPriorityChange(opportunity.id, 'low')
      return
    }
    onPriorityChange(opportunity.id, PRIORITY_CYCLE[opportunity.priority])
  }

  function handleArchiveClick(e: React.MouseEvent) {
    e.stopPropagation()
    onArchive(opportunity.id)
  }

  function handleAvatarClick(e: React.MouseEvent, contactId: string) {
    e.stopPropagation()
    navigate(`/record/${contactId}`)
  }

  const priority = opportunity.priority

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'var(--surface-panel)',
        borderRadius: 10,
        border: '1px solid var(--edge)',
        padding: '8px 16px',
        cursor: isDragOverlay ? 'grabbing' : 'grab',
        boxShadow: isDragOverlay ? '0 8px 24px rgba(0,0,0,0.12)' : undefined,
        position: 'relative',
        userSelect: 'none',
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="opp-card"
    >
      {/* Archive button */}
      <button
        onClick={handleArchiveClick}
        aria-label="Archive opportunity"
        className="opp-archive-btn"
        style={{
          position: 'absolute',
          top: 6,
          right: 8,
          padding: 4,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--color-text-tertiary)',
          display: 'flex',
          alignItems: 'center',
          opacity: 0,
          transition: 'opacity 120ms',
        }}
      >
        <Archive size={14} />
      </button>

      {/* Opportunity name */}
      <p
        style={{
          fontSize: 13,
          fontWeight: 400,
          color: 'var(--color-text-primary)',
          margin: 0,
          paddingRight: 24,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {opportunity.name}
      </p>

      {/* Contacts row + priority badge */}
      {(cardContacts.length > 0 || priority) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          {/* Avatars */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {displayContacts.map((contact, i) => (
              <div
                key={contact.id}
                onClick={e => handleAvatarClick(e, contact.id)}
                title={contact.name}
                style={{ marginLeft: i === 0 ? 0 : -8, cursor: 'pointer', zIndex: displayContacts.length - i }}
              >
                <Avatar name={contact.name} size={24} />
              </div>
            ))}
            {overflow > 0 && (
              <div
                style={{
                  marginLeft: -8,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--tint)',
                  border: '1px solid var(--edge)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500,
                }}
              >
                +{overflow}
              </div>
            )}
          </div>

          {/* Priority badge */}
          {priority && (
            <button
              onClick={handlePriorityClick}
              style={{
                padding: '2px 8px',
                borderRadius: 20,
                border: 'none',
                background: PRIORITY_STYLES[priority].bg,
                color: PRIORITY_STYLES[priority].color,
                fontSize: 11,
                fontWeight: 400,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {PRIORITY_STYLES[priority].label}
            </button>
          )}
        </div>
      )}

      <style>{`
        .opp-card:hover .opp-archive-btn { opacity: 1 !important; }
        .opp-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important; }
      `}</style>
    </div>
  )
}
