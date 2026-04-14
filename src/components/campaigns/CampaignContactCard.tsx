import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router'
import { Star } from 'lucide-react'
import type { CampaignContact, Contact } from '../../lib/types'
import type { ScoreLabel } from '../../lib/equity'
import { Avatar } from '../ui'

interface Props {
  cc: CampaignContact
  contact: Contact
  equityScore: number
  equityLabel: ScoreLabel
  onClick: () => void
  onTogglePriority: (ccId: string) => void
  isDragOverlay?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
  visibleFields?: Set<string>
}

const DAY_MS = 24 * 60 * 60 * 1000

const LABEL_COLORS: Record<ScoreLabel, string> = {
  Thriving: 'var(--health-thriving)',
  Steady: 'var(--health-steady)',
  Cooling: 'var(--health-cooling)',
  Fading: 'var(--health-fading)',
}

function daysInStage(movedAt: string | null): number {
  if (!movedAt) return 0
  return Math.floor((Date.now() - new Date(movedAt).getTime()) / DAY_MS)
}

function stageTimeLabel(days: number): string {
  if (days < 1) return 'Just moved'
  return `${days}d in stage`
}

export function CampaignContactCard({ cc, contact, equityScore, equityLabel, onClick, onTogglePriority, isDragOverlay, selected, onToggleSelect, visibleFields }: Props) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cc.id })

  const days = daysInStage(cc.moved_at)
  const isStale = days >= 7
  const dotColor = LABEL_COLORS[equityLabel]
  const show = (f: string) => !visibleFields || visibleFields.has(f)

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isDragOverlay ? 0.4 : 1,
  }

  function handleAvatarClick(e: React.MouseEvent) {
    e.stopPropagation()
    navigate(`/contact/${contact.id}`)
  }

  function handleStarClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    onTogglePriority(cc.id)
  }

  const extras: Array<{ label: string; value: string }> = []
  if (show('email') && contact.email) extras.push({ label: 'Email', value: contact.email })
  if (show('role') && contact.role) extras.push({ label: 'Role', value: contact.role })
  if (show('owner') && cc.owner) extras.push({ label: 'Owner', value: cc.owner })
  if (show('next_step_due') && cc.next_step_due) extras.push({ label: 'Due', value: new Date(cc.next_step_due + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
  if (show('notes') && cc.notes) extras.push({ label: 'Notes', value: cc.notes })

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
            fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {contact.name}
          </div>
          {show('company') && contact.company && (
            <div style={{
              fontSize: 11, color: 'var(--color-text-tertiary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1,
            }}>
              {contact.company}
            </div>
          )}
        </div>
        {/* Priority star */}
        <div
          className="cc-star"
          onClick={handleStarClick}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            flexShrink: 0,
            cursor: 'pointer',
            opacity: cc.is_priority ? 1 : 0,
            transition: 'opacity 120ms',
          }}
        >
          <Star
            size={14}
            fill={cc.is_priority ? '#F5A623' : 'none'}
            stroke={cc.is_priority ? '#F5A623' : 'var(--color-text-tertiary)'}
            strokeWidth={1.5}
          />
        </div>
      </div>

      {/* Metadata row: equity dot + time in stage */}
      <div style={{
        marginTop: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 10,
        fontWeight: 500,
        color: 'var(--color-text-tertiary)',
        letterSpacing: '0.02em',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
          }} />
          {equityLabel}
        </span>
        <span style={{ color: isStale ? '#FF9500' : 'var(--color-text-tertiary)' }}>
          {stageTimeLabel(days)}
        </span>
      </div>

      {/* Configurable extra fields */}
      {extras.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {extras.map(({ label, value }) => (
            <div key={label} style={{
              fontSize: 11, color: 'var(--color-text-secondary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              <span style={{ color: 'var(--color-text-tertiary)' }}>{label}: </span>{value}
            </div>
          ))}
        </div>
      )}

      {show('next_step') && cc.next_step && (
        <div style={{
          marginTop: 6, fontSize: 11, color: 'var(--color-text-secondary)',
          background: 'var(--tint)', borderRadius: 5, padding: '3px 7px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {cc.next_step}
        </div>
      )}

      <style>{`
        .cc-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important; }
        .cc-card:hover .cc-select { opacity: 1 !important; }
        .cc-card:hover .cc-star { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
