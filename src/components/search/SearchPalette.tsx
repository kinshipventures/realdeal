import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router'
import type { Contact, Pod, Campaign, Project } from '../../lib/types'
import { getContacts, getPods, getAllCampaigns, getProjects } from '../../lib/airtable'
import { useEscape } from '../../lib/escapeStack'

export type SearchResultType = 'contact' | 'company' | 'pod' | 'pipeline' | 'project'

export interface SearchResult {
  id: string
  name: string
  type: SearchResultType
  subtitle?: string
  color?: string
}

export type QuickActionId = 'create-contact' | 'create-company' | 'new-campaign' | 'import' | 'log-interaction'

export interface QuickAction {
  id: QuickActionId
  label: string
  description: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'log-interaction', label: 'Log touchpoint', description: 'Record a call, meeting, email...' },
  { id: 'create-contact', label: 'Create contact', description: 'Add a new person' },
  { id: 'create-company', label: 'Create company', description: 'Add an organization' },
  { id: 'new-campaign', label: 'New campaign', description: 'Start a campaign or pipeline' },
  { id: 'import', label: 'Import CSV', description: 'Bulk import contacts' },
]

interface SearchPaletteProps {
  onClose: () => void
  onSelect: (result: SearchResult) => void
  onQuickAction?: (action: QuickActionId) => void
  /** @deprecated Use onSelect instead */
  onSelectContact?: (contact: Contact) => void
}

const TYPE_META: Record<SearchResultType, { label: string }> = {
  contact: { label: 'People' },
  company: { label: 'Companies' },
  pod: { label: 'Pods' },
  pipeline: { label: 'Campaigns' },
  project: { label: 'Projects' },
}

function TypeIcon({ type, size = 16, color = 'currentColor' }: { type: SearchResultType; size?: number; color?: string }) {
  const s = { width: size, height: size, flexShrink: 0 } as const
  const p = { fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (type === 'contact') return (
    <svg viewBox="0 0 24 24" style={s} {...p}><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" /></svg>
  )
  if (type === 'company') return (
    <svg viewBox="0 0 24 24" style={s} {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" /></svg>
  )
  if (type === 'pod') return (
    <svg viewBox="0 0 24 24" style={s} {...p}><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="1" fill={color} stroke="none" /></svg>
  )
  if (type === 'pipeline') return (
    <svg viewBox="0 0 24 24" style={s} {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
  )
  return (
    <svg viewBox="0 0 24 24" style={s} {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
  )
}

function ActionIcon({ id, size = 16, color = 'currentColor' }: { id: QuickActionId; size?: number; color?: string }) {
  const s = { width: size, height: size, flexShrink: 0 } as const
  const p = { fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (id === 'log-interaction') return (
    <svg viewBox="0 0 24 24" style={s} {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
  )
  if (id === 'create-contact') return (
    <svg viewBox="0 0 24 24" style={s} {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
  )
  if (id === 'create-company') return (
    <svg viewBox="0 0 24 24" style={s} {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="14" /><line x1="9" y1="11" x2="15" y2="11" /></svg>
  )
  if (id === 'new-campaign') return (
    <svg viewBox="0 0 24 24" style={s} {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
  )
  // import
  return (
    <svg viewBox="0 0 24 24" style={s} {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
  )
}

export function SearchPalette({ onClose, onSelect, onQuickAction, onSelectContact }: SearchPaletteProps) {
  const navigate = useNavigate()
  const [logMode, setLogMode] = useState(false)
  const [query, setQuery] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [pipelines, setPipelines] = useState<Campaign[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [podMap, setPodMap] = useState<Map<string, Pod>>(new Map())
  const [activeIndex, setActiveIndex] = useState(-1)
  const [hoveredIndex, setHoveredIndex] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)

  const handleEscape = useCallback(() => {
    if (logMode) { setLogMode(false); setQuery(''); setActiveIndex(-1) }
    else onClose()
  }, [logMode, onClose])
  useEscape(handleEscape)

  useEffect(() => {
    let cancelled = false
    Promise.all([getContacts(), getPods(), getAllCampaigns(), getProjects()]).then(([cts, pds, pls, pjs]) => {
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

  const results: SearchResult[] = query ? (() => {
    const all: (SearchResult & { rank: number })[] = []

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

    for (const c of contacts) {
      if (c.type !== 'Company') continue
      const name = c.name.toLowerCase()
      const prefix = name.startsWith(q)
      if (prefix || name.includes(q)) all.push({ id: c.id, name: c.name, type: 'company', rank: prefix ? 0 : 1 })
    }

    for (const p of pods) {
      const name = p.name.toLowerCase()
      const prefix = name.startsWith(q)
      if (prefix || name.includes(q)) all.push({ id: p.id, name: p.name, type: 'pod', color: p.color, rank: prefix ? 0 : 1 })
    }

    for (const p of pipelines) {
      const name = p.name.toLowerCase()
      const prefix = name.startsWith(q)
      if (prefix || name.includes(q)) all.push({ id: p.id, name: p.name, type: 'pipeline', rank: prefix ? 0 : 1 })
    }

    for (const p of projects) {
      const name = p.name.toLowerCase()
      const prefix = name.startsWith(q)
      if (prefix || name.includes(q)) all.push({ id: p.id, name: p.name, type: 'project', rank: prefix ? 0 : 1 })
    }

    all.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    const limited = all.slice(0, 20)
    return logMode ? limited.filter(r => r.type === 'contact') : limited
  })() : []

  // Filter quick actions by query too; hide all in log mode
  const filteredActions = logMode ? [] : query
    ? QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
    : QUICK_ACTIONS

  // Total selectable items: quick actions (when no query or matching) + results
  const totalItems = (query ? results.length + filteredActions.length : filteredActions.length)

  useEffect(() => setActiveIndex(-1), [query])

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const row = listRef.current.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement | undefined
    row?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (i + 1) % Math.max(totalItems, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (i <= 0 ? totalItems - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectAtIndex(activeIndex)
    }
  }

  function selectAtIndex(idx: number) {
    const actionCount = filteredActions.length
    if (idx < actionCount) {
      const action = filteredActions[idx]
      if (action.id === 'log-interaction') {
        setLogMode(true); setQuery(''); setActiveIndex(-1)
        return
      }
      onQuickAction?.(action.id)
      onClose()
      return
    }
    const resultIdx = idx - actionCount
    if (query && resultIdx >= 0 && resultIdx < results.length) {
      const r = results[resultIdx]
      if (logMode && r.type === 'contact') {
        sessionStorage.setItem('rd:auto-log', r.id)
        navigate(`/contact/${r.id}`)
        onClose()
        return
      }
      if (onSelectContact && r.type === 'contact') {
        const c = contacts.find(ct => ct.id === r.id)
        if (c) { onSelectContact(c); return }
      }
      onSelect(r)
    }
  }

  function handleResultClick(r: SearchResult) {
    if (logMode && r.type === 'contact') {
      sessionStorage.setItem('rd:auto-log', r.id)
      navigate(`/contact/${r.id}`)
      onClose()
      return
    }
    if (onSelectContact && r.type === 'contact') {
      const c = contacts.find(ct => ct.id === r.id)
      if (c) { onSelectContact(c); return }
    }
    onSelect(r)
  }

  // Build grouped display for search results
  let lastType: SearchResultType | null = null
  let globalIdx = filteredActions.length // offset by quick actions count
  const rows: { result: SearchResult; idx: number; showHeader: boolean }[] = []
  for (const r of results) {
    const showHeader = r.type !== lastType
    rows.push({ result: r, idx: globalIdx, showHeader })
    lastType = r.type
    globalIdx++
  }

  const highlightIdx = activeIndex >= 0 ? activeIndex : hoveredIndex

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.18)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        paddingTop: '15vh',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'calc(100% - 32px)', maxWidth: 540,
          borderRadius: 24,
          background: 'rgba(255,255,255,0.82)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)',
          overflow: 'hidden',
          animation: 'spotlight-in 200ms cubic-bezier(0.175, 0.885, 0.32, 1.1) both',
          backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        }}
      >
        <style>{`
          @keyframes spotlight-in {
            from { opacity: 0; transform: scale(0.95) translateY(-8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Log mode header */}
        {logMode && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px 0',
          }}>
            <button
              type="button"
              onClick={() => { setLogMode(false); setQuery('') }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 600, color: 'var(--color-brand)',
                background: 'rgba(var(--color-brand-rgb, 27,107,74), 0.08)',
                border: 'none', borderRadius: 100,
                padding: '3px 10px 3px 8px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Log touchpoint
            </button>
          </div>
        )}

        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            autoFocus type="text" value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={logMode ? 'Who did you interact with?' : 'Search or jump to...'}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 18, fontWeight: 400, fontFamily: 'inherit',
              color: 'var(--color-text-primary)', padding: '20px 0',
              letterSpacing: '-0.01em',
            }}
          />
          <kbd style={{
            fontSize: 10, fontWeight: 600, fontFamily: 'inherit',
            padding: '3px 6px', borderRadius: 5,
            background: 'rgba(0,0,0,0.06)', color: 'var(--color-text-tertiary)',
            border: '1px solid rgba(0,0,0,0.06)',
            lineHeight: 1, flexShrink: 0,
          }}>ESC</kbd>
        </div>

        <div ref={listRef} style={{ maxHeight: 420, overflowY: 'auto', padding: '4px 0' }}>
          {/* Quick actions */}
          {filteredActions.length > 0 && (
            <>
              <div style={{
                padding: '10px 20px 4px', fontSize: 10, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: 'var(--color-text-tertiary)',
              }}>
                Quick Actions
              </div>
              {filteredActions.map((action, i) => (
                <button
                  key={action.id}
                  type="button"
                  data-idx={i}
                  onClick={() => {
                    if (action.id === 'log-interaction') { setLogMode(true); setQuery(''); setActiveIndex(-1); return }
                    onQuickAction?.(action.id); onClose()
                  }}
                  onMouseEnter={() => { setHoveredIndex(i); setActiveIndex(-1) }}
                  onMouseLeave={() => setHoveredIndex(-1)}
                  style={{
                    width: 'calc(100% - 12px)', margin: '0 6px',
                    padding: '10px 14px', height: 44,
                    display: 'flex', alignItems: 'center', gap: 10,
                    border: 'none', borderRadius: 10, cursor: 'pointer',
                    fontFamily: 'inherit', textAlign: 'left',
                    background: highlightIdx === i ? 'var(--color-brand, #1B6B4A)' : 'transparent',
                    transition: 'background 120ms ease',
                  }}
                >
                  <ActionIcon
                    id={action.id}
                    size={16}
                    color={highlightIdx === i ? 'rgba(255,255,255,0.85)' : 'var(--color-text-tertiary)'}
                  />
                  <span style={{
                    fontSize: 14, fontWeight: 500, flex: 1,
                    color: highlightIdx === i ? '#fff' : 'var(--color-text-primary)',
                    transition: 'color 120ms ease',
                  }}>
                    {action.label}
                  </span>
                  <span style={{
                    fontSize: 12,
                    color: highlightIdx === i ? 'rgba(255,255,255,0.6)' : 'var(--color-text-tertiary)',
                    transition: 'color 120ms ease',
                  }}>{action.description}</span>
                </button>
              ))}
            </>
          )}

          {/* Search results */}
          {query && results.length === 0 && filteredActions.length === 0 && (
            <div style={{ padding: '32px 20px 36px', textAlign: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px', opacity: 0.4 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>
                No results found
              </p>
            </div>
          )}

          {rows.length > 0 && (
            <>
              {rows.map(({ result, idx, showHeader }) => (
                <div key={`${result.type}-${result.id}`}>
                  {showHeader && (
                    <div style={{
                      padding: '10px 20px 4px', fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: 'var(--color-text-tertiary)',
                      borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: 4, paddingTop: 12,
                    }}>
                      {TYPE_META[result.type].label}
                    </div>
                  )}
                  <button
                    type="button"
                    data-idx={idx}
                    onClick={() => handleResultClick(result)}
                    onMouseEnter={() => { setHoveredIndex(idx); setActiveIndex(-1) }}
                    onMouseLeave={() => setHoveredIndex(-1)}
                    style={{
                      width: 'calc(100% - 12px)', margin: '0 6px',
                      padding: '10px 14px', height: 44,
                      display: 'flex', alignItems: 'center', gap: 10,
                      border: 'none', borderRadius: 10, cursor: 'pointer',
                      fontFamily: 'inherit', textAlign: 'left',
                      background: highlightIdx === idx ? 'var(--color-brand, #1B6B4A)' : 'transparent',
                      transition: 'background 120ms ease, transform 120ms ease',
                      transform: highlightIdx === idx ? 'scale(1.005)' : 'scale(1)',
                    }}
                  >
                    <TypeIcon
                      type={result.type}
                      size={16}
                      color={highlightIdx === idx ? 'rgba(255,255,255,0.85)' : 'var(--color-text-tertiary)'}
                    />
                    {result.color && (
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: result.color, flexShrink: 0,
                        boxShadow: highlightIdx === idx ? '0 0 0 1px rgba(255,255,255,0.3)' : 'none',
                      }} />
                    )}
                    <span style={{
                      fontSize: 14, fontWeight: 500, flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: highlightIdx === idx ? '#fff' : 'var(--color-text-primary)',
                      transition: 'color 120ms ease',
                    }}>
                      {result.name}
                    </span>
                    {result.subtitle && (
                      <span style={{
                        fontSize: 12, flexShrink: 0,
                        color: highlightIdx === idx ? 'rgba(255,255,255,0.6)' : 'var(--color-text-tertiary)',
                        transition: 'color 120ms ease',
                      }}>{result.subtitle}</span>
                    )}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
