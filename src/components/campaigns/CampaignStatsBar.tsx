import type { CampaignContact, CampaignStage, CampaignType } from '../../lib/types'
import { STALE_MS, daysSince, TYPE_COLORS } from './campaignUtils'

interface Props {
  stages: CampaignStage[]
  campaignContacts: CampaignContact[]
  createdAt: string
  campaignType?: CampaignType
}

export function CampaignStatsBar({ stages, campaignContacts, createdAt, campaignType }: Props) {
  const sorted = [...stages].sort((a, b) => a.order - b.order)
  const total = campaignContacts.length
  const lastStage = sorted[sorted.length - 1]
  const firstStage = sorted[0]

  const converted = lastStage ? campaignContacts.filter(cc => cc.stage_id === lastStage.id).length : 0
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0

  const stalledCount = campaignContacts.filter(cc => {
    if (!cc.moved_at || !cc.stage_id) return false
    if (firstStage && cc.stage_id === firstStage.id) return false
    if (lastStage && cc.stage_id === lastStage.id) return false
    return Date.now() - new Date(cc.moved_at).getTime() > STALE_MS
  }).length

  const age = daysSince(createdAt)

  if (total === 0) return null

  const accentColor = campaignType ? TYPE_COLORS[campaignType] : 'var(--color-brand)'

  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 32, flexWrap: 'wrap', marginBottom: 24,
      padding: '16px 20px',
      background: 'var(--surface-panel)',
      border: '1px solid var(--edge)',
      borderRadius: 12,
    }}>
      <Stat label="Contacts" value={String(total)} primary />
      <Stat label="Converted" value={`${conversionRate}%`} accent={conversionRate > 50} />
      {stalledCount > 0 && <Stat label="Stalled" value={String(stalledCount)} warn />}
      <Stat label="Age" value={`${age}d`} muted />
    </div>
  )
}

function Stat({ label, value, accent, warn, muted, primary }: {
  label: string; value: string; accent?: boolean; warn?: boolean; muted?: boolean; primary?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{
        fontSize: primary ? 24 : 18, fontWeight: 700, fontFamily: 'var(--font-serif)',
        letterSpacing: '-0.02em',
        color: warn ? '#FF9500' : accent ? 'hsla(150, 60%, 35%, 1)' : muted ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
      }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
        {label}
      </span>
    </div>
  )
}
