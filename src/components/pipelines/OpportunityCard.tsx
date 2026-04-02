import { useState } from 'react'
import { Archive, MessageSquare } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router'
import type { Contact, Opportunity, OpportunityPriority } from '../../lib/types'
import { isOverdue } from '../../lib/airtable'
import { isDormant } from '../../lib/equity'
import { Avatar } from '../ui'

interface Props {
  opportunity: Opportunity
  contacts: Contact[]
  onPriorityChange: (id: string, priority: OpportunityPriority) => void
  onArchive: (id: string) => void
  onInlineNote?: (id: string, note: string) => void
  onClick: () => void
  isDragOverlay?: boolean
}

function getContactSignal(contact: Contact): { color: string; reason: string } | null {
  if (isOverdue(contact, 'monthly')) {
    return { color: '#FF3B30', reason: 'Consider reaching out' }
  }
  if (isDormant(contact)) {
    return { color: 'hsla(20, 80%, 45%, 1)', reason: 'No recent contact' }
  }
  return null
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

const STATUS_BADGE_STYLES: Partial<Record<string, { bg: string; color: string; label: string }>> = {
  won:      { bg: 'hsla(140, 60%, 45%, 0.15)', color: 'hsla(140, 60%, 35%, 1)', label: 'Won' },
  lost:     { bg: 'var(--tint)', color: 'var(--color-text-secondary)', label: 'Lost' },
  archived: { bg: 'var(--tint)', color: 'var(--text-muted)', label: 'Archived' },
}

export function OpportunityCard({ opportunity, contacts, onPriorityChange, onArchive, onInlineNote, onClick, isDragOverlay }: Props) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opportunity.id })
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteValue, setNoteValue] = useState('')

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
    navigate(`/contact/${contactId}`)
  }

  function handleNoteToggle(e: React.MouseEvent) {
    e.stopPropagation()
    setShowNoteInput(prev => !prev)
  }

  function handleNoteKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
    if (e.key === 'Escape') {
      setNoteValue('')
      setShowNoteInput(false)
    }
  }

  function handleNoteSave() {
    const trimmed = noteValue.trim()
    if (!trimmed) {
      setShowNoteInput(false)
      return
    }
    onInlineNote?.(opportunity.id, trimmed)
    setNoteValue('')
    setShowNoteInput(false)
  }

  const priority = opportunity.priority
  const statusBadge = opportunity.status !== 'open' ? STATUS_BADGE_STYLES[opportunity.status] : null

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
            {displayContacts.map((contact, i) => {
              const signal = getContactSignal(contact)
              return (
                <div
                  key={contact.id}
                  onClick={e => handleAvatarClick(e, contact.id)}
                  title={signal ? `${contact.name} — ${signal.reason}` : contact.name}
                  style={{ marginLeft: i === 0 ? 0 : -8, cursor: 'pointer', zIndex: displayContacts.length - i, position: 'relative' }}
                >
                  <Avatar name={contact.name} size={24} />
                  {signal && (
                    <div style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: signal.color,
                      border: '1.5px solid var(--surface-panel)',
                      zIndex: 1,
                    }} />
                  )}
                </div>
              )
            })}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Note toggle */}
            <button
              onClick={handleNoteToggle}
              aria-label="Add a note"
              className="opp-note-btn"
              style={{
                padding: 3,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: showNoteInput ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                opacity: showNoteInput ? 1 : 0,
                transition: 'opacity 120ms',
              }}
            >
              <MessageSquare size={13} />
            </button>

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
        </div>
      )}

      {/* Status badge for non-open statuses */}
      {statusBadge && (
        <div style={{ marginTop: 6 }}>
          <span style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
            background: statusBadge.bg,
            color: statusBadge.color,
            fontWeight: 400,
          }}>
            {statusBadge.label}
          </span>
        </div>
      )}

      {/* Inline note input */}
      {showNoteInput && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: 8 }}>
          <input
            autoFocus
            type="text"
            value={noteValue}
            onChange={e => setNoteValue(e.target.value)}
            onKeyDown={handleNoteKeyDown}
            onBlur={handleNoteSave}
            placeholder="Add a note..."
            style={{
              width: '100%',
              fontSize: 13,
              fontWeight: 400,
              padding: '5px 8px',
              borderRadius: 6,
              border: '1px solid var(--edge)',
              background: 'var(--tint)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      <style>{`
        .opp-card:hover .opp-archive-btn { opacity: 1 !important; }
        .opp-card:hover .opp-note-btn { opacity: 1 !important; }
        .opp-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important; }
      `}</style>
    </div>
  )
}
