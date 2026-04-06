import { useState, useEffect, useCallback, useRef } from 'react'
import type { Contact, Pod, Pipeline, Project } from '../../lib/types'
import { getContacts, getPods, getPipelines, getProjects } from '../../lib/airtable'
import { useEscape } from '../../lib/escapeStack'

export type SearchResultType = 'contact' | 'company' | 'pod' | 'pipeline' | 'project'

export interface SearchResult {
  id: string
  name: string
  type: SearchResultType
  subtitle?: string
  color?: string
}

interface SearchPaletteProps {
  onClose: () => void
  onSelect: (result: SearchResult) => void
  /** @deprecated Use onSelect instead */
  onSelectContact?: (contact: Contact) => void
}

const TYPE_ICONS: Record<SearchResultType, { icon: string; label: string }> = {
  contact: { icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', label: 'People' },
  company: { icon: 'M3 21h18M3 7v14M21 7v14M6 11h.01M6 15h.01M6 19h.01M10 11h.01M10 15h.01M10 19h.01M14 11h.01M14 15h.01M14 19h.01M18 11h.01M18 15h.01M18 19h.01', label: 'Companies' },
  pod: { icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', label: 'Pods' },
  pipeline: { icon: 'M22 12h-4l-3 9L9 3l-3 9H2', label: 'Pipelines' },
  project: { icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', label: 'Projects' },
}

function relativeTime(lastContactedAt: string | null): string {
  if (!lastContactedAt) return 'Never'
  const days = Math.floor((Date.now() - new Date(lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return `${Math.floor(days / 30)}mo`
}

export function SearchPalette({ onClose, onSelect, onSelectContact }: SearchPaletteProps) {
  const [query, setQuery] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [podMap, setPodMap] = useState<Map<string, Pod>>(new Map())
  const [activeIndex, setActiveIndex] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => onClose(), [onClose])
  useEscape(handleClose)

  useEffect(() => {
    let cancelled = false
    Promise.all([getContacts(), getPods(), getPipelines(), getProjects()]).then(([cts, pds, pls, pjs]) => {
      if (cancelled) return
      setContacts(cts)
      setPods(pds)
      setPodMap(new Map(pds.map(p => [p.id, p])))
      setPipelines(pls)
      setProjects(pjs)
    })
    return () => { cancelled = true }
  }, [])

  const q = query.toLowerCase()

  // Build ranked results grouped by type
  const results: SearchResult[] = query ? (() => {
    const all: (SearchResult & { rank: number })[] = []

    // Contacts (type !== 'Company')
    for (const c of contacts) {
      if (c.type === 'Company') continue
      const name = c.name.toLowerCase()
      const prefix = name.startsWith(q)
      const match = prefix || name.includes(q) || (c.company?.toLowerCase().includes(q) ?? false) || (c.email?.toLowerCase().includes(q) ?? false)
      if (match) {
        const pod = podMap.get(c.list_ids[0])
        all.push({ id: c.id, name: c.name, type: 'contact', subtitle: pod?.name, color: pod?.color, rank: prefix ? 0 : 1 })
      }
    }

    // Companies (contacts with type === 'Company')
    for (const c of contacts) {
      if (c.type !== 'Company') continue
      const name = c.name.toLowerCase()
      const prefix = name.startsWith(q)
      const match = prefix || name.includes(q)
      if (match) all.push({ id: c.id, name: c.name, type: 'company', rank: prefix ? 0 : 1 })
    }

    // Pods
    for (const p of pods) {
      const name = p.name.toLowerCase()
      const prefix = name.startsWith(q)
      if (prefix || name.includes(q)) all.push({ id: p.id, name: p.name, type: 'pod', color: p.color, rank: prefix ? 0 : 1 })
    }

    // Pipelines
    for (const p of pipelines) {
      const name = p.name.toLowerCase()
      const prefix = name.startsWith(q)
      if (prefix || name.includes(q)) all.push({ id: p.id, name: p.name, type: 'pipeline', rank: prefix ? 0 : 1 })
    }

    // Projects
    for (const p of projects) {
      const name = p.name.toLowerCase()
      const prefix = name.startsWith(q)
      if (prefix || name.includes(q)) all.push({ id: p.id, name: p.name, type: 'project', rank: prefix ? 0 : 1 })
    }

    // Sort: prefix matches first, then alphabetical, grouped by type
    all.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    return all.slice(0, 20)
  })() : []

  useEffect(() => setActiveIndex(-1), [query])

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
      const r = results[activeIndex]
      // Support legacy callback
      if (onSelectContact && r.type === 'contact') {
        const c = contacts.find(ct => ct.id === r.id)
        if (c) { onSelectContact(c); return }
      }
      onSelect(r)
    }
  }

  function handleResultClick(r: SearchResult) {
    if (onSelectContact && r.type === 'contact') {
      const c = contacts.find(ct => ct.id === r.id)
      if (c) { onSelectContact(c); return }
    }
    onSelect(r)
  }

  // Group results by type for section headers
  const grouped: { type: SearchResultType; items: SearchResult[] }[] = []
  let lastType: SearchResultType | null = null
  let globalIdx = 0
  const resultWithIndex: { result: SearchResult; idx: number; showHeader: boolean }[] = []
  for (const r of results) {
    const showHeader = r.type !== lastType
    resultWithIndex.push({ result: r, idx: globalIdx, showHeader })
    if (showHeader) {
      grouped.push({ type: r.type, items: [] })
      lastType = r.type
    }
    grouped[grouped.length - 1].items.push(r)
    globalIdx++
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '20vh',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'calc(100% - 32px)', maxWidth: 480,
          borderRadius: 'var(--panel-radius, 16px)',
          background: 'var(--surface-panel)', border: 'var(--surface-panel-border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.12)', overflow: 'hidden',
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 10 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            autoFocus type="text" value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search everything..."
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 16, fontWeight: 400, fontFamily: 'inherit',
              color: 'var(--color-text-primary)', padding: '16px 0',
            }}
          />
        </div>

        {/* Results */}
        {query && (
          <div ref={listRef} style={{ maxHeight: 360, overflowY: 'auto' }}>
            {results.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)', padding: '32px 20px', margin: 0 }}>
                No results
              </p>
            ) : resultWithIndex.map(({ result, idx, showHeader }) => (
              <div key={`${result.type}-${result.id}`}>
                {showHeader && (
                  <div style={{ padding: '8px 20px 4px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' }}>
                    {TYPE_ICONS[result.type].label}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleResultClick(result)}
                  style={{
                    width: '100%', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 10,
                    border: 'none', background: idx === activeIndex ? 'var(--tint)' : 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  {result.color && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: result.color, flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {result.name}
                  </span>
                  {result.subtitle && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{result.subtitle}</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
