import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import type { Campaign, CampaignContact, CampaignStage, Contact } from '../../lib/types'
import { updateCampaignContact } from '../../lib/airtable'
import { useEscape } from '../../lib/escapeStack'
import { Avatar, CloseButton } from '../ui'
import { ExternalLink } from 'lucide-react'

interface Props {
  cc: CampaignContact
  contact: Contact
  stages: CampaignStage[]
  campaign: Campaign
  onUpdate: (updated: CampaignContact) => void
  onClose: () => void
}

export function CampaignContactPanel({ cc, contact, stages, campaign, onUpdate, onClose }: Props) {
  const navigate = useNavigate()
  const stableClose = useCallback(() => onClose(), [onClose])
  useEscape(stableClose)

  const [owner, setOwner] = useState(cc.owner ?? '')
  const [nextStep, setNextStep] = useState(cc.next_step ?? '')
  const [nextStepDue, setNextStepDue] = useState(cc.next_step_due ?? '')
  const [notes, setNotes] = useState(cc.notes ?? '')

  const sortedStages = [...stages].sort((a, b) => a.order - b.order)

  async function handleFieldSave(field: string, value: string | null) {
    const data: any = { [field]: value || null }
    const updated = await updateCampaignContact(cc.id, data)
    onUpdate(updated)
  }

  async function handleStageChange(stageId: string) {
    const now = new Date().toISOString()
    const updated = await updateCampaignContact(cc.id, { stage_id: stageId, moved_at: now })
    onUpdate(updated)
  }

  const currentStage = stages.find(s => s.id === cc.stage_id)

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.15)',
          backdropFilter: 'blur(2px)',
        }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '100vw',
        zIndex: 401, background: 'var(--surface-panel)',
        borderLeft: '1px solid var(--edge)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column',
        animation: 'panelSlideIn 200ms ease-out',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--edge)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={contact.name} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)' }}>
              {contact.name}
            </div>
            {(contact.company || contact.role) && (
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                {[contact.role, contact.company].filter(Boolean).join(' at ')}
              </div>
            )}
          </div>
          <CloseButton onClick={onClose} size={28} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {/* Campaign section */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>
              Campaign
            </div>

            {/* Stage */}
            <FieldRow label="Stage">
              <select
                value={cc.stage_id ?? ''}
                onChange={e => handleStageChange(e.target.value)}
                style={{
                  fontSize: 12, border: '1px solid var(--edge)', borderRadius: 6,
                  padding: '4px 8px', background: 'var(--tint)',
                  color: currentStage?.color ?? 'var(--color-text-primary)',
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
                }}
              >
                {sortedStages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </FieldRow>

            {/* Owner */}
            <FieldRow label="Owner">
              <input
                type="text"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                onBlur={() => handleFieldSave('owner', owner)}
                placeholder="Assign owner..."
                style={inputStyle}
              />
            </FieldRow>

            {/* Next step */}
            <FieldRow label="Next Step">
              <input
                type="text"
                value={nextStep}
                onChange={e => setNextStep(e.target.value)}
                onBlur={() => handleFieldSave('next_step', nextStep)}
                placeholder="What's next..."
                style={inputStyle}
              />
            </FieldRow>

            {/* Due */}
            <FieldRow label="Due">
              <input
                type="date"
                value={nextStepDue}
                onChange={e => { setNextStepDue(e.target.value); handleFieldSave('next_step_due', e.target.value) }}
                style={{ ...inputStyle, width: 'auto' }}
              />
            </FieldRow>

            {/* Notes */}
            <FieldRow label="Notes">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={() => handleFieldSave('notes', notes)}
                placeholder="Add notes..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
              />
            </FieldRow>

            {cc.moved_at && (
              <FieldRow label="Last Moved">
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {new Date(cc.moved_at).toLocaleDateString()}
                </span>
              </FieldRow>
            )}
          </div>

          {/* Contact section */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>
              Contact Details
            </div>

            {contact.email && <ReadonlyRow label="Email" value={contact.email} />}
            {contact.phone && <ReadonlyRow label="Phone" value={contact.phone} />}
            {contact.location && <ReadonlyRow label="Location" value={contact.location} />}
            {contact.linkedin && <ReadonlyRow label="LinkedIn" value={contact.linkedin} link />}
            {contact.notes && <ReadonlyRow label="Notes" value={contact.notes} />}

            <button
              type="button"
              onClick={() => navigate(`/contact/${contact.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                marginTop: 12, fontSize: 12, fontWeight: 500,
                color: 'var(--color-brand)', background: 'none', border: 'none',
                cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit',
              }}
            >
              Open full record
              <ExternalLink size={11} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes panelSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 12, padding: '5px 8px', borderRadius: 6,
  border: '1px solid var(--edge)', background: 'var(--tint)',
  color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', width: 72, flexShrink: 0, paddingTop: 5 }}>
        {label}
      </span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function ReadonlyRow({ label, value, link }: { label: string; value: string; link?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', width: 72, flexShrink: 0 }}>
        {label}
      </span>
      {link ? (
        <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--color-brand)', wordBreak: 'break-all' }}>
          {value}
        </a>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', wordBreak: 'break-word' }}>
          {value}
        </span>
      )}
    </div>
  )
}
