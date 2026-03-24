import { useState, useEffect, useCallback, useRef } from 'react'
import type { Contact, Pod } from '../../lib/types'
import { getContacts, getPods } from '../../lib/airtable'
import { useEscape } from '../../lib/escapeStack'

interface SearchPaletteProps {
  onClose: () => void
  onSelectContact: (contact: Contact) => void
}

function relativeTime(lastContactedAt: string | null): string {
  if (!lastContactedAt) return 'Never'
  const days = Math.floor((Date.now() - new Date(lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return `${Math.floor(days / 30)}mo`
}

export function SearchPalette({ onClose, onSelectContact }: SearchPaletteProps) {
  const [query, setQuery] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [podMap, setPodMap] = useState<Map<string, Pod>>(new Map())
  const [activeIndex, setActiveIndex] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => onClose(), [onClose])
  useEscape(handleClose)

  useEffect(() => {
    let cancelled = false
    Promise.all([getContacts(), getPods()]).then(([cts, pods]) => {
      if (cancelled) return
      setContacts(cts)
      setPodMap(new Map(pods.map(p => [p.id, p])))
    })
    return () => { cancelled = true }
  }, [])

  const q = query.toLowerCase()
  const results = query
    ? contacts
        .filter(c =>
          c.name.toLowerCase().includes(q) ||
          (c.company?.toLowerCase().includes(q) ?? false) ||
          (c.role?.toLowerCase().includes(q) ?? false)
        )
        .slice(0, 20)
    : []

  // Reset active index when results change
  useEffect(() => setActiveIndex(-1), [query])

  // Scroll active row into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const row = listRef.current.children[activeIndex] as HTMLElement | undefined
    row?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (i + 1) % Math.max(results.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (i <= 0 ? results.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      onSelectContact(results[activeIndex])
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '20vh',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'calc(100% - 32px)',
          maxWidth: 480,
          borderRadius: 'var(--panel-radius, 16px)',
          background: 'var(--surface-panel)',
          border: 'var(--surface-panel-border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          animation: 'palette-in 150ms ease-out both',
        }}
      >
        <style>{`
          @keyframes palette-in {
            from { opacity: 0; transform: scale(0.97); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>

        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid var(--divider)' }}>
          <svg
            width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, marginRight: 10 }}
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find someone..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 16,
              fontWeight: 400,
              fontFamily: 'inherit',
              color: 'var(--color-text-primary)',
              padding: '16px 0',
            }}
          />
        </div>

        {/* Results */}
        {query && (
          <div ref={listRef} style={{ maxHeight: 320, overflowY: 'auto' }}>
            {results.length === 0 ? (
              <p style={{
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--color-text-tertiary)',
                padding: '32px 20px',
                margin: 0,
              }}>
                No one by that name
              </p>
            ) : results.map((contact, i) => {
              const pod = podMap.get(contact.list_ids[0])
              const dotColor = pod?.color ?? '#718096'
              const isActive = i === activeIndex
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => onSelectContact(contact)}
                  style={{
                    width: '100%',
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    border: 'none',
                    background: isActive ? 'var(--tint)' : 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                  }}
                >
                  {/* Pod color dot */}
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: dotColor,
                    flexShrink: 0,
                  }} />

                  {/* Name */}
                  <span style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {contact.name}
                  </span>

                  {/* Pod name */}
                  {pod && (
                    <span style={{
                      fontSize: 11,
                      color: 'var(--color-text-tertiary)',
                      flexShrink: 0,
                    }}>
                      {pod.name}
                    </span>
                  )}

                  {/* Last contact time */}
                  <span style={{
                    fontSize: 11,
                    color: 'var(--color-text-secondary)',
                    flexShrink: 0,
                    minWidth: 36,
                    textAlign: 'right',
                  }}>
                    {relativeTime(contact.last_contacted_at)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
