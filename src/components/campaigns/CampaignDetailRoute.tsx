import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { getAllCampaigns, getCampaignContacts, getStagesForCampaign, getContacts, invalidateCampaignsCache, completeCampaign } from '../../lib/airtable'
import type { Campaign, CampaignContact, CampaignStage, Contact } from '../../lib/types'
import { CampaignBoard } from './CampaignBoard'
import { CampaignStatsBar } from './CampaignStatsBar'
import { CampaignActivityFeed } from './CampaignActivityFeed'
import { CampaignTableView } from './CampaignTableView'
import { CampaignTypeIcon } from './CampaignTypeIcon'
import { CampaignSettingsPanel } from './CampaignSettingsPanel'
import { CampaignContactPanel } from './CampaignContactPanel'
import { TYPE_LABELS, STALE_MS, daysUntil } from './campaignUtils'
import { ArrowLeft, Download, Filter, Settings, LayoutGrid, Table, ArrowUpDown, Eye } from 'lucide-react'

const VIEW_KEY_PREFIX = 'realdeal:campaign-view:'
const SORT_KEY_PREFIX = 'realdeal:campaign-sort:'
const CARD_FIELDS_KEY_PREFIX = 'realdeal:campaign-card-fields:'

const SORT_OPTIONS = [
  { key: 'default', label: 'Default' },
  { key: 'name', label: 'Name (A-Z)' },
  { key: 'company', label: 'Company' },
  { key: 'moved_at', label: 'Date added' },
  { key: 'next_step_due', label: 'Next step due' },
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

function loadCardFields(id: string): Set<string> {
  try {
    const saved = localStorage.getItem(CARD_FIELDS_KEY_PREFIX + id)
    if (saved) return new Set(JSON.parse(saved))
  } catch {}
  return new Set(['company', 'next_step'])
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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stages, setStages] = useState<CampaignStage[]>([])
  const [campaignContacts, setCampaignContacts] = useState<CampaignContact[]>([])
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
  const [showCardFieldsMenu, setShowCardFieldsMenu] = useState(false)

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
    <div className="content-enter" style={{ padding: '28px clamp(16px, 4vw, 32px) 96px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => navigate('/campaigns')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-secondary)', fontSize: 13,
            fontFamily: 'inherit', padding: '4px 8px', borderRadius: 6,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
        >
          <ArrowLeft size={14} />
          Campaigns
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 800,
            margin: 0, color: 'var(--color-text-primary)', letterSpacing: '-0.03em',
          }}>
            {campaign.name}
          </h1>
          <CampaignTypeIcon type={campaign.type} size={16} colored />
          <span style={{
            padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500,
            background: 'var(--tint)', color: 'var(--color-text-secondary)',
          }}>
            {TYPE_LABELS[campaign.type]}
          </span>
          {campaign.deadline && <DeadlineBadge deadline={campaign.deadline} />}
        </div>
        {campaign.description && (
          <p style={{
            margin: '6px 0 0', fontSize: 13, color: 'var(--color-text-secondary)',
            lineHeight: 1.5, maxWidth: 600,
          }}>
            {campaign.description}
          </p>
        )}
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Board / Table toggle */}
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

        {/* Sort (board only) */}
        {view === 'board' && (
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

        {/* Card fields (board only) */}
        {view === 'board' && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowCardFieldsMenu(!showCardFieldsMenu)}
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
              Card fields
            </button>
            {showCardFieldsMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowCardFieldsMenu(false)} />
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4,
                  background: 'var(--surface-panel)', border: '1px solid var(--edge)',
                  borderRadius: 10, padding: 8, zIndex: 100, minWidth: 160,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}>
                  {CARD_FIELD_OPTIONS.map(o => (
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
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ flex: 1 }} />

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
              color: 'var(--color-text-secondary)',
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
            color: showSettings ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Settings size={11} />
          Settings
        </button>

        {campaign.status === 'active' && !confirmingComplete && (
          <button
            type="button"
            onClick={() => setConfirmingComplete(true)}
            style={{
              background: 'none', border: '1px solid var(--edge)',
              borderRadius: 7, padding: '5px 12px',
              fontSize: 11, fontWeight: 500,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Mark complete
          </button>
        )}
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

      {/* Stats bar */}
      {campaignContacts.length > 0 && (
        <CampaignStatsBar
          stages={stages}
          campaignContacts={campaignContacts}
          createdAt={campaign.created_at}
        />
      )}

      {/* View */}
      {view === 'board' ? (
        <CampaignBoard
          campaign={campaign}
          stages={stages}
          campaignContacts={boardContacts}
          contacts={contacts}
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
        />
      )}

      {/* Activity feed */}
      {campaignContacts.length > 0 && (
        <CampaignActivityFeed
          campaignId={campaign.id}
          campaignName={campaign.name}
          contacts={contacts}
          stages={stages}
        />
      )}

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
