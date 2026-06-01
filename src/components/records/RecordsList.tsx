import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Download, FileSpreadsheet, UserPlus } from 'lucide-react'
import { getContacts, getPods, getCategories, getAllInteractions, updateContact, deleteContact, invalidateContactsCache, getCampaigns, addContactToCampaign, invalidateCampaignsCache } from '../../lib/data'
import { EmptyState } from '../empty/EmptyState'
import { MergeModal } from '../merge/MergeModal'
import { ContactDetail } from '../contacts/ContactDetail'
import { CreateRecordModal } from './CreateRecordModal'
import { contactEquityScore, scoreLabel } from '../../lib/equity'
import { formatRelativeTime } from '../../lib/utils'
import { logSystemEvent } from '../../lib/timeline'
import { CompaniesPage } from '../companies/CompaniesPage'
import { planCampaignContactAdd } from '../../lib/campaignMembership'
import { planMoveToSubPod } from '../../lib/subPodAssignment'
import { formatContactSubPods, getContactSubPods } from '../../lib/subPodVisibility'
import type { Contact, Pod, Category, Campaign, RelationshipType, RelationshipStatus, Interaction } from '../../lib/types'

// ── Column definitions ───────────────────────────────────────────────────────

type ColumnId = 'name' | 'company' | 'pod' | 'sub_pod' | 'equity' | 'type' | 'status' | 'last_contact' | 'cadence' | 'location' | 'follow_up'

interface ColumnDef {
  id: ColumnId
  label: string
  defaultVisible: boolean
}

const COLUMNS: ColumnDef[] = [
  { id: 'name',         label: 'Name',         defaultVisible: true },
  { id: 'company',      label: 'Company',       defaultVisible: true },
  { id: 'pod',          label: 'Pod',           defaultVisible: true },
  { id: 'sub_pod',      label: 'Sub-pod',       defaultVisible: true },
  { id: 'equity',       label: 'Health',        defaultVisible: true },
  { id: 'type',         label: 'Type',          defaultVisible: false },
  { id: 'status',       label: 'Status',        defaultVisible: false },
  { id: 'last_contact', label: 'Last Reached Out', defaultVisible: false },
  { id: 'cadence',      label: 'Rhythm',        defaultVisible: false },
  { id: 'location',     label: 'Location',      defaultVisible: false },
  { id: 'follow_up',    label: 'Follow-up',     defaultVisible: false },
]

// ── Filter types ─────────────────────────────────────────────────────────────

type RecencyFilter = 'any' | '7d' | '30d' | '90d' | 'never'

interface FilterState {
  search: string
  pod: string | null
  category: string | null
  type: RelationshipType | null
  status: RelationshipStatus | null
  recency: RecencyFilter
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  pod: null,
  category: null,
  type: null,
  status: null,
  recency: 'any',
}

// ── Sort types ───────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc'

// ── Saved views ──────────────────────────────────────────────────────────────

const VIEWS_KEY = 'realdeal:contacts-views'

interface SavedView {
  name: string
  filters: FilterState
  visibleColumns: ColumnId[]
  sort: { col: ColumnId; dir: SortDir }
}

function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_KEY)
    return raw ? (JSON.parse(raw) as SavedView[]) : []
  } catch {
    return []
  }
}

function saveViews(views: SavedView[]) {
  localStorage.setItem(VIEWS_KEY, JSON.stringify(views))
}

// ── Equity badge colors (using health semantic colors) ──────────────────────

const EQUITY_BADGE: Record<string, { bg: string; color: string }> = {
  Thriving: { bg: 'var(--health-thriving-bg)',  color: 'var(--health-thriving)' },
  Steady:   { bg: 'var(--health-steady-bg)',    color: 'var(--health-steady)' },
  Cooling:  { bg: 'var(--health-cooling-bg)',   color: 'var(--health-cooling)' },
  Fading:   { bg: 'var(--health-fading-bg)',    color: 'var(--health-fading)' },
}

const HEALTH_RING_COLOR: Record<string, string> = {
  Thriving: 'var(--health-thriving)',
  Steady:   'var(--health-steady)',
  Cooling:  'var(--health-cooling)',
  Fading:   'var(--health-fading)',
}

// ── Avatar color from name hash ─────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span style={{ opacity: 0.3, marginLeft: 4, fontSize: 10 }}>↕</span>
  return <span style={{ marginLeft: 4, fontSize: 10 }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

function matchesRecency(contact: Contact, recency: RecencyFilter): boolean {
  if (recency === 'any') return true
  if (recency === 'never') return contact.last_contacted_at === null
  const days = recency === '7d' ? 7 : recency === '30d' ? 30 : 90
  if (!contact.last_contacted_at) return false
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return new Date(contact.last_contacted_at).getTime() >= cutoff
}

function pulseCopy(count: number, atRisk: number, hasFilters: boolean): string {
  if (count === 0) return 'No matches yet.'
  if (hasFilters) return count === 1 ? 'One relationship in focus.' : `${count} relationships in focus.`
  if (atRisk === 0) return 'Your circle is humming.'
  if (atRisk === 1) return 'One relationship could use a nudge.'
  if (atRisk <= 3) return `${atRisk} relationships could use a nudge.`
  return `${atRisk} relationships are ready for a little love.`
}

// ── View toggle ─────────────────────────────────────────────────────────────

function ViewToggle({ active, onChange }: { active: 'people' | 'companies'; onChange: (v: 'people' | 'companies') => void }) {
  const base: React.CSSProperties = {
    minHeight: 44,
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 500,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.12s, color 0.12s',
  }
  return (
    <div style={{
      display: 'inline-flex',
      background: 'var(--tint)',
      borderRadius: 8,
      padding: 2,
    }}>
      <button type="button" aria-pressed={active === 'people'} onClick={() => onChange('people')} style={{
        ...base,
        background: active === 'people' ? 'var(--color-bg)' : 'transparent',
        color: active === 'people' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        boxShadow: active === 'people' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
      }}>People</button>
      <button type="button" aria-pressed={active === 'companies'} onClick={() => onChange('companies')} style={{
        ...base,
        background: active === 'companies' ? 'var(--color-bg)' : 'transparent',
        color: active === 'companies' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        boxShadow: active === 'companies' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
      }}>Companies</button>
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function RecordsList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeView = searchParams.get('view') === 'companies' ? 'companies' : 'people'

  // Data
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [equityMap, setEquityMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Filters - restore from URL query params
  const [filters, setFilters] = useState<FilterState>(() => {
    const f = { ...DEFAULT_FILTERS }
    const pod = searchParams.get('pod')
    const cat = searchParams.get('category')
    const search = searchParams.get('q')
    const recency = searchParams.get('recency')
    if (pod) f.pod = pod
    if (cat) f.category = cat
    if (search) f.search = search
    if (recency && ['7d', '30d', '90d', 'never'].includes(recency)) f.recency = recency as any
    return f
  })

  // Sort - restore from URL query params
  const [sort, setSort] = useState<{ col: ColumnId; dir: SortDir }>(() => {
    const col = searchParams.get('sort_col') as ColumnId | null
    const dir = searchParams.get('sort_dir') as SortDir | null
    const validCols: ColumnId[] = ['name', 'company', 'pod', 'sub_pod', 'equity', 'type', 'status', 'last_contact', 'cadence', 'location', 'follow_up']
    if (col && validCols.includes(col) && (dir === 'asc' || dir === 'desc')) return { col, dir }
    return { col: 'equity', dir: 'desc' }
  })

  // Sync sort to URL
  useEffect(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (sort.col === 'equity' && sort.dir === 'desc') {
        next.delete('sort_col')
        next.delete('sort_dir')
      } else {
        next.set('sort_col', sort.col)
        next.set('sort_dir', sort.dir)
      }
      return next
    }, { replace: true })
  }, [sort.col, sort.dir]) // eslint-disable-line react-hooks/exhaustive-deps

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(
    () => new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.id))
  )

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Bulk actions
  const [showPodPicker, setShowPodPicker] = useState(false)
  const [showSubPodPicker, setShowSubPodPicker] = useState(false)
  const [showFieldUpdate, setShowFieldUpdate] = useState(false)
  const [updateField, setUpdateField] = useState('')
  const [updateValue, setUpdateValue] = useState('')
  const [bulkOperating, setBulkOperating] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [showAddToCampaign, setShowAddToCampaign] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [addingToCampaign, setAddingToCampaign] = useState(false)
  const [campaignAddError, setCampaignAddError] = useState<string | null>(null)
  const [companyFilteredCount, setCompanyFilteredCount] = useState(0)

  const podPickerRef = useRef<HTMLDivElement>(null)
  const subPodPickerRef = useRef<HTMLDivElement>(null)
  const fieldUpdateRef = useRef<HTMLDivElement>(null)
  const addToCampaignDialogRef = useRef<HTMLDivElement>(null)
  const archiveDialogRef = useRef<HTMLDivElement>(null)
  const deleteDialogRef = useRef<HTMLDivElement>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)

  // Saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>(loadViews)
  const [showMoreDropdown, setShowMoreDropdown] = useState(false)
  const [savingViewName, setSavingViewName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  // Toast / undo
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])
  function showToast(message: string, undo?: () => void) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, undo })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }

  // Confirm archive modal
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const moreRef = useRef<HTMLDivElement>(null)
  const createMenuRef = useRef<HTMLDivElement>(null)

  // Load data
  useEffect(() => {
    let stale = false
    async function load() {
      const [allContacts, allPods, allCategories, allInteractions, allCampaigns] = await Promise.all([
        getContacts(),
        getPods(),
        getCategories(),
        getAllInteractions(),
        getCampaigns(),
      ])
      if (stale) return

      setPods(allPods)
      setCategories(allCategories)
      setContacts(allContacts)
      setCampaigns(allCampaigns)

      const interactionsByContact: Record<string, Interaction[]> = {}
      for (const interaction of allInteractions) {
        if (!interactionsByContact[interaction.contact_id]) interactionsByContact[interaction.contact_id] = []
        interactionsByContact[interaction.contact_id].push(interaction)
      }

      const eqMap: Record<string, number> = {}
      for (const contact of allContacts) {
        const interactions = interactionsByContact[contact.id] ?? []
        eqMap[contact.id] = contactEquityScore(interactions)
      }
      setEquityMap(eqMap)
      setLoading(false)
    }
    load().catch(err => {
      console.error('RecordsList load error:', err)
      if (!stale) setLoading(false)
    })
    return () => { stale = true }
  }, [refreshKey])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMoreDropdown(false)
      }
      if (podPickerRef.current && !podPickerRef.current.contains(e.target as Node)) {
        setShowPodPicker(false)
      }
      if (subPodPickerRef.current && !subPodPickerRef.current.contains(e.target as Node)) {
        setShowSubPodPicker(false)
      }
      if (fieldUpdateRef.current && !fieldUpdateRef.current.contains(e.target as Node)) {
        setShowFieldUpdate(false)
      }
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setShowCreateMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!showAddToCampaign && !showArchiveConfirm && !showDeleteConfirm) return
    lastFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }, [showAddToCampaign, showArchiveConfirm, showDeleteConfirm])

  useEffect(() => {
    if (!showAddToCampaign) {
      if (!showArchiveConfirm && !showDeleteConfirm) lastFocusedElementRef.current?.focus()
      return
    }
    addToCampaignDialogRef.current?.focus()
  }, [showAddToCampaign, showArchiveConfirm, showDeleteConfirm])

  useEffect(() => {
    if (!showArchiveConfirm) {
      if (!showAddToCampaign && !showDeleteConfirm) lastFocusedElementRef.current?.focus()
      return
    }
    archiveDialogRef.current?.focus()
  }, [showArchiveConfirm, showAddToCampaign, showDeleteConfirm])

  useEffect(() => {
    if (!showDeleteConfirm) {
      if (!showAddToCampaign && !showArchiveConfirm) lastFocusedElementRef.current?.focus()
      return
    }
    deleteDialogRef.current?.focus()
  }, [showDeleteConfirm, showAddToCampaign, showArchiveConfirm])

  // Pod map for lookups
  const podMap = useMemo<Record<string, Pod>>(() => {
    const m: Record<string, Pod> = {}
    for (const p of pods) m[p.id] = p
    return m
  }, [pods])

  const subPodsByPod = useMemo(
    () => pods
      .map(pod => ({
        pod,
        subPods: categories.filter(category => category.list_id === pod.id),
      }))
      .filter(group => group.subPods.length > 0),
    [pods, categories],
  )

  const activeCampaigns = useMemo(
    () => campaigns.filter(c => c.status === 'active'),
    [campaigns],
  )

  const selectedCampaign = useMemo(
    () => activeCampaigns.find(c => c.id === selectedCampaignId) ?? null,
    [activeCampaigns, selectedCampaignId],
  )

  const campaignAddPlan = useMemo(
    () => selectedCampaign
      ? planCampaignContactAdd(selectedIds, selectedCampaign.contact_ids)
      : { toAdd: Array.from(selectedIds), alreadyInCampaign: [] },
    [selectedCampaign, selectedIds],
  )

  // Filtered + sorted contacts
  const filtered = useMemo(() => {
    let result = contacts.filter(c => c.type !== 'Company')

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
      )
    }

    if (filters.category) {
      result = result.filter(c => c.category_ids.includes(filters.category!))
    } else if (filters.pod) {
      result = result.filter(c => c.list_ids.includes(filters.pod!))
    }

    if (filters.recency !== 'any') {
      result = result.filter(c => matchesRecency(c, filters.recency))
    }

    return [...result].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      switch (sort.col) {
        case 'name':
          return dir * a.name.localeCompare(b.name)
        case 'company':
          return dir * (a.company ?? '').localeCompare(b.company ?? '')
        case 'pod': {
          const aPod = a.primary_list_id ? (podMap[a.primary_list_id]?.name ?? '') : ''
          const bPod = b.primary_list_id ? (podMap[b.primary_list_id]?.name ?? '') : ''
          return dir * aPod.localeCompare(bPod)
        }
        case 'sub_pod':
          return dir * formatContactSubPods(a, categories).localeCompare(formatContactSubPods(b, categories))
        case 'equity':
          return dir * ((equityMap[a.id] ?? 0) - (equityMap[b.id] ?? 0))
        case 'type':
          return dir * a.type.localeCompare(b.type)
        case 'status':
          return dir * a.status.localeCompare(b.status)
        case 'last_contact': {
          const aT = a.last_contacted_at ? new Date(a.last_contacted_at).getTime() : 0
          const bT = b.last_contacted_at ? new Date(b.last_contacted_at).getTime() : 0
          return dir * (aT - bT)
        }
        case 'cadence':
          return dir * (a.cadence_override ?? a.contact_frequency ?? '').localeCompare(b.cadence_override ?? b.contact_frequency ?? '')
        case 'location':
          return dir * (a.location ?? '').localeCompare(b.location ?? '')
        case 'follow_up': {
          const aF = a.next_follow_up_date ? new Date(a.next_follow_up_date).getTime() : Infinity
          const bF = b.next_follow_up_date ? new Date(b.next_follow_up_date).getTime() : Infinity
          return dir * (aF - bF)
        }
        default:
          return 0
      }
    })
  }, [contacts, filters, sort, equityMap, podMap, categories])

  // Toggle sort
  const toggleSort = useCallback((col: ColumnId) => {
    setSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'desc' }
    )
  }, [])

  // Toggle column visibility
  const toggleColumn = useCallback((id: ColumnId) => {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Select all / deselect all
  const allSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id))
  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)))
    }
  }, [allSelected, filtered])

  const toggleSelectRow = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Save current view
  const saveView = useCallback(() => {
    if (!savingViewName.trim()) return
    const view: SavedView = {
      name: savingViewName.trim(),
      filters,
      visibleColumns: Array.from(visibleColumns),
      sort,
    }
    const updated = [...savedViews.filter(v => v.name !== view.name), view]
    setSavedViews(updated)
    saveViews(updated)
    setSavingViewName('')
    setShowSaveInput(false)
  }, [savingViewName, filters, visibleColumns, sort, savedViews])

  // Apply a saved view
  const applyView = useCallback((view: SavedView | null) => {
    if (!view) {
      setFilters(DEFAULT_FILTERS)
      setVisibleColumns(new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.id)))
      setSort({ col: 'equity', dir: 'desc' })
    } else {
      setFilters(view.filters)
      setVisibleColumns(new Set(view.visibleColumns))
      setSort(view.sort)
    }
    setShowMoreDropdown(false)
  }, [])

  // Delete saved view
  const deleteView = useCallback((name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = savedViews.filter(v => v.name !== name)
    setSavedViews(updated)
    saveViews(updated)
  }, [savedViews])

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const hasActiveFilters = filters.search || filters.pod || filters.category || filters.recency !== 'any'
  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.pod || filters.category ? 1 : 0) +
    (filters.recency !== 'any' ? 1 : 0)
  const atRiskCount = useMemo(
    () => filtered.reduce((count, contact) => count + ((equityMap[contact.id] ?? 0) < 70 ? 1 : 0), 0),
    [filtered, equityMap]
  )
  const headerPulse = useMemo(
    () => pulseCopy(filtered.length, atRiskCount, Boolean(hasActiveFilters)),
    [filtered.length, atRiskCount, hasActiveFilters]
  )

  // ── Bulk action handlers ──────────────────────────────────────────────────

  async function handleBulkPodAction(podId: string, mode: 'add' | 'move') {
    setShowPodPicker(false)
    setBulkOperating(true)
    const selected = contacts.filter(c => selectedIds.has(c.id))
    const prevPodState = selected.map(c => ({ id: c.id, list_ids: [...c.list_ids], primary_list_id: c.primary_list_id }))
    const pod = pods.find(p => p.id === podId)
    for (const contact of selected) {
      const newListIds = mode === 'move' ? [podId] : (contact.list_ids.includes(podId) ? contact.list_ids : [...contact.list_ids, podId])
      if (mode === 'add' && contact.list_ids.includes(podId)) continue
      await updateContact(contact.id, { list_ids: newListIds, primary_list_id: podId })
      await logSystemEvent({
        contactId: contact.id,
        type: 'pod_change',
        detail: { action: mode === 'move' ? 'moved' : 'added', pod: pod?.name ?? podId, podId },
        notes: `${mode === 'move' ? 'Moved to' : 'Added to'} ${pod?.name ?? 'pod'}`,
      })
    }
    invalidateContactsCache()
    const fresh = await getContacts()
    setContacts(fresh)
    setSelectedIds(new Set())
    setBulkOperating(false)
    showToast(`${mode === 'move' ? 'Moved' : 'Added'} ${selected.length} to ${pod?.name ?? 'pod'}`, async () => {
      for (const prev of prevPodState) {
        await updateContact(prev.id, { list_ids: prev.list_ids, primary_list_id: prev.primary_list_id })
      }
      invalidateContactsCache()
      setContacts(await getContacts())
      showToast('Pod change undone')
    })
  }

  async function handleBulkSubPodAction(categoryId: string) {
    setShowSubPodPicker(false)
    setBulkOperating(true)
    const selected = contacts.filter(c => selectedIds.has(c.id))
    const subPod = categories.find(category => category.id === categoryId)
    const parentPod = subPod ? pods.find(pod => pod.id === subPod.list_id) : null

    if (!subPod) {
      setBulkOperating(false)
      showToast('Sub-pod not found. Refresh and try again.')
      return
    }

    const previousState = selected.map(contact => ({
      id: contact.id,
      list_ids: [...contact.list_ids],
      primary_list_id: contact.primary_list_id,
      category_ids: [...contact.category_ids],
    }))

    try {
      for (const contact of selected) {
        const update = planMoveToSubPod(contact, subPod, categories)
        await updateContact(contact.id, update)
        await logSystemEvent({
          contactId: contact.id,
          type: 'pod_change',
          detail: {
            action: 'moved_to_sub_pod',
            pod: parentPod?.name ?? subPod.list_id,
            podId: subPod.list_id,
            subPod: subPod.name,
            subPodId: subPod.id,
          },
          notes: `Moved to ${subPod.name}${parentPod ? ` in ${parentPod.name}` : ''}`,
        })
      }
      invalidateContactsCache()
      setContacts(await getContacts())
      setSelectedIds(new Set())
      showToast(`Moved ${selected.length} ${selected.length === 1 ? 'person' : 'people'} to ${subPod.name}`, async () => {
        for (const previous of previousState) {
          await updateContact(previous.id, {
            list_ids: previous.list_ids,
            primary_list_id: previous.primary_list_id,
            category_ids: previous.category_ids,
          })
        }
        invalidateContactsCache()
        setContacts(await getContacts())
        showToast('Sub-pod change undone')
      })
    } catch (err) {
      console.error('Bulk sub-pod update failed:', err)
      invalidateContactsCache()
      setContacts(await getContacts().catch(() => contacts))
      showToast("Couldn't move selected contacts to that sub-pod. Try again.")
    } finally {
      setBulkOperating(false)
    }
  }

  async function handleBulkFieldUpdate() {
    setShowFieldUpdate(false)
    setBulkOperating(true)
    const selected = contacts.filter(c => selectedIds.has(c.id))
    const prevValues = selected.map(c => ({ id: c.id, value: (c as any)[updateField] }))
    const fieldName = updateField
    const fieldValue = updateValue
    for (const contact of selected) {
      await updateContact(contact.id, { [fieldName]: fieldValue } as Partial<Contact>)
      await logSystemEvent({
        contactId: contact.id,
        type: 'field_update',
        detail: { field: fieldName, newValue: fieldValue },
        notes: `Updated ${fieldName} to "${fieldValue}"`,
      })
    }
    invalidateContactsCache()
    const fresh = await getContacts()
    setContacts(fresh)
    setSelectedIds(new Set())
    setUpdateField('')
    setUpdateValue('')
    setBulkOperating(false)
    showToast(`Updated ${fieldName} for ${selected.length} ${selected.length === 1 ? 'person' : 'people'}`, async () => {
      for (const prev of prevValues) {
        await updateContact(prev.id, { [fieldName]: prev.value } as Partial<Contact>)
      }
      invalidateContactsCache()
      setContacts(await getContacts())
      showToast('Update undone')
    })
  }

  function cellValue(contact: Contact, colId: ColumnId): string {
    switch (colId) {
      case 'name': return contact.name
      case 'company': return contact.company ?? ''
      case 'pod': { const p = contact.primary_list_id ? podMap[contact.primary_list_id] : null; return p?.name ?? '' }
      case 'sub_pod': return formatContactSubPods(contact, categories)
      case 'equity': return String(equityMap[contact.id] ?? 0)
      case 'type': return contact.type
      case 'status': return contact.status
      case 'last_contact': return contact.last_contacted_at ?? ''
      case 'cadence': return contact.cadence_override ?? contact.contact_frequency ?? ''
      case 'location': return contact.location ?? ''
      case 'follow_up': return contact.next_follow_up_date ?? ''
      default: return ''
    }
  }

  function handleExportCsv(rows: Contact[] = contacts.filter(c => selectedIds.has(c.id))) {
    const visibleColsSnap = visibleCols
    const headers = visibleColsSnap.map(c => c.label)

    const csvRows = rows.map(c => visibleColsSnap.map(col => {
      const val = cellValue(c, col.id)
      return `"${val.replace(/"/g, '""')}"`
    }).join(','))

    const csv = [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadImportTemplate() {
    const response = await fetch('/templates/realdeal-contact-import-template.xlsx')
    if (!response.ok) throw new Error('Template download failed.')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'realdeal-contact-import-template.xlsx'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function handleCopyToClipboard(rows: Contact[]) {
    const cols = visibleCols
    const headers = cols.map(c => c.label).join('\t')
    const lines = rows.map(c => cols.map(col => cellValue(c, col.id)).join('\t'))
    await navigator.clipboard.writeText([headers, ...lines].join('\n'))
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  async function handleShareAsLink() {
    const params = new URLSearchParams()
    if (filters.pod) params.set('pod', filters.pod)
    if (filters.category) params.set('category', filters.category)
    if (filters.search) params.set('q', filters.search)
    if (filters.recency !== 'any') params.set('recency', filters.recency)
    const qs = params.toString()
    const url = `${window.location.origin}/relationships${qs ? `?${qs}` : ''}`
    await navigator.clipboard.writeText(url)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  async function handleBulkArchive() {
    setBulkOperating(true)
    const selected = contacts.filter(c => selectedIds.has(c.id))
    const prevStatuses = selected.map(c => ({ id: c.id, status: c.status }))
    for (const contact of selected) {
      await updateContact(contact.id, { status: 'Archived' })
      await logSystemEvent({
        contactId: contact.id,
        type: 'field_update',
        detail: { field: 'status', oldValue: contact.status, newValue: 'Archived' },
        notes: 'Archived',
      })
    }
    invalidateContactsCache()
    const fresh = await getContacts()
    setContacts(fresh)
    setSelectedIds(new Set())
    setBulkOperating(false)
    setShowArchiveConfirm(false)
    showToast(`Archived ${selected.length} ${selected.length === 1 ? 'person' : 'people'}`, async () => {
      for (const prev of prevStatuses) {
        await updateContact(prev.id, { status: prev.status })
      }
      invalidateContactsCache()
      setContacts(await getContacts())
      showToast('Archive undone')
    })
  }

  async function handleBulkDelete() {
    const selected = contacts.filter(c => selectedIds.has(c.id))
    if (selected.length === 0) return

    setBulkOperating(true)
    const selectedIdSet = new Set(selected.map(contact => contact.id))

    try {
      for (const contact of selected) {
        await deleteContact(contact.id)
      }
      invalidateContactsCache()
      invalidateCampaignsCache()
      setContacts(prev => prev.filter(contact => !selectedIdSet.has(contact.id)))
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      showToast(`Deleted ${selected.length} ${selected.length === 1 ? 'person' : 'people'}`)
    } catch (err) {
      console.error('Bulk delete failed:', err)
      invalidateContactsCache()
      setContacts(await getContacts())
      showToast('Could not delete selected contacts. Try again.')
    } finally {
      setBulkOperating(false)
    }
  }

  function openAddToCampaign() {
    setCampaignAddError(null)
    setSelectedCampaignId(null)
    setShowAddToCampaign(true)
  }

  function closeAddToCampaign() {
    if (addingToCampaign) return
    setShowAddToCampaign(false)
    setSelectedCampaignId(null)
    setCampaignAddError(null)
  }

  async function handleAddToCampaign() {
    if (!selectedCampaign || addingToCampaign) return

    if (campaignAddPlan.toAdd.length === 0) {
      showToast(`${campaignAddPlan.alreadyInCampaign.length} ${campaignAddPlan.alreadyInCampaign.length === 1 ? 'person is' : 'people are'} already in ${selectedCampaign.name}.`)
      setSelectedIds(new Set())
      closeAddToCampaign()
      return
    }

    setAddingToCampaign(true)
    setCampaignAddError(null)
    try {
      for (const id of campaignAddPlan.toAdd) {
        await addContactToCampaign(selectedCampaign.id, id)
      }
      invalidateCampaignsCache()
      setCampaigns(await getCampaigns())
      setSelectedIds(new Set())
      setShowAddToCampaign(false)
      setSelectedCampaignId(null)
      const added = campaignAddPlan.toAdd.length
      const already = campaignAddPlan.alreadyInCampaign.length
      showToast(
        already > 0
          ? `Added ${added} ${added === 1 ? 'person' : 'people'} to ${selectedCampaign.name}. ${already} ${already === 1 ? 'was' : 'were'} already there.`
          : `Added ${added} ${added === 1 ? 'person' : 'people'} to ${selectedCampaign.name}.`,
      )
    } catch (err) {
      console.error('Add to campaign failed:', err)
      invalidateCampaignsCache()
      setCampaigns(await getCampaigns().catch(() => campaigns))
      setCampaignAddError("Couldn't add the selected contacts. Check your connection and try again.")
    } finally {
      setAddingToCampaign(false)
    }
  }

  const visibleCols = COLUMNS.filter(col => visibleColumns.has(col.id))

  function handleContactSaved(updated: Contact) {
    setContacts(prev => prev.map(contact => contact.id === updated.id ? updated : contact))
    setSelectedContact(updated)
  }

  function handleContactDeleted() {
    if (!selectedContact) return
    const deletedId = selectedContact.id
    setContacts(prev => prev.filter(contact => contact.id !== deletedId))
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(deletedId)
      return next
    })
    setSelectedContact(null)
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'hidden' }}>
        <div className="skeleton-stagger" style={{ padding: '28px clamp(16px, 4vw, 40px) 0', flexShrink: 0 }}>
          <div className="skeleton" style={{ width: 140, height: 28, borderRadius: 8, marginBottom: 20 }} />
          <div className="skeleton" style={{ width: '100%', height: 36, borderRadius: 8, marginBottom: 16 }} />
        </div>
        <div className="skeleton-stagger" style={{ flex: 1, padding: '0 clamp(16px, 4vw, 40px) 40px' }}>
          <div className="skeleton" style={{ width: '100%', height: 12, borderRadius: 4, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: '100%', height: 52, borderRadius: 0, marginBottom: 1 }} />
          <div className="skeleton" style={{ width: '100%', height: 52, borderRadius: 0, marginBottom: 1 }} />
          <div className="skeleton" style={{ width: '100%', height: 52, borderRadius: 0, marginBottom: 1 }} />
          <div className="skeleton" style={{ width: '100%', height: 52, borderRadius: 0, marginBottom: 1 }} />
          <div className="skeleton" style={{ width: '100%', height: 52, borderRadius: 0, marginBottom: 1 }} />
          <div className="skeleton" style={{ width: '100%', height: 52, borderRadius: 0, marginBottom: 1 }} />
        </div>
      </div>
    )
  }

  const viewToggle = (
    <ViewToggle active={activeView} onChange={(v) => {
      const next = new URLSearchParams(searchParams)
      if (v === 'companies') next.set('view', 'companies')
      else next.delete('view')
      setSearchParams(next, { replace: true })
    }} />
  )

  if (activeView === 'companies') {
    return (
      <div className="content-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'hidden' }}>
        <div style={{ padding: '32px clamp(16px, 4vw, 32px) 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 28,
                fontWeight: 800,
                margin: 0,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.03em',
              }}>
                Relationships
              </h1>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                {companyFilteredCount} {companyFilteredCount === 1 ? 'company' : 'companies'}
              </span>
            </div>
            {viewToggle}
          </div>
        </div>
        <CompaniesPage embedded hideInlineCount onFilteredCountChange={setCompanyFilteredCount} />
      </div>
    )
  }

  return (
    <div className="content-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '32px clamp(16px, 4vw, 32px) 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 28,
              fontWeight: 800,
              margin: 0,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.03em',
            }}>
              Relationships
            </h1>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
            </span>
          </div>
          {viewToggle}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
          color: 'var(--color-text-secondary)',
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: atRiskCount > 0 ? 'var(--health-cooling)' : 'var(--color-brand)',
            boxShadow: `0 0 0 6px ${atRiskCount > 0 ? 'rgba(240,173,78,0.12)' : 'rgba(37,180,57,0.12)'}`,
            flexShrink: 0,
          }} />
          <p style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.4,
            color: 'var(--color-text-secondary)',
          }}>
            {headerPulse}
          </p>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>

          {/* Search - primary, wider */}
          <input
            className="records-search"
            type="search"
            placeholder="Search people"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
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

          {/* Primary filters */}
          <select
            value={filters.category ? `cat:${filters.category}` : filters.pod ?? ''}
            onChange={e => {
              const v = e.target.value
              if (v.startsWith('cat:')) {
                setFilters(f => ({ ...f, pod: null, category: v.slice(4) }))
              } else {
                setFilters(f => ({ ...f, pod: v || null, category: null }))
              }
            }}
            className="records-toolbar-select"
            style={selectStyle}
          >
            <option value="">All Pods</option>
            {pods.map(p => {
              const podCats = categories.filter(c => c.list_id === p.id)
              return [
                <option key={p.id} value={p.id}>{p.name}</option>,
                ...podCats.map(c => (
                  <option key={c.id} value={`cat:${c.id}`}>&nbsp;&nbsp;{c.name}</option>
                )),
              ]
            })}
          </select>

          <select
            value={filters.recency}
            onChange={e => setFilters(f => ({ ...f, recency: e.target.value as RecencyFilter }))}
            className="records-toolbar-select"
            style={selectStyle}
          >
            <option value="any">Last contacted</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="never">Never contacted</option>
          </select>

          {activeFilterCount > 0 && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}>
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

          <div ref={moreRef} style={{ marginLeft: 'auto', position: 'relative' }}>
            <button
              className="delight-button"
              type="button"
              onClick={() => setShowMoreDropdown(v => !v)}
              style={utilityBtnStyle(showMoreDropdown)}
            >
              More
            </button>
            {showMoreDropdown && (
              <div className="records-dropdown" style={{ ...dropdownStyle, right: 0, left: 'auto', minWidth: 220 }}>
                <div style={menuLabelStyle}>Views</div>
                <button type="button" onClick={() => applyView(null)} style={dropdownButtonStyle}>
                  All People
                </button>
                {savedViews.map(view => (
                  <div
                    key={view.name}
                    style={dropdownRowStyle}
                  >
                    <button type="button" onClick={() => applyView(view)} style={dropdownButtonStyle}>
                      {view.name}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => deleteView(view.name, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: '0 2px', fontSize: 14, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--edge)', marginTop: 4, paddingTop: 4 }}>
                  {showSaveInput ? (
                    <div style={{ display: 'flex', gap: 4, padding: '4px 8px' }}>
                      <input
                        autoFocus
                        type="text"
                        placeholder="View name..."
                        value={savingViewName}
                        onChange={e => setSavingViewName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveView(); if (e.key === 'Escape') setShowSaveInput(false) }}
                        style={{
                          flex: 1,
                          height: 26,
                          padding: '0 8px',
                          borderRadius: 6,
                          border: '1px solid var(--edge)',
                          background: 'var(--color-bg)',
                          fontSize: 12,
                          color: 'var(--color-text-primary)',
                                      fontFamily: 'inherit',
                        }}
                      />
                      <button
                        type="button"
                        onClick={saveView}
                        style={{ background: 'var(--color-brand)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 600, padding: '0 8px', cursor: 'pointer' }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowSaveInput(true)} style={{ ...dropdownButtonStyle, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                      + Save current view
                    </button>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--edge)', marginTop: 4, paddingTop: 4 }}>
                  <div style={menuLabelStyle}>Columns</div>
                {COLUMNS.map(col => (
                  <label
                    key={col.id}
                    style={{ ...dropdownItemStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col.id)}
                      onChange={() => toggleColumn(col.id)}
                      style={{ margin: 0 }}
                    />
                    <span style={{ fontSize: 13 }}>{col.label}</span>
                  </label>
                ))}
                </div>

                <div style={{ borderTop: '1px solid var(--edge)', marginTop: 4, paddingTop: 4 }}>
                  <div style={menuLabelStyle}>Export</div>
                <button
                  type="button"
                  onClick={() => { handleExportCsv(filtered); setShowMoreDropdown(false) }}
                  style={dropdownButtonStyle}
                >
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => { void handleShareAsLink(); setShowMoreDropdown(false) }}
                  style={dropdownButtonStyle}
                >
                  {copyFeedback ? 'Link copied!' : 'Share as a link'}
                </button>
                </div>

                <div style={{ borderTop: '1px solid var(--edge)', marginTop: 4, paddingTop: 4 }}>
                  <div style={menuLabelStyle}>Import</div>
                  <button
                    type="button"
                    onClick={() => { navigate('/import'); setShowMoreDropdown(false) }}
                    style={dropdownButtonStyle}
                  >
                    Import CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{
          margin: '0 40px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          background: 'var(--tint)',
          borderRadius: 8,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {bulkOperating ? 'Working...' : `${selectedIds.size} selected`}
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Pod actions */}
            <div ref={podPickerRef} style={{ position: 'relative' }}>
              <button
                className="delight-button"
                type="button"
                onClick={() => { setShowPodPicker(v => !v); setShowSubPodPicker(false); setShowFieldUpdate(false) }}
                disabled={bulkOperating}
                style={bulkBtnStyle}
              >
                Pod
                <span style={{ marginLeft: 4, opacity: 0.5 }}>&#9662;</span>
              </button>
              {showPodPicker && (
                <div className="records-dropdown" style={{ ...dropdownStyle, minWidth: 200 }}>
                  <div style={{ padding: '4px 8px', fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Add to pod
                  </div>
                  {pods.map(pod => (
                    <button
                      key={`add-${pod.id}`}
                      type="button"
                      onClick={() => handleBulkPodAction(pod.id, 'add')}
                      style={{ ...dropdownButtonStyle, gap: 8 }}
                    >
                      {pod.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: pod.color, flexShrink: 0 }} />}
                      {pod.name}
                    </button>
                  ))}
                  <div style={{ height: 1, background: 'var(--divider)', margin: '4px 0' }} />
                  <div style={{ padding: '4px 8px', fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Move to pod
                  </div>
                  {pods.map(pod => (
                    <button
                      key={`move-${pod.id}`}
                      type="button"
                      onClick={() => handleBulkPodAction(pod.id, 'move')}
                      style={{ ...dropdownButtonStyle, gap: 8 }}
                    >
                      {pod.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: pod.color, flexShrink: 0 }} />}
                      {pod.name}
                    </button>
                  ))}
                  {pods.length === 0 && (
                    <div style={{ ...dropdownItemStyle, color: 'var(--color-text-tertiary)' }}>No pods</div>
                  )}
                </div>
              )}
            </div>

            {/* Sub-pod actions */}
            <div ref={subPodPickerRef} style={{ position: 'relative' }}>
              <button
                className="delight-button"
                type="button"
                onClick={() => { setShowSubPodPicker(v => !v); setShowPodPicker(false); setShowFieldUpdate(false) }}
                disabled={bulkOperating}
                style={bulkBtnStyle}
              >
                Sub-pod
                <span style={{ marginLeft: 4, opacity: 0.5 }}>&#9662;</span>
              </button>
              {showSubPodPicker && (
                <div className="records-dropdown" style={{ ...dropdownStyle, minWidth: 240, maxHeight: 360, overflowY: 'auto' }}>
                  <div style={{ padding: '4px 8px', fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Move to sub-pod
                  </div>
                  {subPodsByPod.map(({ pod, subPods }) => (
                    <div key={pod.id}>
                      <div style={{ padding: '8px 8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {pod.color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: pod.color, flexShrink: 0 }} />}
                        {pod.name}
                      </div>
                      {subPods.map(subPod => (
                        <button
                          key={subPod.id}
                          type="button"
                          onClick={() => handleBulkSubPodAction(subPod.id)}
                          style={{ ...dropdownButtonStyle, paddingLeft: 18 }}
                        >
                          {subPod.name}
                        </button>
                      ))}
                    </div>
                  ))}
                  {subPodsByPod.length === 0 && (
                    <div style={{ ...dropdownItemStyle, color: 'var(--color-text-tertiary)', whiteSpace: 'normal' }}>
                      No sub-pods yet. Add sub-pods from a pod page.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Field update */}
            <div ref={fieldUpdateRef} style={{ position: 'relative' }}>
              <button
                className="delight-button"
                type="button"
                onClick={() => { setShowFieldUpdate(v => !v); setShowPodPicker(false); setShowSubPodPicker(false) }}
                disabled={bulkOperating}
                style={bulkBtnStyle}
              >
                Update field
              </button>
              {showFieldUpdate && (
                <div className="records-dropdown" style={{ ...dropdownStyle, minWidth: 200, padding: 8 }}>
                  <select
                    value={updateField}
                    onChange={e => setUpdateField(e.target.value)}
                    style={{ ...selectStyle, width: '100%', marginBottom: 6 }}
                  >
                    <option value="">Select field...</option>
                    <option value="company">Company</option>
                    <option value="role">Role</option>
                    <option value="location">Location</option>
                    <option value="status">Status</option>
                  </select>
                  {updateField === 'status' ? (
                    <select
                      value={updateValue}
                      onChange={e => setUpdateValue(e.target.value)}
                      style={{ ...selectStyle, width: '100%', marginBottom: 6 }}
                    >
                      <option value="">Select status...</option>
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Archived">Archived</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="New value..."
                      value={updateValue}
                      onChange={e => setUpdateValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && updateField && updateValue) handleBulkFieldUpdate() }}
                      style={{
                        width: '100%',
                        height: 28,
                        padding: '0 8px',
                        borderRadius: 6,
                        border: '1px solid var(--edge)',
                        background: 'var(--color-bg)',
                        fontSize: 12,
                        color: 'var(--color-text-primary)',
                                  fontFamily: 'inherit',
                        marginBottom: 6,
                        boxSizing: 'border-box',
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => { if (updateField && updateValue) handleBulkFieldUpdate() }}
                    disabled={!updateField || !updateValue}
                    style={{
                      width: '100%',
                      padding: '5px 0',
                      borderRadius: 6,
                      background: 'var(--color-brand)',
                      border: 'none',
                      color: 'var(--header-band-text)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: updateField && updateValue ? 'pointer' : 'not-allowed',
                      opacity: updateField && updateValue ? 1 : 0.5,
                    }}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {selectedIds.size === 2 && (
              <button
                className="delight-button"
                type="button"
                onClick={() => setShowMergeModal(true)}
                disabled={bulkOperating}
                style={bulkBtnStyle}
              >
                Merge
              </button>
            )}

            <button
              className="delight-button"
              type="button"
              onClick={() => handleExportCsv()}
              disabled={bulkOperating}
              style={bulkBtnStyle}
            >
              Export CSV
            </button>
            <button
              className="delight-button"
              type="button"
              onClick={() => setShowArchiveConfirm(true)}
              disabled={bulkOperating}
              style={{ ...bulkBtnStyle, color: 'var(--health-fading)' }}
            >
              Archive
            </button>
            <button
              className="delight-button"
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={bulkOperating}
              style={{ ...bulkBtnStyle, color: 'var(--health-fading)' }}
            >
              Delete
            </button>
            <button
              className="delight-button"
              type="button"
              onClick={openAddToCampaign}
              disabled={bulkOperating}
              style={bulkBtnStyle}
            >
              Add to Campaign
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 12 }}
          >
            Clear
          </button>
        </div>
      )}

      {showMergeModal && selectedIds.size === 2 && (() => {
        const ids = Array.from(selectedIds)
        const a = contacts.find(c => c.id === ids[0])
        const b = contacts.find(c => c.id === ids[1])
        if (!a || !b) return null
        return (
          <MergeModal
            recordA={a}
            recordB={b}
            pods={pods}
            onClose={() => setShowMergeModal(false)}
            onMerged={() => {
              setShowMergeModal(false)
              setSelectedIds(new Set())
              invalidateContactsCache()
              setRefreshKey(k => k + 1)
            }}
          />
        )
      })()}

      {showAddToCampaign && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={closeAddToCampaign} />
          <div
            ref={addToCampaignDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-to-campaign-title"
            tabIndex={-1}
            onKeyDown={(e) => { if (e.key === 'Escape') closeAddToCampaign() }}
            style={{ position: 'relative', background: 'var(--surface-panel)', backdropFilter: 'blur(20px)', borderRadius: 12, padding: 24, minWidth: 320, maxHeight: '60vh', overflow: 'auto' }}
          >
            <h3 id="add-to-campaign-title" style={{ margin: '0 0 16px', fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>Add to Campaign</h3>
            {activeCampaigns.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '0 0 12px' }}>No active campaigns.</p>
            ) : (
              activeCampaigns.map(c => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => { setSelectedCampaignId(c.id); setCampaignAddError(null) }}
                  style={{
                    width: '100%',
                    border: 'none',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    padding: '8px 12px', borderRadius: 8, cursor: addingToCampaign ? 'not-allowed' : 'pointer', marginBottom: 4,
                    background: selectedCampaignId === c.id ? 'var(--tint)' : 'transparent',
                    opacity: addingToCampaign ? 0.7 : 1,
                  }}
                  disabled={addingToCampaign}
                  onMouseEnter={e => { if (selectedCampaignId !== c.id) e.currentTarget.style.background = 'var(--tint)' }}
                  onMouseLeave={e => { if (selectedCampaignId !== c.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{c.type} - {c.contact_ids.length} people</div>
                </button>
              ))
            )}
            {selectedCampaign && campaignAddPlan.alreadyInCampaign.length > 0 && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                {campaignAddPlan.alreadyInCampaign.length} selected {campaignAddPlan.alreadyInCampaign.length === 1 ? 'person is' : 'people are'} already in this campaign.
              </p>
            )}
            {campaignAddError && (
              <p role="alert" style={{ margin: '8px 0 0', fontSize: 12, color: '#D93025', lineHeight: 1.4 }}>
                {campaignAddError}
              </p>
            )}
            <button
              type="button"
              disabled={!selectedCampaignId || addingToCampaign || campaignAddPlan.toAdd.length === 0}
              onClick={handleAddToCampaign}
              style={{
                marginTop: 12, width: '100%', padding: '8px 16px', borderRadius: 8, border: 'none',
                background: selectedCampaignId && campaignAddPlan.toAdd.length > 0 ? 'var(--color-text-primary)' : 'var(--edge-strong)',
                color: selectedCampaignId && campaignAddPlan.toAdd.length > 0 ? 'var(--header-band-text)' : 'var(--color-text-tertiary)',
                cursor: selectedCampaignId && campaignAddPlan.toAdd.length > 0 && !addingToCampaign ? 'pointer' : 'default',
                fontSize: 14, fontWeight: 500,
                fontFamily: 'inherit',
                opacity: addingToCampaign ? 0.75 : 1,
              }}
            >
              {addingToCampaign
                ? 'Adding...'
                : campaignAddPlan.toAdd.length === 0 && selectedCampaign
                  ? 'Already in campaign'
                  : `Add ${campaignAddPlan.toAdd.length || selectedIds.size} ${(campaignAddPlan.toAdd.length || selectedIds.size) === 1 ? 'person' : 'people'}`
              }
            </button>
          </div>
        </div>
      )}

      {/* Table area */}
      {contacts.length === 0 ? (
        <EmptyState
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          heading="Your people live here"
          subtext="Import a CSV or add your first contact to start building your network."
          ctaLabel="Import contacts"
          onCta={() => navigate('/import')}
          ghosts={3}
        />
      ) : filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>No matches for this filter combination</span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: '1px solid var(--edge)',
                background: 'var(--color-surface)',
                fontSize: 13,
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '0 clamp(16px, 4vw, 40px) 40px', WebkitOverflowScrolling: 'touch' }}>
          {/* Table */}
          <table
            className="records-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              tableLayout: 'auto',
            }}
          >
            <thead style={{ position: 'sticky', top: 0, background: 'var(--color-bg)', zIndex: 1 }}>
              <tr style={{ borderBottom: '1px solid var(--edge)' }}>
                <th style={{ width: 48, padding: 0, textAlign: 'center', height: 44, position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 44 }}>
                    <input
                      type="checkbox"
                      aria-label={allSelected ? 'Deselect all people' : 'Select all people'}
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', width: 15, height: 15, accentColor: 'var(--color-brand)' }}
                    />
                  </div>
                </th>
                {visibleCols.map(col => {
                  return (
                    <th
                      key={col.id}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase' as const,
                        color: sort.col === col.id ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        position: 'relative',
                      }}
                      title={col.id === 'equity' ? 'Relationship health based on interaction frequency. Thriving (85+), Steady (70+), Cooling (40+), Fading (<40)' : undefined}
                    >
                      <button type="button" onClick={() => toggleSort(col.id)} aria-label={`Sort by ${col.label}`} style={sortButtonStyle}>
                        {col.label}
                        <SortIcon active={sort.col === col.id} dir={sort.dir} />
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map(contact => {
                const score = equityMap[contact.id] ?? 0
                const label = scoreLabel(score)
                const badge = EQUITY_BADGE[label]
                const selected = selectedIds.has(contact.id)

                return (
                  <tr
                    key={contact.id}
                    className="contacts-row"
                    onClick={() => setSelectedContact(contact)}
                    style={{
                      borderBottom: '1px solid var(--edge)',
                      cursor: 'pointer',
                      background: selected ? 'color-mix(in srgb, var(--color-brand) 10%, transparent)' : 'transparent',
                    }}
                  >
                    {/* Pod color + checkbox */}
                    <td style={{ padding: '0', width: 48, height: 52 }} onClick={e => toggleSelectRow(contact.id, e)}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 52, cursor: 'pointer' }}>
                        <input
                          className="records-checkbox"
                          type="checkbox"
                          checked={selected}
                          onChange={() => {}}
                          style={{ cursor: 'pointer', width: 15, height: 15, accentColor: 'var(--color-brand)' }}
                        />
                      </div>
                    </td>

                    {visibleCols.map(col => (
                      <td key={col.id} style={{ padding: '10px 12px', height: 52 }}>
                        {col.id === 'name' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span className="contact-avatar" style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: avatarColor(contact.name),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--header-band-text)',
                              flexShrink: 0,
                              letterSpacing: '0.02em',
                              boxShadow: `0 0 0 2px ${HEALTH_RING_COLOR[label] ?? 'var(--edge)'}`,
                            }}>
                              {initials(contact.name)}
                            </span>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                              <span className="contact-name" style={{
                                fontFamily: 'var(--font-sans)',
                                fontWeight: 700,
                                fontSize: 14,
                                letterSpacing: '-0.01em',
                                color: 'var(--color-text-primary)',
                                lineHeight: 1.3,
                              }}>
                                {contact.name}
                              </span>
                              <span style={{
                                fontSize: 11,
                                color: 'var(--color-text-tertiary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 'clamp(120px, 15vw, 260px)',
                              }}>
                                {contact.role && contact.company
                                  ? `${contact.role} at ${contact.company}`
                                  : contact.role || contact.company || (
                                    contact.last_contacted_at
                                      ? formatRelativeTime(contact.last_contacted_at)
                                      : ''
                                  )}
                              </span>
                            </span>
                          </span>
                        )}
                        {col.id === 'company' && (
                          <span style={{ color: contact.company ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)' }}>
                            {contact.company ?? '—'}
                          </span>
                        )}
                        {col.id === 'pod' && (() => {
                          const contactPods = contact.list_ids.map(id => pods.find(p => p.id === id)).filter(Boolean) as Pod[]
                          if (contactPods.length === 0) return <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>-</span>
                          return (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {contactPods.map((p, i) => (
                                <span key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color ?? 'var(--edge)', flexShrink: 0 }} />
                                  {i === 0 && <span style={{ color: 'var(--color-text-secondary)' }}>{p.name}</span>}
                                </span>
                              ))}
                              {contactPods.length > 1 && (
                                <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>+{contactPods.length - 1}</span>
                              )}
                            </span>
                          )
                        })()}
                        {col.id === 'sub_pod' && (() => {
                          const contactSubPods = getContactSubPods(contact, categories)
                          if (contactSubPods.length === 0) return <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>-</span>
                          return (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', maxWidth: 'clamp(140px, 18vw, 280px)' }}>
                              {contactSubPods.map(subPod => {
                                const parentPod = pods.find(pod => pod.id === subPod.list_id)
                                return (
                                  <span
                                    key={subPod.id}
                                    title={parentPod ? `${subPod.name} in ${parentPod.name}` : subPod.name}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      maxWidth: 150,
                                      padding: '3px 8px',
                                      borderRadius: 999,
                                      border: '1px solid var(--edge)',
                                      background: parentPod?.color
                                        ? `color-mix(in srgb, ${parentPod.color} 12%, var(--surface-panel) 88%)`
                                        : 'var(--tint)',
                                      color: 'var(--color-text-secondary)',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {parentPod?.color && (
                                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: parentPod.color, flexShrink: 0 }} />
                                    )}
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{subPod.name}</span>
                                  </span>
                                )
                              })}
                            </span>
                          )
                        })()}
                        {col.id === 'equity' && (
                          <span className="health-badge" style={{
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
                        )}
                        {col.id === 'type' && (
                          <span style={{ color: 'var(--color-text-secondary)' }}>
                            {contact.type === 'Contact' ? 'Person' : 'Company'}
                          </span>
                        )}
                        {col.id === 'status' && (
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 100,
                            fontSize: 11,
                            fontWeight: 500,
                            background: contact.status === 'Active'
                              ? 'var(--health-thriving-bg)'
                              : contact.status === 'Pending'
                              ? 'var(--health-cooling-bg)'
                              : 'var(--tint)',
                            color: contact.status === 'Active'
                              ? 'var(--health-thriving)'
                              : contact.status === 'Pending'
                              ? 'var(--health-cooling)'
                              : 'var(--color-text-secondary)',
                          }}>
                            {contact.status}
                          </span>
                        )}
                        {col.id === 'last_contact' && (
                          <span style={{ color: 'var(--color-text-secondary)' }}>
                            {contact.last_contacted_at
                              ? formatRelativeTime(contact.last_contacted_at)
                              : <span style={{ color: 'var(--color-text-tertiary)' }}>Never</span>
                            }
                          </span>
                        )}
                        {col.id === 'cadence' && (
                          <span style={{ color: 'var(--color-text-secondary)' }}>
                            {contact.cadence_override ?? contact.contact_frequency ?? (
                              <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                            )}
                          </span>
                        )}
                        {col.id === 'location' && (
                          <span style={{ color: contact.location ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)' }}>
                            {contact.location ?? '—'}
                          </span>
                        )}
                        {col.id === 'follow_up' && (
                          <span style={{ color: 'var(--color-text-secondary)' }}>
                            {contact.next_follow_up_date
                              ? formatRelativeTime(contact.next_follow_up_date)
                              : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                            }
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Archive confirm */}
      {showArchiveConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} onClick={() => setShowArchiveConfirm(false)} />
          <div
            ref={archiveDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-people-title"
            tabIndex={-1}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowArchiveConfirm(false) }}
            style={{
              position: 'relative', background: 'var(--surface-panel)', backdropFilter: 'blur(24px)',
              borderRadius: 14, padding: '24px 28px', maxWidth: 340, width: '100%',
              boxShadow: '0 16px 48px rgba(0,0,0,0.14)',
            }}
          >
            <p id="archive-people-title" style={{ margin: '0 0 4px', fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Archive {selectedIds.size} {selectedIds.size === 1 ? 'person' : 'people'}?
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              They'll move to Archived status. You can undo this right after.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowArchiveConfirm(false)} style={{
                padding: '7px 16px', borderRadius: 8, border: '1px solid var(--edge)',
                background: 'transparent', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', color: 'var(--color-text-secondary)',
              }}>Cancel</button>
              <button type="button" onClick={handleBulkArchive} style={{
                padding: '7px 16px', borderRadius: 8, border: 'none',
                background: 'var(--health-fading)', color: 'var(--header-band-text)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} onClick={() => setShowDeleteConfirm(false)} />
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-people-title"
            tabIndex={-1}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowDeleteConfirm(false) }}
            style={{
              position: 'relative', background: 'var(--surface-panel)', backdropFilter: 'blur(24px)',
              borderRadius: 14, padding: '24px 28px', maxWidth: 360, width: '100%',
              boxShadow: '0 16px 48px rgba(0,0,0,0.14)',
            }}
          >
            <p id="delete-people-title" style={{ margin: '0 0 4px', fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Delete {selectedIds.size} {selectedIds.size === 1 ? 'person' : 'people'}?
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              This permanently removes the selected contacts from Real Deal and Supabase.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={bulkOperating} style={{
                padding: '7px 16px', borderRadius: 8, border: '1px solid var(--edge)',
                background: 'transparent', fontSize: 13, fontWeight: 500,
                cursor: bulkOperating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', color: 'var(--color-text-secondary)',
              }}>Cancel</button>
              <button type="button" onClick={handleBulkDelete} disabled={bulkOperating} style={{
                padding: '7px 16px', borderRadius: 8, border: 'none',
                background: 'var(--health-fading)', color: 'var(--header-band-text)', fontSize: 13, fontWeight: 600,
                cursor: bulkOperating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: bulkOperating ? 0.7 : 1,
              }}>{bulkOperating ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {selectedContact && (
        <ContactDetail
          contact={selectedContact}
          categoryId={selectedContact.category_ids[0]}
          onClose={() => setSelectedContact(null)}
          onSaved={handleContactSaved}
          onDeleted={handleContactDeleted}
          pods={pods}
          categories={categories}
        />
      )}

      {/* Create FAB */}
      {activeView === 'people' && (
        <div ref={createMenuRef} style={{ position: 'fixed', bottom: 88, right: 20, zIndex: 200 }}>
          {showCreateMenu && (
            <div className="records-dropdown" style={{ ...dropdownStyle, position: 'absolute', top: 'auto', bottom: 56, right: 0, left: 'auto', minWidth: 230 }}>
              <button
                type="button"
                onClick={() => { setShowCreate(true); setShowCreateMenu(false) }}
                style={{ ...dropdownButtonStyle, gap: 10 }}
              >
                <UserPlus size={16} />
                Add contact manually
              </button>
              <button
                type="button"
                onClick={() => { navigate('/import'); setShowCreateMenu(false) }}
                style={{ ...dropdownButtonStyle, gap: 10 }}
              >
                <FileSpreadsheet size={16} />
                Upload Excel or CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadImportTemplate()
                    .catch(err => {
                      console.error('Template download failed:', err)
                      showToast('Template download failed. Try again.')
                    })
                  setShowCreateMenu(false)
                }}
                style={{ ...dropdownButtonStyle, gap: 10 }}
              >
                <Download size={16} />
                Download Excel template
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowCreateMenu(v => !v)}
            aria-label="Open contact actions"
            aria-expanded={showCreateMenu}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--color-brand)', border: 'none',
              color: '#fff', fontSize: 24, fontWeight: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.24)',
              transform: showCreateMenu ? 'rotate(45deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            +
          </button>
        </div>
      )}

      <CreateRecordModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); setRefreshKey(k => k + 1) }}
        initialType="Contact"
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10000, display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', borderRadius: 10,
          background: 'var(--color-text-primary)', color: 'var(--color-bg)',
          fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          animation: 'toast-enter 0.25s ease-out',
        }}>
          <span>{toast.message}</span>
          {toast.undo && (
            <button type="button" onClick={() => { toast.undo?.(); setToast(null) }} style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6,
              color: 'inherit', fontSize: 12, fontWeight: 600, padding: '4px 10px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Undo</button>
          )}
        </div>
      )}

      {/* HIG row styles */}
      <style>{`
        @media (max-width: 767px) {
          .records-table { font-size: 12px; min-width: 520px; }
          .records-search { min-width: 100% !important; flex-basis: 100% !important; }
          .records-toolbar-select { min-height: 40px !important; }
          .records-toolbar-button { min-height: 40px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .contacts-row,
          .contact-avatar,
          .contact-name,
          .health-badge,
          .delight-button,
          .records-search,
          .records-checkbox {
            transition: none !important;
            animation: none !important;
            transform: none !important;
          }
        }
        @keyframes toast-enter {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes checkbox-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.14); }
          100% { transform: scale(1); }
        }
        .contacts-row {
          transition: background 0.16s ease, transform 0.16s ease;
        }
        .contacts-row:hover {
          background: color-mix(in srgb, var(--tint) 60%, transparent) !important;
          transform: translateY(-1px);
        }
        .contacts-row:active {
          background: rgba(0,0,0,0.04) !important;
        }
        .contacts-row[style*="rgba(37,180,57"]:hover {
          background: rgba(37,180,57,0.09) !important;
        }
        .contacts-row:hover .contact-avatar {
          transform: translateY(-1px) scale(1.04);
          box-shadow: 0 0 0 2px currentColor, 0 10px 18px rgba(0,0,0,0.08);
        }
        .contacts-row:hover .contact-name {
          color: var(--color-brand);
        }
        .contacts-row:hover .health-badge {
          transform: translateY(-1px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.06);
        }
        .contact-avatar,
        .contact-name,
        .health-badge,
        .delight-button,
        .records-search {
          transition: transform 0.16s ease, box-shadow 0.16s ease, color 0.16s ease, border-color 0.16s ease, background 0.16s ease;
        }
        .delight-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.06);
        }
        .delight-button:active {
          transform: translateY(0);
          box-shadow: none;
        }
        .records-search:focus {
          outline: none;
          border-color: color-mix(in srgb, var(--color-brand) 45%, var(--edge));
          box-shadow: 0 0 0 4px rgba(37,180,57,0.08);
        }
        .records-checkbox:checked {
          animation: checkbox-pop 0.22s ease-out;
        }
        @media (prefers-color-scheme: dark) {
          input[type="checkbox"] {
            accent-color: var(--color-brand);
            color-scheme: dark;
          }
        }
        .records-dropdown > div:hover {
          background: var(--tint);
        }
        .records-dropdown > label:hover {
          background: var(--tint);
        }
        .records-dropdown > button:hover,
        .records-dropdown > div > button:hover {
          background: var(--tint);
        }
      `}</style>
    </div>
  )
}

// ── Shared micro styles ───────────────────────────────────────────────────────

function utilityBtnStyle(active: boolean): React.CSSProperties {
  return {
    minWidth: 64,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    border: `1px solid ${active ? 'var(--edge-strong)' : 'var(--edge)'}`,
    background: active ? 'var(--tint)' : 'transparent',
    color: active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
    cursor: 'pointer',
    transition: 'background 0.12s, border-color 0.12s, color 0.12s',
    padding: '0 12px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
  }
}

const selectStyle: React.CSSProperties = {
  height: 44,
  minHeight: 44,
  padding: '0 10px',
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'var(--surface-panel)',
  backdropFilter: 'blur(20px)',
  color: 'var(--color-text-secondary)',
  fontSize: 12,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'border-color 0.12s',
}

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 6,
  background: 'var(--surface-panel)',
  border: '1px solid var(--edge)',
  borderRadius: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
  zIndex: 50,
  minWidth: 180,
  padding: 4,
  backdropFilter: 'blur(32px)',
}

const dropdownItemStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  minHeight: 36,
  display: 'flex',
  alignItems: 'center',
  transition: 'background 0.1s',
}

const dropdownButtonStyle: React.CSSProperties = {
  ...dropdownItemStyle,
  width: '100%',
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  fontFamily: 'inherit',
}

const dropdownRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
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

const menuLabelStyle: React.CSSProperties = {
  padding: '6px 12px 2px',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
}

const bulkBtnStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  padding: '6px 14px',
  minHeight: 32,
  borderRadius: 8,
  background: 'var(--surface-panel)',
  backdropFilter: 'blur(20px)',
  border: '1px solid var(--edge)',
  cursor: 'pointer',
  color: 'var(--color-text-primary)',
  fontFamily: 'inherit',
  transition: 'background 0.12s',
}
