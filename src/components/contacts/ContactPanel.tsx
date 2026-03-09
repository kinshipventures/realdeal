import { useEffect, useState } from 'react'
import { getContacts } from '../../lib/airtable'
import type { Contact } from '../../lib/types'
import { ContactCard } from './ContactCard'
import { ContactDetail } from './ContactDetail'

interface ContactPanelProps {
  categoryId: string
  categoryName?: string
  onClose: () => void
}

export function ContactPanel({ categoryId, categoryName, onClose }: ContactPanelProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showNewContact, setShowNewContact] = useState(false)

  useEffect(() => {
    setLoading(true)
    setSearch('')
    setSelectedContact(null)
    setShowNewContact(false)
    getContacts(categoryId)
      .then(data => setContacts(data))
      .catch(err => console.error('Failed to load contacts:', err))
      .finally(() => setLoading(false))
  }, [categoryId])

  function handleSaved(updated: Contact) {
    setContacts(prev => {
      const idx = prev.findIndex(c => c.id === updated.id)
      if (idx === -1) {
        return updated.category_ids.includes(categoryId) ? [...prev, updated] : prev
      }
      const next = [...prev]
      next[idx] = updated
      return next
    })
    setSelectedContact(prev => prev?.id === updated.id ? updated : prev)
  }

  const filtered = search.trim()
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company?.toLowerCase().includes(search.toLowerCase())
      )
    : contacts

  return (
    <>
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
        background: 'rgba(245,244,240,0.88)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderLeft: '1px solid rgba(0,0,0,0.07)',
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div style={{ padding: '28px 24px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(0,0,0,0.85)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {categoryName ?? '—'}
            </div>
            <div style={{
              fontSize: 11,
              color: 'rgba(0,0,0,0.30)',
              marginTop: 3,
              letterSpacing: '0.01em',
            }}>
              contacts
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              marginTop: 2,
              width: 26, height: 26,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.08)',
              color: 'rgba(0,0,0,0.35)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, lineHeight: 1,
              transition: 'background 0.15s, color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(0,0,0,0.07)'
              el.style.color = 'rgba(0,0,0,0.70)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(0,0,0,0.04)'
              el.style.color = 'rgba(0,0,0,0.35)'
            }}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, color: 'rgba(0,0,0,0.25)', pointerEvents: 'none',
          }}>
            ⌕
          </span>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 28px',
              background: 'rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: 8,
              color: 'rgba(0,0,0,0.75)',
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onFocus={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'rgba(255,255,255,0.15)'
              el.style.background = 'rgba(0,0,0,0.05)'
            }}
            onBlur={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'rgba(0,0,0,0.07)'
              el.style.background = 'rgba(0,0,0,0.03)'
            }}
          />
        </div>
      </div>

      {/* Contact list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: 20, height: 20,
              borderRadius: '50%',
              border: '1.5px solid rgba(0,0,0,0.08)',
              borderTopColor: 'rgba(0,0,0,0.35)',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto',
            }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(0,0,0,0.25)', fontSize: 13 }}>
            {search ? 'No matches' : 'No contacts yet'}
          </div>
        ) : (
          <div>
            {filtered.map(contact => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onClick={() => setSelectedContact(contact)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 24px',
        borderTop: '1px solid rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.25)' }}>
          {!loading && `${filtered.length} contact${filtered.length !== 1 ? 's' : ''}`}
        </span>
        <button
          onClick={() => setShowNewContact(true)}
          style={{
            padding: '6px 14px',
            background: 'rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 7,
            color: 'rgba(0,0,0,0.50)',
            fontSize: 12, fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(0,0,0,0.07)'
            el.style.color = 'rgba(0,0,0,0.75)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(0,0,0,0.05)'
            el.style.color = 'rgba(0,0,0,0.50)'
          }}
        >
          + Add contact
        </button>
      </div>
    </div>

    {/* Contact detail — stacked over the list */}
    {(selectedContact || showNewContact) && (
      <ContactDetail
        contact={selectedContact}
        categoryId={categoryId}
        onClose={() => { setSelectedContact(null); setShowNewContact(false) }}
        onSaved={handleSaved}
        onDeleted={() => {
          if (selectedContact) setContacts(prev => prev.filter(c => c.id !== selectedContact.id))
          setSelectedContact(null)
        }}
      />
    )}
    </>
  )
}
