import { useNavigate } from 'react-router'
import type { Campaign, CampaignContact, CampaignType } from '../../../lib/types'

const TYPE_COLORS: Record<CampaignType, string> = {
  event: 'hsla(280, 60%, 50%, 0.5)',
  investment: 'hsla(150, 60%, 40%, 0.5)',
  outreach: 'hsla(210, 60%, 50%, 0.5)',
  other: 'var(--color-text-tertiary)',
}

interface CampaignProgressWidgetProps {
  campaigns: Campaign[]
  campaignContacts: CampaignContact[]
  loading: boolean
  onCampaignClick: (id: string) => void
}

export function CampaignProgressWidget({ campaigns, campaignContacts, loading, onCampaignClick }: CampaignProgressWidgetProps) {
  const navigate = useNavigate()
  const active = campaigns.filter(c => c.status === 'active')

  if (loading || active.length === 0) return null

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {active.map(campaign => {
          const cc = campaignContacts.filter(c => c.campaign_id === campaign.id)
          const total = cc.length
          const confirmed = cc.filter(c => c.status === 'confirmed').length
          const responded = cc.filter(c => c.status === 'responded').length
          const reached = cc.filter(c => c.status === 'reached').length
          const dotColor = TYPE_COLORS[campaign.type]

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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
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

              {/* Progress bar with segments */}
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

              {/* Status breakdown + deadline */}
              <div style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'center' }}>
                <StatusDot color="hsla(150, 60%, 40%, 0.6)" label="confirmed" count={confirmed} />
                <StatusDot color="hsla(270, 60%, 50%, 0.4)" label="responded" count={responded} />
                <StatusDot color="hsla(210, 60%, 50%, 0.3)" label="reached" count={reached} />
                {campaign.deadline && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
                    due {new Date(campaign.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Link to all campaigns */}
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
