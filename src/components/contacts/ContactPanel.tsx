import { useCallback, useEffect, useRef, useState } from 'react'
import { getContacts } from '../../lib/airtable'
import type { Contact } from '../../lib/types'
import { useEscape } from '../../lib/escapeStack'
import { Spinner, CloseButton } from '../ui'
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
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showNewContact, setShowNewContact] = useState(false)

  // Panel animation fix: only animate on first mount, not when switching categories
  const wasOpen = useRef(false)
  useEffect(() => { wasOpen.current = true }, [])
  const animateClass = wasOpen.current ? '' : 'panel-enter'

  const handleClose = useCallback(() => onClose(), [onClose])
  useEscape(handleClose)

  useEffect(() => {
    let canceled = false
    setLoading(true)
    setLoadError(false)
    setSearch('')
    setSelectedContact(null)
    setShowNewContact(false)
    getContacts(categoryId)
      .then(data => { if (!canceled) setContacts(data) })
      .catch(() => { if (!canceled) setLoadError(true) })
      .finally(() => { if (!canceled) setLoading(false) })
    return () => { canceled = true }
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
      className={animateClass}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 360,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-panel)',
        backdropFilter: 'var(--panel-blur)',
        WebkitBackdropFilter: 'var(--panel-blur)',
        borderLeft: '1px solid rgba(0,0,0,0.07)',
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div style={{ padding: '28px 24px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {categoryName ?? '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3, letterSpacing: '0.01em' }}>
              contacts
            </div>
          </div>

          <div style={{ marginTop: 2 }}>
            <CloseButton onClick={onClose} />
          </div>
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
          <Spinner />
        ) : loadError ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
            Could not load contacts. Check your connection and try again.
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
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
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {!loading && `${filtered.length} contact${filtered.length !== 1 ? 's' : ''}`}
        </span>
        <button
          type="button"
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
