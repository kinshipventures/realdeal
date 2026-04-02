import { useState, useCallback, useRef, useEffect } from 'react'
import type { Contact, Interaction, Pod } from '../../lib/types'
import { getInteractions } from '../../lib/airtable'
import { contactEquityScore, contactEquityBreakdown, scoreLabel, type EquityBreakdown } from '../../lib/equity'

function daysUntilBirthday(birthday: string | null): number | null {
  if (!birthday) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [, month, day] = birthday.split('-').map(Number)
  const thisYear = new Date(today.getFullYear(), month - 1, day)
  if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1)
  return Math.ceil((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
import { updateContact, createContact, deleteContact, getCampaigns, addContactToCampaign } from '../../lib/airtable'
import { logSystemEvent } from '../../lib/timeline'
import { callEnrichFunction, isEnrichmentAllowed, computeFieldDiffs, applyEnrichment, ENRICHABLE_FIELDS } from '../../lib/enrichment'
import type { Campaign } from '../../lib/types'
import { avatarHue, initials } from '../../lib/utils'
import { useEscape } from '../../lib/escapeStack'
import { CloseButton } from '../ui'
import { InteractionSection } from './InteractionSection'

const RING_COLORS: Record<string, string> = {
  intro: '#C2185B',
  meeting: '#E65100',
  call: '#2E7D32',
  text: '#7B1FA2',
  email: '#1565C0',
}

function SegmentedEquityRing({ breakdown, score, size = 72 }: {
  breakdown: EquityBreakdown[]
  score: number
  size?: number
}) {
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  if (breakdown.length === 0) {
    return (
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--stroke-subtle)" strokeWidth={strokeWidth} />
      </svg>
    )
  }

  const totalScore = breakdown.reduce((s, b) => s + b.score, 0)
  const filledArc = (score / 100) * circumference

  let offset = 0
  const segments = breakdown.map((b, i) => {
    const isLast = i === breakdown.length - 1
    const arcLength = isLast
      ? filledArc - offset
      : (b.score / totalScore) * filledArc
    const segmentOffset = circumference - offset
    offset += arcLength
    return { ...b, arcLength, segmentOffset }
  })

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--stroke-subtle)" strokeWidth={strokeWidth} />
      {segments.map(seg => (
        <circle key={seg.type}
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={RING_COLORS[seg.type] ?? 'var(--edge-strong)'}
          strokeWidth={strokeWidth}
          strokeDasharray={`${seg.arcLength} ${circumference}`}
          strokeDashoffset={seg.segmentOffset}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  )
}

interface Props {
  contact: Contact | null  // null = create mode
  categoryId?: string      // only used for create mode
  onClose: () => void
  onSaved: (contact: Contact) => void
  onDeleted?: () => void
  pods?: Pod[]  // optional -- enrichment features disabled when not provided
}

type SaveError = { field: keyof Contact; value: string | null } | null

export function ContactDetail({ contact, categoryId, onClose, onSaved, onDeleted, pods = [] }: Props) {
  const isNew = contact === null

  const [draft, setDraft] = useState<Partial<Contact>>(
    contact ?? {
      name: '', email: null, phone: null, company: null, role: null,
      location: null, website: null, notes: null, recommended_by: null,
      specialization: null, past_clients: null,
      birthday: null, milestones: null, interests: null, relationship_context: null,
      category_ids: categoryId ? [categoryId] : [], list_ids: [],
    }
  )
  const [editingField, setEditingField] = useState<keyof Contact | null>(isNew ? 'name' : null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState<SaveError>(null)
  const saveGenRef = useRef(0)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showCampaignPicker, setShowCampaignPicker] = useState(false)
  const [addingToCampaign, setAddingToCampaign] = useState(false)
  const [addedCampaignId, setAddedCampaignId] = useState<string | null>(null)
  const [editFollowUpDate, setEditFollowUpDate] = useState('')
  const [editFollowUpAction, setEditFollowUpAction] = useState('')
  const [completingFollowUp, setCompletingFollowUp] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [enrichedFields, setEnrichedFields] = useState<Set<keyof Contact>>(new Set())
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const [suggestedUpdates, setSuggestedUpdates] = useState<Record<string, { current: string; suggested: string }>>({})
  const [acceptingField, setAcceptingField] = useState<string | null>(null)

  useEffect(() => {
    if (!contact) return
    getInteractions(contact.id).then(setInteractions)
  }, [contact?.id])

  useEffect(() => {
    getCampaigns().then(all => setCampaigns(all.filter(c => c.status === 'active')))
  }, [])

  async function handleAddToCampaign(campaignId: string) {
    if (!contact) return
    setAddingToCampaign(true)
    try {
      await addContactToCampaign(campaignId, contact.id)
      setShowCampaignPicker(false)
      setAddedCampaignId(campaignId)
      setTimeout(() => setAddedCampaignId(null), 2000)
    } finally {
      setAddingToCampaign(false)
    }
  }

  const equityScore = contactEquityScore(interactions)
  const equityBreakdown = contactEquityBreakdown(interactions)

  const handleClose = useCallback(() => onClose(), [onClose])
  useEscape(handleClose)

  // Auto-save on blur for existing contacts — generation counter prevents stale responses from overwriting
  function handleBlur(key: keyof Contact, value: string) {
    const v = value.trim() || null
    setDraft(prev => ({ ...prev, [key]: v }))
    setEditingField(null)
    if (!isNew && contact) {
      const gen = ++saveGenRef.current
      updateContact(contact.id, { [key]: v } as Partial<Contact>)
        .then(updated => {
          if (gen !== saveGenRef.current) return
          if (saveError?.field === key) setSaveError(null)
          onSaved(updated)
        })
        .catch(() => {
          if (gen !== saveGenRef.current) return
          setSaveError({ field: key, value: v })
        })
    }
  }

  function handleRetrySave() {
    if (!saveError || !contact) return
    updateContact(contact.id, { [saveError.field]: saveError.value } as Partial<Contact>)
      .then(updated => { setSaveError(null); onSaved(updated) })
      .catch(() => {})  // error state persists, user can retry again
  }

  // Field renderer — label + display/input based on editingField
  function field(key: keyof Contact, label: string, multi = false) {
    const val = (draft[key] as string | null | undefined) ?? null
    const editing = editingField === key
    const hasSaveError = saveError?.field === key
    const isEnriched = enrichedFields.has(key)
    const fieldKey = key as string

    const inputStyle = {
      width: '100%',
      background: 'var(--tint)',
      border: '1px solid var(--edge-strong)',
      borderRadius: 6,
      color: 'var(--color-text-primary)',
      fontSize: 13,
      padding: '6px 10px',
      outline: 'none',
      fontFamily: 'inherit',
    }

    // Enter commits single-line fields; Cmd+Enter commits textareas.
    // Escape reverts to the closure value (render-time original) and blurs.
    // stopPropagation prevents Escape from bubbling to the window escape stack.
    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
      const tag = e.currentTarget.tagName
      if (e.key === 'Enter' && tag === 'INPUT') {
        e.currentTarget.blur()
      }
      if (e.key === 'Enter' && tag === 'TEXTAREA' && (e.metaKey || e.ctrlKey)) {
        e.currentTarget.blur()
      }
      if (e.key === 'Escape') {
        e.currentTarget.value = val ?? ''
        e.currentTarget.blur()
        e.stopPropagation()
      }
    }

    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{
            fontSize: 10, fontWeight: 500,
            color: 'var(--color-text-tertiary)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {label}
          </div>
          {isEnriched && (
            <span
              title="AI-enriched"
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#6366F1',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
          )}
          {hasSaveError && (
            <button
              type="button"
              onClick={handleRetrySave}
              style={{
                fontSize: 10, fontWeight: 400,
                color: '#D93025',
                letterSpacing: '0.01em',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
              }}
            >
              failed to save — retry
            </button>
          )}
        </div>
        {editing ? (
          multi ? (
            <textarea
              autoFocus
              defaultValue={val ?? ''}
              onBlur={e => handleBlur(key, e.target.value)}
              onKeyDown={onKeyDown}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          ) : (
            <input
              autoFocus
              type="text"
              defaultValue={val ?? ''}
              onBlur={e => handleBlur(key, e.target.value)}
              onKeyDown={onKeyDown}
              style={inputStyle}
            />
          )
        ) : (
          <div
            onClick={() => setEditingField(key)}
            style={{
              fontSize: 13,
              color: val ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              cursor: 'text',
              padding: '2px 0',
              minHeight: 20,
              whiteSpace: multi ? 'pre-wrap' : 'nowrap',
              overflow: 'hidden',
              textOverflow: multi ? undefined : 'ellipsis',
              lineHeight: 1.5,
            }}
          >
            {val ?? `add ${label.toLowerCase()}`}
          </div>
        )}
        {suggestedUpdates[fieldKey] && (
          <div style={{ marginTop: 4, padding: '6px 8px', background: 'rgba(99,102,241,0.06)', borderRadius: 6, fontSize: 13 }}>
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: 2 }}>
              Suggested: <strong>{suggestedUpdates[fieldKey].suggested}</strong>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                disabled={acceptingField === fieldKey}
                onClick={async () => {
                  setAcceptingField(fieldKey)
                  const original = { [fieldKey]: suggestedUpdates[fieldKey].current }
                  const updated = await applyEnrichment(contact!.id, { [fieldKey]: suggestedUpdates[fieldKey].suggested }, original)
                  onSaved(updated)
                  setEnrichedFields(prev => new Set([...prev, key]))
                  setSuggestedUpdates(prev => { const next = { ...prev }; delete next[fieldKey]; return next })
                  setAcceptingField(null)
                }}
                style={{ fontSize: 12, color: '#6366F1', cursor: 'pointer', background: 'none', border: 'none', padding: 0, opacity: acceptingField === fieldKey ? 0.5 : 1 }}
              >
                {acceptingField === fieldKey ? 'Accepting...' : 'Accept'}
              </button>
              <button
                type="button"
                onClick={() => setSuggestedUpdates(prev => { const next = { ...prev }; delete next[fieldKey]; return next })}
                style={{ fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                Keep current
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  async function handleCreate() {
    if (!draft.name) return
    setCreating(true)
    setCreateError(false)
    try {
      const created = await createContact({
        name: draft.name,
        email: draft.email ?? null,
        phone: draft.phone ?? null,
        company: draft.company ?? null,
        role: draft.role ?? null,
        location: draft.location ?? null,
        website: draft.website ?? null,
        notes: draft.notes ?? null,
        recommended_by: draft.recommended_by ?? null,
        specialization: draft.specialization ?? null,
        past_clients: draft.past_clients ?? null,
        birthday: draft.birthday ?? null,
        milestones: draft.milestones ?? null,
        interests: draft.interests ?? null,
        relationship_context: draft.relationship_context ?? null,
        last_contacted_at: null,
        list_ids: [],
        category_ids: categoryId ? [categoryId] : [],
        primary_list_id: null, cadence_override: null,
        first_name: null, last_name: null, linkedin: null,
        country: null, global_region: null, gender: null,
        introduced_by: null, intel_notes: null, relationship_owner: null,
        contact_frequency: null, next_follow_up_date: null, next_action: null,
        kv_fund_investor: null, spv_investor: null, needs_review: false,
        type: 'Contact', status: 'Active',
        company_record_id: null, industry: null, stage: null,
        ticker: null, domain: null, email_2: null, email_3: null,
        custom_fields: {},
      })
      onSaved(created)
      onClose()
    } catch {
      setCreateError(true)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete() {
    if (!contact?.id) return
    setDeleting(true)
    try {
      await deleteContact(contact.id)
      onDeleted?.()
      onClose()
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const hue = avatarHue(draft.name ?? '')
  const nameInitials = initials(draft.name ?? '')

  const smallInputStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    background: 'var(--tint)',
    border: '1px solid var(--edge-strong)',
    borderRadius: 4,
    padding: '2px 6px',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontFamily: 'var(--font-serif)',
    fontWeight: 600,
    color: 'var(--color-text-tertiary)',
    marginBottom: 14,
    letterSpacing: '0.01em',
  }

  function linkedinField() {
    const val = (draft.linkedin as string | null) ?? null
    const editing = editingField === 'linkedin'
    const hasSaveError = saveError?.field === 'linkedin'
    const isEnriched = enrichedFields.has('linkedin')

    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{
            fontSize: 10, fontWeight: 500,
            color: 'var(--color-text-tertiary)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            LinkedIn
          </div>
          {isEnriched && (
            <span
              title="AI-enriched"
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#6366F1',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
          )}
          {hasSaveError && (
            <button
              type="button"
              onClick={handleRetrySave}
              style={{
                fontSize: 10, fontWeight: 400,
                color: '#D93025',
                letterSpacing: '0.01em',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
              }}
            >
              failed to save — retry
            </button>
          )}
        </div>
        {editing ? (
          <input
            autoFocus
            type="text"
            defaultValue={val ?? ''}
            placeholder="https://linkedin.com/in/..."
            onBlur={e => handleBlur('linkedin', e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') { e.currentTarget.value = val ?? ''; e.currentTarget.blur(); e.stopPropagation() }
            }}
            style={{
              width: '100%',
              background: 'var(--tint)',
              border: '1px solid var(--edge-strong)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              fontSize: 13,
              padding: '6px 10px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        ) : val && val.startsWith('http') ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', minHeight: 20 }}>
            <a
              href={val}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: '#1565C0', textDecoration: 'none' }}
            >
              {val.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '') || val}
            </a>
            <span
              onClick={() => setEditingField('linkedin')}
              style={{ fontSize: 10, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}
            >
              edit
            </span>
          </div>
        ) : (
          <div
            onClick={() => setEditingField('linkedin')}
            style={{
              fontSize: 13,
              color: val ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              cursor: 'text',
              padding: '2px 0',
              minHeight: 20,
            }}
          >
            {val ?? 'add linkedin'}
          </div>
        )}
        {suggestedUpdates['linkedin'] && (
          <div style={{ marginTop: 4, padding: '6px 8px', background: 'rgba(99,102,241,0.06)', borderRadius: 6, fontSize: 13 }}>
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: 2 }}>
              Suggested: <strong>{suggestedUpdates['linkedin'].suggested}</strong>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                disabled={acceptingField === 'linkedin'}
                onClick={async () => {
                  setAcceptingField('linkedin')
                  const original = { linkedin: suggestedUpdates['linkedin'].current }
                  const updated = await applyEnrichment(contact!.id, { linkedin: suggestedUpdates['linkedin'].suggested }, original)
                  onSaved(updated)
                  setEnrichedFields(prev => new Set([...prev, 'linkedin' as keyof Contact]))
                  setSuggestedUpdates(prev => { const next = { ...prev }; delete next['linkedin']; return next })
                  setAcceptingField(null)
                }}
                style={{ fontSize: 12, color: '#6366F1', cursor: 'pointer', background: 'none', border: 'none', padding: 0, opacity: acceptingField === 'linkedin' ? 0.5 : 1 }}
              >
                {acceptingField === 'linkedin' ? 'Accepting...' : 'Accept'}
              </button>
              <button
                type="button"
                onClick={() => setSuggestedUpdates(prev => { const next = { ...prev }; delete next['linkedin']; return next })}
                style={{ fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                Keep current
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  function birthdayField() {
    const val = (draft.birthday as string | null) ?? null
    const editing = editingField === 'birthday'
    const countdown = daysUntilBirthday(val)

    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 3 }}>
          Birthday
        </div>
        {editing ? (
          <input
            autoFocus
            type="date"
            defaultValue={val ?? ''}
            onBlur={e => handleBlur('birthday', e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') { e.currentTarget.value = val ?? ''; e.currentTarget.blur(); e.stopPropagation() }
            }}
            style={{
              width: '100%',
              background: 'var(--tint)',
              border: '1px solid var(--edge-strong)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              fontSize: 13,
              padding: '6px 10px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        ) : (
          <div
            onClick={() => setEditingField('birthday')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'text', padding: '2px 0', minHeight: 20 }}
          >
            <span style={{ fontSize: 13, color: val ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
              {val ?? 'add birthday'}
            </span>
            {countdown !== null && countdown <= 30 && (
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                {countdown === 0 ? 'today' : `in ${countdown} day${countdown === 1 ? '' : 's'}`}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  const hasFundTags = (draft.kv_fund_investor && draft.kv_fund_investor.length > 0) || (draft.spv_investor && draft.spv_investor.length > 0)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.25)',
          zIndex: 199,
        }}
      />

      {/* Centered modal */}
      <div
        className="modal-enter"
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          width: 'min(880px, calc(100vw - 48px))',
          maxHeight: 'calc(100vh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)',
          zIndex: 200,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 32px 20px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            {!isNew ? (
              confirmDelete ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{
                      fontSize: 11, fontWeight: 500,
                      color: deleting ? 'var(--color-text-tertiary)' : 'rgba(180,40,40,0.85)',
                      background: 'none', border: 'none',
                      cursor: deleting ? 'default' : 'pointer',
                      padding: 0, letterSpacing: '0.01em',
                    }}
                  >
                    {deleting ? 'Removing...' : 'Remove this person?'}
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>·</span>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      fontSize: 11, color: 'var(--text-muted)',
                      background: 'none', border: 'none',
                      cursor: 'pointer', padding: 0,
                    }}
                  >
                    cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="action-ghost"
                  onClick={() => setConfirmDelete(true)}
                  style={{ fontSize: 11, padding: 0, letterSpacing: '0.01em' }}
                >
                  Delete
                </button>
              )
            ) : <div />}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Enrich button -- only for existing contacts */}
              {!isNew && contact && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <button
                    type="button"
                    disabled={enriching || !isEnrichmentAllowed(contact, pods)}
                    title={!isEnrichmentAllowed(contact, pods) ? 'Enable enrichment on at least one pod to use this feature' : 'Auto-fill contact fields'}
                    onClick={async () => {
                      setEnriching(true)
                      setEnrichError(null)
                      const result = await callEnrichFunction(contact)
                      if (!result.ok || !result.data) {
                        setEnrichError(result.error ?? 'Enrichment failed')
                        setEnriching(false)
                        return
                      }
                      const { autoFill, suggestedUpdates: suggestions } = computeFieldDiffs(contact, result.data)

                      if (Object.keys(autoFill).length > 0) {
                        const originalValues: Record<string, string | null> = {}
                        for (const key of Object.keys(autoFill)) {
                          originalValues[key] = (contact as Record<string, unknown>)[key] as string | null ?? null
                        }
                        const updated = await applyEnrichment(contact.id, autoFill, originalValues)
                        onSaved(updated)
                        setEnrichedFields(prev => new Set([...prev, ...Object.keys(autoFill) as (keyof Contact)[]]))
                      }

                      setSuggestedUpdates(suggestions)
                      setEnriching(false)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 500,
                      padding: '4px 10px',
                      background: isEnrichmentAllowed(contact, pods) ? 'rgba(99,102,241,0.08)' : 'var(--tint)',
                      border: '1px solid ' + (isEnrichmentAllowed(contact, pods) ? 'rgba(99,102,241,0.2)' : 'var(--edge)'),
                      borderRadius: 6,
                      color: isEnrichmentAllowed(contact, pods) ? '#6366F1' : 'var(--color-text-tertiary)',
                      cursor: (enriching || !isEnrichmentAllowed(contact, pods)) ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      opacity: enriching ? 0.6 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    {enriching ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M21 12a9 9 0 11-6.219-8.56"/>
                        </svg>
                        Enriching...
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3l1.9 5.8L19 10.5l-5.1 3.7 1.9 5.8L12 16.5l-4.8 3.5 1.9-5.8L4 10.5l5.1-1.7z"/>
                        </svg>
                        Enrich
                      </>
                    )}
                  </button>
                  {enrichError && (
                    <div style={{ fontSize: 10, color: '#D93025' }}>{enrichError}</div>
                  )}
                </div>
              )}
              <CloseButton onClick={onClose} aria-label="Close contact" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Avatar */}
            <div style={{
              width: 48, height: 48,
              borderRadius: '50%',
              background: `hsla(${hue}, 40%, 88%, 0.9)`,
              border: `1px solid hsla(${hue}, 30%, 78%, 0.5)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600,
              color: `hsla(${hue}, 40%, 30%, 0.85)`,
              flexShrink: 0,
              letterSpacing: '0.03em',
            }}>
              {nameInitials || '?'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {editingField === 'name' ? (
                <input
                  autoFocus
                  type="text"
                  defaultValue={draft.name ?? ''}
                  placeholder="Name"
                  onBlur={e => handleBlur('name', e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') { e.currentTarget.value = draft.name ?? ''; e.currentTarget.blur(); e.stopPropagation() }
                  }}
                  style={{
                    width: '100%',
                    fontSize: 18, fontWeight: 600,
                    letterSpacing: '-0.02em',
                    background: 'var(--tint)',
                    border: '1px solid var(--edge-strong)',
                    borderRadius: 6,
                    color: 'var(--color-text-primary)',
                    padding: '3px 8px',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              ) : (
                <div
                  onClick={() => setEditingField('name')}
                  style={{
                    fontSize: 18, fontWeight: 600,
                    fontFamily: 'var(--font-serif)',
                    letterSpacing: '-0.02em',
                    color: draft.name ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    cursor: 'text',
                    padding: '2px 0',
                  }}
                >
                  {draft.name || 'Name'}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                {editingField === 'role' ? (
                  <input
                    autoFocus
                    defaultValue={draft.role ?? ''}
                    placeholder="Role"
                    onBlur={e => handleBlur('role', e.target.value)}
                    style={{ ...smallInputStyle, width: '45%' }}
                  />
                ) : (
                  <span
                    onClick={() => setEditingField('role')}
                    style={{ fontSize: 12, color: draft.role ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)', cursor: 'text' }}
                  >
                    {draft.role ?? 'Role'}
                  </span>
                )}
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>at</span>
                {editingField === 'company' ? (
                  <input
                    autoFocus
                    defaultValue={draft.company ?? ''}
                    placeholder="Company"
                    onBlur={e => handleBlur('company', e.target.value)}
                    style={{ ...smallInputStyle, flex: 1 }}
                  />
                ) : (
                  <span
                    onClick={() => setEditingField('company')}
                    style={{ fontSize: 12, color: draft.company ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)', cursor: 'text' }}
                  >
                    {draft.company ?? 'Company'}
                  </span>
                )}
              </div>
            </div>

            {/* Equity score in header — existing contacts only */}
            {!isNew && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <SegmentedEquityRing breakdown={equityBreakdown} score={equityScore} size={56} />
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}>
                    {equityScore}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', letterSpacing: '0.01em' }}>
                    {scoreLabel(equityScore)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isNew && equityBreakdown.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 12 }}>
              {equityBreakdown.map(b => (
                <div key={b.type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: RING_COLORS[b.type] }} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
                    {b.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Two-column body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

          {/* Left column — Timeline & Interactions */}
          <div style={{
            flex: 1, minWidth: 0,
            overflowY: 'auto',
            padding: '24px 32px',
            borderRight: '1px solid var(--divider)',
          }}>
            {!isNew && contact ? (
              <InteractionSection
                contact={contact}
                onContactUpdated={onSaved}
              />
            ) : (
              <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                Save this contact to start logging interactions.
              </div>
            )}
          </div>

          {/* Right column — Details */}
          <div style={{
            width: 320, flexShrink: 0,
            overflowY: 'auto',
            padding: '24px 32px',
          }}>
            <div style={{ marginBottom: 24 }}>
              <div style={sectionLabel}>contact info</div>
              {field('email', 'Email')}
              {field('phone', 'Phone')}
              {linkedinField()}
              {field('website', 'Website')}
              {field('location', 'Location')}
              {field('country', 'City / Country')}
              {birthdayField()}
              {draft.global_region && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 3 }}>Region</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{draft.global_region}</div>
                </div>
              )}
              {draft.gender && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 3 }}>Gender</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{draft.gender}</div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={sectionLabel}>relationship</div>
              {field('introduced_by', 'Introduced By')}
              {field('relationship_owner', 'Relationship Owner')}
              {draft.contact_frequency && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 3 }}>Contact Frequency</div>
                  <span style={{
                    fontSize: 12, fontWeight: 500,
                    padding: '3px 10px', borderRadius: 100,
                    background: 'rgba(37,180,57,0.08)',
                    color: 'var(--color-brand)',
                  }}>
                    {draft.contact_frequency}
                  </span>
                </div>
              )}
              {field('intel_notes', 'Intel / Notes', true)}
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={sectionLabel}>context</div>
              {field('specialization', 'Focus')}
              {field('interests', 'Interests', true)}
              {field('relationship_context', 'Context', true)}
              {field('notes', 'Notes', true)}
            </div>

            {hasFundTags && (
              <div style={{ marginBottom: 24 }}>
                <div style={sectionLabel}>fund tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {draft.kv_fund_investor?.map(tag => (
                    <span key={tag} style={{
                      fontSize: 11, fontWeight: 500,
                      padding: '3px 10px', borderRadius: 100,
                      background: 'hsla(150, 60%, 40%, 0.08)',
                      color: 'hsla(150, 60%, 30%, 0.80)',
                    }}>
                      KV: {tag}
                    </span>
                  ))}
                  {draft.spv_investor?.map(tag => (
                    <span key={tag} style={{
                      fontSize: 11, fontWeight: 500,
                      padding: '3px 10px', borderRadius: 100,
                      background: 'hsla(210, 60%, 50%, 0.08)',
                      color: 'hsla(210, 60%, 40%, 0.80)',
                    }}>
                      SPV: {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Add to campaign */}
            {!isNew && contact && campaigns.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                {addedCampaignId ? (
                  <div style={{ fontSize: 12, color: 'hsla(150, 60%, 35%, 0.9)', padding: '4px 0' }}>
                    added to {campaigns.find(c => c.id === addedCampaignId)?.name ?? 'campaign'}
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowCampaignPicker(v => !v)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: 'var(--color-text-secondary)',
                        padding: '6px 0', fontFamily: 'inherit',
                      }}
                    >
                      + add to campaign
                    </button>
                    {showCampaignPicker && (
                      <div style={{
                        marginTop: 6,
                        background: 'var(--surface-panel)',
                        border: '1px solid var(--edge)',
                        borderRadius: 8,
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}>
                        {campaigns.map(campaign => (
                          <button
                            key={campaign.id}
                            type="button"
                            onClick={() => handleAddToCampaign(campaign.id)}
                            disabled={addingToCampaign}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              width: '100%', padding: '10px 14px',
                              background: 'none', border: 'none',
                              borderBottom: '1px solid var(--divider)',
                              cursor: addingToCampaign ? 'default' : 'pointer',
                              textAlign: 'left', fontFamily: 'inherit',
                              opacity: addingToCampaign ? 0.5 : 1,
                            }}
                          >
                            <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                              {campaign.name}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                              {campaign.type}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Next Follow-Up bar — pinned at bottom */}
        {!isNew && contact && (
          <div style={{
            padding: '12px 32px',
            borderTop: '1px solid var(--divider)',
            background: 'rgba(37,180,57,0.03)',
          }}>
            {editingField === 'next_follow_up_date' ? (
              /* Edit mode */
              <div>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                  Next Follow-Up
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="date"
                    value={editFollowUpDate}
                    onChange={e => setEditFollowUpDate(e.target.value)}
                    style={{
                      background: 'var(--tint)',
                      border: '1px solid var(--edge-strong)',
                      borderRadius: 6,
                      color: 'var(--color-text-primary)',
                      fontSize: 13,
                      padding: '4px 8px',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <input
                    type="text"
                    value={editFollowUpAction}
                    onChange={e => setEditFollowUpAction(e.target.value)}
                    placeholder="Next action..."
                    style={{
                      flex: 1,
                      minWidth: 120,
                      background: 'var(--tint)',
                      border: '1px solid var(--edge-strong)',
                      borderRadius: 6,
                      color: 'var(--color-text-primary)',
                      fontSize: 13,
                      padding: '4px 8px',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const updated = await updateContact(contact.id, {
                        next_follow_up_date: editFollowUpDate || null,
                        next_action: editFollowUpAction || null,
                      })
                      onSaved(updated)
                      setEditingField(null)
                    }}
                    style={{
                      padding: '4px 12px',
                      background: 'var(--color-brand)',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingField(null)}
                    style={{
                      padding: '4px 10px',
                      background: 'none',
                      border: '1px solid var(--edge)',
                      borderRadius: 6,
                      color: 'var(--color-text-secondary)',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : contact.next_follow_up_date ? (
              /* Read mode — follow-up exists */
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setEditFollowUpDate(contact.next_follow_up_date ?? '')
                    setEditFollowUpAction(contact.next_action ?? '')
                    setEditingField('next_follow_up_date')
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                    Next Follow-Up
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {contact.next_action ?? 'Follow up'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      fontSize: 12, fontWeight: 500, color: 'var(--color-brand)',
                      background: 'rgba(37,180,57,0.08)',
                      padding: '4px 12px', borderRadius: 8,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setEditFollowUpDate(contact.next_follow_up_date ?? '')
                      setEditFollowUpAction(contact.next_action ?? '')
                      setEditingField('next_follow_up_date')
                    }}
                  >
                    {new Date(contact.next_follow_up_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <button
                    type="button"
                    title="Complete follow-up"
                    disabled={completingFollowUp}
                    onClick={async () => {
                      setCompletingFollowUp(true)
                      try {
                        await logSystemEvent({
                          contactId: contact.id,
                          type: 'field_update',
                          detail: {
                            source: 'follow_up_completed',
                            action: contact.next_action,
                            date: contact.next_follow_up_date,
                          },
                          notes: `Follow-up completed: ${contact.next_action ?? 'Follow up'}`,
                        })
                        const updated = await updateContact(contact.id, {
                          next_follow_up_date: null,
                          next_action: null,
                        })
                        onSaved(updated)
                      } finally {
                        setCompletingFollowUp(false)
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: completingFollowUp ? 'default' : 'pointer',
                      padding: 4,
                      borderRadius: 6,
                      color: 'var(--color-text-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: completingFollowUp ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { if (!completingFollowUp) (e.currentTarget as HTMLElement).style.color = '#22c55e' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="9 12 11 14 15 10"/>
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              /* Empty state — no follow-up set */
              <button
                type="button"
                onClick={() => {
                  setEditFollowUpDate('')
                  setEditFollowUpAction('')
                  setEditingField('next_follow_up_date')
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'var(--color-text-tertiary)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Set follow-up
              </button>
            )}
          </div>
        )}

        {/* Create footer */}
        {isNew && (
          <div style={{
            padding: '14px 32px',
            borderTop: '1px solid var(--divider)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
          }}>
            {createError && (
              <p style={{ fontSize: 11, color: '#D93025', margin: 0 }}>failed to create — try again</p>
            )}
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !draft.name}
              style={{
                padding: '8px 20px',
                background: draft.name ? 'var(--edge)' : 'var(--tint)',
                border: '1px solid var(--edge-strong)',
                borderRadius: 7,
                color: draft.name ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                fontSize: 13, fontWeight: 500,
                cursor: draft.name ? 'pointer' : 'default',
                transition: 'all 0.15s',
                letterSpacing: '0.01em',
                fontFamily: 'inherit',
              }}
            >
              {creating ? 'Adding...' : 'Add to network'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
