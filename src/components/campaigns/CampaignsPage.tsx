import { useState, useEffect, useCallback } from 'react'
import { getCampaigns, getContacts, getPods, invalidateCampaignsCache } from '../../lib/airtable'
import type { Campaign, Contact, Pod, CampaignType } from '../../lib/types'
import { Spinner } from '../ui'
import { CampaignCreate } from './CampaignCreate'
import { CampaignDetail } from './CampaignDetail'
import { EmptyState } from '../empty/EmptyState'

const TYPE_LABELS: Record<CampaignType, string> = {
  event: 'Event',
  investment: 'Investment',
  outreach: 'Outreach',
  other: 'Other',
}

const TYPE_COLORS: Record<CampaignType, { bg: string; color: string }> = {
  event:      { bg: 'hsla(280, 60%, 50%, 0.10)', color: 'hsla(280, 50%, 40%, 0.9)' },
  investment: { bg: 'hsla(150, 60%, 40%, 0.10)', color: 'hsla(150, 50%, 30%, 0.9)' },
  outreach:   { bg: 'hsla(210, 60%, 50%, 0.10)', color: 'hsla(210, 50%, 35%, 0.9)' },
  other:      { bg: 'var(--tint)',                color: 'var(--color-text-secondary)' },
}

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active')

  const load = useCallback(async () => {
    const [c, ct, p] = await Promise.all([getCampaigns(), getContacts(), getPods()])
    setCampaigns(c)
    setContacts(ct)
    setPods(p)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreated = useCallback((campaign: Campaign) => {
    setCampaigns(prev => [...prev, campaign])
    setCreating(false)
    setActiveCampaignId(campaign.id)
  }, [])

  const handleUpdate = useCallback(() => {
    invalidateCampaignsCache()
    load()
  }, [load])

  const filtered = campaigns.filter(c => {
    if (filter === 'all') return true
    return c.status === filter
  })

  const activeCampaign = campaigns.find(c => c.id === activeCampaignId)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }}>
        <Spinner />
      </div>
    )
  }

  return (
    <div className="content-enter" style={{ padding: '32px clamp(16px, 4vw, 32px) 96px', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            fontWeight: 800,
            margin: 0,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.03em',
          }}>
            Campaigns
          </h1>
          <StatusFilter active={filter} onChange={setFilter} />
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: '8px 18px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--color-brand)',
            color: '#ffffff',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + New
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <CampaignCreate
          onCreated={handleCreated}
          onCancel={() => setCreating(false)}
        />
      )}

      {/* Campaign list */}
      {filtered.length === 0 && !creating ? (
        <EmptyState
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="5" height="18" rx="1"/><rect x="9.5" y="6" width="5" height="15" rx="1"/><rect x="17" y="9" width="5" height="12" rx="1"/></svg>}
          heading={filter === 'active' ? 'No active campaigns' : 'No campaigns yet'}
          subtext="Campaigns track concrete projects like events, fundraises, and outreach."
          ctaLabel="+ New Campaign"
          onCta={() => setCreating(true)}
          ghosts={2}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={() => setActiveCampaignId(campaign.id)}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {activeCampaign && (
        <>
          <div
            onClick={() => setActiveCampaignId(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 55,
              background: 'rgba(0,0,0,0.15)',
              transition: 'opacity 0.2s',
            }}
          />
          <CampaignDetail
            campaignId={activeCampaign.id}
            campaignName={activeCampaign.name}
            campaignType={activeCampaign.type}
            campaignDeadline={activeCampaign.deadline}
            campaignStatus={activeCampaign.status}
            contacts={contacts}
            pods={pods}
            onClose={() => setActiveCampaignId(null)}
            onUpdate={handleUpdate}
          />
        </>
      )}
    </div>
  )
}

// ── Campaign card ────────────────────────────────────────────────────────────

function CampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const typeStyle = TYPE_COLORS[campaign.type]
  const count = campaign.contact_ids.length
  const isCompleted = campaign.status === 'completed'

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        width: '100%',
        padding: '16px 20px',
        background: 'var(--surface-panel)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--edge)',
        borderRadius: 12,
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        transition: 'border-color 0.12s, box-shadow 0.12s',
        opacity: isCompleted ? 0.6 : 1,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--edge-strong)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--edge)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {campaign.name}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            padding: '2px 8px',
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 500,
            background: typeStyle.bg,
            color: typeStyle.color,
          }}>
            {TYPE_LABELS[campaign.type]}
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {count} {count === 1 ? 'person' : 'people'}
          </span>
          {campaign.deadline && (
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              due {new Date(campaign.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
      {isCompleted && (
        <span style={{
          fontSize: 11, fontWeight: 500,
          padding: '3px 10px', borderRadius: 100,
          background: 'hsla(150, 60%, 40%, 0.10)',
          color: 'hsla(150, 50%, 30%, 0.9)',
        }}>
          Done
        </span>
      )}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )
}

// ── Status filter ────────────────────────────────────────────────────────────

function StatusFilter({ active, onChange }: { active: string; onChange: (v: 'active' | 'completed' | 'all') => void }) {
  const opts: Array<{ value: 'active' | 'completed' | 'all'; label: string }> = [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'all', label: 'All' },
  ]
  return (
    <div style={{ display: 'inline-flex', background: 'var(--tint)', borderRadius: 8, padding: 2 }}>
      {opts.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          style={{
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 500,
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.12s, color 0.12s',
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
