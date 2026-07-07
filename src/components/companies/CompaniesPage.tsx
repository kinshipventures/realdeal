import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { ListFilter } from 'lucide-react'
import { getCampaigns, getCategories, getContacts, getPods } from '../../lib/data'
import { getSharedContactsWithMe } from '../../lib/collaboration'
import { EmptyState } from '../empty/EmptyState'
import type { Category, Contact, Pod } from '../../lib/types'
import { projectSharedWorkspaceResources } from '../../lib/sharedContactProjection'
import { isTeamWorkspace, useWorkspace } from '@/contexts/WorkspaceContext'

type SortCol = 'name' | 'industry' | 'stage' | 'pod' | 'subpod' | 'domain' | 'location'
type SortDir = 'asc' | 'desc'
type CompanyFilterFieldId =
  | 'name'
  | 'industry'
  | 'stage'
  | 'pod'
  | 'subpod'
  | 'domain'
  | 'location'
  | 'website'
  | 'linkedin'
  | 'email'
  | 'phone'
  | 'city'
  | 'state'
  | 'country'
  | 'global_region'

type CompanyColumnId = 'name' | 'industry' | 'stage' | 'pod' | 'subpod' | 'domain' | 'location' | 'linkedin'

const COMPANY_FILTER_FIELDS: Array<{ id: CompanyFilterFieldId; label: string }> = [
  { id: 'name', label: 'Name' },
  { id: 'industry', label: 'Industry' },
  { id: 'stage', label: 'Stage' },
  { id: 'pod', label: 'Pod' },
  { id: 'subpod', label: 'Sub-pod' },
  { id: 'domain', label: 'Domain' },
  { id: 'location', label: 'Location' },
  { id: 'website', label: 'Website' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'city', label: 'City' },
  { id: 'state', label: 'State' },
  { id: 'country', label: 'Country' },
  { id: 'global_region', label: 'Global Region' },
]

const COMPANY_COLUMNS: Array<{ id: CompanyColumnId; label: string; defaultVisible: boolean; sort?: SortCol }> = [
  { id: 'name', label: 'Name', defaultVisible: true, sort: 'name' },
  { id: 'industry', label: 'Industry', defaultVisible: true, sort: 'industry' },
  { id: 'stage', label: 'Stage', defaultVisible: true, sort: 'stage' },
  { id: 'pod', label: 'Pod', defaultVisible: true, sort: 'pod' },
  { id: 'subpod', label: 'Sub-pod', defaultVisible: true, sort: 'subpod' },
  { id: 'domain', label: 'Domain', defaultVisible: true, sort: 'domain' },
  { id: 'location', label: 'Location', defaultVisible: true, sort: 'location' },
  { id: 'linkedin', label: 'LinkedIn', defaultVisible: false },
]

const DEFAULT_COMPANY_COLUMNS = new Set(
  COMPANY_COLUMNS.filter(column => column.defaultVisible).map(column => column.id),
)

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span style={{ opacity: 0.3, marginLeft: 4, fontSize: 10 }}>↕</span>
  return <span style={{ marginLeft: 4, fontSize: 10 }}>{dir === 'asc' ? '↑' : '↓'}</span>
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

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const h = ((hash % 360) + 360) % 360
  return `hsl(${h}, 45%, 55%)`
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? ''
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function normalizedFilterText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function uniqueFilterOptions(values: Iterable<string>): string[] {
  const seen = new Map<string, string>()
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = normalizedFilterText(trimmed)
    if (!seen.has(key)) seen.set(key, trimmed)
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b))
}

function filterValueParts(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(filterValueParts)
  if (typeof value === 'string') return value.split(',').map(part => part.trim()).filter(Boolean)
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)]
  return []
}

function customFieldValues(company: Contact, keys: string[]): string[] {
  return keys.flatMap(key => filterValueParts(company.custom_fields?.[key]))
}

function namesFromIds(ids: string[], map: Map<string, { name: string }>): string[] {
  return ids.map(id => map.get(id)?.name).filter((name): name is string => Boolean(name))
}

function displayList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : '-'
}

function companyDomain(company: Contact): string | null {
  return company.domain ?? company.website ?? null
}

function companyCity(company: Contact): string | null {
  return customFieldValues(company, ['city', 'City'])[0] ?? null
}

function companyState(company: Contact): string | null {
  return customFieldValues(company, ['state', 'State'])[0] ?? null
}

export function CompaniesPage({
  embedded,
  hideInlineCount,
  onFilteredCountChange,
  onOpenCompany,
}: {
  embedded?: boolean
  hideInlineCount?: boolean
  onFilteredCountChange?: (count: number) => void
  onOpenCompany?: (company: Contact) => void
} = {}) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { activeWorkspace } = useWorkspace()
  const includeSharedWorkspaceResources = !isTeamWorkspace(activeWorkspace)
  const columnFilterRef = useRef<HTMLDivElement>(null)
  const [companies, setCompanies] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [fieldFilter, setFieldFilter] = useState<CompanyFilterFieldId | null>(null)
  const [fieldValue, setFieldValue] = useState<string | null>(null)
  const [showColumnFilter, setShowColumnFilter] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<CompanyColumnId>>(() => new Set(DEFAULT_COMPANY_COLUMNS))
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: 'name', dir: 'asc' })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getContacts(),
      getPods(),
      getCategories(),
      getCampaigns(),
      includeSharedWorkspaceResources ? getSharedContactsWithMe() : Promise.resolve([]),
    ]).then(([contacts, loadedPods, loadedCategories, campaigns, incomingSharedContacts]) => {
      const projection = projectSharedWorkspaceResources(incomingSharedContacts, {
        pods: loadedPods,
        categories: loadedCategories,
        campaigns,
        contacts,
      })
      if (!cancelled) {
        setPods(loadedPods)
        setCategories(loadedCategories)
        setCompanies(projection.contacts.filter(contact => contact.type === 'Company'))
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [includeSharedWorkspaceResources])

  useEffect(() => {
    if (!showColumnFilter) return
    const handlePointerDown = (event: PointerEvent) => {
      if (columnFilterRef.current && !columnFilterRef.current.contains(event.target as Node)) {
        setShowColumnFilter(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [showColumnFilter])

  const podMap = useMemo(() => new Map(pods.map(pod => [pod.id, pod])), [pods])
  const categoryMap = useMemo(() => new Map(categories.map(category => [category.id, category])), [categories])

  const podNamesForCompany = useCallback(
    (company: Contact) => namesFromIds(company.list_ids ?? [], podMap),
    [podMap],
  )

  const subPodNamesForCompany = useCallback(
    (company: Contact) => namesFromIds(company.category_ids ?? [], categoryMap),
    [categoryMap],
  )

  const filterValuesForCompany = useCallback((company: Contact, fieldId: CompanyFilterFieldId | null): string[] => {
    if (!fieldId) return []
    switch (fieldId) {
      case 'name':
        return filterValueParts(company.name)
      case 'industry':
        return filterValueParts(company.industry)
      case 'stage':
        return filterValueParts(company.stage)
      case 'pod':
        return podNamesForCompany(company)
      case 'subpod':
        return subPodNamesForCompany(company)
      case 'domain':
        return filterValueParts(companyDomain(company))
      case 'location':
        return filterValueParts(company.location)
      case 'website':
        return filterValueParts(company.website)
      case 'linkedin':
        return filterValueParts(company.linkedin)
      case 'email':
        return filterValueParts(company.email)
      case 'phone':
        return filterValueParts(company.phone)
      case 'city':
        return customFieldValues(company, ['city', 'City'])
      case 'state':
        return customFieldValues(company, ['state', 'State'])
      case 'country':
        return filterValueParts(company.country)
      case 'global_region':
        return filterValueParts(company.global_region)
      default:
        return []
    }
  }, [podNamesForCompany, subPodNamesForCompany])

  const filterValueOptions = useMemo(() => {
    return uniqueFilterOptions(companies.flatMap(company => filterValuesForCompany(company, fieldFilter)))
  }, [companies, fieldFilter, filterValuesForCompany])

  const toggleSort = useCallback((col: SortCol) => {
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  }, [])

  const toggleColumn = useCallback((columnId: CompanyColumnId) => {
    setVisibleColumns(current => {
      const next = new Set(current)
      if (next.has(columnId)) {
        if (next.size === 1) return current
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }, [])

  const openCompany = useCallback((company: Contact) => {
    if (onOpenCompany) {
      onOpenCompany(company)
      return
    }
    navigate(`/contact/${company.id}`)
  }, [navigate, onOpenCompany])

  const sortValueForCompany = useCallback((company: Contact, col: SortCol): string => {
    switch (col) {
      case 'name':
        return company.name
      case 'industry':
        return company.industry ?? ''
      case 'stage':
        return company.stage ?? ''
      case 'pod':
        return podNamesForCompany(company)[0] ?? ''
      case 'subpod':
        return subPodNamesForCompany(company)[0] ?? ''
      case 'domain':
        return companyDomain(company) ?? ''
      case 'location':
        return company.location ?? ''
      default:
        return ''
    }
  }, [podNamesForCompany, subPodNamesForCompany])

  const filtered = useMemo(() => {
    let list = companies
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(company =>
        company.name.toLowerCase().includes(q) ||
        (company.industry ?? '').toLowerCase().includes(q) ||
        (company.stage ?? '').toLowerCase().includes(q) ||
        (companyDomain(company) ?? '').toLowerCase().includes(q) ||
        (company.location ?? '').toLowerCase().includes(q) ||
        (company.email ?? '').toLowerCase().includes(q) ||
        (company.phone ?? '').toLowerCase().includes(q) ||
        (company.linkedin ?? '').toLowerCase().includes(q) ||
        (company.country ?? '').toLowerCase().includes(q) ||
        companyCity(company)?.toLowerCase().includes(q) ||
        companyState(company)?.toLowerCase().includes(q) ||
        podNamesForCompany(company).some(name => name.toLowerCase().includes(q)) ||
        subPodNamesForCompany(company).some(name => name.toLowerCase().includes(q))
      )
    }
    if (fieldFilter && fieldValue) {
      const selectedValue = normalizedFilterText(fieldValue)
      list = list.filter(company =>
        filterValuesForCompany(company, fieldFilter)
          .some(value => normalizedFilterText(value) === selectedValue)
      )
    }
    list = [...list].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      return dir * sortValueForCompany(a, sort.col).localeCompare(sortValueForCompany(b, sort.col))
    })
    return list
  }, [companies, fieldFilter, fieldValue, filterValuesForCompany, podNamesForCompany, search, sort, sortValueForCompany, subPodNamesForCompany])

  useEffect(() => {
    onFilteredCountChange?.(filtered.length)
  }, [filtered.length, onFilteredCountChange])

  const clearFilters = useCallback(() => {
    setSearch('')
    setFieldFilter(null)
    setFieldValue(null)
  }, [])

  const activeFilterCount = (search.trim() ? 1 : 0) + (fieldFilter && fieldValue ? 1 : 0)

  const renderPodBadges = (company: Contact) => {
    const companyPods = company.list_ids
      .map(id => podMap.get(id))
      .filter((pod): pod is Pod => Boolean(pod))
    if (companyPods.length === 0) return <span style={emptyCellStyle}>-</span>
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {companyPods.slice(0, 2).map(pod => (
          <span key={pod.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: pod.color ?? 'var(--color-brand)' }} />
            <span>{pod.name}</span>
          </span>
        ))}
        {companyPods.length > 2 && <span style={{ color: 'var(--color-text-tertiary)' }}>+{companyPods.length - 2}</span>}
      </span>
    )
  }

  const renderSubPodBadges = (company: Contact) => {
    const companyCategories = company.category_ids
      .map(id => categoryMap.get(id))
      .filter((category): category is Category => Boolean(category))
    if (companyCategories.length === 0) return <span style={emptyCellStyle}>-</span>
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {companyCategories.slice(0, 2).map(category => (
          <span key={category.id} style={pillStyle}>
            {category.name}
          </span>
        ))}
        {companyCategories.length > 2 && <span style={{ color: 'var(--color-text-tertiary)' }}>+{companyCategories.length - 2}</span>}
      </span>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '48px 32px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 20, height: 20, border: '2px solid var(--edge)', borderTopColor: 'var(--color-brand)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ height: embedded ? undefined : '100%', display: 'flex', flexDirection: 'column', flex: embedded ? 1 : undefined }}>
      {!embedded && (
        <div style={{
          padding: '28px clamp(16px, 4vw, 32px) 16px',
          borderBottom: '1px solid var(--divider)',
          background: 'var(--surface-panel)',
        }}>
          <h1 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--color-text-primary)',
            margin: 0,
            marginBottom: 16,
          }}>
            Companies
          </h1>
        </div>
      )}
      <div style={{ padding: '12px clamp(16px, 4vw, 32px) 0' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <input
            className="companies-search records-search"
            type="search"
            placeholder="Search companies"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid var(--edge)',
              background: 'var(--surface-panel)',
              backdropFilter: 'blur(20px)',
              fontSize: 13,
              color: 'var(--color-text-primary)',
              fontFamily: 'inherit',
              minWidth: 220,
              flex: '0 1 280px',
              transition: 'border-color 0.15s',
            }}
          />

          <select
            value={fieldFilter ?? ''}
            onChange={e => {
              setFieldFilter((e.target.value || null) as CompanyFilterFieldId | null)
              setFieldValue(null)
            }}
            className="records-toolbar-select"
            aria-label="Company filter field"
            style={{ ...selectStyle, minWidth: 170, flex: '0 1 220px' }}
          >
            <option value="">Filter by field</option>
            {COMPANY_FILTER_FIELDS.map(field => (
              <option key={field.id} value={field.id}>{field.label}</option>
            ))}
          </select>

          <select
            value={fieldValue ?? ''}
            onChange={e => setFieldValue(e.target.value || null)}
            className="records-toolbar-select"
            aria-label="Company filter value"
            disabled={!fieldFilter || filterValueOptions.length === 0}
            style={{
              ...selectStyle,
              minWidth: 170,
              flex: '0 1 220px',
              opacity: !fieldFilter || filterValueOptions.length === 0 ? 0.62 : 1,
            }}
          >
            <option value="">
              {!fieldFilter
                ? 'Choose field first'
                : filterValueOptions.length === 0
                  ? 'No values found'
                  : 'Choose value'}
            </option>
            {filterValueOptions.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <div ref={columnFilterRef} style={{ position: 'relative' }}>
            <button
              className="records-toolbar-button"
              type="button"
              aria-label="Show visible sections filter"
              aria-expanded={showColumnFilter}
              title="Visible sections"
              onClick={() => setShowColumnFilter(value => !value)}
              style={{ ...utilityBtnStyle(showColumnFilter), minWidth: 44, width: 44, padding: 0 }}
            >
              <ListFilter size={16} />
            </button>
            {showColumnFilter && (
              <div className="records-dropdown" style={{ ...dropdownStyle, minWidth: 220 }}>
                <div style={menuLabelStyle}>Visible sections</div>
                {COMPANY_COLUMNS.map(column => (
                  <label
                    key={column.id}
                    style={{ ...dropdownItemStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(column.id)}
                      onChange={() => toggleColumn(column.id)}
                      style={{ margin: 0, accentColor: 'var(--color-brand)' }}
                    />
                    <span style={{ fontSize: 13 }}>{column.label}</span>
                  </label>
                ))}
                <div style={{ borderTop: '1px solid var(--edge)', marginTop: 4, paddingTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setVisibleColumns(new Set(COMPANY_COLUMNS.map(column => column.id)))}
                    style={{ ...dropdownButtonStyle, color: 'var(--color-text-secondary)', fontSize: 12 }}
                  >
                    Show all sections
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleColumns(new Set(DEFAULT_COMPANY_COLUMNS))}
                    style={{ ...dropdownButtonStyle, color: 'var(--color-text-secondary)', fontSize: 12 }}
                  >
                    Restore default
                  </button>
                </div>
              </div>
            )}
          </div>

          {activeFilterCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                padding: '2px 8px',
                borderRadius: 100,
                background: 'color-mix(in srgb, var(--color-brand) 14%, transparent)',
                color: 'var(--color-brand)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap',
              }}>
                {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'}
              </span>
              <button type="button" className="records-toolbar-button" onClick={clearFilters} style={{
                height: 28, padding: '0 8px', borderRadius: 6, border: 'none',
                background: 'transparent', color: 'var(--color-text-tertiary)',
                fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Clear
              </button>
            </span>
          )}

          {!hideInlineCount && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {filtered.length} {filtered.length === 1 ? 'company' : 'companies'}
            </span>
          )}
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
            No companies match your filters.
          </div>
        ) : isMobile ? (
          <div style={{ display: 'grid', gap: 12, paddingBottom: 24 }}>
            {filtered.map(company => (
              <button
                key={company.id}
                type="button"
                onClick={() => openCompany(company)}
                style={{
                  display: 'grid',
                  gap: 10,
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--edge)',
                  background: 'var(--surface-panel)',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span className="company-avatar" style={{ background: avatarColor(company.name) }}>
                    {initials(company.name)}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {company.name}
                    </span>
                    <span style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: 12 }}>
                      {companyDomain(company) ?? 'No domain yet'}
                    </span>
                  </span>
                </span>
                <div style={{ display: 'grid', gap: 6, color: 'var(--color-text-secondary)', fontSize: 13 }}>
                  <span>{company.industry ?? 'No industry yet'}</span>
                  <span>{displayList(podNamesForCompany(company))}</span>
                  <span>{company.location ?? companyCity(company) ?? companyState(company) ?? 'No location yet'}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                {COMPANY_COLUMNS.filter(column => visibleColumns.has(column.id)).map(column => (
                  <th key={column.id} style={thStyle}>
                    {column.sort ? (
                      <button type="button" onClick={() => toggleSort(column.sort!)} style={sortButtonStyle}>
                        {column.label} <SortIcon active={sort.col === column.sort} dir={sort.dir} />
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(company => (
                <tr
                  key={company.id}
                  style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                  tabIndex={0}
                  onClick={() => openCompany(company)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openCompany(company)
                    }
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--tint-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {visibleColumns.has('name') && (
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, maxWidth: '100%' }}>
                        <span className="company-avatar" style={{ background: avatarColor(company.name) }}>
                          {initials(company.name)}
                        </span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {company.name}
                          </span>
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {companyDomain(company) ?? company.location ?? 'Company'}
                          </span>
                        </span>
                      </span>
                    </td>
                  )}
                  {visibleColumns.has('industry') && (
                    <td style={secondaryCellStyle}>{company.industry ?? <span style={emptyCellStyle}>-</span>}</td>
                  )}
                  {visibleColumns.has('stage') && (
                    <td style={secondaryCellStyle}>{company.stage ?? <span style={emptyCellStyle}>-</span>}</td>
                  )}
                  {visibleColumns.has('pod') && (
                    <td style={secondaryCellStyle}>{renderPodBadges(company)}</td>
                  )}
                  {visibleColumns.has('subpod') && (
                    <td style={secondaryCellStyle}>{renderSubPodBadges(company)}</td>
                  )}
                  {visibleColumns.has('domain') && (
                    <td style={secondaryCellStyle}>{companyDomain(company) ?? <span style={emptyCellStyle}>-</span>}</td>
                  )}
                  {visibleColumns.has('location') && (
                    <td style={secondaryCellStyle}>{company.location ?? companyCity(company) ?? companyState(company) ?? <span style={emptyCellStyle}>-</span>}</td>
                  )}
                  {visibleColumns.has('linkedin') && (
                    <td style={secondaryCellStyle}>{company.linkedin ?? <span style={emptyCellStyle}>-</span>}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <style>{`
        .companies-search:focus {
          border-color: color-mix(in srgb, var(--color-brand) 45%, var(--edge));
          box-shadow: 0 0 0 4px rgba(37,180,57,0.08);
        }
        .company-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.24);
        }
      `}</style>
    </div>
  )
}

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
  minHeight: 44,
}

const secondaryCellStyle: React.CSSProperties = {
  ...tdStyle,
  color: 'var(--color-text-secondary)',
}

const emptyCellStyle: React.CSSProperties = {
  color: 'var(--color-text-tertiary)',
}

const pillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 22,
  padding: '0 8px',
  borderRadius: 999,
  background: 'color-mix(in srgb, var(--color-brand) 10%, transparent)',
  color: 'var(--color-text-secondary)',
  fontSize: 12,
  fontWeight: 600,
}

const sortButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  minHeight: 28,
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textTransform: 'inherit',
  letterSpacing: 'inherit',
  cursor: 'pointer',
}

const selectStyle: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'var(--surface-panel)',
  color: 'var(--color-text-secondary)',
  fontSize: 13,
  fontFamily: 'inherit',
  cursor: 'pointer',
  outline: 'none',
}

const utilityBtnStyle = (active = false): React.CSSProperties => ({
  height: 36,
  minWidth: 60,
  padding: '0 14px',
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: active ? 'var(--tint-active)' : 'var(--surface-panel)',
  color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
})

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  zIndex: 30,
  background: 'var(--surface-panel)',
  border: '1px solid var(--edge)',
  borderRadius: 8,
  boxShadow: '0 12px 30px rgba(15,23,42,0.14)',
  padding: 8,
}

const menuLabelStyle: React.CSSProperties = {
  padding: '4px 8px 8px',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
  letterSpacing: '0.04em',
}

const dropdownItemStyle: React.CSSProperties = {
  minHeight: 32,
  padding: '4px 8px',
  borderRadius: 6,
  color: 'var(--color-text-primary)',
}

const dropdownButtonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 32,
  padding: '4px 8px',
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: 'var(--color-text-primary)',
  textAlign: 'left',
  fontSize: 13,
  fontFamily: 'inherit',
  cursor: 'pointer',
}
