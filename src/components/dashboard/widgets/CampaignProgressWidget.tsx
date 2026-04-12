import { useNavigate } from 'react-router'
import type { Campaign, CampaignContact, CampaignType } from '../../../lib/types'
import { CampaignTypeIcon } from '../../campaigns/CampaignTypeIcon'
import { TYPE_LABELS } from '../../campaigns/campaignUtils'

const STALE_MS = 7 * 24 * 60 * 60 * 1000

interface CampaignProgressWidgetProps {
  campaigns: Campaign[]
  campaignContacts: CampaignContact[]
  loading: boolean
  onCampaignClick: (id: string) => void
}

export function CampaignProgressWidget({ campaigns, campaignContacts, loading, onCampaignClick }: CampaignProgressWidgetProps) {
  const navigate = useNavigate()
  const active = campaigns.filter(c => c.status === 'active')

  if (loading) return null

  if (active.length === 0) {
    return (
      <div style={{
        background: 'var(--surface-panel)',
        border: '1px solid var(--edge)',
        borderRadius: 'var(--panel-radius)',
        padding: '24px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 10 }}>
          No active campaigns
        </div>
        <button
          type="button"
          onClick={() => navigate('/campaigns')}
          style={{
            fontSize: 12, fontWeight: 600,
            padding: '6px 16px', borderRadius: 8,
            border: 'none', background: 'var(--color-brand)',
            color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          + Create Campaign
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {active.map(campaign => {
          const cc = campaignContacts.filter(c => c.campaign_id === campaign.id)
          const total = cc.length
          const confirmed = cc.filter(c => c.status === 'confirmed').length
          const responded = cc.filter(c => c.status === 'responded').length
          const reached = cc.filter(c => c.status === 'reached').length

          // Stalled count
          const stalledCount = cc.filter(c => {
            if (!c.moved_at) return false
            return Date.now() - new Date(c.moved_at).getTime() > STALE_MS
          }).length

          // Recent moves this week
          const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
          const recentMoves = cc.filter(c => c.moved_at && new Date(c.moved_at).getTime() > weekAgo).length

          // Days until deadline
          const deadlineDays = campaign.deadline
            ? Math.ceil((new Date(campaign.deadline + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null
          const isUrgent = deadlineDays !== null && deadlineDays <= 7 && deadlineDays >= 0
          const isOverdue = deadlineDays !== null && deadlineDays < 0

          return (
            <button
              key={campaign.id}
              type="button"
              onClick={() => onCampaignClick(campaign.id)}
              className="widget-card"
              style={{
                background: 'var(--surface-panel)',
                border: '1px solid var(--edge)',
                borderRadius: 'var(--panel-radius)',
                width: '100%',
                padding: '14px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                boxSizing: 'border-box',
              }}
            >
              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                  <CampaignTypeIcon type={campaign.type} size={14} />
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {campaign.name}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flexShrink: 0, fontVariantNumeric: 'tabular-nums', marginLeft: 8 }}>
                  {confirmed}/{total}
                </span>
              </div>

              {/* Funnel bar */}
              <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'var(--tint)', overflow: 'hidden', display: 'flex' }}>
                {confirmed > 0 && (
                  <div style={{ width: `${(confirmed / total) * 100}%`, height: '100%', background: 'hsla(150, 60%, 40%, 0.6)', transition: 'width 0.3s' }} />
                )}
                {responded > 0 && (
                  <div style={{ width: `${(responded / total) * 100}%`, height: '100%', background: 'hsla(270, 60%, 50%, 0.4)', transition: 'width 0.3s' }} />
                )}
                {reached > 0 && (
                  <div style={{ width: `${(reached / total) * 100}%`, height: '100%', background: 'hsla(210, 60%, 50%, 0.3)', transition: 'width 0.3s' }} />
                )}
              </div>

              {/* Info row */}
              <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusDot color="hsla(150, 60%, 40%, 0.6)" label="confirmed" count={confirmed} />
                <StatusDot color="hsla(270, 60%, 50%, 0.4)" label="responded" count={responded} />
                <StatusDot color="hsla(210, 60%, 50%, 0.3)" label="reached" count={reached} />

                <div style={{ flex: 1 }} />

                {/* Insights */}
                {stalledCount > 0 && (
                  <span style={{ fontSize: 11, color: '#FF9500', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FF9500' }} />
                    {stalledCount} stalled
                  </span>
                )}
                {recentMoves > 0 && stalledCount === 0 && (
                  <span style={{ fontSize: 11, color: 'hsla(150, 60%, 35%, 1)', fontWeight: 500 }}>
                    {recentMoves} moved this week
                  </span>
                )}
                {campaign.deadline && (
                  <span style={{
                    fontSize: 11, fontWeight: isUrgent || isOverdue ? 500 : 400,
                    color: isOverdue ? '#D93025' : isUrgent ? '#FF9500' : 'var(--color-text-tertiary)',
                  }}>
                    {isOverdue
                      ? `${Math.abs(deadlineDays!)}d overdue`
                      : deadlineDays === 0 ? 'due today'
                      : `due ${new Date(campaign.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => navigate('/campaigns')}
        style={{
          display: 'block',
          width: '100%',
          marginTop: 8,
          padding: '8px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--color-text-tertiary)',
          fontFamily: 'inherit',
          textAlign: 'center',
        }}
      >
        View all campaigns
      </button>
    </div>
  )
}

function StatusDot({ color, label, count }: { color: string; label: string; count: number }) {
  if (count === 0) return null
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {count}
    </span>
  )
}
