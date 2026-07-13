import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Download, ListFilter } from 'lucide-react'
import { useContactDisplaySettings } from '@/hooks/useContactDisplaySettings'
import { isTeamWorkspace, useWorkspace } from '@/contexts/WorkspaceContext'
import {
  COMPANY_STANDARD_PROPERTY_OPTIONS,
  CONTACT_DISPLAY_SECTION_OPTIONS,
  isSectionVisibleForObject,
  isStandardFieldVisibleForObject,
  type ContactDisplaySectionId,
} from '../../lib/contactDisplaySettings'
import { getCampaigns, getCategories, getContacts, getPods } from '../../lib/data'
import { getSharedContactsWithMe } from '../../lib/collaboration'
import {
  FIELD_CONFIGS_EVENT,
  fieldConfigDisplaySectionId,
  getFieldConfigs,
  type FieldConfig,
} from '../../lib/fieldConfig'
import { downloadRelationshipExportWorkbook } from '../../lib/relationshipExport'
import { projectSharedWorkspaceResources } from '../../lib/sharedContactProjection'
import type { Campaign, Category, Contact, Pod } from '../../lib/types'
import { EmptyState } from '../empty/EmptyState'

type SortCol = string
type SortDir = 'asc' | 'desc'
type CompanyFilterFieldId = string
type CompanyColumnId = string

type CompanyPropertyField = {
  id: string
  label: string
  defaultVisible: boolean
  sort?: SortCol
  getValues: (company: Contact) => string[]
}

const COMPANY_DEFAULT_VISIBLE_FIELD_IDS = new Set(['name', 'industry', 'stage', 'pod', 'subpod', 'domain', 'location'])

const COMPANY_FIELD_ORDER = [
  'name',
  'industry',
  'stage',
  'pod',
  'subpod',
  'domain',
  'location',
  'contacts',
  'website',
  'linkedin',
  'companyType',
  'fundType',
  'notes',
  'email',
  'email_2',
  'email_3',
  'phone',
  'address',
  'city',
  'state',
  'country',
  'global_region',
  'campaigns',
]

const COMPANY_STANDARD_FIELD_SECTION_IDS: Record<string, ContactDisplaySectionId> = {
  name: 'details',
  contacts: 'details',
  website: 'details',
  linkedin: 'details',
  companyType: 'details',
  industry: 'details',
  fundType: 'details',
  stage: 'details',
  domain: 'details',
  location: 'details',
  notes: 'details',
  email: 'ways_to_contact',
  email_2: 'ways_to_contact',
  email_3: 'ways_to_contact',
  phone: 'ways_to_contact',
  address: 'ways_to_contact',
  city: 'ways_to_contact',
  state: 'ways_to_contact',
  country: 'ways_to_contact',
  global_region: 'ways_to_contact',
}

const KNOWN_DISPLAY_SECTION_IDS = new Set<string>(CONTACT_DISPLAY_SECTION_OPTIONS.map(section => section.id))

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span style={{ opacity: 0.3, marginLeft: 4, fontSize: 10 }}>-</span>
  return <span style={{ marginLeft: 4, fontSize: 10 }}>{dir === 'asc' ? '^' : 'v'}</span>
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

function normalizedFieldKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
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
  const customFields = company.custom_fields ?? {}
  const directKeys = new Set(keys.map(key => key.trim()).filter(Boolean))
  const normalizedKeys = new Set([...directKeys].map(normalizedFieldKey))

  return Object.entries(customFields).flatMap(([key, value]) => {
    if (directKeys.has(key) || normalizedKeys.has(normalizedFieldKey(key))) return filterValueParts(value)
    return []
  })
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

function companyLocation(company: Contact): string | null {
  const city = companyCity(company)
  const state = companyState(company)
  return company.location ?? ([city, state, company.country].filter(Boolean).join(', ') || null)
}

function contactBelongsToCompany(contact: Contact, company: Contact): boolean {
  if (contact.type === 'Company') return false
  if (contact.company_record_id === company.id) return true
  if (contact.company_ids?.includes(company.id)) return true
  return normalizedFilterText(contact.company ?? '') === normalizedFilterText(company.name)
}

function peopleNamesForCompany(company: Contact, contacts: Contact[]): string[] {
  return contacts
    .filter(contact => contactBelongsToCompany(contact, company))
    .map(contact => contact.name)
}

function companyStandardValues(company: Contact, fieldId: string, contacts: Contact[]): string[] {
  switch (fieldId) {
    case 'name':
      return filterValueParts(company.name)
    case 'contacts':
      return peopleNamesForCompany(company, contacts)
    case 'industry':
      return filterValueParts(company.industry)
    case 'stage':
      return filterValueParts(company.stage)
    case 'domain':
      return filterValueParts(companyDomain(company))
    case 'location':
      return filterValueParts(companyLocation(company))
    case 'website':
      return filterValueParts(company.website)
    case 'linkedin':
      return filterValueParts(company.linkedin)
    case 'email':
      return filterValueParts(company.email)
    case 'email_2':
      return filterValueParts(company.email_2)
    case 'email_3':
      return filterValueParts(company.email_3)
    case 'phone':
      return filterValueParts(company.phone)
    case 'address':
      return customFieldValues(company, ['address', 'Address'])
    case 'city':
      return customFieldValues(company, ['city', 'City'])
    case 'state':
      return customFieldValues(company, ['state', 'State'])
    case 'country':
      return filterValueParts(company.country)
    case 'global_region':
      return filterValueParts(company.global_region)
    case 'companyType':
      return customFieldValues(company, ['companyType', 'company_type', 'Company Type'])
    case 'fundType':
      return customFieldValues(company, ['fundType', 'fund_type', 'Fund Type'])
    case 'notes':
      return filterValueParts(company.notes)
    default:
      return filterValueParts((company as unknown as Record<string, unknown>)[fieldId])
  }
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const item of a) {
    if (!b.has(item)) return false
  }
  return true
}

function exportFilename(): string {
  return `realdeal-companies-current-view-${new Date().toISOString().slice(0, 10)}.xlsx`
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
  const [displaySettings] = useContactDisplaySettings(activeWorkspace?.id)
  const includeSharedWorkspaceResources = !isTeamWorkspace(activeWorkspace)
  const columnFilterRef = useRef<HTMLDivElement>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [fieldFilter, setFieldFilter] = useState<CompanyFilterFieldId | null>(null)
  const [fieldValue, setFieldValue] = useState<string | null>(null)
  const [showColumnFilter, setShowColumnFilter] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<CompanyColumnId>>(() => new Set(COMPANY_DEFAULT_VISIBLE_FIELD_IDS))
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: 'name', dir: 'asc' })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getContacts(),
      getPods(),
      getCategories(),
      getCampaigns(),
      getFieldConfigs(),
      includeSharedWorkspaceResources ? getSharedContactsWithMe() : Promise.resolve([]),
    ]).then(([loadedContacts, loadedPods, loadedCategories, loadedCampaigns, loadedFieldConfigs, incomingSharedContacts]) => {
      const projection = projectSharedWorkspaceResources(incomingSharedContacts, {
        pods: loadedPods,
        categories: loadedCategories,
        campaigns: loadedCampaigns,
        contacts: loadedContacts,
      })
      if (!cancelled) {
        setPods(projection.pods)
        setCategories(projection.categories)
        setCampaigns(projection.campaigns)
        setFieldConfigs(loadedFieldConfigs)
        setContacts(projection.contacts)
        setCompanies(projection.contacts.filter(contact => contact.type === 'Company'))
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) {
        setContacts([])
        setCompanies([])
        setPods([])
        setCategories([])
        setCampaigns([])
        setFieldConfigs([])
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [includeSharedWorkspaceResources])

  useEffect(() => {
    function refreshFieldConfigs() {
      getFieldConfigs()
        .then(setFieldConfigs)
        .catch(() => setFieldConfigs([]))
    }

    window.addEventListener(FIELD_CONFIGS_EVENT, refreshFieldConfigs)
    return () => window.removeEventListener(FIELD_CONFIGS_EVENT, refreshFieldConfigs)
  }, [])

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
  const hiddenPodIds = useMemo(() => new Set(displaySettings.hiddenPodIds), [displaySettings.hiddenPodIds])
  const hiddenSubPodIds = useMemo(() => new Set(displaySettings.hiddenSubPodIds), [displaySettings.hiddenSubPodIds])
  const hiddenCampaignIds = useMemo(() => new Set(displaySettings.hiddenCampaignIds), [displaySettings.hiddenCampaignIds])
  const hiddenFieldConfigIds = useMemo(() => new Set(displaySettings.hiddenFieldConfigIds), [displaySettings.hiddenFieldConfigIds])

  const podNamesForCompany = useCallback(
    (company: Contact) => namesFromIds((company.list_ids ?? []).filter(id => !hiddenPodIds.has(id)), podMap),
    [hiddenPodIds, podMap],
  )

  const subPodNamesForCompany = useCallback(
    (company: Contact) => namesFromIds((company.category_ids ?? []).filter(id => !hiddenSubPodIds.has(id)), categoryMap),
    [categoryMap, hiddenSubPodIds],
  )

  const campaignNamesForCompany = useCallback(
    (company: Contact) => campaigns
      .filter(campaign => campaign.contact_ids.includes(company.id) && !hiddenCampaignIds.has(campaign.id))
      .map(campaign => campaign.name),
    [campaigns, hiddenCampaignIds],
  )

  const companyPropertyFields = useMemo<CompanyPropertyField[]>(() => {
    const standardOptionsById = new Map(COMPANY_STANDARD_PROPERTY_OPTIONS.map(option => [option.id, option]))
    const fields: CompanyPropertyField[] = []

    function addStandardField(fieldId: string) {
      const option = standardOptionsById.get(fieldId)
      if (!option) return
      const sectionId = COMPANY_STANDARD_FIELD_SECTION_IDS[fieldId]
      if (sectionId && !isSectionVisibleForObject(displaySettings, 'Company', sectionId)) return
      if (!isStandardFieldVisibleForObject(displaySettings, 'Company', fieldId)) return
      fields.push({
        id: fieldId,
        label: option.label === 'Company Name' ? 'Name' : option.label,
        defaultVisible: COMPANY_DEFAULT_VISIBLE_FIELD_IDS.has(fieldId),
        sort: fieldId,
        getValues: company => companyStandardValues(company, fieldId, contacts),
      })
    }

    function addLinkedField(fieldId: 'pod' | 'subpod' | 'campaigns', label: string, sectionId: ContactDisplaySectionId, getValues: (company: Contact) => string[]) {
      if (!isSectionVisibleForObject(displaySettings, 'Company', sectionId)) return
      fields.push({
        id: fieldId,
        label,
        defaultVisible: COMPANY_DEFAULT_VISIBLE_FIELD_IDS.has(fieldId),
        sort: fieldId,
        getValues,
      })
    }

    COMPANY_FIELD_ORDER.forEach(fieldId => {
      if (fieldId === 'pod') {
        addLinkedField('pod', 'Pod', 'pods', podNamesForCompany)
        return
      }
      if (fieldId === 'subpod') {
        addLinkedField('subpod', 'Sub-pod', 'sub_pods', subPodNamesForCompany)
        return
      }
      if (fieldId === 'campaigns') {
        addLinkedField('campaigns', 'Campaigns', 'campaigns', campaignNamesForCompany)
        return
      }
      addStandardField(fieldId)
    })

    fieldConfigs
      .filter(config => config.scope_type === 'Company' || config.scope_type === 'Both')
      .filter(config => !hiddenFieldConfigIds.has(config.id))
      .filter(config => {
        const sectionId = fieldConfigDisplaySectionId(config, 'details')
        if (!KNOWN_DISPLAY_SECTION_IDS.has(sectionId)) return true
        return isSectionVisibleForObject(displaySettings, 'Company', sectionId)
      })
      .sort((a, b) => a.display_order - b.display_order)
      .forEach(config => {
        fields.push({
          id: `custom:${config.id}`,
          label: config.name,
          defaultVisible: false,
          sort: `custom:${config.id}`,
          getValues: company => {
            if (config.scope_pod_id && !company.list_ids.includes(config.scope_pod_id)) return []
            return customFieldValues(company, [config.name, config.source_field_id])
          },
        })
      })

    return fields
  }, [
    campaignNamesForCompany,
    contacts,
    displaySettings,
    fieldConfigs,
    hiddenFieldConfigIds,
    podNamesForCompany,
    subPodNamesForCompany,
  ])

  const fieldById = useMemo(() => new Map(companyPropertyFields.map(field => [field.id, field])), [companyPropertyFields])
  const defaultCompanyColumns = useMemo(() => {
    const defaults = companyPropertyFields.filter(field => field.defaultVisible).map(field => field.id)
    return new Set(defaults.length > 0 ? defaults : companyPropertyFields.slice(0, 1).map(field => field.id))
  }, [companyPropertyFields])
  const visibleCompanyFields = useMemo(
    () => companyPropertyFields.filter(field => visibleColumns.has(field.id)),
    [companyPropertyFields, visibleColumns],
  )

  useEffect(() => {
    setVisibleColumns(current => {
      const availableIds = new Set(companyPropertyFields.map(field => field.id))
      const next = new Set([...current].filter(id => availableIds.has(id)))
      if (next.size === 0) {
        defaultCompanyColumns.forEach(id => next.add(id))
      }
      return sameSet(current, next) ? current : next
    })
  }, [companyPropertyFields, defaultCompanyColumns])

  useEffect(() => {
    if (fieldFilter && !fieldById.has(fieldFilter)) {
      setFieldFilter(null)
      setFieldValue(null)
    }
  }, [fieldById, fieldFilter])

  useEffect(() => {
    if (fieldById.has(sort.col)) return
    const fallback = companyPropertyFields.find(field => field.sort)?.id ?? 'name'
    setSort({ col: fallback, dir: 'asc' })
  }, [companyPropertyFields, fieldById, sort.col])

  const filterValuesForCompany = useCallback((company: Contact, fieldId: CompanyFilterFieldId | null): string[] => {
    if (!fieldId) return []
    return fieldById.get(fieldId)?.getValues(company) ?? []
  }, [fieldById])

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
    return fieldById.get(col)?.getValues(company)[0] ?? ''
  }, [fieldById])

  const filtered = useMemo(() => {
    let list = companies
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(company =>
        companyPropertyFields.some(field =>
          field.getValues(company).some(value => value.toLowerCase().includes(q))
        )
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
  }, [companies, companyPropertyFields, fieldFilter, fieldValue, filterValuesForCompany, search, sort, sortValueForCompany])

  useEffect(() => {
    onFilteredCountChange?.(filtered.length)
  }, [filtered.length, onFilteredCountChange])

  const clearFilters = useCallback(() => {
    setSearch('')
    setFieldFilter(null)
    setFieldValue(null)
  }, [])

  const handleExportCurrentViewExcel = useCallback(() => {
    if (visibleCompanyFields.length === 0) return
    downloadRelationshipExportWorkbook({
      filename: exportFilename(),
      sheetName: 'Companies',
      headers: visibleCompanyFields.map(field => field.label),
      rows: filtered.map(company => visibleCompanyFields.map(field => displayList(field.getValues(company)))),
    })
  }, [filtered, visibleCompanyFields])

  const activeFilterCount = (search.trim() ? 1 : 0) + (fieldFilter && fieldValue ? 1 : 0)

  const renderPodBadges = (company: Contact) => {
    const companyPods = company.list_ids
      .map(id => podMap.get(id))
      .filter((pod): pod is Pod => Boolean(pod) && !hiddenPodIds.has(pod.id))
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
      .filter((category): category is Category => Boolean(category) && !hiddenSubPodIds.has(category.id))
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

  const renderCampaignBadges = (company: Contact) => {
    const companyCampaigns = campaigns
      .filter(campaign => campaign.contact_ids.includes(company.id) && !hiddenCampaignIds.has(campaign.id))
    if (companyCampaigns.length === 0) return <span style={emptyCellStyle}>-</span>
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {companyCampaigns.slice(0, 2).map(campaign => (
          <span key={campaign.id} style={pillStyle}>
            {campaign.name}
          </span>
        ))}
        {companyCampaigns.length > 2 && <span style={{ color: 'var(--color-text-tertiary)' }}>+{companyCampaigns.length - 2}</span>}
      </span>
    )
  }

  const renderCompanyCell = (company: Contact, field: CompanyPropertyField) => {
    if (field.id === 'name') {
      return (
        <td key={field.id} style={{ ...tdStyle, fontWeight: 600 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, maxWidth: '100%' }}>
            <span className="company-avatar" style={{ background: avatarColor(company.name) }}>
              {initials(company.name)}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {company.name}
              </span>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {companyDomain(company) ?? companyLocation(company) ?? 'Company'}
              </span>
            </span>
          </span>
        </td>
      )
    }

    if (field.id === 'pod') return <td key={field.id} style={secondaryCellStyle}>{renderPodBadges(company)}</td>
    if (field.id === 'subpod') return <td key={field.id} style={secondaryCellStyle}>{renderSubPodBadges(company)}</td>
    if (field.id === 'campaigns') return <td key={field.id} style={secondaryCellStyle}>{renderCampaignBadges(company)}</td>

    const values = field.getValues(company)
    return (
      <td key={field.id} style={secondaryCellStyle}>
        {values.length > 0 ? displayList(values) : <span style={emptyCellStyle}>-</span>}
      </td>
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
            letterSpacing: 0,
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
              setFieldFilter(e.target.value || null)
              setFieldValue(null)
            }}
            className="records-toolbar-select"
            aria-label="Company filter field"
            style={{ ...selectStyle, minWidth: 170, flex: '0 1 220px' }}
          >
            <option value="">Filter by field</option>
            {companyPropertyFields.map(field => (
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
              aria-label="Show visible columns filter"
              aria-expanded={showColumnFilter}
              title="Visible columns"
              onClick={() => setShowColumnFilter(value => !value)}
              style={{ ...utilityBtnStyle(showColumnFilter), minWidth: 44, width: 44, padding: 0 }}
            >
              <ListFilter size={16} />
            </button>
            {showColumnFilter && (
              <div className="records-dropdown" style={{ ...dropdownStyle, minWidth: 240 }}>
                <div style={menuLabelStyle}>Visible columns</div>
                {companyPropertyFields.map(field => (
                  <label
                    key={field.id}
                    style={{ ...dropdownItemStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(field.id)}
                      onChange={() => toggleColumn(field.id)}
                      style={{ margin: 0, accentColor: 'var(--color-brand)' }}
                    />
                    <span style={{ fontSize: 13 }}>{field.label}</span>
                  </label>
                ))}
                <div style={{ borderTop: '1px solid var(--edge)', marginTop: 4, paddingTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setVisibleColumns(new Set(companyPropertyFields.map(field => field.id)))}
                    style={{ ...dropdownButtonStyle, color: 'var(--color-text-secondary)', fontSize: 12 }}
                  >
                    Show all columns
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleColumns(new Set(defaultCompanyColumns))}
                    style={{ ...dropdownButtonStyle, color: 'var(--color-text-secondary)', fontSize: 12 }}
                  >
                    Restore default
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            className="records-toolbar-button"
            type="button"
            aria-label="Export current companies view to Excel"
            title="Export current view to Excel"
            onClick={handleExportCurrentViewExcel}
            disabled={visibleCompanyFields.length === 0}
            style={{
              ...utilityBtnStyle(false),
              minWidth: 44,
              width: 44,
              padding: 0,
              opacity: visibleCompanyFields.length === 0 ? 0.5 : 1,
              cursor: visibleCompanyFields.length === 0 ? 'default' : 'pointer',
            }}
          >
            <Download size={16} />
          </button>

          {activeFilterCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                padding: '2px 8px',
                borderRadius: 100,
                background: 'color-mix(in srgb, var(--color-brand) 14%, transparent)',
                color: 'var(--color-brand)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0,
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
                  <span>{companyLocation(company) ?? 'No location yet'}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <table style={{
            width: '100%',
            minWidth: Math.max(820, visibleCompanyFields.length * 150),
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}>
            <thead>
              <tr>
                {visibleCompanyFields.map(field => (
                  <th key={field.id} style={thStyle}>
                    {field.sort ? (
                      <button type="button" onClick={() => toggleSort(field.sort!)} style={sortButtonStyle}>
                        {field.label} <SortIcon active={sort.col === field.sort} dir={sort.dir} />
                      </button>
                    ) : (
                      field.label
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
                  {visibleCompanyFields.map(field => renderCompanyCell(company, field))}
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
  letterSpacing: 0,
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
  letterSpacing: 0,
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
