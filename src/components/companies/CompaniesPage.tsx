import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { getContacts, getPods, getAllInteractions } from '../../lib/airtable'
import { contactEquityScore, scoreLabel } from '../../lib/equity'
import { formatRelativeTime } from '../../lib/utils'
import type { Contact, Pod } from '../../lib/types'
import type { Interaction } from '../../lib/types'

type SortCol = 'name' | 'industry' | 'stage' | 'domain' | 'location' | 'equity' | 'last_contact'
type SortDir = 'asc' | 'desc'

const EQUITY_BADGE: Record<string, { bg: string; color: string }> = {
  Thriving: { bg: 'rgba(37,180,57,0.12)', color: '#16a34a' },
  Steady:   { bg: 'rgba(37,180,57,0.07)', color: '#4ade80' },
  Cooling:  { bg: 'rgba(251,146,60,0.12)', color: '#ea580c' },
  Fading:   { bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span style={{ opacity: 0.3, marginLeft: 4, fontSize: 10 }}>↕</span>
  return <span style={{ marginLeft: 4, fontSize: 10 }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

export function CompaniesPage() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [equityMap, setEquityMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: 'name', dir: 'asc' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [allContacts, allPods, allInteractions] = await Promise.all([
        getContacts(),
        getPods(),
        getAllInteractions(),
      ])
      if (cancelled) return
      const companies = allContacts.filter(c => c.type === 'Company')
      setContacts(companies)
      setPods(allPods)

      const interactionsByContact: Record<string, Interaction[]> = {}
      for (const ix of allInteractions) {
        ;(interactionsByContact[ix.contact_id] ??= []).push(ix)
      }
      const eMap: Record<string, number> = {}
      for (const c of companies) {
        const pod = allPods.find(p => c.list_ids.includes(p.id))
        eMap[c.id] = contactEquityScore(c, interactionsByContact[c.id] ?? [], pod?.cadence ?? 'monthly')
      }
      setEquityMap(eMap)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const toggleSort = useCallback((col: SortCol) => {
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  }, [])

  const filtered = useMemo(() => {
    let list = contacts
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.industry ?? '').toLowerCase().includes(q) ||
        (c.domain ?? '').toLowerCase().includes(q) ||
        (c.location ?? '').toLowerCase().includes(q)
      )
    }
    list = [...list].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      switch (sort.col) {
        case 'name': return dir * a.name.localeCompare(b.name)
        case 'industry': return dir * (a.industry ?? '').localeCompare(b.industry ?? '')
        case 'stage': return dir * (a.stage ?? '').localeCompare(b.stage ?? '')
        case 'domain': return dir * (a.domain ?? '').localeCompare(b.domain ?? '')
        case 'location': return dir * (a.location ?? '').localeCompare(b.location ?? '')
        case 'equity': return dir * ((equityMap[a.id] ?? 0) - (equityMap[b.id] ?? 0))
        case 'last_contact': {
          const da = a.last_contacted_at ? new Date(a.last_contacted_at).getTime() : 0
          const db = b.last_contacted_at ? new Date(b.last_contacted_at).getTime() : 0
          return dir * (da - db)
        }
        default: return 0
      }
    })
    return list
  }, [contacts, search, sort, equityMap])

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--color-text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--divider)',
  }

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 13,
    color: 'var(--color-text-primary)',
    borderBottom: '1px solid var(--divider)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 200,
  }

  if (loading) {
    return (
      <div style={{ padding: '48px 32px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 20, height: 20, border: '2px solid var(--edge)', borderTopColor: 'var(--color-brand)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '28px 32px 16px',
        borderBottom: '1px solid var(--divider)',
        background: 'var(--surface-panel)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--color-text-primary)',
          margin: 0,
          marginBottom: 16,
        }}>
          Companies
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1,
              maxWidth: 320,
              padding: '8px 12px',
              fontSize: 13,
              fontFamily: 'inherit',
              border: '1px solid var(--edge)',
              borderRadius: 8,
              background: 'var(--color-bg)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {filtered.length} {filtered.length === 1 ? 'company' : 'companies'}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 32px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            {search ? 'No companies match your search.' : 'No companies yet.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle} onClick={() => toggleSort('name')}>Name <SortIcon active={sort.col === 'name'} dir={sort.dir} /></th>
                <th style={thStyle} onClick={() => toggleSort('industry')}>Industry <SortIcon active={sort.col === 'industry'} dir={sort.dir} /></th>
                <th style={thStyle} onClick={() => toggleSort('stage')}>Stage <SortIcon active={sort.col === 'stage'} dir={sort.dir} /></th>
                <th style={thStyle} onClick={() => toggleSort('domain')}>Domain <SortIcon active={sort.col === 'domain'} dir={sort.dir} /></th>
                <th style={thStyle} onClick={() => toggleSort('location')}>Location <SortIcon active={sort.col === 'location'} dir={sort.dir} /></th>
                <th style={thStyle} onClick={() => toggleSort('equity')}>Equity <SortIcon active={sort.col === 'equity'} dir={sort.dir} /></th>
                <th style={thStyle} onClick={() => toggleSort('last_contact')}>Last Contact <SortIcon active={sort.col === 'last_contact'} dir={sort.dir} /></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const eq = equityMap[c.id] ?? 0
                const label = scoreLabel(eq)
                const badge = EQUITY_BADGE[label] ?? EQUITY_BADGE.Fading
                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/contact/${c.id}`)}
                    style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--tint-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{c.name}</td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>{c.industry ?? '-'}</td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>{c.stage ?? '-'}</td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>{c.domain ?? '-'}</td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>{c.location ?? '-'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, borderRadius: 100,
                        padding: '2px 8px', background: badge.bg, color: badge.color,
                      }}>
                        {label}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                      {c.last_contacted_at ? formatRelativeTime(c.last_contacted_at) : 'Never'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
