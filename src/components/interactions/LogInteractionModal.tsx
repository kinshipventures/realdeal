import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Plus, Search, UserPlus, X } from 'lucide-react'
import { createContact, logInteraction } from '../../lib/data'
import { HUMAN_TYPES, type Contact, type Interaction } from '../../lib/types'

type LoggableType = (typeof HUMAN_TYPES)[number]

interface LogInteractionModalProps {
  contacts: Contact[]
  onClose: () => void
  onContactCreated: (contact: Contact) => void
  onLogged: (contact: Contact, interaction: Interaction) => void
}

const TYPE_LABELS: Record<LoggableType, string> = {
  call: 'Call',
  email: 'Email',
  text: 'Text',
  meeting: 'Meeting',
  intro: 'Introduction',
  note: 'Note',
}

function todayIso(): string {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().trim()
}

function splitName(name: string): { firstName: string | null; lastName: string | null } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: null, lastName: null }
  if (parts.length === 1) return { firstName: parts[0], lastName: null }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function buildNewContact(name: string, email: string | null): Omit<Contact, 'id' | 'created_at'> {
  const { firstName, lastName } = splitName(name)
  return {
    name,
    email,
    phone: null,
    company: null,
    role: null,
    location: null,
    website: null,
    notes: null,
    recommended_by: null,
    specialization: null,
    past_clients: null,
    birthday: null,
    milestones: null,
    interests: null,
    relationship_context: null,
    last_contacted_at: null,
    list_ids: [],
    category_ids: [],
    primary_list_id: null,
    cadence_override: null,
    first_name: firstName,
    last_name: lastName,
    linkedin: null,
    country: null,
    global_region: null,
    gender: null,
    introduced_by: null,
    intel_notes: null,
    relationship_owner: null,
    contact_frequency: null,
    communication_preferences: null,
    next_follow_up_date: null,
    next_action: null,
    kv_fund_investor: null,
    spv_investor: null,
    needs_review: true,
    type: 'Contact',
    status: 'Pending',
    ring_ids: [],
    company_record_id: null,
    company_ids: [],
    industry: null,
    stage: null,
    ticker: null,
    domain: null,
    email_2: null,
    email_3: null,
    photo_url: null,
    custom_fields: {},
    snoozed_until: null,
  }
}

export function LogInteractionModal({ contacts, onClose, onContactCreated, onLogged }: LogInteractionModalProps) {
  const [query, setQuery] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [logType, setLogType] = useState<LoggableType>('call')
  const [logDate, setLogDate] = useState(todayIso())
  const [logNotes, setLogNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matches = useMemo(() => {
    const needle = normalize(query)
    const sorted = [...contacts].sort((a, b) => a.name.localeCompare(b.name))
    if (!needle) return sorted.slice(0, 8)
    return sorted.filter(contact => {
      const haystack = [
        contact.name,
        contact.first_name,
        contact.last_name,
        contact.email,
        contact.email_2,
        contact.email_3,
        contact.company,
        contact.role,
      ].map(normalize).join(' ')
      return haystack.includes(needle)
    }).slice(0, 8)
  }, [contacts, query])

  function startCreate() {
    const trimmed = query.trim()
    setNewName(isLikelyEmail(trimmed) ? '' : trimmed)
    setNewEmail(isLikelyEmail(trimmed) ? trimmed : '')
    setIsCreating(true)
    setError(null)
  }

  async function handleCreateContact() {
    const name = newName.trim()
    if (!name || saving) return
    setSaving(true)
    setError(null)
    try {
      const email = newEmail.trim() || null
      const created = await createContact(buildNewContact(name, email))
      onContactCreated(created)
      setSelectedContact(created)
      setIsCreating(false)
      setQuery(created.name)
    } catch {
      setError("Couldn't create that contact. Try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveTouchpoint() {
    if (!selectedContact || saving) return
    setSaving(true)
    setError(null)
    try {
      const interaction = await logInteraction(selectedContact.id, {
        type: logType,
        date: logDate,
        notes: logNotes.trim() || null,
        summary: null,
        source: 'Manual',
        email_link: null,
        granola_link: null,
        event_detail: null,
        actor: null,
      })
      const updatedContact = logType === 'note'
        ? selectedContact
        : { ...selectedContact, last_contacted_at: logDate }
      onLogged(updatedContact, interaction)
      onClose()
    } catch {
      setError("Couldn't save that touchpoint. Try again.")
    } finally {
      setSaving(false)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-touchpoint-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(17, 24, 39, 0.42)',
        backdropFilter: 'blur(10px)',
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: 'min(560px, 100%)',
          maxHeight: 'min(760px, calc(100vh - 48px))',
          overflow: 'auto',
          background: 'var(--surface-panel)',
          border: 'var(--surface-panel-border)',
          borderRadius: 8,
          boxShadow: '0 24px 70px rgba(15, 23, 42, 0.22)',
        }}
      >
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--edge)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h2 id="log-touchpoint-title" style={{ margin: 0, fontSize: 20, fontWeight: 750, color: 'var(--color-text-primary)', letterSpacing: 0 }}>
              Log touchpoint
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--edge)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'grid', gap: 20 }}>
          {!selectedContact && !isCreating && (
            <section style={{ display: 'grid', gap: 14 }}>
              <label style={{ display: 'grid', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Contact
                <span style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search contacts"
                    style={{
                      width: '100%',
                      height: 44,
                      border: '1px solid var(--edge)',
                      borderRadius: 8,
                      padding: '0 12px 0 38px',
                      fontSize: 14,
                      color: 'var(--color-text-primary)',
                      background: 'var(--surface-base)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </span>
              </label>

              <div style={{ display: 'grid', gap: 8, maxHeight: 312, overflow: 'auto', paddingRight: 2 }}>
                {matches.map(contact => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setSelectedContact(contact)}
                    style={{
                      border: '1px solid var(--edge)',
                      background: 'var(--surface-base)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {contact.name}
                      </span>
                      <span style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[contact.company, contact.email].filter(Boolean).join(' · ') || 'No company or email'}
                      </span>
                    </span>
                    <Check size={15} style={{ color: 'var(--color-text-tertiary)' }} />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={startCreate}
                style={{
                  height: 42,
                  borderRadius: 8,
                  border: '1px solid var(--edge)',
                  background: 'transparent',
                  color: 'var(--color-text-primary)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <UserPlus size={16} />
                Add new contact
              </button>
            </section>
          )}

          {isCreating && (
            <section style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ display: 'grid', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Name
                  <input
                    autoFocus
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="Full name"
                    style={{
                      height: 44,
                      border: '1px solid var(--edge)',
                      borderRadius: 8,
                      padding: '0 12px',
                      fontSize: 14,
                      color: 'var(--color-text-primary)',
                      background: 'var(--surface-base)',
                      outline: 'none',
                    }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Email
                  <input
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    placeholder="email@example.com"
                    style={{
                      height: 44,
                      border: '1px solid var(--edge)',
                      borderRadius: 8,
                      padding: '0 12px',
                      fontSize: 14,
                      color: 'var(--color-text-primary)',
                      background: 'var(--surface-base)',
                      outline: 'none',
                    }}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  disabled={saving}
                  style={{
                    height: 42,
                    padding: '0 16px',
                    borderRadius: 8,
                    border: '1px solid var(--edge)',
                    background: 'transparent',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: saving ? 'default' : 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCreateContact}
                  disabled={!newName.trim() || saving}
                  style={{
                    height: 42,
                    padding: '0 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--color-brand)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 750,
                    cursor: !newName.trim() || saving ? 'default' : 'pointer',
                    opacity: !newName.trim() || saving ? 0.55 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Plus size={16} />
                  {saving ? 'Creating...' : 'Create contact'}
                </button>
              </div>
            </section>
          )}

          {selectedContact && (
            <section style={{ display: 'grid', gap: 18 }}>
              <div style={{
                border: '1px solid var(--edge)',
                borderRadius: 8,
                padding: 14,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 12,
                alignItems: 'center',
                background: 'var(--surface-base)',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--color-text-primary)', fontSize: 15, fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedContact.name}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[selectedContact.company, selectedContact.email].filter(Boolean).join(' · ') || 'No company or email'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedContact(null)
                    setIsCreating(false)
                  }}
                  disabled={saving}
                  style={{
                    height: 34,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid var(--edge)',
                    background: 'transparent',
                    color: 'var(--color-text-primary)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: saving ? 'default' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Change
                </button>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {HUMAN_TYPES.map(type => {
                    const active = logType === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLogType(type)}
                        style={{
                          height: 34,
                          padding: '0 12px',
                          borderRadius: 8,
                          border: active ? '1px solid var(--color-brand)' : '1px solid var(--edge)',
                          background: active ? 'rgba(0, 61, 165, 0.08)' : 'transparent',
                          color: active ? 'var(--color-brand)' : 'var(--color-text-primary)',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {TYPE_LABELS[type]}
                      </button>
                    )
                  })}
                </div>

                <label style={{ display: 'grid', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Date
                  <input
                    type="date"
                    value={logDate}
                    onChange={(event) => setLogDate(event.target.value)}
                    style={{
                      height: 44,
                      border: '1px solid var(--edge)',
                      borderRadius: 8,
                      padding: '0 12px',
                      fontSize: 14,
                      color: 'var(--color-text-primary)',
                      background: 'var(--surface-base)',
                      outline: 'none',
                    }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Notes
                  <textarea
                    value={logNotes}
                    onChange={(event) => setLogNotes(event.target.value)}
                    placeholder="Add context"
                    rows={5}
                    style={{
                      border: '1px solid var(--edge)',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      color: 'var(--color-text-primary)',
                      background: 'var(--surface-base)',
                      outline: 'none',
                      resize: 'vertical',
                      minHeight: 112,
                    }}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleSaveTouchpoint}
                disabled={saving}
                style={{
                  height: 44,
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--color-brand)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 750,
                  cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.65 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save touchpoint'}
              </button>
            </section>
          )}

          {error && (
            <div role="alert" style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.08)', color: '#B42318', fontSize: 13, fontWeight: 650 }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
