import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import type { Campaign, CampaignContact, CampaignStage, Contact, Interaction } from '../../lib/types'
import { HUMAN_TYPES } from '../../lib/types'
import { updateCampaignContact, logInteraction } from '../../lib/data'
import { contactEquityScore, scoreLabel } from '../../lib/equity'
import type { ScoreLabel } from '../../lib/equity'
import { CAMPAIGN_COMMITMENT_AMOUNT_FIELD, CAMPAIGN_SOURCE_STATUS_FIELD, getCampaignContactCampaignStatus, getCampaignContactCommitmentAmount, withMoneyField, withTextField } from '../../lib/campaignCommitments'
import { LP_TRACKER_FIELDS, lpTrackerDisplayValue } from '../../lib/lpTrackerFields'
import { useEscape } from '../../lib/escapeStack'
import { Avatar, CloseButton } from '../ui'
import { ChevronDown, ChevronRight, Phone, Mail, MessageSquare, Users } from 'lucide-react'
import { CampaignCommitmentInput } from './CampaignCommitmentInput'

interface Props {
  cc: CampaignContact
  contact: Contact
  stages: CampaignStage[]
  campaign: Campaign
  interactions: Interaction[]
  onUpdate: (updated: CampaignContact) => void
  onClose: () => void
}

const HEALTH_COLORS: Record<ScoreLabel, string> = {
  Thriving: 'var(--health-thriving)',
  Steady: 'var(--health-steady)',
  Cooling: 'var(--health-cooling)',
  Fading: 'var(--health-fading)',
}

const HEALTH_BG: Record<ScoreLabel, string> = {
  Thriving: 'var(--health-thriving-bg)',
  Steady: 'var(--health-steady-bg)',
  Cooling: 'var(--health-cooling-bg)',
  Fading: 'var(--health-fading-bg)',
}

const INTERACTION_COLORS: Record<string, string> = {
  call: 'var(--interaction-call)',
  email: 'var(--interaction-email)',
  text: 'var(--interaction-text)',
  meeting: 'var(--interaction-meeting)',
  note: 'var(--interaction-note)',
  intro: 'var(--interaction-intro)',
}

const DAY_MS = 24 * 60 * 60 * 1000
const LINK_CUSTOM_FIELD_KEYS = new Set(['companyLinkedIn', 'upworkLink'])

function relativeDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)
  if (diff < 1) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff}d ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  return `${Math.floor(diff / 30)}mo ago`
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return mobile
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function CampaignContactPanel({ cc, contact, stages, campaign, interactions, onUpdate, onClose }: Props) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const stableClose = useCallback(() => onClose(), [onClose])
  useEscape(stableClose)

  const [owner, setOwner] = useState(cc.owner ?? '')
  const [nextStep, setNextStep] = useState(cc.next_step ?? '')
  const [nextStepDue, setNextStepDue] = useState(cc.next_step_due ?? '')
  const [notes, setNotes] = useState(cc.notes ?? '')
  const [campaignStatus, setCampaignStatus] = useState(getCampaignContactCampaignStatus(cc) ?? '')
  const [stageOpen, setStageOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [closing, setClosing] = useState(false)
  const [loggingType, setLoggingType] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  const sortedStages = [...stages].sort((a, b) => a.order - b.order)
  const contactCustomFields =
    contact.custom_fields && typeof contact.custom_fields === 'object' && !Array.isArray(contact.custom_fields)
      ? contact.custom_fields as Record<string, unknown>
      : {}
  const customField = (key: string) => lpTrackerDisplayValue(contactCustomFields[key])
  const hasCustomField = (key: string) =>
    Object.prototype.hasOwnProperty.call(contactCustomFields, key) && customField(key).trim().length > 0

  const equityScore = contactEquityScore(interactions)
  const label = scoreLabel(equityScore)
  const healthColor = HEALTH_COLORS[label]
  const healthBg = HEALTH_BG[label]

  const humanInteractions = interactions
    .filter(i => (HUMAN_TYPES as string[]).includes(i.type))
    .slice(0, 3)

  const lastContactDate = humanInteractions.find(i => i.type !== 'note')?.date

  useEffect(() => {
    setCampaignStatus(getCampaignContactCampaignStatus(cc) ?? '')
  }, [cc.id, cc.custom_fields])

  const daysInStage = cc.moved_at
    ? Math.floor((Date.now() - new Date(cc.moved_at).getTime()) / DAY_MS)
    : 0

  function flashSaved() {
    setSaveStatus('saved')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaveStatus('idle'), 1500)
  }

  async function handleFieldSave(field: string, value: string | null) {
    setSaveStatus('saving')
    try {
      const updated = await updateCampaignContact(cc.id, { [field]: value || null })
      onUpdate(updated)
      flashSaved()
    } catch {
      setSaveStatus('error')
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  async function handleStageChange(stageId: string) {
    setSaveStatus('saving')
    try {
      const now = new Date().toISOString()
      const updated = await updateCampaignContact(cc.id, { stage_id: stageId, moved_at: now })
      onUpdate(updated)
      flashSaved()
    } catch {
      setSaveStatus('error')
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  async function handleCommitmentSave(amount: number | null) {
    setSaveStatus('saving')
    try {
      const updated = await updateCampaignContact(cc.id, {
        custom_fields: withMoneyField(cc.custom_fields, CAMPAIGN_COMMITMENT_AMOUNT_FIELD, amount),
      })
      onUpdate(updated)
      flashSaved()
    } catch {
      setSaveStatus('error')
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => setSaveStatus('idle'), 3000)
      throw new Error('Commitment amount save failed')
    }
  }

  async function handleCampaignStatusSave(value: string | null) {
    setSaveStatus('saving')
    try {
      const updated = await updateCampaignContact(cc.id, {
        custom_fields: withTextField(cc.custom_fields, CAMPAIGN_SOURCE_STATUS_FIELD, value),
      })
      onUpdate(updated)
      flashSaved()
    } catch {
      setSaveStatus('error')
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  async function handleQuickLog(type: string) {
    setLoggingType(type)
    try {
      await logInteraction(contact.id, {
        type: type as any,
        date: new Date().toISOString().split('T')[0],
        notes: null,
        summary: null,
        source: 'Manual' as const,
        email_link: null,
        granola_link: null,
        event_detail: null,
        actor: null,
      })
      flashSaved()
    } catch {
      setSaveStatus('error')
    } finally {
      setLoggingType(null)
    }
  }

  function handleClose() {
    setClosing(true)
    setTimeout(onClose, 200)
  }

  const currentStage = stages.find(s => s.id === cc.stage_id)

  useEffect(() => {
    setOwner(cc.owner ?? '')
    setNextStep(cc.next_step ?? '')
    setNextStepDue(cc.next_step_due ?? '')
    setNotes(cc.notes ?? '')
  }, [cc.id, cc.owner, cc.next_step, cc.next_step_due, cc.notes])

  // Horizontal padding adapts to screen size
  const px = isMobile ? 20 : 24

  return (
    <>
      <div
        role="presentation"
        onClick={handleClose}
        className="ccp-backdrop"
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.18)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          opacity: closing ? 0 : 1,
          transition: 'opacity 200ms',
        }}
      />
      <div
        role="dialog"
        aria-label={`${contact.name} - campaign details`}
        aria-modal="true"
        className={`ccp-panel ${closing ? 'ccp-closing' : ''} ${isMobile ? 'ccp-mobile' : 'ccp-desktop'}`}
      >
        {/* Drag handle - mobile only */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--edge-strong)' }} />
          </div>
        )}

        {/* Header */}
        <div style={{ padding: `${isMobile ? 12 : 20}px ${px}px 16px`, display: 'flex', alignItems: 'flex-start', gap: isMobile ? 12 : 14 }}>
          <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate(`/contact/${contact.id}`)}>
            <Avatar name={contact.name} size={isMobile ? 40 : 44} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 17 : 18, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', lineHeight: 1.2 }}>
              {contact.name}
            </div>
            {(contact.company || contact.role) && (
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 3 }}>
                {[contact.role, contact.company].filter(Boolean).join(' at ')}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="ccp-save-status" style={{
              fontSize: 11, fontWeight: 500, transition: 'opacity 200ms',
              opacity: saveStatus === 'idle' ? 0 : 1,
              color: saveStatus === 'error' ? 'var(--health-fading)' : saveStatus === 'saved' ? 'var(--health-thriving)' : 'var(--color-text-tertiary)',
            }}>
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed' : ''}
            </span>
            <CloseButton onClick={handleClose} size={isMobile ? 32 : 28} />
          </div>
        </div>

        {/* Health bar */}
        <div className="ccp-health-bar" style={{
          margin: `0 ${px}px 16px`,
          display: 'flex',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          alignItems: 'center', gap: isMobile ? 6 : 10,
          padding: isMobile ? '10px 12px' : '10px 14px',
          background: healthBg,
          borderRadius: 10,
          border: `1px solid ${healthColor}20`,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 13, fontWeight: 600,
            color: healthColor,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: healthColor }} />
            {label}
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Score {equityScore}
          </span>
          <span style={{ marginLeft: isMobile ? 0 : 'auto', fontSize: 11, color: 'var(--color-text-tertiary)', ...(isMobile ? { width: '100%' } : {}) }}>
            {lastContactDate ? `Last contact ${relativeDate(lastContactDate)}` : 'No interactions yet'}
          </span>
        </div>

        {/* Quick actions */}
        <div style={{ margin: `0 ${px}px 16px`, display: 'flex', gap: isMobile ? 6 : 8 }}>
          {[
            { type: 'call', icon: Phone, label: 'Call' },
            { type: 'email', icon: Mail, label: 'Email' },
            { type: 'text', icon: MessageSquare, label: 'Text' },
            { type: 'meeting', icon: Users, label: 'Meeting' },
          ].map(({ type, icon: Icon, label: actionLabel }) => (
            <button
              key={type}
              type="button"
              onClick={() => handleQuickLog(type)}
              disabled={loggingType !== null}
              className="ccp-action-btn"
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: isMobile ? '10px 4px' : '8px 4px',
                minHeight: isMobile ? 44 : undefined,
                borderRadius: 8,
                border: '1px solid var(--edge)',
                background: loggingType === type ? 'var(--tint-hover)' : 'transparent',
                cursor: loggingType ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                color: INTERACTION_COLORS[type] ?? 'var(--color-text-secondary)',
                transition: 'background 120ms, border-color 120ms',
              }}
            >
              <Icon size={isMobile ? 18 : 16} strokeWidth={1.8} />
              <span style={{ fontSize: isMobile ? 11 : 10, fontWeight: 500, letterSpacing: '0.02em' }}>
                Log {actionLabel}
              </span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: `0 ${px}px 24px` }}>
          {/* Recent interactions */}
          {humanInteractions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <SectionHeader>Recent Activity</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 2 : 6 }}>
                {humanInteractions.map(ix => (
                  <div key={ix.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: isMobile ? '8px 0' : '6px 0',
                    minHeight: isMobile ? 44 : undefined,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: INTERACTION_COLORS[ix.type] ?? 'var(--color-text-tertiary)',
                    }} />
                    <span style={{ fontSize: isMobile ? 13 : 12, fontWeight: 500, color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                      {ix.type}
                    </span>
                    {ix.summary && (
                      <span style={{
                        flex: 1, fontSize: isMobile ? 13 : 12, color: 'var(--color-text-tertiary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {ix.summary}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                      {relativeDate(ix.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campaign fields */}
          <div style={{ marginBottom: 20 }}>
            <SectionHeader>Pipeline</SectionHeader>

            {/* Stage */}
            <FieldRow label="Stage" mobile={isMobile}>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  aria-expanded={stageOpen}
                  aria-haspopup="listbox"
                  onClick={() => setStageOpen(!stageOpen)}
                  className="ccp-stage-btn"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                    fontSize: 13, fontWeight: 600,
                    border: '1px solid var(--edge)', borderRadius: 8,
                    padding: isMobile ? '9px 12px' : '7px 10px',
                    minHeight: isMobile ? 44 : undefined,
                    background: 'var(--tint)',
                    color: currentStage?.color ?? 'var(--color-text-primary)',
                    cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 120ms',
                  }}
                >
                  {currentStage?.color && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentStage.color, flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, textAlign: 'left' }}>{currentStage?.name ?? 'Select stage'}</span>
                  <ChevronDown size={13} style={{
                    color: 'var(--color-text-tertiary)',
                    transition: 'transform 150ms',
                    transform: stageOpen ? 'rotate(180deg)' : 'none',
                  }} />
                </button>
                {stageOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setStageOpen(false)} />
                    <div role="listbox" style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                      background: 'var(--surface-panel)', border: '1px solid var(--edge)',
                      borderRadius: 10, padding: 4, zIndex: 11,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    }}>
                      {sortedStages.map(s => {
                        const isActive = s.id === cc.stage_id
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onClick={() => { handleStageChange(s.id); setStageOpen(false) }}
                            className="ccp-dropdown-option"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                              textAlign: 'left',
                              padding: isMobile ? '10px 12px' : '7px 10px',
                              minHeight: isMobile ? 44 : undefined,
                              borderRadius: 6,
                              border: 'none', background: isActive ? 'var(--tint)' : 'transparent',
                              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                              color: s.color ?? 'var(--color-text-primary)',
                              fontWeight: isActive ? 600 : 400,
                            }}
                          >
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color ?? 'var(--color-text-tertiary)', flexShrink: 0 }} />
                            {s.name}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </FieldRow>

            {daysInStage > 0 && (
              <FieldRow label="In Stage" mobile={isMobile}>
                <span style={{
                  fontSize: 13, fontWeight: 500,
                  color: daysInStage >= 7 ? 'var(--health-cooling)' : 'var(--color-text-secondary)',
                }}>
                  {daysInStage}d
                </span>
              </FieldRow>
            )}

            <FieldRow label="Commitment Amount" mobile={isMobile}>
              <CampaignCommitmentInput
                value={getCampaignContactCommitmentAmount(cc)}
                onSave={handleCommitmentSave}
                placeholder="$0"
                style={isMobile ? { minHeight: 44 } : undefined}
              />
            </FieldRow>

            <FieldRow label="Campaign Status" mobile={isMobile}>
              <input
                type="text"
                value={campaignStatus}
                onChange={e => setCampaignStatus(e.target.value)}
                onBlur={() => handleCampaignStatusSave(campaignStatus)}
                placeholder="Add campaign status..."
                className="ccp-input"
                style={isMobile ? mobileInputStyle : inputStyle}
              />
            </FieldRow>

            <FieldRow label="Owner" mobile={isMobile}>
              <input
                type="text"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                onBlur={() => handleFieldSave('owner', owner)}
                placeholder="Assign owner..."
                className="ccp-input"
                style={isMobile ? mobileInputStyle : inputStyle}
              />
            </FieldRow>

            <FieldRow label="Next Step" mobile={isMobile}>
              <input
                type="text"
                value={nextStep}
                onChange={e => setNextStep(e.target.value)}
                onBlur={() => handleFieldSave('next_step', nextStep)}
                placeholder="What's next..."
                className="ccp-input"
                style={isMobile ? mobileInputStyle : inputStyle}
              />
            </FieldRow>

            <FieldRow label="Due" mobile={isMobile}>
              <input
                type="date"
                value={nextStepDue}
                onChange={e => { setNextStepDue(e.target.value); handleFieldSave('next_step_due', e.target.value) }}
                className="ccp-input"
                style={{ ...(isMobile ? mobileInputStyle : inputStyle), width: 'auto' }}
              />
            </FieldRow>

            <FieldRow label="Notes" mobile={isMobile}>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={() => handleFieldSave('notes', notes)}
                placeholder="Add notes..."
                rows={3}
                className="ccp-input"
                style={{ ...(isMobile ? mobileInputStyle : inputStyle), resize: 'vertical', minHeight: 64 }}
              />
            </FieldRow>
          </div>

          {/* Contact details */}
          <div>
            <SectionHeader>Contact</SectionHeader>
            {contact.email && <ReadonlyRow label="Email" value={contact.email} mobile={isMobile} />}
            {contact.phone && <ReadonlyRow label="Phone" value={contact.phone} mobile={isMobile} />}
            {contact.location && <ReadonlyRow label="Location" value={contact.location} mobile={isMobile} />}
            {contact.linkedin && <ReadonlyRow label="LinkedIn" value={contact.linkedin} link mobile={isMobile} />}
            {contact.spv_investor && contact.spv_investor.length > 0 && <ReadonlyRow label="SPV Investor" value={contact.spv_investor.join(', ')} mobile={isMobile} />}
            {LP_TRACKER_FIELDS.filter(field => hasCustomField(field.key)).map(field => (
              <ReadonlyRow
                key={field.key}
                label={field.label}
                value={customField(field.key)}
                link={LINK_CUSTOM_FIELD_KEYS.has(field.key)}
                mobile={isMobile}
              />
            ))}

            <button
              type="button"
              onClick={() => navigate(`/contact/${contact.id}`)}
              className="ccp-link-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                marginTop: 14, fontSize: 13, fontWeight: 500,
                color: 'var(--color-brand)', background: 'none', border: 'none',
                cursor: 'pointer',
                padding: isMobile ? '12px 0' : '4px 0',
                minHeight: isMobile ? 44 : undefined,
                fontFamily: 'inherit',
              }}
            >
              Open full record
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Safe area spacer for mobile */}
          {isMobile && <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />}
        </div>
      </div>

      <style>{`
        /* ── Panel positioning ──────────────────────────────────────────── */
        .ccp-desktop {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: 420px; max-width: 100vw;
          z-index: 401;
          background: var(--surface-panel);
          border-left: 1px solid var(--edge);
          box-shadow: -12px 0 40px rgba(0,0,0,0.10);
          display: flex; flex-direction: column;
          overflow: hidden;
          animation: ccpSlideInRight 300ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ccp-desktop.ccp-closing {
          animation: ccpSlideOutRight 200ms ease-in forwards;
        }

        .ccp-mobile {
          position: fixed; left: 0; right: 0; bottom: 0;
          max-height: 92vh;
          z-index: 401;
          background: var(--surface-panel);
          border-top: 1px solid var(--edge);
          border-radius: 16px 16px 0 0;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.12);
          display: flex; flex-direction: column;
          overflow: hidden;
          animation: ccpSlideInUp 350ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ccp-mobile.ccp-closing {
          animation: ccpSlideOutDown 200ms ease-in forwards;
        }

        /* ── Animations ────────────────────────────────────────────────── */
        @keyframes ccpSlideInRight {
          from { transform: translateX(100%); opacity: 0.5; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes ccpSlideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes ccpSlideInUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes ccpSlideOutDown {
          from { transform: translateY(0); }
          to { transform: translateY(100%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ccp-desktop, .ccp-mobile,
          .ccp-desktop.ccp-closing, .ccp-mobile.ccp-closing {
            animation: none !important;
          }
          .ccp-backdrop { transition: none !important; }
        }

        /* ── Interactive states ─────────────────────────────────────────── */
        .ccp-input:focus-visible {
          border-color: var(--color-brand) !important;
          outline: none;
          box-shadow: 0 0 0 2px rgba(52,177,93,0.15);
        }
        .ccp-stage-btn:focus-visible {
          border-color: var(--color-brand) !important;
          outline: none;
          box-shadow: 0 0 0 2px rgba(52,177,93,0.15);
        }
        .ccp-dropdown-option:hover {
          background: var(--tint) !important;
        }
        .ccp-action-btn:hover:not(:disabled) {
          background: var(--tint);
          border-color: var(--edge-strong);
        }
        .ccp-action-btn:active:not(:disabled) {
          background: var(--tint-hover);
          transform: scale(0.97);
        }
        .ccp-action-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px rgba(52,177,93,0.15);
        }
        .ccp-link-btn:hover {
          text-decoration: underline;
        }
        .ccp-link-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px rgba(52,177,93,0.15);
          border-radius: 4px;
        }

        /* Touch feedback for mobile */
        @media (max-width: 767px) {
          .ccp-action-btn:active:not(:disabled) {
            transform: scale(0.95);
            transition: transform 60ms;
          }
          .ccp-dropdown-option:active {
            background: var(--tint-hover) !important;
          }
        }
      `}</style>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 8,
  border: '1px solid var(--edge)', background: 'var(--tint)',
  color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color 120ms',
}

const mobileInputStyle: React.CSSProperties = {
  ...inputStyle,
  fontSize: 16, // prevents iOS zoom on focus
  padding: '10px 12px',
  minHeight: 44,
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600,
      color: 'var(--color-text-tertiary)',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      marginBottom: 4, marginTop: 4,
    }}>
      {children}
    </div>
  )
}

function FieldRow({ label, children, mobile }: { label: string; children: React.ReactNode; mobile?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: mobile ? '10px 0' : '8px 0',
      borderBottom: '1px solid var(--divider)',
    }}>
      <span style={{
        fontSize: 13,
        color: 'var(--color-text-secondary)',
        width: 80, flexShrink: 0,
        paddingTop: mobile ? 10 : 7,
      }}>
        {label}
      </span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function ReadonlyRow({ label, value, link, mobile }: { label: string; value: string; link?: boolean; mobile?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: mobile ? '10px 0' : '8px 0',
      borderBottom: '1px solid var(--divider)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', width: 80, flexShrink: 0 }}>
        {label}
      </span>
      {link ? (
        <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 13, color: 'var(--color-brand)', wordBreak: 'break-all' }}>
          {value}
        </a>
      ) : (
        <span style={{ fontSize: 13, color: 'var(--color-text-primary)', wordBreak: 'break-word' }}>
          {value}
        </span>
      )}
    </div>
  )
}
