import { useEffect, useMemo, useState } from 'react'
import { getContacts, getPods, isOverdue, getRecentInteractions } from '../../lib/airtable'

import { daysOverdue, formatRelativeTime } from '../../lib/utils'
import type { Contact, Pod, Interaction } from '../../lib/types'
import { Spinner, Avatar } from '../ui'
import { ContactDetail } from '../contacts/ContactDetail'

const PANEL: React.CSSProperties = {
  background: 'rgba(245,244,240,0.88)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 16,
}

export function Dashboard() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [recentInteractions, setRecentInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  // Schwartzian transform: compute daysOverdue once per contact, reused for both sort and display
  const overdueContacts = useMemo(() =>
    contacts
      .filter(isOverdue)
      .map(c => ({ contact: c, days: daysOverdue(c) }))
      .sort((a, b) => {
        // null = never contacted → highest urgency, sorts first
        if (a.days === null && b.days === null) return a.contact.name.localeCompare(b.contact.name)
        if (a.days === null) return -1
        if (b.days === null) return 1
        if (a.days === b.days) return a.contact.name.localeCompare(b.contact.name)
        return b.days - a.days
      }),
    [contacts]
  )

  const totalContacts = contacts.length

  const countsByPod = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of contacts) {
      for (const lid of c.list_ids) {
        map[lid] = (map[lid] ?? 0) + 1
      }
    }
    return map
  }, [contacts])

  const categoryCount = useMemo(
    () => new Set(contacts.flatMap(c => c.category_ids)).size,
    [contacts]
  )

  // O(1) lookup for feed row contact name resolution
  const contactsById = useMemo(() => {
    const map = new Map<string, Contact>()
    for (const c of contacts) map.set(c.id, c)
    return map
  }, [contacts])

  const sortedPods = useMemo(
    () => [...pods].sort((a, b) => {
      if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1
      return a.name.localeCompare(b.name)
    }),
    [pods]
  )

  useEffect(() => {
    Promise.allSettled([getContacts(), getPods(), getRecentInteractions(20)])
      .then(([contactsResult, podsResult, interactionsResult]) => {
        if (contactsResult.status === 'fulfilled') setContacts(contactsResult.value)
        else setError('Could not load contacts. Check your connection and refresh.')

        if (podsResult.status === 'fulfilled') setPods(podsResult.value)

        if (interactionsResult.status === 'fulfilled') setRecentInteractions(interactionsResult.value)
        // interactions failure is silent — feed shows empty state
      })
      .finally(() => setLoading(false))
  }, [])

  function handleContactSaved(updated: Contact) {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  function handleContactDeleted() {
    if (!selectedContact) return
    const id = selectedContact.id
    setContacts(prev => prev.filter(c => c.id !== id))
    setSelectedContact(null)
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>

      {/* Main grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '60fr 40fr',
        gap: 16,
        height: '100vh',
        padding: '80px 24px 24px',
        boxSizing: 'border-box',
      }}>

        {/* Left: Overdue queue */}
        <div style={{ ...PANEL, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'rgba(0,0,0,0.85)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              needs attention
            </span>
            {!loading && overdueContacts.length > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '2px 7px', borderRadius: 100,
                background: 'hsla(20, 80%, 45%, 0.10)',
                border: '1px solid hsla(20, 80%, 45%, 0.18)',
                fontSize: 11, fontWeight: 500,
                color: 'hsla(20, 80%, 45%, 0.80)',
                letterSpacing: '0.01em', marginLeft: 8,
              }}>
                {overdueContacts.length}
              </span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <Spinner />
            ) : error ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(0,0,0,0.45)', fontSize: 13 }}>
                {error}
              </div>
            ) : overdueContacts.length === 0 ? (
              <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)' }}>All caught up.</span>
              </div>
            ) : (
              overdueContacts.map(({ contact, days }) => (
                <OverdueRow key={contact.id} contact={contact} days={days} onClick={() => setSelectedContact(contact)} />
              ))
            )}
          </div>
        </div>

        {/* Right column: stats + feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>

          {/* Network stats */}
          <div style={{ ...PANEL, padding: '20px 24px', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.01em', marginBottom: 12 }}>
              network
            </div>
            {loading ? <Spinner size={18} padding={20} /> : (
              <>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(0,0,0,0.82)', letterSpacing: '-0.02em', marginBottom: 12 }}>
                  {totalContacts} contacts
                </div>
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: 12 }}>
                  {sortedPods.map(pod => (
                    <div key={pod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                      <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>{pod.name}</span>
                      <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.35)', fontVariantNumeric: 'tabular-nums' }}>
                        {countsByPod[pod.id] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
                {categoryCount > 0 && (
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: 10, marginTop: 8, fontSize: 13, color: 'rgba(0,0,0,0.45)' }}>
                    {categoryCount} categories
                  </div>
                )}
              </>
            )}
          </div>

          {/* Recent activity feed */}
          <div style={{ ...PANEL, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)', flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.01em' }}>recent</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? <Spinner /> : recentInteractions.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(0,0,0,0.25)', fontSize: 13 }}>
                  No recent activity.
                </div>
              ) : (
                recentInteractions.map(interaction => {
                  const contact = contactsById.get(interaction.contact_id)
                  if (!contact) return null
                  return (
                    <button
                      key={interaction.id}
                      type="button"
                      onClick={() => setSelectedContact(contact)}
                      className="interactive-row"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '10px 24px',
                        background: 'none', border: 'none',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
                        <span style={{ color: 'rgba(0,0,0,0.38)' }}>{interaction.type}</span>
                        {' · '}
                        {contact.name}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.28)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                        {formatRelativeTime(interaction.date)}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedContact && (
        <ContactDetail
          contact={selectedContact}
          categoryId={selectedContact.category_ids[0]}
          onClose={() => setSelectedContact(null)}
          onSaved={handleContactSaved}
          onDeleted={handleContactDeleted}
        />
      )}
    </div>
  )
}

function OverdueRow({ contact, days, onClick }: { contact: Contact; days: number | null; onClick: () => void }) {
  const roleCompany = [contact.role, contact.company].filter(Boolean).join(' at ')

  return (
    <button
      type="button"
      onClick={onClick}
      className="interactive-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '12px 24px',
        background: 'none', border: 'none',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <Avatar name={contact.name} size={32} variant="subtle" />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,0.82)', lineHeight: 1.3 }}>
          {contact.name}
        </div>
        {roleCompany && (
          <div style={{
            fontSize: 11, color: 'rgba(0,0,0,0.38)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            lineHeight: 1.4,
          }}>
            {roleCompany}
          </div>
        )}
      </div>

      <div style={{
        fontSize: 11, fontWeight: 500, flexShrink: 0,
        color: days === null ? 'rgba(0,0,0,0.28)' : 'hsla(20, 80%, 45%, 0.80)',
        whiteSpace: 'nowrap', letterSpacing: '0.02em',
      }}>
        {days === null ? 'Never contacted' : `${days}d ago`}
      </div>
    </button>
  )
}
