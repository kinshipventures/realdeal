import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Download } from 'lucide-react'
import { getContacts, getPods, getAllInteractions, updateContact, invalidateContactsCache, getProjects, addRecordToProject, invalidateProjectsCache } from '../../lib/airtable'
import { AddToPipelineModal } from '../pipelines/AddToPipelineModal'
import { MergeModal } from '../merge/MergeModal'
import { contactEquityScore, scoreLabel } from '../../lib/equity'
import { formatRelativeTime } from '../../lib/utils'
import { logSystemEvent } from '../../lib/timeline'
import type { Contact, Pod, Project, RelationshipType, RelationshipStatus } from '../../lib/types'
import type { Interaction } from '../../lib/types'

// ── Column definitions ───────────────────────────────────────────────────────

type ColumnId = 'name' | 'company' | 'pod' | 'equity' | 'type' | 'status' | 'last_contact' | 'cadence' | 'location' | 'follow_up'

interface ColumnDef {
  id: ColumnId
  label: string
  defaultVisible: boolean
}

const COLUMNS: ColumnDef[] = [
  { id: 'name',         label: 'Name',         defaultVisible: true },
  { id: 'company',      label: 'Company',       defaultVisible: true },
  { id: 'pod',          label: 'Pod',           defaultVisible: true },
  { id: 'equity',       label: 'Equity',        defaultVisible: true },
  { id: 'type',         label: 'Type',          defaultVisible: false },
  { id: 'status',       label: 'Status',        defaultVisible: false },
  { id: 'last_contact', label: 'Last Contact',  defaultVisible: false },
  { id: 'cadence',      label: 'Cadence',       defaultVisible: false },
  { id: 'location',     label: 'Location',      defaultVisible: false },
  { id: 'follow_up',    label: 'Follow-up',     defaultVisible: false },
]

// ── Filter types ─────────────────────────────────────────────────────────────

type RecencyFilter = 'any' | '7d' | '30d' | '90d' | 'never'

interface FilterState {
  search: string
  pod: string | null
  type: RelationshipType | null
  status: RelationshipStatus | null
  recency: RecencyFilter
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  pod: null,
  type: null,
  status: null,
  recency: 'any',
}

// ── Sort types ───────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc'

// ── Saved views ──────────────────────────────────────────────────────────────

const VIEWS_KEY = 'realdeal:contacts-views'
const COL_ORDER_KEY = 'realdeal:contacts-column-order'
const COL_WIDTHS_KEY = 'realdeal:contacts-column-widths'

interface SavedView {
  name: string
  filters: FilterState
  visibleColumns: ColumnId[]
  sort: { col: ColumnId; dir: SortDir }
  columnOrder?: ColumnId[]
  columnWidths?: Record<ColumnId, number>
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

// ── Equity badge colors ──────────────────────────────────────────────────────

const EQUITY_BADGE: Record<string, { bg: string; color: string }> = {
  Thriving: { bg: 'rgba(37,180,57,0.12)',  color: '#16a34a' },
  Steady:   { bg: 'rgba(37,180,57,0.07)',  color: '#4ade80' },
  Cooling:  { bg: 'rgba(251,146,60,0.12)', color: '#ea580c' },
  Fading:   { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626' },
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

// ── Component ────────────────────────────────────────────────────────────────

export function RecordsList() {
  const navigate = useNavigate()

  // Data
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [equityMap, setEquityMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Filters
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)

  // Sort
  const [sort, setSort] = useState<{ col: ColumnId; dir: SortDir }>({ col: 'equity', dir: 'desc' })

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(
    () => new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.id))
  )

  // Column order (drag-reorder)
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(() => {
    try {
      const raw = localStorage.getItem(COL_ORDER_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ColumnId[]
        // Ensure all known columns are present (handles new columns added after save)
        const allIds = COLUMNS.map(c => c.id)
        const merged = [...parsed.filter(id => allIds.includes(id))]
        for (const id of allIds) {
          if (!merged.includes(id)) merged.push(id)
        }
        return merged
      }
    } catch { /* ignore */ }
    return COLUMNS.map(c => c.id)
  })

  // Column widths (resize)
  const [columnWidths, setColumnWidths] = useState<Partial<Record<ColumnId, number>>>(() => {
    try {
      const raw = localStorage.getItem(COL_WIDTHS_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  })

  // Drag-reorder refs (avoid re-renders during drag)
  const dragCol = useRef<ColumnId | null>(null)
  const overCol = useRef<ColumnId | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dropTargetCol, setDropTargetCol] = useState<ColumnId | null>(null)

  // Resize refs
  const resizingCol = useRef<ColumnId | null>(null)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Bulk actions
  const [showPodPicker, setShowPodPicker] = useState(false)
  const [showFieldUpdate, setShowFieldUpdate] = useState(false)
  const [updateField, setUpdateField] = useState('')
  const [updateValue, setUpdateValue] = useState('')
  const [bulkOperating, setBulkOperating] = useState(false)
  const [showBulkPipelineModal, setShowBulkPipelineModal] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [showAddToProject, setShowAddToProject] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const podPickerRef = useRef<HTMLDivElement>(null)
  const fieldUpdateRef = useRef<HTMLDivElement>(null)

  // Saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>(loadViews)
  const [showViewsDropdown, setShowViewsDropdown] = useState(false)
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false)
  const [savingViewName, setSavingViewName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)

  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)

  const viewsRef = useRef<HTMLDivElement>(null)
  const columnsRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // Load data
  useEffect(() => {
    let stale = false
    async function load() {
      const [allContacts, allPods, allInteractions, allProjects] = await Promise.all([
        getContacts(),
        getPods(),
        getAllInteractions(),
        getProjects(),
      ])
      if (stale) return

      setPods(allPods)
      setContacts(allContacts)
      setProjects(allProjects)

      const eqMap: Record<string, number> = {}
      for (const contact of allContacts) {
        const interactions: Interaction[] = allInteractions.filter(i => i.contact_id === contact.id)
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
      if (viewsRef.current && !viewsRef.current.contains(e.target as Node)) {
        setShowViewsDropdown(false)
      }
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) {
        setShowColumnsDropdown(false)
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportDropdown(false)
      }
      if (podPickerRef.current && !podPickerRef.current.contains(e.target as Node)) {
        setShowPodPicker(false)
      }
      if (fieldUpdateRef.current && !fieldUpdateRef.current.contains(e.target as Node)) {
        setShowFieldUpdate(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Pod map for lookups
  const podMap = useMemo<Record<string, Pod>>(() => {
    const m: Record<string, Pod> = {}
    for (const p of pods) m[p.id] = p
    return m
  }, [pods])

  // Filtered + sorted contacts
  const filtered = useMemo(() => {
    let result = contacts

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
      )
    }

    if (filters.pod) {
      result = result.filter(c => c.list_ids.includes(filters.pod!))
    }

    if (filters.type) {
      result = result.filter(c => c.type === filters.type)
    }

    if (filters.status) {
      result = result.filter(c => c.status === filters.status)
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
  }, [contacts, filters, sort, equityMap, podMap])

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
        // Ensure newly visible column is in columnOrder
        setColumnOrder(order => {
          if (order.includes(id)) return order
          return [...order, id]
        })
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
      columnOrder,
      columnWidths: columnWidths as Record<ColumnId, number>,
    }
    const updated = [...savedViews.filter(v => v.name !== view.name), view]
    setSavedViews(updated)
    saveViews(updated)
    setSavingViewName('')
    setShowSaveInput(false)
  }, [savingViewName, filters, visibleColumns, sort, columnOrder, columnWidths, savedViews])

  // Apply a saved view
  const applyView = useCallback((view: SavedView | null) => {
    if (!view) {
      setFilters(DEFAULT_FILTERS)
      setVisibleColumns(new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.id)))
      setSort({ col: 'equity', dir: 'desc' })
      setColumnOrder(COLUMNS.map(c => c.id))
      setColumnWidths({})
      localStorage.removeItem(COL_ORDER_KEY)
      localStorage.removeItem(COL_WIDTHS_KEY)
    } else {
      setFilters(view.filters)
      setVisibleColumns(new Set(view.visibleColumns))
      setSort(view.sort)
      if (view.columnOrder) setColumnOrder(view.columnOrder)
      if (view.columnWidths) setColumnWidths(view.columnWidths)
    }
    setShowViewsDropdown(false)
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

  const hasActiveFilters = filters.search || filters.pod || filters.type || filters.status || filters.recency !== 'any'

  // ── Bulk action handlers ──────────────────────────────────────────────────

  async function handleBulkAddToPod(podId: string) {
    setShowPodPicker(false)
    setBulkOperating(true)
    const selected = contacts.filter(c => selectedIds.has(c.id))
    const pod = pods.find(p => p.id === podId)
    for (const contact of selected) {
      if (contact.list_ids.includes(podId)) continue
      const newListIds = [...contact.list_ids, podId]
      const primaryId = contact.primary_list_id ?? podId
      await updateContact(contact.id, { list_ids: newListIds, primary_list_id: primaryId })
      await logSystemEvent({
        contactId: contact.id,
        type: 'pod_change',
        detail: { action: 'added', pod: pod?.name ?? podId, podId },
        notes: `Added to ${pod?.name ?? 'pod'}`,
      })
    }
    invalidateContactsCache()
    const fresh = await getContacts()
    setContacts(fresh)
    setSelectedIds(new Set())
    setBulkOperating(false)
  }

  async function handleBulkFieldUpdate() {
    setShowFieldUpdate(false)
    setBulkOperating(true)
    const selected = contacts.filter(c => selectedIds.has(c.id))
    for (const contact of selected) {
      await updateContact(contact.id, { [updateField]: updateValue } as Partial<Contact>)
      await logSystemEvent({
        contactId: contact.id,
        type: 'field_update',
        detail: { field: updateField, newValue: updateValue },
        notes: `Updated ${updateField} to "${updateValue}"`,
      })
    }
    invalidateContactsCache()
    const fresh = await getContacts()
    setContacts(fresh)
    setSelectedIds(new Set())
    setUpdateField('')
    setUpdateValue('')
    setBulkOperating(false)
  }

  function cellValue(contact: Contact, colId: ColumnId): string {
    switch (colId) {
      case 'name': return contact.name
      case 'company': return contact.company ?? ''
      case 'pod': { const p = contact.primary_list_id ? podMap[contact.primary_list_id] : null; return p?.name ?? '' }
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

  async function handleCopyToClipboard(rows: Contact[]) {
    const cols = visibleCols
    const headers = cols.map(c => c.label).join('\t')
    const lines = rows.map(c => cols.map(col => cellValue(c, col.id)).join('\t'))
    await navigator.clipboard.writeText([headers, ...lines].join('\n'))
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  // ── Column drag-reorder handlers ──────────────────────────────────────────

  function handleColDragStart(e: React.DragEvent, colId: ColumnId) {
    dragCol.current = colId
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    // Use a transparent 1x1 drag image to avoid browser ghost
    const img = document.createElement('div')
    img.style.position = 'absolute'
    img.style.top = '-9999px'
    document.body.appendChild(img)
    e.dataTransfer.setDragImage(img, 0, 0)
    requestAnimationFrame(() => document.body.removeChild(img))
  }

  function handleColDragOver(e: React.DragEvent, colId: ColumnId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overCol.current !== colId) {
      overCol.current = colId
      setDropTargetCol(colId)
    }
  }

  function handleColDragLeave() {
    overCol.current = null
    setDropTargetCol(null)
  }

  function handleColDragEnd() {
    const from = dragCol.current
    const to = overCol.current
    if (from && to && from !== to) {
      setColumnOrder(prev => {
        const next = prev.filter(id => id !== from)
        const toIdx = next.indexOf(to)
        next.splice(toIdx, 0, from)
        localStorage.setItem(COL_ORDER_KEY, JSON.stringify(next))
        return next
      })
    }
    dragCol.current = null
    overCol.current = null
    setIsDragging(false)
    setDropTargetCol(null)
  }

  // ── Column resize handlers ────────────────────────────────────────────────

  function handleResizePointerDown(e: React.PointerEvent, colId: ColumnId) {
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    resizingCol.current = colId
    resizeStartX.current = e.clientX
    // Get current width from state or measure the th
    const th = (e.target as HTMLElement).parentElement as HTMLTableCellElement
    resizeStartWidth.current = columnWidths[colId] ?? th.offsetWidth
  }

  function handleResizePointerMove(e: React.PointerEvent, colId: ColumnId) {
    if (resizingCol.current !== colId) return
    const delta = e.clientX - resizeStartX.current
    const newWidth = Math.max(60, resizeStartWidth.current + delta)
    setColumnWidths(prev => ({ ...prev, [colId]: newWidth }))
  }

  function handleResizePointerUp(e: React.PointerEvent) {
    if (!resizingCol.current) return
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    setColumnWidths(prev => {
      localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(prev))
      return prev
    })
    resizingCol.current = null
  }

  function handleResizeDoubleClick(colId: ColumnId) {
    setColumnWidths(prev => {
      const next = { ...prev }
      delete next[colId]
      localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(next))
      return next
    })
  }

  const hasCustomWidths = Object.keys(columnWidths).length > 0

  async function handleBulkArchive() {
    if (!window.confirm(`Archive ${selectedIds.size} contact(s)? This is reversible.`)) return
    setBulkOperating(true)
    const selected = contacts.filter(c => selectedIds.has(c.id))
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
  }

  async function handleAddToProject() {
    if (!selectedProjectId) return
    for (const id of selectedIds) {
      await addRecordToProject(selectedProjectId, id)
    }
    invalidateProjectsCache()
    setSelectedIds(new Set())
    setShowAddToProject(false)
    setSelectedProjectId(null)
  }

  // Ordered visible columns -- respects custom column order
  const visibleCols = columnOrder
    .filter(id => visibleColumns.has(id))
    .map(id => COLUMNS.find(c => c.id === id)!)
    .filter(Boolean)

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'hidden' }}>
        <div style={{ padding: '28px 40px 0', flexShrink: 0 }}>
          <div className="skeleton" style={{ width: 140, height: 28, borderRadius: 8, marginBottom: 20 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[80, 180, 100, 90, 90, 90].map((w, i) => (
              <div key={i} className="skeleton" style={{ width: w, height: 36, borderRadius: 8 }} />
            ))}
          </div>
        </div>
        <div style={{ flex: 1, padding: '0 40px 40px' }}>
          <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--edge)' }}>
            {[40, 120, 100, 80, 60].map((w, i) => (
              <div key={i} className="skeleton" style={{ width: w, height: 12, borderRadius: 4 }} />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--edge)', opacity: 1 - i * 0.08 }}>
              <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 3 }} />
              <div className="skeleton" style={{ width: 140 + Math.random() * 60, height: 14, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 90, height: 14, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 100 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '28px 40px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 30,
            fontWeight: 700,
            margin: 0,
            color: 'var(--color-text-primary)',
          }}>
            Contacts
          </h1>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}
          </span>
        </div>

        {/* Filter bar - compact horizontal toolbar */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>

          {/* Views dropdown */}
          <div ref={viewsRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowViewsDropdown(v => !v)}
              style={filterBtnStyle(showViewsDropdown)}
            >
              Views
              <span style={{ marginLeft: 4, opacity: 0.5 }}>▾</span>
            </button>
            {showViewsDropdown && (
              <div style={dropdownStyle}>
                <div
                  onClick={() => applyView(null)}
                  style={dropdownItemStyle}
                >
                  All Contacts
                </div>
                {savedViews.map(view => (
                  <div
                    key={view.name}
                    onClick={() => applyView(view)}
                    style={{ ...dropdownItemStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span>{view.name}</span>
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
                          outline: 'none',
                          fontFamily: 'inherit',
                        }}
                      />
                      <button
                        type="button"
                        onClick={saveView}
                        style={{ background: '#25B439', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 600, padding: '0 8px', cursor: 'pointer' }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => setShowSaveInput(true)} style={{ ...dropdownItemStyle, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                      + Save current view
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <input
            type="search"
            placeholder="Search..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            style={{
              height: 36,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--edge)',
              background: 'var(--surface-panel)',
              backdropFilter: 'blur(20px)',
              fontSize: 13,
              color: 'var(--color-text-primary)',
              outline: 'none',
              fontFamily: 'inherit',
              minWidth: 180,
              transition: 'border-color 0.15s',
            }}
          />

          {/* Pod filter */}
          <select
            value={filters.pod ?? ''}
            onChange={e => setFilters(f => ({ ...f, pod: e.target.value || null }))}
            style={selectStyle}
          >
            <option value="">All Pods</option>
            {pods.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Type filter */}
          <select
            value={filters.type ?? ''}
            onChange={e => setFilters(f => ({ ...f, type: (e.target.value as RelationshipType) || null }))}
            style={selectStyle}
          >
            <option value="">All Types</option>
            <option value="Contact">Person</option>
            <option value="Company">Company</option>
          </select>

          {/* Status filter */}
          <select
            value={filters.status ?? ''}
            onChange={e => setFilters(f => ({ ...f, status: (e.target.value as RelationshipStatus) || null }))}
            style={selectStyle}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Archived">Archived</option>
          </select>

          {/* Recency filter (LIST-01) */}
          <select
            value={filters.recency}
            onChange={e => setFilters(f => ({ ...f, recency: e.target.value as RecencyFilter }))}
            style={selectStyle}
          >
            <option value="any">Any time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="never">Never contacted</option>
          </select>

          {/* Columns toggle */}
          <div ref={columnsRef} style={{ position: 'relative', marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={() => setShowColumnsDropdown(v => !v)}
              style={filterBtnStyle(showColumnsDropdown)}
            >
              Columns
              <span style={{ marginLeft: 4, opacity: 0.5 }}>▾</span>
            </button>
            {showColumnsDropdown && (
              <div style={{ ...dropdownStyle, right: 0, left: 'auto', minWidth: 160 }}>
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
            )}
          </div>

          {/* Toolbar export */}
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowExportDropdown(v => !v)}
              style={{ ...filterBtnStyle(showExportDropdown), display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Download size={13} />
              Export
              <span style={{ marginLeft: 2, opacity: 0.5 }}>▾</span>
            </button>
            {showExportDropdown && (
              <div style={{ ...dropdownStyle, right: 0, left: 'auto', minWidth: 160 }}>
                <div
                  onClick={() => { handleExportCsv(filtered); setShowExportDropdown(false) }}
                  style={dropdownItemStyle}
                >
                  Download CSV
                </div>
                <div
                  onClick={() => { void handleCopyToClipboard(filtered); setShowExportDropdown(false) }}
                  style={dropdownItemStyle}
                >
                  {copyFeedback ? 'Copied!' : 'Copy to clipboard'}
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
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Add to pod */}
            <div ref={podPickerRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => { setShowPodPicker(v => !v); setShowFieldUpdate(false) }}
                disabled={bulkOperating}
                style={bulkBtnStyle}
              >
                Add to pod
              </button>
              {showPodPicker && (
                <div style={{ ...dropdownStyle, minWidth: 160 }}>
                  {pods.map(pod => (
                    <div
                      key={pod.id}
                      onClick={() => handleBulkAddToPod(pod.id)}
                      style={{ ...dropdownItemStyle, display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      {pod.color && (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: pod.color, flexShrink: 0 }} />
                      )}
                      {pod.name}
                    </div>
                  ))}
                  {pods.length === 0 && (
                    <div style={{ ...dropdownItemStyle, color: 'var(--color-text-tertiary)' }}>No pods</div>
                  )}
                </div>
              )}
            </div>

            {/* Field update */}
            <div ref={fieldUpdateRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => { setShowFieldUpdate(v => !v); setShowPodPicker(false) }}
                disabled={bulkOperating}
                style={bulkBtnStyle}
              >
                Update field
              </button>
              {showFieldUpdate && (
                <div style={{ ...dropdownStyle, minWidth: 200, padding: 8 }}>
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
                        outline: 'none',
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
                      background: '#25B439',
                      border: 'none',
                      color: '#fff',
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
                type="button"
                onClick={() => setShowMergeModal(true)}
                disabled={bulkOperating}
                style={bulkBtnStyle}
              >
                Merge
              </button>
            )}

            <button
              type="button"
              onClick={() => handleExportCsv()}
              disabled={bulkOperating}
              style={bulkBtnStyle}
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleBulkArchive}
              disabled={bulkOperating}
              style={{ ...bulkBtnStyle, color: '#D93025' }}
            >
              Archive
            </button>
            <button
              type="button"
              onClick={() => setShowBulkPipelineModal(true)}
              disabled={bulkOperating}
              style={bulkBtnStyle}
            >
              Add to Pipeline
            </button>
            <button
              type="button"
              onClick={() => setShowAddToProject(true)}
              disabled={bulkOperating}
              style={bulkBtnStyle}
            >
              Add to Project
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

      {showBulkPipelineModal && (
        <AddToPipelineModal
          open={showBulkPipelineModal}
          onClose={() => setShowBulkPipelineModal(false)}
          contactIds={Array.from(selectedIds)}
          onCreated={() => { setShowBulkPipelineModal(false); setSelectedIds(new Set()) }}
        />
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

      {showAddToProject && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setShowAddToProject(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, padding: 24, minWidth: 320, maxHeight: '60vh', overflow: 'auto' }}>
            <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Add to Project</h3>
            {projects.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '0 0 12px' }}>No projects available.</p>
            ) : (
              projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  style={{
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                    background: selectedProjectId === p.id ? 'var(--tint)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (selectedProjectId !== p.id) (e.currentTarget as HTMLDivElement).style.background = 'var(--tint)' }}
                  onMouseLeave={e => { if (selectedProjectId !== p.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                  {p.description && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{p.description}</div>}
                </div>
              ))
            )}
            <button
              disabled={!selectedProjectId}
              onClick={handleAddToProject}
              style={{
                marginTop: 12, width: '100%', padding: '8px 16px', borderRadius: 8, border: 'none',
                background: selectedProjectId ? 'var(--color-text-primary)' : 'var(--edge-strong)',
                color: selectedProjectId ? '#fff' : 'var(--color-text-tertiary)',
                cursor: selectedProjectId ? 'pointer' : 'default',
                fontSize: 14, fontWeight: 500,
              }}
            >
              Add {selectedIds.size} record{selectedIds.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Table area */}
      {filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>No contacts match your filters</span>
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 40px 40px' }}>
          {/* Desktop table */}
          <table
            className="records-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              tableLayout: hasCustomWidths ? 'fixed' : 'auto',
            }}
          >
            <thead style={{ position: 'sticky', top: 0, background: 'var(--color-bg)', zIndex: 1 }}>
              <tr style={{ borderBottom: '1px solid var(--edge)' }}>
                {/* Checkbox header - 44px touch target */}
                <th style={{ width: 44, padding: 0, textAlign: 'center', height: 44, position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, cursor: 'pointer' }} onClick={toggleSelectAll}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#25B439' }}
                    />
                  </div>
                </th>
                {visibleCols.map(col => {
                  const isDragSource = isDragging && dragCol.current === col.id
                  const isDropTarget = dropTargetCol === col.id && dragCol.current !== col.id
                  const canDrag = col.id !== 'name'
                  return (
                    <th
                      key={col.id}
                      draggable={canDrag}
                      onClick={() => toggleSort(col.id)}
                      onDragStart={canDrag ? e => handleColDragStart(e, col.id) : undefined}
                      onDragOver={canDrag ? e => handleColDragOver(e, col.id) : undefined}
                      onDragLeave={canDrag ? handleColDragLeave : undefined}
                      onDragEnd={canDrag ? handleColDragEnd : undefined}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: sort.col === col.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                        cursor: canDrag ? 'grab' : 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        position: 'relative',
                        opacity: isDragSource ? 0.4 : 1,
                        borderLeft: isDropTarget ? '2px solid #25B439' : undefined,
                        width: columnWidths[col.id] ? columnWidths[col.id] + 'px' : undefined,
                      }}
                    >
                      {col.label}
                      <SortIcon active={sort.col === col.id} dir={sort.dir} />
                      {/* Resize handle */}
                      <div
                        className="col-resize-handle"
                        onClick={e => e.stopPropagation()}
                        onPointerDown={e => handleResizePointerDown(e, col.id)}
                        onPointerMove={e => handleResizePointerMove(e, col.id)}
                        onPointerUp={handleResizePointerUp}
                        onDoubleClick={() => handleResizeDoubleClick(col.id)}
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: 4,
                          cursor: 'col-resize',
                          zIndex: 2,
                        }}
                      />
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact, idx) => {
                const score = equityMap[contact.id] ?? 0
                const label = scoreLabel(score)
                const badge = EQUITY_BADGE[label]
                const primaryPod = contact.primary_list_id ? podMap[contact.primary_list_id] : null
                const selected = selectedIds.has(contact.id)

                return (
                  <tr
                    key={contact.id}
                    className="contacts-row"
                    onClick={() => navigate(`/contact/${contact.id}`)}
                    style={{
                      borderBottom: '1px solid var(--edge)',
                      cursor: 'pointer',
                      background: selected ? 'rgba(37,180,57,0.05)' : 'transparent',
                      animationDelay: `${Math.min(idx, 20) * 25}ms`,
                    }}
                  >
                    {/* Checkbox cell - 44px touch target */}
                    <td style={{ padding: '0', textAlign: 'center', width: 44, height: 44 }} onClick={e => toggleSelectRow(contact.id, e)}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {}}
                          style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#25B439' }}
                        />
                      </div>
                    </td>

                    {visibleCols.map(col => (
                      <td key={col.id} style={{ padding: '12px 12px', height: 44, width: columnWidths[col.id] ? columnWidths[col.id] + 'px' : undefined }}>
                        {col.id === 'name' && (
                          <span style={{
                            fontWeight: contact.type === 'Company' ? 600 : 500,
                            color: 'var(--color-text-primary)',
                          }}>
                            {contact.name}
                          </span>
                        )}
                        {col.id === 'company' && (
                          <span style={{ color: contact.company ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)' }}>
                            {contact.company ?? '—'}
                          </span>
                        )}
                        {col.id === 'pod' && (
                          primaryPod ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {primaryPod.color && (
                                <span style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: '50%',
                                  background: primaryPod.color,
                                  flexShrink: 0,
                                }} />
                              )}
                              <span style={{ color: 'var(--color-text-secondary)' }}>{primaryPod.name}</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                          )
                        )}
                        {col.id === 'equity' && (
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
                              ? 'rgba(37,180,57,0.1)'
                              : contact.status === 'Pending'
                              ? 'rgba(251,191,36,0.12)'
                              : 'var(--tint)',
                            color: contact.status === 'Active'
                              ? '#16a34a'
                              : contact.status === 'Pending'
                              ? '#d97706'
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

      {/* Mobile card layout + HIG row styles */}
      <style>{`
        @media (max-width: 767px) {
          .records-table { display: none !important; }
        }
        @keyframes row-enter {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .contacts-row {
          animation: row-enter 0.3s ease-out both;
          transition: background 0.12s ease;
        }
        .contacts-row:hover {
          background: var(--tint) !important;
        }
        .contacts-row:active {
          background: var(--tint) !important;
        }
        .contacts-row[style*="rgba(37,180,57"]:hover {
          background: rgba(37,180,57,0.08) !important;
        }
      `}</style>
    </div>
  )
}

// ── Shared micro styles ───────────────────────────────────────────────────────

function filterBtnStyle(active: boolean): React.CSSProperties {
  return {
    height: 36,
    minHeight: 36,
    padding: '0 14px',
    borderRadius: 8,
    border: `1px solid ${active ? 'var(--edge-strong)' : 'var(--edge)'}`,
    background: active ? 'var(--tint)' : 'var(--surface-panel)',
    backdropFilter: 'blur(20px)',
    color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.12s, border-color 0.12s',
  }
}

const selectStyle: React.CSSProperties = {
  height: 36,
  minHeight: 36,
  padding: '0 10px',
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'var(--surface-panel)',
  backdropFilter: 'blur(20px)',
  color: 'var(--color-text-secondary)',
  fontSize: 12,
  fontFamily: 'inherit',
  cursor: 'pointer',
  outline: 'none',
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
