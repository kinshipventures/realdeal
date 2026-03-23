import { useState, useCallback, useRef, useEffect } from 'react'
import type { Contact, Interaction } from '../../lib/types'
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
import { updateContact, createContact, deleteContact } from '../../lib/airtable'
import { avatarHue, initials } from '../../lib/utils'
import { useEscape } from '../../lib/escapeStack'
import { CloseButton } from '../ui'
import { InteractionSection } from './InteractionSection'

const RING_COLORS: Record<string, string> = {
  intro: '#7B61FF',
  meeting: '#FF6B4A',
  call: '#34C759',
  text: '#FFB547',
  email: '#5AC8FA',
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
          fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth} />
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
        fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth} />
      {segments.map(seg => (
        <circle key={seg.type}
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={RING_COLORS[seg.type] ?? 'rgba(0,0,0,0.15)'}
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
}

type SaveError = { field: keyof Contact; value: string | null } | null

export function ContactDetail({ contact, categoryId, onClose, onSaved, onDeleted }: Props) {
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

  useEffect(() => {
    if (!contact) return
    getInteractions(contact.id).then(setInteractions)
  }, [contact?.id])

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

    const inputStyle = {
      width: '100%',
      background: 'rgba(0,0,0,0.03)',
      border: '1px solid rgba(0,0,0,0.10)',
      borderRadius: 6,
      color: 'rgba(0,0,0,0.82)',
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
            color: 'rgba(0,0,0,0.28)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {label}
          </div>
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
              color: val ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.18)',
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
    color: 'rgba(0,0,0,0.60)',
    background: 'rgba(0,0,0,0.03)',
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 4,
    padding: '2px 6px',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    color: 'rgba(0,0,0,0.25)',
    marginBottom: 14,
    letterSpacing: '0.01em',
  }

  function birthdayField() {
    const val = (draft.birthday as string | null) ?? null
    const editing = editingField === 'birthday'
    const countdown = daysUntilBirthday(val)

    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(0,0,0,0.28)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 3 }}>
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
              background: 'rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 6,
              color: 'rgba(0,0,0,0.82)',
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
            <span style={{ fontSize: 13, color: val ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.18)' }}>
              {val ?? 'add birthday'}
            </span>
            {countdown !== null && countdown <= 30 && (
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.28)' }}>
                {countdown === 0 ? 'today' : `in ${countdown} day${countdown === 1 ? '' : 's'}`}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="panel-enter"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 360,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(243,242,238,0.94)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderLeft: '1px solid rgba(0,0,0,0.08)',
        zIndex: 60,
      }}
    >
      {/* Header */}
      <div style={{ padding: '24px 24px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          {/* Delete control — existing contacts only */}
          {!isNew ? (
            confirmDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    fontSize: 11, fontWeight: 500,
                    color: deleting ? 'rgba(0,0,0,0.28)' : 'rgba(180,40,40,0.85)',
                    background: 'none', border: 'none',
                    cursor: deleting ? 'default' : 'pointer',
                    padding: 0, letterSpacing: '0.01em',
                  }}
                >
                  {deleting ? 'Deleting...' : 'Confirm delete'}
                </button>
                <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.20)' }}>·</span>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    fontSize: 11, color: 'rgba(0,0,0,0.38)',
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

          <CloseButton onClick={onClose} aria-label="Close contact" />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingBottom: !isNew ? 0 : 20 }}>
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
            {/* Name */}
            {editingField === 'name' ? (
              <input
                autoFocus
                type="text"
                defaultValue={draft.name ?? ''}
                placeholder="Full name"
                onBlur={e => handleBlur('name', e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'Escape') { e.currentTarget.value = draft.name ?? ''; e.currentTarget.blur(); e.stopPropagation() }
                }}
                style={{
                  width: '100%',
                  fontSize: 18, fontWeight: 600,
                  letterSpacing: '-0.02em',
                  background: 'rgba(0,0,0,0.03)',
                  border: '1px solid rgba(0,0,0,0.10)',
                  borderRadius: 6,
                  color: 'rgba(0,0,0,0.85)',
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
                  letterSpacing: '-0.02em',
                  color: draft.name ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.20)',
                  cursor: 'text',
                  padding: '2px 0',
                }}
              >
                {draft.name || 'Full name'}
              </div>
            )}

            {/* Role + Company */}
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
                  style={{ fontSize: 12, color: draft.role ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.18)', cursor: 'text' }}
                >
                  {draft.role ?? 'Role'}
                </span>
              )}
              <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.20)' }}>at</span>
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
                  style={{ fontSize: 12, color: draft.company ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.18)', cursor: 'text' }}
                >
                  {draft.company ?? 'Company'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>

        <div style={{ marginBottom: 24 }}>
          <div style={sectionLabel}>contact</div>
          {field('email', 'Email')}
          {field('phone', 'Phone')}
          {field('website', 'Website')}
          {field('location', 'Location')}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={sectionLabel}>context</div>
          {field('specialization', 'Specialization')}
          {field('past_clients', 'Past clients', true)}
          {field('recommended_by', 'Recommended by')}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={sectionLabel}>personal</div>

          {/* Equity score ring — existing contacts only */}
          {!isNew && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <SegmentedEquityRing breakdown={equityBreakdown} score={equityScore} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(0,0,0,0.85)', letterSpacing: '-0.03em' }}>
                  {equityScore}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 2, letterSpacing: '0.01em' }}>
                  {scoreLabel(equityScore)}
                </div>
              </div>
            </div>
          )}
          {!isNew && equityBreakdown.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginBottom: 16 }}>
              {equityBreakdown.map(b => (
                <div key={b.type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: RING_COLORS[b.type] }} />
                  <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.38)', letterSpacing: '0.02em' }}>
                    {b.type}
                  </span>
                </div>
              ))}
            </div>
          )}

          {birthdayField()}
          {field('milestones', 'Milestones', true)}
          {field('interests', 'Interests', true)}
          {field('relationship_context', 'Relationship context', true)}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={sectionLabel}>notes</div>
          {field('notes', 'Notes', true)}
        </div>

        {/* Interactions — existing contacts only */}
        {!isNew && contact && (
          <InteractionSection
            contact={contact}
            onContactUpdated={onSaved}
          />
        )}
      </div>

      {/* Create footer */}
      {isNew && (
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid rgba(0,0,0,0.04)',
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
              background: draft.name ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 7,
              color: draft.name ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.28)',
              fontSize: 13, fontWeight: 500,
              cursor: draft.name ? 'pointer' : 'default',
              transition: 'all 0.15s',
              letterSpacing: '0.01em',
              fontFamily: 'inherit',
            }}
          >
            {creating ? 'Creating...' : 'Create contact'}
          </button>
        </div>
      )}
    </div>
  )
}
