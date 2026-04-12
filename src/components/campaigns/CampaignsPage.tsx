import { useState, useEffect, useCallback, useMemo } from 'react'
import { getAllCampaigns, getCampaignContacts, getStagesForCampaign, getCampaignOpportunities, getContacts, invalidateCampaignsCache, completeCampaign } from '../../lib/airtable'
import type { Campaign, CampaignContact, CampaignStage, CampaignOpportunity, CampaignType, Contact } from '../../lib/types'
import { CampaignCreate } from './CampaignCreate'
import { CampaignBoard } from './CampaignBoard'
import { CampaignStatsBar } from './CampaignStatsBar'
import { CampaignActivityFeed } from './CampaignActivityFeed'
import { CampaignTypeIcon } from './CampaignTypeIcon'
import { EmptyState } from '../empty/EmptyState'
import { TYPE_LABELS, TYPE_COLORS, STALE_MS, daysUntil } from './campaignUtils'
import { Download, Filter } from 'lucide-react'

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'active' | 'completed'>('active')
  const [confirmingComplete, setConfirmingComplete] = useState(false)
  const [showStalledOnly, setShowStalledOnly] = useState(false)

  const [stages, setStages] = useState<CampaignStage[]>([])
  const [campaignContacts, setCampaignContacts] = useState<CampaignContact[]>([])
  const [campaignOpportunities, setCampaignOpportunities] = useState<CampaignOpportunity[]>([])
  const [boardLoading, setBoardLoading] = useState(false)

  const load = useCallback(async () => {
    const [c, ct] = await Promise.all([getAllCampaigns(), getContacts()])
    setCampaigns(c)
    setContacts(ct)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!activeCampaignId) { setStages([]); setCampaignContacts([]); setCampaignOpportunities([]); return }
    const campaign = campaigns.find(c => c.id === activeCampaignId)
    if (!campaign) return
    setBoardLoading(true)
    setConfirmingComplete(false)
    setShowStalledOnly(false)
    if (campaign.backing === 'pipeline') {
      Promise.all([
        getStagesForCampaign(activeCampaignId, 'pipeline'),
        getCampaignOpportunities(activeCampaignId),
      ]).then(([s, opps]) => {
        setStages(s)
        setCampaignOpportunities(opps)
        setCampaignContacts([])
      }).finally(() => setBoardLoading(false))
    } else {
      Promise.all([
        getStagesForCampaign(activeCampaignId, 'outreach'),
        getCampaignContacts(activeCampaignId),
      ]).then(([s, cc]) => {
        setStages(s)
        setCampaignContacts(cc)
        setCampaignOpportunities([])
      }).finally(() => setBoardLoading(false))
    }
  }, [activeCampaignId, campaigns])

  const handleCreated = useCallback((campaign: Campaign, newStages: CampaignStage[]) => {
    setCampaigns(prev => [...prev, campaign])
    setCreating(false)
    setActiveCampaignId(campaign.id)
    setStages(newStages)
    setCampaignContacts([])
  }, [])

  const handleComplete = useCallback(async () => {
    if (!activeCampaignId) return
    await completeCampaign(activeCampaignId)
    invalidateCampaignsCache()
    setCampaigns(prev => prev.map(c => c.id === activeCampaignId ? { ...c, status: 'completed' } : c))
    setActiveCampaignId(null)
    setConfirmingComplete(false)
  }, [activeCampaignId])

  const filtered = campaigns.filter(c => c.status === filter)
  const activeCampaign = campaigns.find(c => c.id === activeCampaignId)

  useEffect(() => {
    if (loading) return
    const match = filtered.find(c => c.id === activeCampaignId)
    if (!match && filtered.length > 0) {
      setActiveCampaignId(filtered[0].id)
    } else if (filtered.length === 0) {
      setActiveCampaignId(null)
    }
  }, [loading, filter, campaigns])

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

  const inProgressCount = campaignContacts.filter(cc => {
    if (firstStage && cc.stage_id === firstStage.id) return false
    if (lastStage && cc.stage_id === lastStage.id) return false
    return true
  }).length

  // Filter contacts for board if stalled filter active
  const boardContacts = showStalledOnly
    ? campaignContacts.filter(cc => stalledIds.has(cc.id))
    : campaignContacts

  const insight = getCampaignInsight(stages, campaignContacts, contacts)

  // Export campaign as CSV
  function handleExport() {
    if (!activeCampaign) return
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
    a.download = `${activeCampaign.name.replace(/[^a-zA-Z0-9]/g, '_')}_contacts.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <CampaignSkeleton />

  return (
    <div className="content-enter" style={{ padding: '28px clamp(16px, 4vw, 32px) 96px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 800,
          margin: 0, color: 'var(--color-text-primary)', letterSpacing: '-0.03em',
        }}>
          Campaigns
        </h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={{
            fontSize: 13, fontWeight: 600, padding: '8px 18px',
            borderRadius: 10, border: 'none',
            background: 'var(--color-brand)', color: '#ffffff',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          + New Campaign
        </button>
      </div>

      {creating && (
        <CampaignCreate
          onCreated={handleCreated}
          onCancel={() => setCreating(false)}
        />
      )}

      {/* Tab bar */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
          <StatusToggle active={filter} onChange={setFilter} />
          <div style={{ width: 1, height: 20, background: 'var(--edge)', margin: '0 8px', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1, minWidth: 0 }}>
            {filtered.map(c => {
              const ccCount = campaignContacts.length
              return (
                <TabButton
                  key={c.id}
                  label={c.name}
                  type={c.type}
                  deadline={c.deadline}
                  active={c.id === activeCampaignId}
                  contactCount={c.id === activeCampaignId ? ccCount : undefined}
                  onClick={() => setActiveCampaignId(c.id)}
                />
              )
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 && !creating ? (
        <>
          <StatusToggle active={filter} onChange={setFilter} />
          <div style={{ marginTop: 20 }}>
            <EmptyState
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="5" height="18" rx="1"/><rect x="9.5" y="6" width="5" height="15" rx="1"/><rect x="17" y="9" width="5" height="12" rx="1"/></svg>}
              heading={filter === 'active' ? 'No active campaigns' : 'No completed campaigns'}
              subtext={filter === 'active'
                ? "Campaigns track concrete projects like events, fundraises, and outreach."
                : "Completed campaigns will appear here."}
              ctaLabel={filter === 'active' ? "+ New Campaign" : undefined}
              onCta={filter === 'active' ? () => setCreating(true) : undefined}
              ghosts={2}
            />
          </div>
        </>
      ) : activeCampaign ? (
        <>
          {/* Campaign context zone */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <CampaignTypeIcon type={activeCampaign.type} size={16} />
            <span style={{
              padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500,
              background: 'var(--tint)', color: 'var(--color-text-secondary)',
            }}>
              {TYPE_LABELS[activeCampaign.type]}
            </span>
            {activeCampaign.deadline && (
              <DeadlineBadge deadline={activeCampaign.deadline} />
            )}

            {/* Action buttons */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
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

              {/* Export */}
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

              {/* Mark complete */}
              {activeCampaign.status === 'active' && !confirmingComplete && (
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
          </div>

          {/* Confirmation dialog */}
          {confirmingComplete && (
            <div style={{
              background: 'var(--surface-panel)', border: '1px solid var(--edge)',
              borderRadius: 10, padding: '14px 16px', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)', minWidth: 200 }}>
                Complete <strong>{activeCampaign.name}</strong>?
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

          {/* Stats bar */}
          {!boardLoading && campaignContacts.length > 0 && (
            <CampaignStatsBar
              stages={stages}
              campaignContacts={campaignContacts}
              createdAt={activeCampaign.created_at}
            />
          )}

          {/* Funnel bar + insight */}
          {!boardLoading && campaignContacts.length > 0 && (
            <CampaignFunnel stages={stages} campaignContacts={campaignContacts} insight={insight} />
          )}

          {/* Kanban board */}
          {boardLoading ? (
            <BoardSkeleton />
          ) : (
            <CampaignBoard
              campaign={activeCampaign}
              stages={stages}
              campaignContacts={boardContacts}
              campaignOpportunities={campaignOpportunities}
              contacts={contacts}
              onStagesChange={setStages}
              onContactsChange={setCampaignContacts}
              onOpportunitiesChange={setCampaignOpportunities}
            />
          )}

          {/* Activity feed */}
          {!boardLoading && campaignContacts.length > 0 && (
            <CampaignActivityFeed
              campaignId={activeCampaign.id}
              campaignName={activeCampaign.name}
              contacts={contacts}
              stages={stages}
            />
          )}
        </>
      ) : null}
    </div>
  )
}

// -- Helpers --

const STALE_MS_LOCAL = 7 * 24 * 60 * 60 * 1000

function getCampaignInsight(
  stages: CampaignStage[],
  campaignContacts: CampaignContact[],
  contacts: Contact[],
): string | null {
  if (campaignContacts.length === 0) return null
  const sorted = [...stages].sort((a, b) => a.order - b.order)
  const lastStage = sorted[sorted.length - 1]
  const firstStage = sorted[0]

  const stalled = campaignContacts
    .filter(cc => {
      if (!cc.moved_at || !cc.stage_id) return false
      if (firstStage && cc.stage_id === firstStage.id) return false
      if (lastStage && cc.stage_id === lastStage.id) return false
      return Date.now() - new Date(cc.moved_at).getTime() > STALE_MS_LOCAL
    })
    .sort((a, b) => new Date(a.moved_at!).getTime() - new Date(b.moved_at!).getTime())

  if (stalled.length > 0) {
    const oldest = stalled[0]
    const contact = contacts.find(c => c.id === oldest.contact_id)
    const stage = stages.find(s => s.id === oldest.stage_id)
    const days = Math.floor((Date.now() - new Date(oldest.moved_at!).getTime()) / (1000 * 60 * 60 * 24))
    if (contact && stage) return `${contact.name} has been in ${stage.name} for ${days} days`
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentMoves = campaignContacts.filter(cc => cc.moved_at && new Date(cc.moved_at).getTime() > weekAgo)
  if (recentMoves.length > 0) {
    return `${recentMoves.length} ${recentMoves.length === 1 ? 'person' : 'people'} moved forward this week`
  }

  if (lastStage) {
    const inLast = campaignContacts.filter(cc => cc.stage_id === lastStage.id).length
    if (inLast > 0) return `${inLast} ${inLast === 1 ? 'person has' : 'people have'} reached ${lastStage.name}`
  }

  return null
}

// -- Sub-components -----------------------------------------------------------

function CampaignFunnel({ stages, campaignContacts, insight }: {
  stages: CampaignStage[]
  campaignContacts: CampaignContact[]
  insight: string | null
}) {
  const sorted = [...stages].sort((a, b) => a.order - b.order)
  const total = campaignContacts.length

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
        {sorted.map(stage => {
          const count = campaignContacts.filter(cc => cc.stage_id === stage.id).length
          if (count === 0) return <div key={stage.id} style={{ flex: 0 }} />
          return (
            <div
              key={stage.id}
              title={`${stage.name}: ${count}`}
              style={{
                flex: count,
                background: stage.color ?? '#999',
                borderRadius: 2,
                transition: 'flex 300ms ease-out',
                minWidth: 4,
              }}
            />
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {sorted.map(stage => {
          const count = campaignContacts.filter(cc => cc.stage_id === stage.id).length
          return (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color ?? '#999', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                {stage.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {count}
              </span>
            </div>
          )
        })}
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
          {total} total
        </span>
      </div>

      {insight && (
        <p style={{
          fontSize: 12, color: 'var(--color-text-secondary)',
          margin: '6px 0 0 2px', fontStyle: 'italic',
        }}>
          {insight}
        </p>
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

function TabButton({ label, type, deadline, active, contactCount, onClick }: {
  label: string
  type: CampaignType
  deadline?: string | null
  active: boolean
  contactCount?: number
  onClick: () => void
}) {
  const isUrgent = deadline ? daysUntil(deadline) <= 3 && daysUntil(deadline) >= 0 : false

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 8,
        border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
        background: active ? 'var(--color-brand)' : 'transparent',
        color: active ? '#fff' : 'var(--color-text-secondary)',
        whiteSpace: 'nowrap',
        transition: 'background 0.12s, color 0.12s',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <CampaignTypeIcon type={type} size={12} colored={!active} />
      {label}
      {contactCount !== undefined && contactCount > 0 && (
        <span style={{
          fontSize: 10, fontWeight: 600,
          padding: '1px 5px', borderRadius: 100,
          background: active ? 'rgba(255,255,255,0.25)' : 'var(--tint)',
          color: active ? '#fff' : 'var(--color-text-tertiary)',
        }}>
          {contactCount}
        </span>
      )}
      {isUrgent && !active && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#FF9500', flexShrink: 0,
        }} />
      )}
      {/* Progress indicator line under active tab */}
      {active && (
        <div style={{
          position: 'absolute', bottom: 0, left: 4, right: 4,
          height: 2, borderRadius: 1,
          background: 'rgba(255,255,255,0.4)',
        }} />
      )}
    </button>
  )
}

function StatusToggle({ active, onChange }: { active: 'active' | 'completed'; onChange: (v: 'active' | 'completed') => void }) {
  return (
    <div style={{
      display: 'flex', gap: 0,
      background: 'var(--tint)', borderRadius: 8,
      padding: 2, flexShrink: 0,
    }}>
      {(['active', 'completed'] as const).map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          style={{
            fontSize: 12, fontWeight: active === s ? 600 : 400,
            padding: '5px 12px', borderRadius: 6,
            border: 'none', cursor: 'pointer',
            fontFamily: 'inherit',
            background: active === s ? 'var(--surface-panel)' : 'transparent',
            color: active === s ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
            boxShadow: active === s ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.12s',
          }}
        >
          {s === 'active' ? 'Active' : 'Completed'}
        </button>
      ))}
    </div>
  )
}

function CampaignSkeleton() {
  return (
    <div className="skeleton-stagger" style={{ padding: '28px clamp(16px, 4vw, 32px) 96px' }}>
      <div className="skeleton" style={{ width: 160, height: 28, borderRadius: 8, marginBottom: 24 }} />
      <div className="skeleton" style={{ width: '100%', height: 40, borderRadius: 8, marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ width: 260, height: 300, borderRadius: 12, flexShrink: 0 }} />
        ))}
      </div>
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '12px 0 32px' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skeleton" style={{ width: 260, height: 200, borderRadius: 12, flexShrink: 0 }} />
      ))}
    </div>
  )
}
