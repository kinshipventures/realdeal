import type { Pod } from '../../../lib/types'
import { WidgetHeading } from './WidgetHeading'

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

function PodRow({ pod, contactCount, overdueCount, score, scoreReady }: {
  pod: Pod; contactCount: number; overdueCount: number; score: number; scoreReady: boolean
}) {
  const cadence = pod.cadence ?? 'monthly'
  const health = scoreReady ? healthLabel(score) : null

  return (
    <div
      style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid var(--divider)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              {pod.name}
            </span>
            {health && (
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.02em',
                padding: '2px 8px', borderRadius: 999,
                color: health.color, background: health.bg,
              }}>
                {health.text}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
            <span>{contactCount} people</span>
            {overdueCount > 0 && (
              <span style={{ color: 'hsla(20, 80%, 45%, 0.80)' }}>{overdueCount} overdue</span>
            )}
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {cadence}
            </span>
          </div>
        </div>
      </div>
      {scoreReady && (
        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)', letterSpacing: '-0.03em', flexShrink: 0 }}>
          {score}
        </div>
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
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <WidgetHeading title="pod health" />
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {podStats.length} pods
        </span>
      </div>
      <div style={{ ...PANEL, overflow: 'hidden' }}>
        {podStats.map(({ pod, contactCount, overdueCount, score, scoreReady }) => (
          <PodRow key={pod.id} pod={pod} contactCount={contactCount} overdueCount={overdueCount} score={score} scoreReady={scoreReady} />
        ))}
      </div>
    </div>
  )
}
