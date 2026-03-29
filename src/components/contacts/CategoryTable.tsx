import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { getContacts, getCategories, getPods, getAllInteractions, isOverdue } from '../../lib/airtable'
import { contactEquityScore, scoreLabel } from '../../lib/equity'
import type { Contact, Pod, Cadence } from '../../lib/types'
import { formatRelativeTime } from '../../lib/utils'
import { Avatar } from '../ui'
import { EmptyState } from '../empty/EmptyState'

type SortCol = 'name' | 'company' | 'equity' | 'last_contacted' | 'location' | 'follow_up' | 'frequency' | 'introduced_by' | 'email'
type SortDir = 'asc' | 'desc'

const EQUITY_BADGE: Record<string, { bg: string; color: string }> = {
  Thriving: { bg: 'rgba(37,180,57,0.12)',  color: '#16a34a' },
  Steady:   { bg: 'rgba(37,180,57,0.07)',  color: '#4ade80' },
  Cooling:  { bg: 'rgba(251,146,60,0.12)', color: '#ea580c' },
  Fading:   { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626' },
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>
  return <span style={{ marginLeft: 4 }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

export function CategoryTable() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [equityMap, setEquityMap] = useState<Record<string, number>>({})
  const [categoryName, setCategoryName] = useState('')
  const [podName, setPodName] = useState('')
  const [cadence, setCadence] = useState<Cadence>('monthly')
  const [loading, setLoading] = useState(true)

  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: 'equity', dir: 'desc' })
  const [filterOverdue, setFilterOverdue] = useState(false)
  const [filterCooling, setFilterCooling] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!id) { navigate('/map'); return }
    let stale = false

    async function load() {
      const [categoryContacts, categories, pods, allInteractions] = await Promise.all([
        getContacts(id),
        getCategories(),
        getPods(),
        getAllInteractions(),
      ])
      if (stale) return

      const cat = categories.find(c => c.id === id)
      if (!cat) { navigate('/map'); return }

      const pod = pods.find((p: Pod) => p.id === cat.list_id)
      setCategoryName(cat.name)
      setPodName(pod?.name ?? '')
      if (pod?.cadence) setCadence(pod.cadence)
      setContacts(categoryContacts)

      const eqMap: Record<string, number> = {}
      for (const contact of categoryContacts) {
        const interactions = allInteractions.filter(i => i.contact_id === contact.id)
        eqMap[contact.id] = contactEquityScore(interactions)
      }
      setEquityMap(eqMap)
      setLoading(false)
    }

    load().catch(err => {
      console.error('CategoryTable load error:', err)
      if (!stale) setLoading(false)
    })

    return () => { stale = true }
  }, [id, navigate])

  const overdueCount = useMemo(
    () => contacts.filter(c => isOverdue(c, cadence)).length,
    [contacts, cadence]
  )

  const filtered = useMemo(() => {
    let result = contacts

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.role ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.location ?? '').toLowerCase().includes(q) ||
        (c.country ?? '').toLowerCase().includes(q) ||
        (c.introduced_by ?? '').toLowerCase().includes(q)
      )
    }

    if (filterOverdue) result = result.filter(c => isOverdue(c, cadence))
    if (filterCooling) result = result.filter(c => scoreLabel(equityMap[c.id] ?? 0) === 'Cooling')

    return [...result].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      switch (sort.col) {
        case 'name':
          return dir * a.name.localeCompare(b.name)
        case 'company':
          return dir * (a.company ?? '').localeCompare(b.company ?? '')
        case 'equity':
          return dir * ((equityMap[a.id] ?? 0) - (equityMap[b.id] ?? 0))
        case 'last_contacted': {
          const aT = a.last_contacted_at ? new Date(a.last_contacted_at).getTime() : 0
          const bT = b.last_contacted_at ? new Date(b.last_contacted_at).getTime() : 0
          return dir * (aT - bT)
        }
        case 'location': {
          const aL = [a.location, a.country].filter(Boolean).join(', ')
          const bL = [b.location, b.country].filter(Boolean).join(', ')
          return dir * aL.localeCompare(bL)
        }
        case 'follow_up': {
          const aF = a.next_follow_up_date ? new Date(a.next_follow_up_date).getTime() : Infinity
          const bF = b.next_follow_up_date ? new Date(b.next_follow_up_date).getTime() : Infinity
          return dir * (aF - bF)
        }
        case 'frequency':
          return dir * (a.contact_frequency ?? '').localeCompare(b.contact_frequency ?? '')
        case 'introduced_by':
          return dir * (a.introduced_by ?? '').localeCompare(b.introduced_by ?? '')
        case 'email':
          return dir * (a.email ?? '').localeCompare(b.email ?? '')
      }
    })
  }, [contacts, equityMap, search, filterOverdue, filterCooling, sort, cadence])

  const toggleSort = useCallback((col: SortCol) => {
    setSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'desc' }
    )
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading...</span>
      </div>
    )
  }

  const COLS: { key: SortCol; label: string }[] = [
    { key: 'name',          label: 'Name' },
    { key: 'company',       label: 'Company' },
    { key: 'equity',        label: 'Equity' },
    { key: 'last_contacted', label: 'Last Contact' },
    { key: 'location',      label: 'Location' },
    { key: 'follow_up',     label: 'Follow-Up' },
    { key: 'frequency',     label: 'Frequency' },
    { key: 'introduced_by', label: 'Intro By' },
    { key: 'email',         label: 'Email' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      {/* Header */}
      <div style={{ padding: '28px 40px 0', flexShrink: 0 }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <button
            type="button"
            onClick={() => navigate('/map')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'inherit', fontSize: 13 }}
          >
            Map
          </button>
          <span style={{ color: 'var(--color-text-tertiary)' }}>›</span>
          {podName && (
            <>
              <span>{podName}</span>
              <span style={{ color: 'var(--color-text-tertiary)' }}>›</span>
            </>
          )}
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{categoryName}</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 30,
            fontWeight: 700,
            margin: 0,
            color: 'var(--color-text-primary)',
          }}>
            {categoryName}
          </h1>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 0, paddingBottom: 0 }}>
          <input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1,
              maxWidth: 280,
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--edge)',
              background: 'var(--color-surface)',
              fontSize: 13,
              color: 'var(--color-text-primary)',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={() => setFilterOverdue(v => !v)}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              border: `1px solid ${filterOverdue ? '#dc2626' : 'var(--edge)'}`,
              background: filterOverdue ? 'rgba(239,68,68,0.08)' : 'var(--color-surface)',
              color: filterOverdue ? '#dc2626' : 'var(--color-text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {overdueCount > 0 && (
              <span style={{
                width: 16, height: 16, borderRadius: '50%',
                background: '#dc2626', color: '#fff',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {overdueCount}
              </span>
            )}
            Overdue
          </button>
          <button
            type="button"
            onClick={() => setFilterCooling(v => !v)}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              border: `1px solid ${filterCooling ? '#ea580c' : 'var(--edge)'}`,
              background: filterCooling ? 'rgba(251,146,60,0.08)' : 'var(--color-surface)',
              color: filterCooling ? '#ea580c' : 'var(--color-text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            Cooling
          </button>
        </div>
      </div>

      {/* Table or empty */}
      {filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            }
            heading={search || filterOverdue || filterCooling ? 'No contacts match' : 'No contacts yet'}
            subtext={search || filterOverdue || filterCooling
              ? 'Try clearing a filter.'
              : 'Add contacts to this category to start tracking relationships.'}
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 40px 40px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--edge)' }}>
                {COLS.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: sort.col === key ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                    <SortIcon active={sort.col === key} dir={sort.dir} />
                  </th>
                ))}
                <th style={{
                  padding: '10px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-secondary)',
                  textAlign: 'left',
                  width: 48,
                }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(contact => {
                const score = equityMap[contact.id] ?? 0
                const label = scoreLabel(score)
                const badge = EQUITY_BADGE[label]
                const overdue = isOverdue(contact, cadence)

                return (
                  <tr
                    key={contact.id}
                    onClick={() => navigate(`/record/${contact.id}`)}
                    style={{
                      borderBottom: '1px solid var(--edge)',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--color-surface)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                  >
                    <td style={{ padding: '12px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={contact.name} size={28} />
                        <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{contact.name}</span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 12px', color: 'var(--color-text-secondary)' }}>
                      {contact.company && <div>{contact.company}</div>}
                      {contact.role && (
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{contact.role}</div>
                      )}
                    </td>

                    <td style={{ padding: '12px 12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 8px',
                        borderRadius: 100,
                        fontSize: 11,
                        fontWeight: 600,
                        background: badge.bg,
                        color: badge.color,
                        whiteSpace: 'nowrap',
                      }}>
                        {label}
                        <span style={{ opacity: 0.75 }}>{score}</span>
                      </span>
                    </td>

                    <td style={{
                      padding: '12px 12px',
                      color: overdue ? '#dc2626' : 'var(--color-text-secondary)',
                      fontSize: 13,
                    }}>
                      {contact.last_contacted_at
                        ? formatRelativeTime(contact.last_contacted_at)
                        : <span style={{ color: 'var(--color-text-tertiary)' }}>Never</span>
                      }
                    </td>

                    <td style={{ padding: '12px 12px', color: 'var(--color-text-secondary)', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {[contact.location, contact.country].filter(Boolean).join(', ') || <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                    </td>

                    <td style={{ padding: '12px 12px', fontSize: 13 }}>
                      {contact.next_follow_up_date ? (
                        <span style={{
                          color: new Date(contact.next_follow_up_date) < new Date() ? '#dc2626' : 'var(--color-text-secondary)',
                        }}>
                          {new Date(contact.next_follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      ) : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                    </td>

                    <td style={{ padding: '12px 12px' }}>
                      {contact.contact_frequency ? (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 100,
                          fontSize: 11,
                          fontWeight: 500,
                          background: 'var(--color-surface)',
                          color: 'var(--color-text-secondary)',
                          whiteSpace: 'nowrap',
                        }}>
                          {contact.contact_frequency}
                        </span>
                      ) : <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>—</span>}
                    </td>

                    <td style={{ padding: '12px 12px', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                      {contact.introduced_by || <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                    </td>

                    <td style={{ padding: '12px 12px', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                      {contact.email ? (
                        <span style={{ opacity: 0.8 }}>{contact.email}</span>
                      ) : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                    </td>

                    <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                      {overdue && (
                        <span
                          style={{
                            display: 'inline-block',
                            width: 7, height: 7,
                            borderRadius: '50%',
                            background: '#dc2626',
                          }}
                          title="Overdue"
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
