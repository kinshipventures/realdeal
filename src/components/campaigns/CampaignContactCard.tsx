import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router'
import type { CampaignContact, Contact } from '../../lib/types'
import { Avatar } from '../ui'

interface Props {
  cc: CampaignContact
  contact: Contact
  onClick: () => void
  isDragOverlay?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

const STALE_MS = 7 * 24 * 60 * 60 * 1000

export function CampaignContactCard({ cc, contact, onClick, isDragOverlay, selected, onToggleSelect }: Props) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cc.id })

  const isStale = cc.moved_at && Date.now() - new Date(cc.moved_at).getTime() > STALE_MS

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isDragOverlay ? 0.4 : 1,
  }

  function handleAvatarClick(e: React.MouseEvent) {
    e.stopPropagation()
    navigate(`/contact/${contact.id}`)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: selected ? 'rgba(37,180,57,0.04)' : 'var(--surface-panel)',
        borderRadius: 10,
        border: selected ? '1px solid rgba(37,180,57,0.3)' : '1px solid var(--edge)',
        padding: '12px 14px',
        cursor: isDragOverlay ? 'grabbing' : 'grab',
        boxShadow: isDragOverlay ? '0 8px 24px rgba(0,0,0,0.12)' : undefined,
        userSelect: 'none',
        transition: 'border-color 120ms, background 120ms',
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cc-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Selection checkbox */}
        {onToggleSelect && (
          <div
            className="cc-select"
            onClick={(e) => { e.stopPropagation(); onToggleSelect(cc.id) }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: selected ? 'none' : '1.5px solid var(--edge-strong)',
              background: selected ? 'var(--color-brand)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              opacity: selected ? 1 : 0,
              transition: 'opacity 120ms, background 120ms',
            }}
          >
            {selected && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        )}
        <div onClick={handleAvatarClick} style={{ cursor: 'pointer', flexShrink: 0 }}>
          <Avatar name={contact.name} size={28} />
        </div>
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
              color: 'var(--color-text-tertiary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: 1,
            }}>
              {contact.company}
            </div>
          )}
        </div>
        {isStale && (
          <div
            title="Stalled 7d+"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#FF9500',
              boxShadow: '0 0 0 3px rgba(255,149,0,0.15)',
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {cc.next_step && (
        <div style={{
          marginTop: 6,
          fontSize: 11,
          color: 'var(--color-text-secondary)',
          background: 'var(--tint)',
          borderRadius: 5,
          padding: '3px 7px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {cc.next_step}
        </div>
      )}

      <style>{`
        .cc-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important; }
        .cc-card:hover .cc-select { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
