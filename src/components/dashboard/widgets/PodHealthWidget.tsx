import { useNavigate } from 'react-router'
import type { Pod } from '../../../lib/types'
import { WidgetHeading } from './WidgetHeading'
import { SectionDivider } from './RadarWidget'

const PANEL: React.CSSProperties = {
  background: 'var(--surface-panel)',
  backdropFilter: 'var(--panel-blur)',
  WebkitBackdropFilter: 'var(--panel-blur)',
  border: 'var(--surface-panel-border)',
  borderRadius: 'var(--panel-radius)',
}

function healthLabel(score: number): { text: string; color: string; bg: string } {
  if (score >= 85) return { text: 'Thriving', color: 'var(--health-thriving)', bg: 'var(--health-thriving-bg)' }
  if (score >= 70) return { text: 'Steady', color: 'var(--health-steady)', bg: 'var(--health-steady-bg)' }
  if (score >= 40) return { text: 'Cooling', color: 'var(--health-cooling)', bg: 'var(--health-cooling-bg)' }
  return { text: 'Fading', color: 'var(--health-fading)', bg: 'var(--health-fading-bg)' }
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 56
  const h = 18
  const max = Math.max(1, ...data)
  const step = w / Math.max(1, data.length - 1)
  const pts = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} opacity="0.7" />
    </svg>
  )
}

function PodRow({ pod, contactCount, overdueCount, score, scoreReady, sparkline }: {
  pod: Pod; contactCount: number; overdueCount: number; score: number; scoreReady: boolean; sparkline: number[] | null
}) {
  const navigate = useNavigate()
  const cadence = pod.cadence ?? 'monthly'
  const health = scoreReady ? healthLabel(score) : null

  return (
    <div
      onClick={() => navigate(`/pod/${pod.id}`)}
      style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid var(--divider)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: pod.color ?? '#718096',
          flexShrink: 0,
        }}>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* enov.one style: status label above title */}
          {health && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: health.color,
              marginBottom: 3,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: health.color, flexShrink: 0 }} />
              {health.text}
            </div>
          )}
          <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 4 }}>
            {pod.name}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--tint)', border: '1px solid var(--edge)', color: 'var(--color-text-tertiary)' }}>
              {contactCount} people
            </span>
            {overdueCount > 0 && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.18)', color: '#b91c1c' }}>
                {overdueCount} overdue
              </span>
            )}
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--tint)', border: '1px solid var(--edge)', color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>
              {cadence}
            </span>
          </div>
        </div>
      </div>
      {scoreReady && sparkline && (
        <Sparkline data={sparkline} color={health?.color ?? 'var(--color-text-tertiary)'} />
      )}
    </div>
  )
}

interface PodStatEntry {
  pod: Pod
  contactCount: number
  overdueCount: number
  score: number
  scoreReady: boolean
  sparkline: number[] | null
}

interface PodHealthWidgetProps {
  podStats: PodStatEntry[]
  dataReady: boolean
}

export function PodHealthWidget({ podStats, dataReady }: PodHealthWidgetProps) {
  if (!dataReady || podStats.length === 0) return null

  return (
    <div style={{ position: 'relative', marginBottom: 0 }}>
      <SectionDivider title="Pods" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          {podStats.length} pods
        </span>
      </div>
      <div style={{ ...PANEL, overflow: 'hidden' }}>
        {podStats.map(({ pod, contactCount, overdueCount, score, scoreReady, sparkline }) => (
          <PodRow key={pod.id} pod={pod} contactCount={contactCount} overdueCount={overdueCount} score={score} scoreReady={scoreReady} sparkline={sparkline} />
        ))}
      </div>
    </div>
  )
}
