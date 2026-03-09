import { useState, useEffect } from 'react'
import type { Contact, Interaction, InteractionType } from '../../lib/types'
import { getInteractions, logInteraction, updateContact, createContact } from '../../lib/airtable'
import { formatRelativeTime, avatarHue, initials } from '../../lib/utils'

interface Props {
  contact: Contact | null  // null = create mode
  categoryId: string
  onClose: () => void
  onSaved: (contact: Contact) => void
}

const TYPES: InteractionType[] = ['call', 'email', 'meeting', 'intro', 'event', 'note']
const TYPE_LABELS: Record<InteractionType, string> = {
  call: 'Call', email: 'Email', meeting: 'Meeting', intro: 'Intro', event: 'Event', note: 'Note',
}

export function ContactDetail({ contact, categoryId, onClose, onSaved }: Props) {
  const isNew = contact === null

  const [draft, setDraft] = useState<Partial<Contact>>(
    contact ?? {
      name: '', email: null, phone: null, company: null, role: null,
      location: null, website: null, notes: null, recommended_by: null,
      specialization: null, past_clients: null, category_ids: [categoryId], list_ids: [],
    }
  )
  const [editingField, setEditingField] = useState<keyof Contact | null>(isNew ? 'name' : null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [showLogForm, setShowLogForm] = useState(false)
  const [logType, setLogType] = useState<InteractionType>('call')
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10))
  const [logNotes, setLogNotes] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (contact?.id) getInteractions(contact.id).then(setInteractions)
  }, [contact?.id])

  // Update draft and auto-save for existing contacts
  function handleBlur(key: keyof Contact, value: string) {
    const v = value.trim() || null
    setDraft(prev => ({ ...prev, [key]: v }))
    setEditingField(null)
    if (!isNew && contact) {
      updateContact(contact.id, { [key]: v } as Partial<Contact>).then(onSaved).catch(console.error)
    }
  }

  // Shared field renderer — label + text-or-input based on editingField
  function field(key: keyof Contact, label: string, multi = false) {
    const val = (draft[key] as string | null | undefined) ?? null
    const editing = editingField === key

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

    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 10, fontWeight: 500,
          color: 'rgba(0,0,0,0.28)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: 3,
        }}>
          {label}
        </div>
        {editing ? (
          multi ? (
            <textarea
              autoFocus
              defaultValue={val ?? ''}
              onBlur={e => handleBlur(key, e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          ) : (
            <input
              autoFocus
              type="text"
              defaultValue={val ?? ''}
              onBlur={e => handleBlur(key, e.target.value)}
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
        last_contacted_at: null,
        list_ids: [],
        category_ids: [categoryId],
      })
      onSaved(created)
      onClose()
    } catch (err) {
      console.error('Failed to create contact:', err)
    } finally {
      setCreating(false)
    }
  }

  async function handleLog() {
    if (!contact?.id) return
    try {
      const interaction = await logInteraction(contact.id, {
        type: logType,
        date: logDate,
        notes: logNotes.trim() || null,
      })
      setInteractions(prev => [interaction, ...prev])
      setShowLogForm(false)
      setLogNotes('')
      setLogType('call')
      setLogDate(new Date().toISOString().slice(0, 10))
      if (logType !== 'note') {
        onSaved({ ...contact, last_contacted_at: logDate })
      }
    } catch (err) {
      console.error('Failed to log interaction:', err)
    }
  }

  const hue = avatarHue(draft.name ?? '')
  const nameInitials = initials(draft.name ?? '')

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    color: 'rgba(0,0,0,0.25)',
    marginBottom: 14,
    letterSpacing: '0.01em',
  }

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
      <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button
            onClick={onClose}
            aria-label="Close contact"
            style={{
              width: 26, height: 26,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.08)',
              color: 'rgba(0,0,0,0.35)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, lineHeight: 1,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(0,0,0,0.07)'; el.style.color = 'rgba(0,0,0,0.70)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(0,0,0,0.04)'; el.style.color = 'rgba(0,0,0,0.35)' }}
          >
            ×
          </button>
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
            {/* Name */}
            {editingField === 'name' ? (
              <input
                autoFocus
                type="text"
                defaultValue={draft.name ?? ''}
                placeholder="Full name"
                onBlur={e => handleBlur('name', e.target.value)}
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
          <div style={sectionLabel}>notes</div>
          {field('notes', 'Notes', true)}
        </div>

        {/* Interactions — existing contacts only */}
        {!isNew && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={sectionLabel}>interactions</div>
              <button
                onClick={() => setShowLogForm(v => !v)}
                style={{
                  fontSize: 11, fontWeight: 500,
                  color: 'rgba(0,0,0,0.40)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', padding: '2px 0',
                  letterSpacing: '0.01em',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(0,0,0,0.75)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(0,0,0,0.40)' }}
              >
                {showLogForm ? 'cancel' : '+ log'}
              </button>
            </div>

            {/* Log form */}
            {showLogForm && (
              <div style={{
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.07)',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 16,
              }}>
                {/* Type pills */}
                <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
                  {TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setLogType(t)}
                      style={{
                        fontSize: 11, fontWeight: 500,
                        padding: '3px 10px',
                        borderRadius: 100,
                        background: logType === t ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.04)',
                        border: '1px solid',
                        borderColor: logType === t ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)',
                        color: logType === t ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.38)',
                        cursor: 'pointer',
                        transition: 'all 0.1s',
                      }}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>

                {/* Date */}
                <input
                  type="date"
                  value={logDate}
                  onChange={e => setLogDate(e.target.value)}
                  style={{
                    width: '100%',
                    fontSize: 12,
                    padding: '6px 8px',
                    background: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 6,
                    color: 'rgba(0,0,0,0.70)',
                    marginBottom: 8,
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />

                {/* Notes */}
                <textarea
                  placeholder="Notes (optional)"
                  value={logNotes}
                  onChange={e => setLogNotes(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    fontSize: 12,
                    padding: '6px 8px',
                    background: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 6,
                    color: 'rgba(0,0,0,0.70)',
                    marginBottom: 10,
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                <button
                  onClick={handleLog}
                  style={{
                    fontSize: 12, fontWeight: 500,
                    padding: '6px 16px',
                    background: 'rgba(0,0,0,0.07)',
                    border: '1px solid rgba(0,0,0,0.10)',
                    borderRadius: 6,
                    color: 'rgba(0,0,0,0.70)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  Log {TYPE_LABELS[logType]}
                </button>
              </div>
            )}

            {/* Interaction list */}
            {interactions.length === 0 && !showLogForm && (
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.22)', padding: '4px 0' }}>
                no interactions yet
              </div>
            )}
            {interactions.map((interaction, i) => (
              <div
                key={interaction.id}
                style={{
                  paddingBottom: 12,
                  marginBottom: 12,
                  borderBottom: i < interactions.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 500,
                    color: 'rgba(0,0,0,0.50)',
                    background: 'rgba(0,0,0,0.05)',
                    padding: '2px 8px',
                    borderRadius: 100,
                  }}>
                    {TYPE_LABELS[interaction.type]}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.28)', letterSpacing: '0.02em' }}>
                    {formatRelativeTime(interaction.date)}
                  </span>
                </div>
                {interaction.notes && (
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', lineHeight: 1.55, marginTop: 4 }}>
                    {interaction.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create footer */}
      {isNew && (
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
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
