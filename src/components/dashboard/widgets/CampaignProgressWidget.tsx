import { useNavigate } from 'react-router'
import type { CSSProperties } from 'react'
import type { Campaign, CampaignContact, CampaignType } from '../../../lib/types'
import { CampaignTypeIcon } from '../../campaigns/CampaignTypeIcon'
import { TYPE_COLORS, TYPE_LABELS } from '../../campaigns/campaignUtils'
import { WidgetHeading } from './WidgetHeading'

const STALE_MS = 7 * 24 * 60 * 60 * 1000

const STATUS_META = {
  pending: {
    label: 'queued',
    color: 'rgba(77, 73, 64, 0.52)',
    background: 'rgba(77, 73, 64, 0.08)',
  },
  reached: {
    label: 'reached',
    color: 'rgba(76, 110, 168, 0.9)',
    background: 'rgba(76, 110, 168, 0.12)',
  },
  responded: {
    label: 'replied',
    color: 'rgba(123, 74, 165, 0.92)',
    background: 'rgba(123, 74, 165, 0.12)',
  },
  confirmed: {
    label: 'confirmed',
    color: 'rgba(37, 180, 57, 0.9)',
    background: 'rgba(37, 180, 57, 0.12)',
  },
} as const

type StageKey = keyof typeof STATUS_META

interface CampaignProgressWidgetProps {
  campaigns: Campaign[]
  campaignContacts: CampaignContact[]
  loading: boolean
  onCampaignClick: (id: string) => void
}

type CampaignSnapshot = {
  campaign: Campaign
  total: number
  pending: number
  reached: number
  responded: number
  confirmed: number
  stalledCount: number
  recentMoves: number
  deadlineDays: number | null
  isUrgent: boolean
  isOverdue: boolean
  typeColor: string
  score: number
}

export function CampaignProgressWidget({ campaigns, campaignContacts, loading, onCampaignClick }: CampaignProgressWidgetProps) {
  const navigate = useNavigate()
  const active = campaigns.filter(c => c.status === 'active')

  if (loading) {
    return (
      <div style={{ marginBottom: 0 }}>
        <div style={{ marginBottom: 14 }}>
          <WidgetHeading title="campaigns" />
        </div>
        <div className="campaign-progress-layout">
          <div
            className="widget-card"
            style={{
              background: 'var(--surface-panel)',
              border: '1px solid var(--edge)',
              borderRadius: 'var(--panel-radius)',
              minHeight: 220,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="widget-card" style={{ background: 'var(--surface-panel)', border: '1px solid var(--edge)', borderRadius: 'var(--panel-radius)', minHeight: 104 }} />
            <div className="widget-card" style={{ background: 'var(--surface-panel)', border: '1px solid var(--edge)', borderRadius: 'var(--panel-radius)', minHeight: 104 }} />
          </div>
        </div>
      </div>
    )
  }

  if (active.length === 0) {
    return (
      <div style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <WidgetHeading title="campaigns" />
          <button type="button" className="see-all-link" onClick={() => navigate('/campaigns')}>
            Open board
          </button>
        </div>
        <div style={{
          background: 'var(--surface-panel)',
          border: '1px solid var(--edge)',
          borderRadius: 'var(--panel-radius)',
          padding: '24px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Nothing live right now.
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55, maxWidth: '44ch' }}>
            Start a campaign when you have a dinner, outreach run, fundraise, or deal flow you want to actively move.
          </div>
          <div>
            <button
              type="button"
              onClick={() => navigate('/campaigns')}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--color-accent)',
                color: '#fff',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Start a campaign
            </button>
          </div>
        </div>
      </div>
    )
  }

  const snapshots = active
    .map(campaign => buildSnapshot(campaign, campaignContacts))
    .sort((a, b) => b.score - a.score)

  const featured = snapshots[0]
  const rest = snapshots.slice(1)
  const stalledCampaigns = snapshots.filter(item => item.stalledCount > 0).length
  const urgentCampaigns = snapshots.filter(item => item.isUrgent || item.isOverdue).length

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <WidgetHeading title="campaigns" />
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {active.length} live
            {stalledCampaigns > 0 ? ` - ${stalledCampaigns} need attention` : urgentCampaigns > 0 ? ` - ${urgentCampaigns} closing soon` : ''}
          </span>
        </div>
        <button type="button" className="see-all-link" onClick={() => navigate('/campaigns')}>
          Open board
        </button>
      </div>

      <div className="campaign-progress-layout">
        <FeaturedCampaignCard snapshot={featured} onClick={() => onCampaignClick(featured.campaign.id)} />

        <div className="campaign-progress-sidebar">
          {rest.map(item => (
            <CompactCampaignCard key={item.campaign.id} snapshot={item} onClick={() => onCampaignClick(item.campaign.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FeaturedCampaignCard({ snapshot, onClick }: { snapshot: CampaignSnapshot; onClick: () => void }) {
  const message = buildPrimaryMessage(snapshot)
  const stageSummary = [
    { key: 'pending', count: snapshot.pending },
    { key: 'reached', count: snapshot.reached },
    { key: 'responded', count: snapshot.responded },
    { key: 'confirmed', count: snapshot.confirmed },
  ] as const

  return (
    <button
      type="button"
      onClick={onClick}
      className="widget-card"
      style={{
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface-panel) 88%, white 12%), var(--surface-panel))',
        border: `1px solid color-mix(in srgb, ${snapshot.typeColor} 22%, var(--edge))`,
        borderRadius: 'var(--panel-radius)',
        padding: '20px 22px',
        textAlign: 'left',
        cursor: 'pointer',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <TypePill type={snapshot.campaign.type} />
          <MomentumPill snapshot={snapshot} />
        </div>
        <DeadlineLabel snapshot={snapshot} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          fontSize: 24,
          lineHeight: 1.08,
          fontWeight: 700,
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.03em',
          maxWidth: '20ch',
        }}>
          {snapshot.campaign.name}
        </div>
        <div style={{
          fontSize: 14,
          lineHeight: 1.55,
          color: 'var(--color-text-secondary)',
          maxWidth: '52ch',
        }}>
          {message}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          width: '100%',
          height: 10,
          borderRadius: 999,
          background: 'rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
          display: 'flex',
        }}>
          {stageSummary.map(stage => (
            <StageSegment
              key={stage.key}
              count={stage.count}
              total={snapshot.total}
              color={STATUS_META[stage.key].color}
            />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          {stageSummary.map(stage => (
            <StageStat
              key={stage.key}
              stage={stage.key}
              count={stage.count}
              color={STATUS_META[stage.key].color}
            />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <InsightChip text={`${snapshot.confirmed}/${snapshot.total} locked in`} tone="success" />
          {snapshot.stalledCount > 0
            ? <InsightChip text={`${snapshot.stalledCount} need a nudge`} tone="warning" />
            : snapshot.recentMoves > 0
              ? <InsightChip text={`${snapshot.recentMoves} moved this week`} tone="neutral" />
              : null}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Open campaign
        </span>
      </div>
    </button>
  )
}

function CompactCampaignCard({ snapshot, onClick }: { snapshot: CampaignSnapshot; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="widget-card"
      style={{
        background: 'var(--surface-panel)',
        border: '1px solid var(--edge)',
        borderRadius: 'var(--panel-radius)',
        width: '100%',
        padding: '16px 18px',
        cursor: 'pointer',
        textAlign: 'left',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <CampaignTypeIcon type={snapshot.campaign.type} size={14} colored />
            <span style={{ fontSize: 11, fontWeight: 600, color: snapshot.typeColor }}>
              {TYPE_LABELS[snapshot.campaign.type]}
            </span>
          </div>
          <div style={{
            fontSize: 17,
            lineHeight: 1.12,
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {snapshot.campaign.name}
          </div>
        </div>
        <DeadlineLabel snapshot={snapshot} compact />
      </div>

      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
        {buildCompactMessage(snapshot)}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
        <StageStat
          stage="confirmed"
          count={snapshot.confirmed}
          color={STATUS_META.confirmed.color}
        />
        <StageStat
          stage="responded"
          count={snapshot.responded}
          color={STATUS_META.responded.color}
        />
        {snapshot.stalledCount > 0 && <InsightChip text={`${snapshot.stalledCount} stalled`} tone="warning" />}
      </div>
    </button>
  )
}

function TypePill({ type }: { type: CampaignType }) {
  const color = TYPE_COLORS[type]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      borderRadius: 999,
      background: `${color}14`,
      color,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      <CampaignTypeIcon type={type} size={14} colored />
      {TYPE_LABELS[type]}
    </span>
  )
}

function DeadlineLabel({ snapshot, compact }: { snapshot: CampaignSnapshot; compact?: boolean }) {
  if (!snapshot.campaign.deadline) return null

  return (
    <span style={{
      fontSize: compact ? 11 : 12,
      fontWeight: snapshot.isUrgent || snapshot.isOverdue ? 600 : 500,
      color: snapshot.isOverdue ? '#B42318' : snapshot.isUrgent ? '#B54708' : 'var(--color-text-secondary)',
      background: snapshot.isOverdue
        ? 'rgba(180, 35, 24, 0.08)'
        : snapshot.isUrgent
          ? 'rgba(181, 71, 8, 0.08)'
          : 'rgba(0, 0, 0, 0.04)',
      padding: compact ? '5px 8px' : '6px 10px',
      borderRadius: 999,
      whiteSpace: 'nowrap',
    }}>
      {formatDeadline(snapshot.deadlineDays, snapshot.campaign.deadline)}
    </span>
  )
}

function MomentumPill({ snapshot }: { snapshot: CampaignSnapshot }) {
  const tone = snapshot.stalledCount > 0
    ? { text: `${snapshot.stalledCount} need a nudge`, background: 'rgba(255, 149, 0, 0.1)', color: '#B54708' }
    : snapshot.recentMoves > 0
      ? { text: `${snapshot.recentMoves} moved this week`, background: 'rgba(37, 180, 57, 0.1)', color: '#1D7A2A' }
      : { text: `${snapshot.total} people in motion`, background: 'rgba(0, 0, 0, 0.05)', color: 'var(--color-text-secondary)' }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '6px 10px',
      borderRadius: 999,
      background: tone.background,
      color: tone.color,
      fontSize: 11,
      fontWeight: 600,
    }}>
      {tone.text}
    </span>
  )
}

function StageSegment({ count, total, color }: { count: number; total: number; color: string }) {
  if (count === 0 || total === 0) return null
  return <div style={{ width: `${(count / total) * 100}%`, height: '100%', background: color }} />
}

function StageIcon({ stage, color }: { stage: StageKey; color: string }) {
  if (stage === 'pending') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l2.5 2.5" />
      </svg>
    )
  }
  if (stage === 'reached') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22 11 13 2 9 22 2z" />
      </svg>
    )
  }
  if (stage === 'responded') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function StageStat({ stage, count, color }: {
  stage: StageKey
  count: number
  color: string
}) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      color,
      minHeight: 24,
    }}
    aria-label={`${count} ${STATUS_META[stage].label}`}
    >
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        borderRadius: 999,
        background: STATUS_META[stage].background,
        color,
      }}>
        <StageIcon stage={stage} color={color} />
      </span>
      <span style={{
        fontSize: 12,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {count}
      </span>
    </span>
  )
}

function InsightChip({ text, tone }: { text: string; tone: 'success' | 'warning' | 'neutral' }) {
  const styles: Record<typeof tone, CSSProperties> = {
    success: { color: '#1D7A2A', background: 'rgba(37, 180, 57, 0.1)' },
    warning: { color: '#B54708', background: 'rgba(255, 149, 0, 0.1)' },
    neutral: { color: 'var(--color-text-secondary)', background: 'rgba(0, 0, 0, 0.05)' },
  }

  return (
    <span style={{
      ...styles[tone],
      display: 'inline-flex',
      alignItems: 'center',
      padding: '6px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
    }}>
      {text}
    </span>
  )
}

function buildSnapshot(campaign: Campaign, campaignContacts: CampaignContact[]): CampaignSnapshot {
  const cc = campaignContacts.filter(c => c.campaign_id === campaign.id)
  const total = cc.length
  const confirmed = cc.filter(c => c.status === 'confirmed').length
  const responded = cc.filter(c => c.status === 'responded').length
  const reached = cc.filter(c => c.status === 'reached').length
  const pending = Math.max(total - confirmed - responded - reached, 0)

  const stalledCount = cc.filter(c => {
    if (!c.moved_at) return false
    return Date.now() - new Date(c.moved_at).getTime() > STALE_MS
  }).length

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentMoves = cc.filter(c => c.moved_at && new Date(c.moved_at).getTime() > weekAgo).length

  const deadlineDays = campaign.deadline
    ? Math.ceil((new Date(campaign.deadline + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const isUrgent = deadlineDays !== null && deadlineDays <= 7 && deadlineDays >= 0
  const isOverdue = deadlineDays !== null && deadlineDays < 0
  const score = (isOverdue ? 50 : 0) + (isUrgent ? 25 : 0) + stalledCount * 8 + responded * 3 + confirmed * 2 + recentMoves

  return {
    campaign,
    total,
    pending,
    reached,
    responded,
    confirmed,
    stalledCount,
    recentMoves,
    deadlineDays,
    isUrgent,
    isOverdue,
    typeColor: TYPE_COLORS[campaign.type],
    score,
  }
}

function buildPrimaryMessage(snapshot: CampaignSnapshot) {
  if (snapshot.total === 0) return 'No one is in this campaign yet. Add a few people and the pulse will start reading clearly.'
  if (snapshot.isOverdue) return `${snapshot.confirmed} confirmed, but ${snapshot.stalledCount || snapshot.responded + snapshot.reached} people still need movement and the deadline has already passed.`
  if (snapshot.stalledCount > 0) return `${snapshot.confirmed} locked in. ${snapshot.stalledCount} people need a nudge to keep this moving.`
  if (snapshot.isUrgent) return `${snapshot.confirmed} already in. ${snapshot.responded + snapshot.reached} more are still in motion before the deadline hits.`
  if (snapshot.responded > 0) return `${snapshot.responded} people are actively replying and ${snapshot.confirmed} are already locked in.`
  if (snapshot.reached > 0) return `${snapshot.reached} people have been reached and are waiting on the next move.`
  return `${snapshot.pending} still queued up. This campaign is ready for the first push.`
}

function buildCompactMessage(snapshot: CampaignSnapshot) {
  if (snapshot.total === 0) return 'No people added yet.'
  if (snapshot.stalledCount > 0) return `${snapshot.stalledCount} people need a follow-up.`
  if (snapshot.isOverdue) return 'Past due and still needs movement.'
  if (snapshot.isUrgent) return `${snapshot.confirmed}/${snapshot.total} locked in before the deadline.`
  if (snapshot.responded > 0) return `${snapshot.responded} replies in play.`
  if (snapshot.reached > 0) return `${snapshot.reached} reached, waiting on replies.`
  return `${snapshot.pending} still queued to start.`
}

function formatDeadline(deadlineDays: number | null, deadline: string) {
  if (deadlineDays === null) return ''
  if (deadlineDays < 0) return `${Math.abs(deadlineDays)}d overdue`
  if (deadlineDays === 0) return 'Due today'
  return `Due ${new Date(deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}
