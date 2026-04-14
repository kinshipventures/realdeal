import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { getCampaigns, getCampaignContacts } from '../../lib/airtable'
import type { Contact, Campaign, CampaignContact } from '../../lib/types'
import { WIDGET_STYLE } from './shared'

interface PipelinesWidgetProps {
  contact: Contact
}

export function PipelinesWidget({ contact }: PipelinesWidgetProps) {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [linkedCampaignIds, setLinkedCampaignIds] = useState<string[]>([])

  const load = useCallback(async () => {
    const [allCampaigns, allCc] = await Promise.all([
      getCampaigns(),
      getCampaignContacts(),
    ])
    const myLinks = allCc.filter(cc => cc.contact_id === contact.id)
    const ids = myLinks.map(cc => cc.campaign_id)
    setLinkedCampaignIds(ids)
    setCampaigns(allCampaigns.filter(c => ids.includes(c.id) && c.status !== 'hidden'))
  }, [contact.id])

  useEffect(() => { load() }, [load])

  return (
    <div style={WIDGET_STYLE}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}>
          Campaigns
        </span>
      </div>

      {campaigns.length === 0 ? (
        <p style={{
          fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0, lineHeight: 1.5,
        }}>
          Not in any campaigns
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {campaigns.map(c => (
            <div
              key={c.id}
              onClick={() => navigate(`/campaigns?campaign=${c.id}`)}
              style={{
                padding: '6px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--tint)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-primary)' }}>
                {c.name}
              </div>
              <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                {c.type}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
