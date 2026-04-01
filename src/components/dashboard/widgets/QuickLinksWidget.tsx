import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Campaign, CampaignContact, Pipeline } from '../../../lib/types'
import { getPipelines } from '../../../lib/airtable'
import { WidgetHeading } from './WidgetHeading'

interface QuickLinksWidgetProps {
  campaigns: Campaign[]
  campaignContacts: CampaignContact[]
  campaignsLoading: boolean
}

export function QuickLinksWidget({ campaigns, campaignContacts, campaignsLoading }: QuickLinksWidgetProps) {
  const navigate = useNavigate()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])

  useEffect(() => {
    getPipelines().then(setPipelines).catch(() => {})
  }, [])

  const activeCampaigns = campaigns.filter(c => c.status === 'active')

  const hasLinks = !campaignsLoading && (activeCampaigns.length > 0 || pipelines.length > 0)
  if (!hasLinks) return null

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ marginBottom: 12 }}>
        <WidgetHeading title="quick links" tooltip="Jump to your active campaigns and pipelines." />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {activeCampaigns.map(campaign => {
          const cc = campaignContacts.filter(c => c.campaign_id === campaign.id)
          const contacted = cc.filter(c => c.status !== 'pending').length
          const total = cc.length
          return (
            <button
              key={campaign.id}
              type="button"
              onClick={() => navigate(`/`)}
              className="widget-card"
              style={{
                background: 'var(--surface-panel)',
                border: '1px solid var(--edge)',
                borderRadius: 'var(--panel-radius)',
                width: '100%', padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsla(210, 60%, 50%, 0.5)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {campaign.name}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  campaign
                </span>
              </div>
              {total > 0 && (
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {contacted}/{total} contacted
                </span>
              )}
            </button>
          )
        })}
        {pipelines.filter(p => p.status === 'active').map(pipeline => (
          <button
            key={pipeline.id}
            type="button"
            onClick={() => navigate('/pipelines')}
            className="widget-card"
            style={{
              background: 'var(--surface-panel)',
              border: '1px solid var(--edge)',
              borderRadius: 'var(--panel-radius)',
              width: '100%', padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsla(150, 60%, 40%, 0.5)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {pipeline.name}
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                pipeline
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
