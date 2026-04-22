import type { CampaignContact, CampaignStage } from '../../lib/types'

interface Props {
  stages: CampaignStage[]
  campaignContacts: CampaignContact[]
}

export function CampaignStatsBar({ stages, campaignContacts }: Props) {
  const sorted = [...stages].sort((a, b) => a.order - b.order)
  const total = campaignContacts.length
  const lastStage = sorted[sorted.length - 1]

  const converted = lastStage ? campaignContacts.filter(cc => cc.stage_id === lastStage.id).length : 0
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0

  if (total === 0) return null

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
    </div>
  )
}

function Stat({ label, value, accent, warn, muted, primary }: {
  label: string; value: string; accent?: boolean; warn?: boolean; muted?: boolean; primary?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{
        fontSize: primary ? 24 : 18, fontWeight: 700, fontFamily: 'var(--font-sans)',
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
