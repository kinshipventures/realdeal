import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { getAllCampaigns, getCampaignContacts, getStagesForCampaign, getContacts, getInteractions, invalidateCampaignsCache, completeCampaign, updateCampaign } from '../../lib/airtable'
import type { Campaign, CampaignContact, CampaignStage, Contact, Interaction } from '../../lib/types'
import { CampaignBoard } from './CampaignBoard'
import { CampaignStatsBar } from './CampaignStatsBar'
import { CampaignNotesSidebar } from './CampaignNotesSidebar'
import { CampaignTableView } from './CampaignTableView'
import { CampaignTypeIcon } from './CampaignTypeIcon'
import { CampaignSettingsPanel } from './CampaignSettingsPanel'
import { CampaignContactPanel } from './CampaignContactPanel'
import { TYPE_LABELS, TYPE_COLORS, STALE_MS, daysUntil } from './campaignUtils'
import { Download, Filter, Settings, LayoutGrid, Table, ArrowUpDown, Eye, Check } from 'lucide-react'

const VIEW_KEY_PREFIX = 'realdeal:campaign-view:'
const SORT_KEY_PREFIX = 'realdeal:campaign-sort:'
const CARD_FIELDS_KEY_PREFIX = 'realdeal:campaign-card-fields:'
const TABLE_FIELDS_KEY_PREFIX = 'realdeal:campaign-fields:'

const SORT_OPTIONS = [
  { key: 'default', label: 'Default' },
  { key: 'name', label: 'Name (A-Z)' },
  { key: 'company', label: 'Company' },
  { key: 'stage', label: 'Stage' },
  { key: 'owner', label: 'Owner' },
  { key: 'next_step_due', label: 'Next step due' },
  { key: 'moved_at', label: 'Last moved' },
]

const CARD_FIELD_OPTIONS = [
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'owner', label: 'Owner' },
  { key: 'next_step', label: 'Next Step' },
  { key: 'next_step_due', label: 'Due Date' },
  { key: 'notes', label: 'Notes' },
]

const TABLE_FIELD_OPTIONS = [
  { key: 'name', label: 'Name', locked: true },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'stage', label: 'Stage' },
  { key: 'owner', label: 'Owner' },
  { key: 'next_step', label: 'Next Step' },
  { key: 'next_step_due', label: 'Due' },
  { key: 'notes', label: 'Notes' },
  { key: 'moved_at', label: 'Last Moved' },
]

function loadCardFields(id: string): Set<string> {
  try {
    const saved = localStorage.getItem(CARD_FIELDS_KEY_PREFIX + id)
    if (saved) return new Set(JSON.parse(saved))
  } catch {}
  return new Set(['company', 'next_step'])
}

function loadTableFields(id: string): Set<string> {
  try {
    const saved = localStorage.getItem(TABLE_FIELDS_KEY_PREFIX + id)
    if (saved) return new Set(JSON.parse(saved))
  } catch {}
  return new Set(TABLE_FIELD_OPTIONS.map(o => o.key))
}

function loadSort(id: string): { key: string; asc: boolean } {
  try {
    const saved = localStorage.getItem(SORT_KEY_PREFIX + id)
    if (saved) return JSON.parse(saved)
  } catch {}
  return { key: 'default', asc: true }
}

export function CampaignDetailRoute() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stages, setStages] = useState<CampaignStage[]>([])
  const [campaignContacts, setCampaignContacts] = useState<CampaignContact[]>([])
  const [interactionsMap, setInteractionsMap] = useState<Map<string, Interaction[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [confirmingComplete, setConfirmingComplete] = useState(false)
  const [showStalledOnly, setShowStalledOnly] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Panel state
  const [panelCcId, setPanelCcId] = useState<string | null>(null)

  // Sort state
  const [sortKey, setSortKey] = useState(() => id ? loadSort(id).key : 'default')
  const [sortAsc, setSortAsc] = useState(() => id ? loadSort(id).asc : true)
  const [showSortMenu, setShowSortMenu] = useState(false)

  // Card fields state
  const [cardFields, setCardFields] = useState<Set<string>>(() => id ? loadCardFields(id) : new Set(['company', 'next_step']))
  const [tableFields, setTableFields] = useState<Set<string>>(() => id ? loadTableFields(id) : new Set(TABLE_FIELD_OPTIONS.map(o => o.key)))
  const [showFieldsMenu, setShowFieldsMenu] = useState(false)

  const [view, setView] = useState<'board' | 'table'>(() => {
    const param = searchParams.get('view')
    if (param === 'table') return 'table'
    if (id) {
      const saved = localStorage.getItem(VIEW_KEY_PREFIX + id)
      if (saved === 'table') return 'table'
    }
    return 'board'
  })

  function switchView(v: 'board' | 'table') {
    setView(v)
    if (id) localStorage.setItem(VIEW_KEY_PREFIX + id, v)
    setSearchParams(v === 'table' ? { view: 'table' } : {}, { replace: true })
  }

  function handleSortChange(key: string) {
    if (key === sortKey) {
      setSortAsc(!sortAsc)
      if (id) localStorage.setItem(SORT_KEY_PREFIX + id, JSON.stringify({ key, asc: !sortAsc }))
    } else {
      setSortKey(key)
      setSortAsc(true)
      if (id) localStorage.setItem(SORT_KEY_PREFIX + id, JSON.stringify({ key, asc: true }))
    }
    setShowSortMenu(false)
  }

  function toggleCardField(key: string) {
    setCardFields(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      if (id) localStorage.setItem(CARD_FIELDS_KEY_PREFIX + id, JSON.stringify([...next]))
      return next
    })
  }

  function toggleTableField(key: string) {
    if (key === 'name') return
    setTableFields(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      if (id) localStorage.setItem(TABLE_FIELDS_KEY_PREFIX + id, JSON.stringify([...next]))
      return next
    })
  }

  const loadData = useCallback(async () => {
    if (!id) return
    const [allCampaigns, ct] = await Promise.all([getAllCampaigns(), getContacts()])
    setCampaigns(allCampaigns)
    setContacts(ct)
    const camp = allCampaigns.find(c => c.id === id)
    setCampaign(camp ?? null)
    if (camp) {
      const [s, cc] = await Promise.all([
        getStagesForCampaign(id),
        getCampaignContacts(id),
      ])
      setStages(s)
      setCampaignContacts(cc)
      // Fetch interactions for equity scoring
      const contactIds = [...new Set(cc.map(c => c.contact_id))]
      const ixResults = await Promise.all(contactIds.map(cid => getInteractions(cid).then(ix => [cid, ix] as const)))
      setInteractionsMap(new Map(ixResults))
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  const handleComplete = useCallback(async () => {
    if (!id) return
    await completeCampaign(id)
    invalidateCampaignsCache()
    setCampaign(prev => prev ? { ...prev, status: 'completed' } : prev)
    setConfirmingComplete(false)
  }, [id])

  const sortedStages = useMemo(() => [...stages].sort((a, b) => a.order - b.order), [stages])
  const firstStage = sortedStages[0]
  const lastStage = sortedStages[sortedStages.length - 1]

  const stalledIds = useMemo(() => {
    const set = new Set<string>()
    campaignContacts.forEach(cc => {
      if (!cc.moved_at || !cc.stage_id) return
      if (firstStage && cc.stage_id === firstStage.id) return
      if (lastStage && cc.stage_id === lastStage.id) return
      if (Date.now() - new Date(cc.moved_at).getTime() > STALE_MS) set.add(cc.id)
    })
    return set
  }, [campaignContacts, firstStage, lastStage])

  const boardContacts = showStalledOnly
    ? campaignContacts.filter(cc => stalledIds.has(cc.id))
    : campaignContacts

  const inProgressCount = campaignContacts.filter(cc => {
    if (firstStage && cc.stage_id === firstStage.id) return false
    if (lastStage && cc.stage_id === lastStage.id) return false
    return true
  }).length

  function handleExport() {
    if (!campaign) return
    const rows: string[] = ['Name,Company,Stage,Status,Added,Last Moved,Next Step']
    for (const cc of campaignContacts) {
      const contact = contacts.find(c => c.id === cc.contact_id)
      const stage = stages.find(s => s.id === cc.stage_id)
      rows.push([
        contact?.name ?? '',
        contact?.company ?? '',
        stage?.name ?? '',
        cc.status,
        cc.created_at ? new Date(cc.created_at).toLocaleDateString() : '',
        cc.moved_at ? new Date(cc.moved_at).toLocaleDateString() : '',
        cc.next_step ?? '',
      ].map(v => `"${(v ?? '').replace(/"/g, '""')}"`).join(','))
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${campaign.name.replace(/[^a-zA-Z0-9]/g, '_')}_contacts.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleCardClick(cc: CampaignContact) {
    setPanelCcId(cc.id)
  }

  function handlePanelUpdate(updated: CampaignContact) {
    setCampaignContacts(prev => prev.map(cc => cc.id === updated.id ? updated : cc))
  }

  const panelCc = panelCcId ? campaignContacts.find(cc => cc.id === panelCcId) : null
  const panelContact = panelCc ? contacts.find(c => c.id === panelCc.contact_id) : null

  if (loading) return <DetailSkeleton />
  if (!campaign) return <div style={{ padding: 32, color: 'var(--color-text-secondary)' }}>Campaign not found</div>

  return (
    <div className="content-enter" style={{ padding: '16px clamp(16px, 4vw, 32px) 96px' }}>
      {/* Header: title + type + deadline + stats inline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 800,
          margin: 0, color: 'var(--color-text-primary)', letterSpacing: '-0.03em',
        }}>
          {campaign.name}
        </h1>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500,
          background: `${TYPE_COLORS[campaign.type]}12`,
          color: TYPE_COLORS[campaign.type],
        }}>
          <CampaignTypeIcon type={campaign.type} size={11} colored />
          {TYPE_LABELS[campaign.type]}
        </span>
        {campaign.deadline && <DeadlineBadge deadline={campaign.deadline} />}
      </div>

      <InlineDescription
        value={campaign.description ?? ''}
        onSave={async (desc) => {
          const updated = await updateCampaign(campaign.id, { description: desc || null })
          invalidateCampaignsCache()
          setCampaign(prev => prev ? { ...prev, ...updated } : prev)
        }}
      />

      {/* Stats bar */}
      {campaignContacts.length > 0 && (
        <CampaignStatsBar
          stages={stages}
          campaignContacts={campaignContacts}
          createdAt={campaign.created_at}
          campaignType={campaign.type}
        />
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Primary: View + board controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', gap: 2, background: 'var(--tint)', borderRadius: 8, padding: 2 }}>
            <button
              type="button"
              onClick={() => switchView('board')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, fontWeight: view === 'board' ? 600 : 400,
                background: view === 'board' ? 'var(--surface-panel)' : 'transparent',
                color: view === 'board' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                boxShadow: view === 'board' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <LayoutGrid size={12} />
              Board
            </button>
            <button
              type="button"
              onClick={() => switchView('table')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, fontWeight: view === 'table' ? 600 : 400,
                background: view === 'table' ? 'var(--surface-panel)' : 'transparent',
                color: view === 'table' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                boxShadow: view === 'table' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <Table size={12} />
              Table
            </button>
          </div>

          {/* Sort */}
          {(
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowSortMenu(!showSortMenu)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 7,
                  border: sortKey !== 'default' ? '1px solid var(--edge-strong)' : '1px solid var(--edge)',
                  background: sortKey !== 'default' ? 'var(--tint)' : 'transparent',
                  fontSize: 11, fontWeight: 500,
                  color: sortKey !== 'default' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <ArrowUpDown size={11} />
                Sort
              </button>
              {showSortMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowSortMenu(false)} />
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: 4,
                    background: 'var(--surface-panel)', border: '1px solid var(--edge)',
                    borderRadius: 10, padding: 4, zIndex: 100, minWidth: 160,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  }}>
                    {SORT_OPTIONS.map(o => (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => handleSortChange(o.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                          textAlign: 'left', padding: '6px 10px', borderRadius: 6,
                          border: 'none', background: sortKey === o.key ? 'var(--tint)' : 'none',
                          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                          color: 'var(--color-text-primary)', fontWeight: sortKey === o.key ? 600 : 400,
                        }}
                      >
                        {o.label}
                        {sortKey === o.key && <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{sortAsc ? '^' : 'v'}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Fields */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowFieldsMenu(!showFieldsMenu)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 7,
                border: '1px solid var(--edge)', background: 'transparent',
                fontSize: 11, fontWeight: 500,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Eye size={11} />
              Fields
            </button>
            {showFieldsMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowFieldsMenu(false)} />
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4,
                  background: 'var(--surface-panel)', border: '1px solid var(--edge)',
                  borderRadius: 10, padding: 8, zIndex: 100, minWidth: 160,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}>
                  {view === 'board' ? (
                    CARD_FIELD_OPTIONS.map(o => (
                      <label key={o.key} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                        fontSize: 12, color: 'var(--color-text-primary)',
                      }}>
                        <input
                          type="checkbox"
                          checked={cardFields.has(o.key)}
                          onChange={() => toggleCardField(o.key)}
                        />
                        {o.label}
                      </label>
                    ))
                  ) : (
                    TABLE_FIELD_OPTIONS.map(o => (
                      <label key={o.key} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                        fontSize: 12, color: o.locked ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                      }}>
                        <input
                          type="checkbox"
                          checked={tableFields.has(o.key)}
                          disabled={!!o.locked}
                          onChange={() => toggleTableField(o.key)}
                        />
                        {o.label}
                      </label>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Stalled filter */}
          {stalledIds.size > 0 && (
            <button
              type="button"
              onClick={() => setShowStalledOnly(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 7,
                border: showStalledOnly ? '1px solid #FF9500' : '1px solid var(--edge)',
                background: showStalledOnly ? 'rgba(255,149,0,0.08)' : 'transparent',
                fontSize: 11, fontWeight: 500,
                color: showStalledOnly ? '#FF9500' : 'var(--color-text-secondary)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Filter size={11} />
              {stalledIds.size} stalled
            </button>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Secondary: utilities */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {campaignContacts.length > 0 && (
            <button
              type="button"
              onClick={handleExport}
              title="Export as CSV"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 7,
                border: '1px solid var(--edge)', background: 'transparent',
                fontSize: 11, fontWeight: 500,
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Download size={11} />
              Export
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSettings(prev => !prev)}
            title="Campaign settings"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 7,
              border: showSettings ? '1px solid var(--edge-strong)' : '1px solid var(--edge)',
              background: showSettings ? 'var(--tint)' : 'transparent',
              fontSize: 11, fontWeight: 500,
              color: showSettings ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Settings size={11} />
          </button>

          {campaign.status === 'active' && !confirmingComplete && (
            <button
              type="button"
              onClick={() => setConfirmingComplete(true)}
              style={{
                background: 'rgba(72,187,120,0.08)', border: '1px solid rgba(72,187,120,0.25)',
                borderRadius: 7, padding: '5px 14px',
                fontSize: 12, fontWeight: 600,
                color: '#2D8A4E',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(72,187,120,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(72,187,120,0.08)'}
            >
              Mark complete
            </button>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirmingComplete && (
        <div style={{
          background: 'var(--surface-panel)', border: '1px solid var(--edge)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)', minWidth: 200 }}>
            Complete <strong>{campaign.name}</strong>?
            {inProgressCount > 0 && (
              <span style={{ color: '#FF9500', marginLeft: 6 }}>
                {inProgressCount} {inProgressCount === 1 ? 'contact' : 'contacts'} still in progress.
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleComplete}
              style={{
                fontSize: 12, fontWeight: 600, padding: '6px 14px',
                borderRadius: 7, border: 'none',
                background: 'var(--color-brand)', color: '#fff',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Complete
            </button>
            <button
              type="button"
              onClick={() => setConfirmingComplete(false)}
              style={{
                fontSize: 12, padding: '6px 12px',
                borderRadius: 7, border: '1px solid var(--edge)',
                background: 'transparent', color: 'var(--color-text-secondary)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <CampaignSettingsPanel
          campaign={campaign}
          onUpdate={(updated) => setCampaign(updated)}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Board/Table + Notes sidebar */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {view === 'board' ? (
            <CampaignBoard
              campaign={campaign}
              stages={stages}
              campaignContacts={boardContacts}
              contacts={contacts}
              interactionsMap={interactionsMap}
              onStagesChange={setStages}
              onContactsChange={setCampaignContacts}
              onCardClick={handleCardClick}
              sortKey={sortKey}
              sortAsc={sortAsc}
              visibleCardFields={cardFields}
            />
          ) : (
            <CampaignTableView
              campaign={campaign}
              stages={stages}
              campaignContacts={boardContacts}
              contacts={contacts}
              onContactsChange={setCampaignContacts}
              onCardClick={handleCardClick}
              sortKey={sortKey}
              sortAsc={sortAsc}
              onSortChange={handleSortChange}
              visibleColumns={tableFields}
            />
          )}
        </div>

        <CampaignNotesSidebar
          campaign={campaign}
          contacts={contacts}
          stages={stages}
          hasCampaignContacts={campaignContacts.length > 0}
          onCampaignUpdate={(updated) => setCampaign(updated)}
        />
      </div>

      {/* Contact panel */}
      {panelCc && panelContact && (
        <CampaignContactPanel
          cc={panelCc}
          contact={panelContact}
          stages={stages}
          campaign={campaign}
          onUpdate={handlePanelUpdate}
          onClose={() => setPanelCcId(null)}
        />
      )}
    </div>
  )
}

function InlineDescription({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setDraft(value) }, [value])

  async function save() {
    if (draft === value) { setEditing(false); return }
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ marginBottom: 10, maxWidth: 600 }}>
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() }
            if (e.key === 'Escape') { setDraft(value); setEditing(false) }
          }}
          placeholder="Add a description..."
          style={{
            width: '100%', background: 'var(--tint)',
            border: '1px solid var(--edge-strong)', borderRadius: 8,
            color: 'var(--color-text-primary)', fontSize: 13, lineHeight: 1.5,
            padding: '8px 12px', outline: 'none', fontFamily: 'inherit',
            boxSizing: 'border-box', resize: 'vertical', minHeight: 48,
          }}
          rows={2}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              fontSize: 11, fontWeight: 600, padding: '4px 12px',
              borderRadius: 6, border: 'none',
              background: 'var(--color-brand)', color: '#fff',
              cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
              opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Check size={11} />
            {saving ? 'Saving' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => { setDraft(value); setEditing(false) }}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 6,
              border: '1px solid var(--edge)', background: 'transparent',
              color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (!value) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        style={{
          fontSize: 13, color: 'var(--color-text-tertiary)',
          background: 'none', border: 'none', padding: 0,
          cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
        }}
      >
        + Add description
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      style={{
        fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5,
        background: 'none', border: 'none', padding: 0, textAlign: 'left',
        cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
        maxWidth: 600,
      }}
    >
      {value}
    </button>
  )
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const days = daysUntil(deadline)
  const isUrgent = days <= 7 && days >= 0
  const isPast = days < 0

  let label: string
  if (isPast) label = `${Math.abs(days)}d overdue`
  else if (days === 0) label = 'due today'
  else if (days === 1) label = 'due tomorrow'
  else label = `due ${new Date(deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <span style={{
      fontSize: 12,
      color: isPast ? '#D93025' : isUrgent ? '#FF9500' : 'var(--color-text-tertiary)',
      fontWeight: isPast || isUrgent ? 500 : 400,
    }}>
      {label}
    </span>
  )
}

function DetailSkeleton() {
  return (
    <div className="skeleton-stagger" style={{ padding: '28px clamp(16px, 4vw, 32px) 96px' }}>
      <div className="skeleton" style={{ width: 80, height: 20, borderRadius: 6, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: 240, height: 28, borderRadius: 8, marginBottom: 24 }} />
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ width: 260, height: 300, borderRadius: 12, flexShrink: 0 }} />
        ))}
      </div>
    </div>
  )
}
