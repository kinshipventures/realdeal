import { useState, useEffect, useCallback } from 'react'
import { getAllCampaigns, getCampaignContacts, getStagesForCampaign, getCampaignOpportunities, getContacts, invalidateCampaignsCache, completeCampaign } from '../../lib/airtable'
import type { Campaign, CampaignContact, CampaignStage, CampaignOpportunity, CampaignType, Contact } from '../../lib/types'
import { CampaignCreate } from './CampaignCreate'
import { CampaignBoard } from './CampaignBoard'
import { EmptyState } from '../empty/EmptyState'

const TYPE_LABELS: Record<CampaignType, string> = {
  event: 'Event',
  investment: 'Investment',
  outreach: 'Outreach',
  deal_flow: 'Deal Flow',
  fundraise: 'Fundraise',
  talent: 'Talent',
  partnerships: 'Partnerships',
  other: 'Other',
}

const TYPE_COLORS: Record<CampaignType, string> = {
  event: '#4299E1',
  investment: '#48BB78',
  outreach: '#7E57C2',
  deal_flow: '#ED8936',
  fundraise: '#38B2AC',
  talent: '#D53F8C',
  partnerships: '#667EEA',
  other: '#718096',
}

const STALE_MS = 7 * 24 * 60 * 60 * 1000

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

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
      return Date.now() - new Date(cc.moved_at).getTime() > STALE_MS
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

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'active' | 'completed'>('active')
  const [confirmingComplete, setConfirmingComplete] = useState(false)

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

  const filtered = campaigns.filter(c => {
    if (filter === 'active') return c.status === 'active'
    if (filter === 'completed') return c.status === 'completed'
    return false
  })
  const activeCampaign = campaigns.find(c => c.id === activeCampaignId)

  useEffect(() => {
    if (!loading && !activeCampaignId && filtered.length > 0) {
      setActiveCampaignId(filtered[0].id)
    }
  }, [loading, filtered.length])

  const sortedStages = [...stages].sort((a, b) => a.order - b.order)
  const firstStage = sortedStages[0]
  const lastStage = sortedStages[sortedStages.length - 1]
  const inProgressCount = campaignContacts.filter(cc => {
    if (firstStage && cc.stage_id === firstStage.id) return false
    if (lastStage && cc.stage_id === lastStage.id) return false
    return true
  }).length

  const insight = getCampaignInsight(stages, campaignContacts, contacts)

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

      {/* Tab bar - status toggle stays fixed, campaign tabs scroll */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
          <StatusToggle active={filter} onChange={setFilter} />
          <div style={{ width: 1, height: 20, background: 'var(--edge)', margin: '0 8px', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1, minWidth: 0 }}>
            {filtered.map(c => (
              <TabButton
                key={c.id}
                label={c.name}
                type={c.type}
                deadline={c.deadline}
                active={c.id === activeCampaignId}
                onClick={() => setActiveCampaignId(c.id)}
              />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && !creating ? (
        <EmptyState
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="5" height="18" rx="1"/><rect x="9.5" y="6" width="5" height="15" rx="1"/><rect x="17" y="9" width="5" height="12" rx="1"/></svg>}
          heading={filter === 'active' ? 'No active campaigns' : 'No completed campaigns'}
          subtext="Campaigns track concrete projects like events, fundraises, and outreach."
          ctaLabel="+ New Campaign"
          onCta={() => setCreating(true)}
          ghosts={2}
        />
      ) : activeCampaign ? (
        <>
          {/* Campaign context zone - tight grouping */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{
              padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500,
              background: 'var(--tint)', color: 'var(--color-text-secondary)',
            }}>
              {TYPE_LABELS[activeCampaign.type]}
            </span>
            {activeCampaign.deadline && (
              <DeadlineBadge deadline={activeCampaign.deadline} />
            )}
            {activeCampaign.status === 'active' && !confirmingComplete && (
              <button
                type="button"
                onClick={() => setConfirmingComplete(true)}
                style={{
                  marginLeft: 'auto',
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

          {/* Funnel bar + insight - grouped as health snapshot */}
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
              campaignContacts={campaignContacts}
              campaignOpportunities={campaignOpportunities}
              contacts={contacts}
              onStagesChange={setStages}
              onContactsChange={setCampaignContacts}
              onOpportunitiesChange={setCampaignOpportunities}
            />
          )}
        </>
      ) : null}
    </div>
  )
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
      {/* Bar */}
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

      {/* Legend + insight grouped tightly below bar */}
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

function TabButton({ label, type, deadline, active, onClick }: {
  label: string
  type: CampaignType
  deadline?: string | null
  active: boolean
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
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: active ? 'rgba(255,255,255,0.5)' : TYPE_COLORS[type],
        flexShrink: 0,
      }} />
      {label}
      {isUrgent && !active && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#FF9500', flexShrink: 0,
        }} />
      )}
    </button>
  )
}

function StatusToggle({ active, onChange }: { active: 'active' | 'completed'; onChange: (v: 'active' | 'completed') => void }) {
  const opts: Array<{ value: 'active' | 'completed'; label: string }> = [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
  ]
  return (
    <div style={{ display: 'inline-flex', background: 'var(--tint)', borderRadius: 8, padding: 2, flexShrink: 0 }}>
      {opts.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          style={{
            padding: '4px 10px', fontSize: 11, fontWeight: 500,
            border: 'none', borderRadius: 6, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'background 0.12s, color 0.12s',
            background: active === o.value ? 'var(--color-bg)' : 'transparent',
            color: active === o.value ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
            boxShadow: active === o.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function CampaignSkeleton() {
  return (
    <div style={{ padding: '28px clamp(16px, 4vw, 32px) 96px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ height: 28, width: 140, borderRadius: 6, background: 'var(--tint)' }} />
        <div style={{ height: 36, width: 130, borderRadius: 10, background: 'var(--tint)' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[80, 110, 90].map((w, i) => (
          <div key={i} style={{ height: 30, width: w, borderRadius: 8, background: 'var(--tint)' }} />
        ))}
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--tint)', marginBottom: 16 }} />
      <BoardSkeleton />
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '12px 0' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          width: 260, minWidth: 260, borderRadius: 12,
          background: 'var(--tint)', padding: 14,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ height: 14, width: 80, borderRadius: 4, background: 'var(--edge)' }} />
          {Array.from({ length: 4 - i }).map((_, j) => (
            <div key={j} style={{
              height: 52, borderRadius: 10,
              background: 'var(--surface-panel)', border: '1px solid var(--edge)',
            }} />
          ))}
        </div>
      ))}
    </div>
  )
}
