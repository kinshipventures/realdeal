import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router'
import { Star } from 'lucide-react'
import type { CampaignContact, Contact } from '../../lib/types'
import type { ScoreLabel } from '../../lib/equity'
import { formatMoneyCompact, getCampaignContactCampaignStatus, getCampaignContactCommitmentAmount } from '../../lib/campaignCommitments'
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
  stagger?: number
}

const DAY_MS = 24 * 60 * 60 * 1000

const LABEL_COLORS: Record<ScoreLabel, string> = {
  Thriving: 'var(--health-thriving)',
  Steady: 'var(--health-steady)',
  Cooling: 'var(--health-cooling)',
  Fading: 'var(--health-fading)',
}

const LABEL_BG: Record<ScoreLabel, string> = {
  Thriving: 'rgba(37,180,57,0.10)',
  Steady: 'rgba(66,153,225,0.10)',
  Cooling: 'rgba(255,149,0,0.10)',
  Fading: 'rgba(229,57,53,0.10)',
}

function daysInStage(movedAt: string | null): number {
  if (!movedAt) return 0
  return Math.floor((Date.now() - new Date(movedAt).getTime()) / DAY_MS)
}

function stageTimeLabel(days: number): string {
  if (days < 1) return 'Just moved'
  return `${days}d in stage`
}

function isDueSoon(due: string | null): boolean {
  if (!due) return false
  const diff = new Date(due + 'T00:00:00').getTime() - Date.now()
  return diff < 3 * DAY_MS
}

export function CampaignContactCard({ cc, contact, equityScore, equityLabel, onClick, onTogglePriority, isDragOverlay, selected, onToggleSelect, visibleFields, stagger }: Props) {
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

  const dueSoon = isDueSoon(cc.next_step_due)
  const commitmentAmount = getCampaignContactCommitmentAmount(cc)
  const campaignStatus = getCampaignContactCampaignStatus(cc)

  const extras: Array<{ label: string; value: string; type: string }> = []
  if (show('commitment_amount') && commitmentAmount !== null) extras.push({ label: 'Commitment Amount', value: formatMoneyCompact(commitmentAmount), type: 'money' })
  if (show('campaign_status') && campaignStatus) extras.push({ label: 'Campaign Status', value: campaignStatus, type: 'text' })
  if (show('email') && contact.email) extras.push({ label: 'Email', value: contact.email, type: 'email' })
  if (show('role') && contact.role) extras.push({ label: 'Role', value: contact.role, type: 'text' })
  if (show('owner') && cc.owner) extras.push({ label: 'Owner', value: cc.owner, type: 'text' })
  if (show('next_step_due') && cc.next_step_due) extras.push({ label: 'Due', value: new Date(cc.next_step_due + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), type: 'due' })
  if (show('notes') && cc.notes) extras.push({ label: 'Notes', value: cc.notes, type: 'notes' })

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(stagger != null ? { '--stagger': stagger } as React.CSSProperties : {}),
        background: selected ? 'rgba(37,180,57,0.04)' : 'var(--surface-panel)',
        borderRadius: 10,
        border: selected ? '1px solid rgba(37,180,57,0.3)' : '1px solid var(--edge)',
        padding: '12px 14px',
        cursor: isDragOverlay ? 'grabbing' : 'grab',
        boxShadow: isDragOverlay ? '0 8px 24px rgba(0,0,0,0.12)' : undefined,
        userSelect: 'none',
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`cc-card${stagger != null ? ' cc-card-enter' : ''}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={handleAvatarClick}
          aria-label={`View ${contact.name}`}
          style={{ cursor: 'pointer', flexShrink: 0, background: 'none', border: 'none', padding: 0 }}
        >
          <Avatar name={contact.name} size={28} />
        </button>
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

      {/* Status row: equity pill + time in stage */}
      <div style={{
        marginTop: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 600, letterSpacing: '0.03em',
          color: dotColor,
          background: LABEL_BG[equityLabel],
          borderRadius: 4, padding: '2px 6px',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: dotColor, flexShrink: 0,
          }} />
          {equityLabel}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 500,
          color: isStale ? '#FF9500' : 'var(--color-text-tertiary)',
          letterSpacing: '0.02em',
        }}>
          {stageTimeLabel(days)}
        </span>
      </div>

      {/* Configurable metadata fields */}
      {extras.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {extras.map(({ label, value, type }) => (
            <div key={label} style={{
              fontSize: 11,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              ...(type === 'email' ? {
                color: 'var(--color-text-secondary)',
                opacity: 0.7,
              } : type === 'due' ? {
                display: 'inline-flex', alignItems: 'center', gap: 4,
              } : type === 'money' ? {
                display: 'inline-flex',
                width: 'fit-content',
                color: 'var(--color-text-primary)',
                background: 'rgba(37,180,57,0.08)',
                border: '1px solid rgba(37,180,57,0.16)',
                borderRadius: 999,
                padding: '2px 7px',
                fontWeight: 700,
              } : type === 'notes' ? {
                color: 'var(--color-text-tertiary)',
                fontStyle: 'italic',
                whiteSpace: 'normal',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              } : {
                color: 'var(--color-text-secondary)',
              }),
            }}>
              {type === 'due' ? (
                <span style={{
                  fontSize: 10, fontWeight: 500,
                  color: dueSoon ? '#FF9500' : 'var(--color-text-secondary)',
                  background: dueSoon ? 'rgba(255,149,0,0.08)' : 'var(--tint)',
                  borderRadius: 4, padding: '1px 6px',
                }}>
                  Due {value}
                </span>
              ) : (
                value
              )}
            </div>
          ))}
        </div>
      )}

      {/* Next step - distinct callout */}
      {show('next_step') && cc.next_step && (
        <div style={{
          marginTop: 8, fontSize: 11, fontWeight: 500,
          color: 'var(--color-text-primary)',
          background: 'var(--tint)', borderRadius: 6, padding: '5px 8px',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }}>
          {cc.next_step}
        </div>
      )}

      <style>{`
        .cc-card:hover .cc-select { opacity: 1 !important; }
        .cc-card:hover .cc-star { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
