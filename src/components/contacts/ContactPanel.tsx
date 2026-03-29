import { useCallback, useEffect, useRef, useState } from 'react'
import { getContacts } from '../../lib/airtable'
import type { Contact } from '../../lib/types'
import { useEscape } from '../../lib/escapeStack'
import { Spinner, CloseButton } from '../ui'
import { ContactCard } from './ContactCard'
import { EmptyState } from '../empty/EmptyState'

interface ContactPanelProps {
  categoryId: string
  categoryName?: string
  onClose: () => void
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

export function ContactPanel({ categoryId, categoryName, onClose }: ContactPanelProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const [showNewContact, setShowNewContact] = useState(false)
  const isMobile = useIsMobile()

  // Panel animation fix: only animate on first mount, not when switching categories
  const wasOpen = useRef(false)
  useEffect(() => { wasOpen.current = true }, [])
  const animateClass = wasOpen.current ? '' : isMobile ? 'panel-enter-mobile' : 'panel-enter'

  const handleClose = useCallback(() => onClose(), [onClose])
  useEscape(handleClose)

  useEffect(() => {
    let canceled = false
    setLoading(true)
    setLoadError(false)
    setSearch('')
    setShowNewContact(false)
    getContacts(categoryId)
      .then(data => { if (!canceled) setContacts(data) })
      .catch(() => { if (!canceled) setLoadError(true) })
      .finally(() => { if (!canceled) setLoading(false) })
    return () => { canceled = true }
  }, [categoryId])

  const filtered = search.trim()
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company?.toLowerCase().includes(search.toLowerCase())
      )
    : contacts

  const mobileStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 60,
    background: 'var(--color-bg)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    animation: wasOpen.current ? undefined : 'panel-slide-up 0.35s cubic-bezier(0.4, 0, 0.2, 1) both',
  }

  const desktopStyle: React.CSSProperties = {
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
    borderLeft: '1px solid var(--edge)',
    zIndex: 50,
  }

  return (
    <>
    <div
      className={isMobile ? undefined : animateClass}
      role="dialog"
      aria-labelledby="panel-title"
      style={isMobile ? mobileStyle : desktopStyle}
    >
      {/* Header */}
      <div style={{ padding: '28px 24px 18px', borderBottom: '1px solid var(--divider)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMobile && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Back to map"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 8, color: 'var(--color-text-primary)',
                  minWidth: 44, minHeight: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginLeft: -8,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
            )}
            <div>
              <div
                id="panel-title"
                style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}
              >
                {categoryName ?? '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3, letterSpacing: '0.01em' }}>
                contacts
              </div>
            </div>
          </div>

          {!isMobile && (
            <div style={{ marginTop: 2 }}>
              <CloseButton onClick={onClose} />
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, color: 'var(--color-text-tertiary)', pointerEvents: 'none',
          }}>
            ⌕
          </span>
          <input
            type="text"
            placeholder="Find someone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 28px',
              background: 'var(--tint)',
              border: '1px solid var(--edge)',
              borderRadius: 8,
              color: 'var(--color-text-primary)',
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onFocus={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--edge-strong)'
              el.style.background = 'var(--tint-hover)'
            }}
            onBlur={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--edge)'
              el.style.background = 'var(--tint)'
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
            Couldn't reach Airtable. Try again?
          </div>
        ) : filtered.length === 0 ? (
          search ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
              No one by that name
            </div>
          ) : (
            <EmptyState
              icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              heading="No one here yet"
              ctaLabel="Add contact"
              onCta={() => setShowNewContact(true)}
              ghosts={3}
            />
          )
        ) : (
          <div>
            {filtered.map(c => (
              <ContactCard
                key={c.id}
                contact={c}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 24px',
        borderTop: '1px solid var(--divider)',
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
            background: 'var(--tint-hover)',
            border: '1px solid var(--edge)',
            borderRadius: 7,
            color: 'var(--color-text-secondary)',
            fontSize: 12, fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'var(--edge)'
            el.style.color = 'var(--color-text-primary)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'var(--tint-hover)'
            el.style.color = 'var(--color-text-secondary)'
          }}
        >
          + Add contact
        </button>
      </div>
    </div>

    </>
  )
}
