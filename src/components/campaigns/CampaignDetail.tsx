import { useState, useCallback, useEffect, useRef } from 'react'
import type { Contact, Pod, CampaignContact, CampaignContactStatus } from '../../lib/types'
import { getCampaignContacts, updateCampaignContactStatus, addContactToCampaign, completeCampaign, updateCampaignNotes } from '../../lib/data'
import { useEscape } from '../../lib/escapeStack'
import { Avatar, CloseButton, Spinner } from '../ui'

const STATUS_ORDER: CampaignContactStatus[] = ['pending', 'reached', 'responded', 'confirmed']

function nextStatus(current: CampaignContactStatus): CampaignContactStatus {
  const idx = STATUS_ORDER.indexOf(current)
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
}

const STATUS_STYLE: Record<CampaignContactStatus, { background: string; color: string }> = {
  pending:   { background: 'var(--tint)',                     color: 'var(--color-text-secondary)' },
  reached:   { background: 'hsla(210, 60%, 50%, 0.12)',      color: 'hsla(210, 60%, 35%, 0.9)' },
  responded: { background: 'hsla(270, 60%, 50%, 0.12)',      color: 'hsla(270, 60%, 35%, 0.9)' },
  confirmed: { background: 'hsla(150, 60%, 40%, 0.12)',      color: 'hsla(150, 60%, 28%, 0.9)' },
}

function formatLastContacted(date: string | null): string {
  if (!date) return 'Never'
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  campaignId: string
  campaignName: string
  campaignType: string
  campaignDeadline: string | null
  campaignStatus: 'active' | 'completed'
  campaignNotes: string | null
  contacts: Contact[]
  pods: Pod[]
  onClose: () => void
  onUpdate: () => void
}

export function CampaignDetail({
  campaignId,
  campaignName,
  campaignType,
  campaignDeadline,
  campaignStatus,
  campaignNotes,
  contacts,
  pods,
  onClose,
  onUpdate,
}: Props) {
  const [campaignContacts, setCampaignContacts] = useState<CampaignContact[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [addingContactId, setAddingContactId] = useState<string | null>(null)
  const [notes, setNotes] = useState(campaignNotes ?? '')
  const [notesEditing, setNotesEditing] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null)
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  // Auto-save notes with debounce
  function handleNotesChange(value: string) {
    setNotes(value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await updateCampaignNotes(campaignId, value || null)
      onUpdate()
    }, 800)
  }

  const handleClose = useCallback(() => onClose(), [onClose])
  useEscape(handleClose)

  useEffect(() => {
    setLoading(true)
    getCampaignContacts(campaignId)
      .then(setCampaignContacts)
      .finally(() => setLoading(false))
  }, [campaignId])

  async function handleStatusToggle(cc: CampaignContact) {
    const updated = nextStatus(cc.status)
    // Optimistic update
    setCampaignContacts(prev => prev.map(c => c.id === cc.id ? { ...c, status: updated } : c))
    try {
      await updateCampaignContactStatus(cc.id, updated)
      onUpdate()
    } catch {
      // Revert on failure
      setCampaignContacts(prev => prev.map(c => c.id === cc.id ? { ...c, status: cc.status } : c))
    }
  }

  async function handleAddContact(contactId: string) {
    setAddingContactId(contactId)
    try {
      const newCc = await addContactToCampaign(campaignId, contactId)
      setCampaignContacts(prev =>
        prev.some(cc => cc.id === newCc.id || cc.contact_id === contactId) ? prev : [...prev, newCc]
      )
      setSearchQuery('')
      onUpdate()
    } finally {
      setAddingContactId(null)
    }
  }

  async function handleComplete() {
    setCompleting(true)
    try {
      await completeCampaign(campaignId)
      onUpdate()
      onClose()
    } finally {
      setCompleting(false)
    }
  }

  const campaignContactIds = new Set(campaignContacts.map(cc => cc.contact_id))

  // Contacts already in this campaign, enriched with contact data
  const contactRows = campaignContacts.map(cc => ({
    cc,
    contact: contacts.find(c => c.id === cc.contact_id) ?? null,
  })).filter(row => row.contact !== null) as Array<{ cc: CampaignContact; contact: Contact }>

  // Search results: contacts not already in campaign
  const searchResults = searchQuery.length > 0
    ? contacts
        .filter(c => !campaignContactIds.has(c.id) && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 8)
    : []

  const contacted = campaignContacts.filter(cc => cc.status !== 'pending').length
  const total = campaignContacts.length

  function getPodName(contact: Contact): string {
    const podId = contact.list_ids[0]
    if (!podId) return ''
    return pods.find(p => p.id === podId)?.name ?? ''
  }

  return (
    <div
      className="panel-enter"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 420,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-panel)',
        backdropFilter: 'var(--panel-blur)',
        WebkitBackdropFilter: 'var(--panel-blur)',
        borderLeft: '1px solid var(--edge)',
        zIndex: 60,
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 18, fontWeight: 700,
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              marginBottom: 6,
            }}>
              {campaignName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500,
                background: 'var(--tint)', color: 'var(--color-text-secondary)',
              }}>
                {campaignType}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                {contacted}/{total} contacted
              </span>
              {campaignDeadline && (
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  due {new Date(campaignDeadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <CloseButton onClick={onClose} aria-label="Close campaign" />
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--tint)', marginTop: 8 }}>
            <div style={{
              width: `${total > 0 ? (contacted / total) * 100 : 0}%`,
              height: '100%', borderRadius: 2,
              background: contacted === total && total > 0 ? 'hsla(150, 60%, 40%, 0.6)' : 'hsla(210, 60%, 50%, 0.4)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        )}

        {/* Mark complete */}
        {campaignStatus === 'active' && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            style={{
              marginTop: 12,
              background: 'none', border: '1px solid var(--edge)',
              borderRadius: 7, padding: '6px 14px',
              fontSize: 12, fontWeight: 500,
              color: completing ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
              cursor: completing ? 'default' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {completing ? 'Completing...' : 'Mark complete'}
          </button>
        )}
      </div>

      {/* Notes section */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--divider)', flexShrink: 0 }}>
        <div
          style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6, fontWeight: 500, cursor: 'pointer' }}
          onClick={() => setNotesEditing(true)}
        >
          notes
        </div>
        {notesEditing || notes ? (
          <textarea
            value={notes}
            onChange={e => handleNotesChange(e.target.value)}
            onFocus={() => setNotesEditing(true)}
            onBlur={() => { if (!notes) setNotesEditing(false) }}
            placeholder="Add notes..."
            rows={3}
            style={{
              width: '100%', background: 'var(--tint)',
              border: '1px solid var(--edge)', borderRadius: 8,
              color: 'var(--color-text-primary)', fontSize: 13,
              padding: '8px 12px', outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box', resize: 'vertical',
              lineHeight: 1.5,
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setNotesEditing(true)}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 13, color: 'var(--color-text-tertiary)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Add notes...
          </button>
        )}
      </div>

      {/* Contact list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <Spinner />
        ) : contactRows.length === 0 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            No people yet — add some below
          </div>
        ) : (
          contactRows.map(({ cc, contact }) => {
            const podName = getPodName(contact)
            const style = STATUS_STYLE[cc.status]
            return (
              <div
                key={cc.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 24px',
                  borderBottom: '1px solid var(--divider)',
                }}
              >
                <Avatar name={contact.name} size={32} variant="subtle" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                    {contact.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    {podName && (
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{podName}</span>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      {formatLastContacted(contact.last_contacted_at)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleStatusToggle(cc)}
                  style={{
                    padding: '4px 10px', borderRadius: 100,
                    border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 500,
                    background: style.background,
                    color: style.color,
                    fontFamily: 'inherit',
                    flexShrink: 0,
                    transition: 'opacity 0.1s',
                  }}
                >
                  {cc.status}
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Add contacts search */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--divider)',
        flexShrink: 0,
      }}>
        <input
          type="text"
          placeholder="Add a contact..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--tint)',
            border: '1px solid var(--edge-strong)',
            borderRadius: 8,
            color: 'var(--color-text-primary)',
            fontSize: 13,
            padding: '8px 12px',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        {searchResults.length > 0 && (
          <div style={{
            marginTop: 6,
            background: 'var(--surface-panel)',
            border: '1px solid var(--edge)',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}>
            {searchResults.map(contact => (
              <button
                key={contact.id}
                type="button"
                onClick={() => handleAddContact(contact.id)}
                disabled={addingContactId === contact.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 14px',
                  background: 'none', border: 'none',
                  borderBottom: '1px solid var(--divider)',
                  cursor: addingContactId === contact.id ? 'default' : 'pointer',
                  textAlign: 'left', fontFamily: 'inherit',
                  opacity: addingContactId === contact.id ? 0.5 : 1,
                }}
              >
                <Avatar name={contact.name} size={24} variant="subtle" />
                <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{contact.name}</span>
                {contact.company && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', flex: 1, textAlign: 'right' }}>
                    {contact.company}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
