import { useCallback, useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { getCompanies } from '../../lib/airtable'
import { EmptyState } from '../empty/EmptyState'
import type { Company } from '../../lib/types'

type SortCol = 'name' | 'industry' | 'stage' | 'domain' | 'location'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span style={{ opacity: 0.3, marginLeft: 4, fontSize: 10 }}>↕</span>
  return <span style={{ marginLeft: 4, fontSize: 10 }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

export function CompaniesPage() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: 'name', dir: 'asc' })

  useEffect(() => {
    let cancelled = false
    getCompanies().then(data => {
      if (!cancelled) { setCompanies(data); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [])

  const toggleSort = useCallback((col: SortCol) => {
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  }, [])

  const filtered = useMemo(() => {
    let list = companies
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
        default: return 0
      }
    })
    return list
  }, [companies, search, sort])

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
      <div style={{
        padding: '28px clamp(16px, 4vw, 32px) 16px',
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

      <div style={{ flex: 1, overflow: 'auto', padding: '0 clamp(16px, 4vw, 32px)' }}>
        {companies.length === 0 ? (
          <EmptyState
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/></svg>}
            heading="No companies yet"
            subtext="Import companies or add them manually to get started."
            ctaLabel="Import"
            onCta={() => navigate('/import')}
            ghosts={2}
          />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            No companies match your search.
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
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--tint-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{c.name}</td>
                  <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>{c.industry ?? '-'}</td>
                  <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>{c.stage ?? '-'}</td>
                  <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>{c.domain ?? '-'}</td>
                  <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>{c.location ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
