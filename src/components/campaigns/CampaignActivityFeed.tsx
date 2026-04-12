import { useEffect, useState } from 'react'
import { getAllInteractions } from '../../lib/airtable'
import type { Interaction, Contact, CampaignStage } from '../../lib/types'
import { formatRelativeTime } from './campaignUtils'
import { Avatar } from '../ui'

interface Props {
  campaignId: string
  campaignName: string
  contacts: Contact[]
  stages: CampaignStage[]
}

interface ActivityItem {
  id: string
  contactName: string
  contactId: string
  fromStage: string
  toStage: string
  date: string
}

export function CampaignActivityFeed({ campaignId, campaignName, contacts, stages }: Props) {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setLoading(true)
    getAllInteractions().then(interactions => {
      const pipelineEvents = interactions
        .filter(i => i.type === 'pipeline_event' && i.event_detail)
        .map(i => {
          try {
            const detail = JSON.parse(i.event_detail!)
            if (detail.campaign !== campaignName) return null
            const contact = contacts.find(c => c.id === i.contact_id)
            return {
              id: i.id,
              contactName: contact?.name ?? 'Unknown',
              contactId: i.contact_id,
              fromStage: detail.from_stage ?? '',
              toStage: detail.to_stage ?? '',
              date: i.created_at ?? i.date,
            }
          } catch { return null }
        })
        .filter(Boolean) as ActivityItem[]

      pipelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setItems(pipelineEvents.slice(0, 20))
      setLoading(false)
    })
  }, [campaignId, campaignName, contacts])

  if (loading || items.length === 0) return null

  const shown = expanded ? items : items.slice(0, 5)

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase' as const, color: 'var(--color-text-tertiary)',
        marginBottom: 8,
      }}>
        Recent Activity
      </div>
      <div style={{
        background: 'var(--surface-panel)', border: '1px solid var(--edge)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {shown.map((item, i) => (
          <div
            key={item.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              borderBottom: i < shown.length - 1 ? '1px solid var(--divider)' : 'none',
              fontSize: 13, color: 'var(--color-text-primary)',
            }}
          >
            <Avatar name={item.contactName} size={22} variant="subtle" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 500 }}>{item.contactName}</span>
              <span style={{ color: 'var(--color-text-tertiary)' }}> moved from </span>
              <span style={{ fontWeight: 500 }}>{item.fromStage}</span>
              <span style={{ color: 'var(--color-text-tertiary)' }}> to </span>
              <span style={{ fontWeight: 500 }}>{item.toStage}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
              {formatRelativeTime(item.date)}
            </span>
          </div>
        ))}
      </div>
      {items.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          style={{
            fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 500,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 0', fontFamily: 'inherit',
          }}
        >
          {expanded ? 'Show less' : `Show ${items.length - 5} more`}
        </button>
      )}
    </div>
  )
}
