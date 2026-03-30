import { useRef } from 'react'
import type { Pod } from '../../../lib/types'
import { POD_SHIFT_COLORS } from '../../map/SolidOrb'
import { hexToRgba } from '../../../lib/utils'

function Sparkline({ data, color, width = 60, height = 24 }: {
  data: number[]
  color: string
  width?: number
  height?: number
}) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (v / max) * height,
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`
  return (
    <svg width={width} height={height} style={{ display: 'block', flexShrink: 0 }}>
      <path d={areaPath} fill={`${color}1F`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PodCard({ pod, contactCount, overdueCount, score, scoreReady, sparkline }: {
  pod: Pod; contactCount: number; overdueCount: number; score: number; scoreReady: boolean
  sparkline: number[] | null
}) {
  const color = pod.color ?? '#718096'
  const cadence = pod.cadence ?? 'monthly'
  const cardRef = useRef<HTMLDivElement>(null)
  const restShadow = '0 1px 3px var(--divider)'
  const hoverShadow = `0 4px 16px ${hexToRgba(color, 0.15)}`

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => {
        if (cardRef.current) {
          cardRef.current.style.transform = 'translateY(-2px)'
          cardRef.current.style.boxShadow = hoverShadow
        }
      }}
      onMouseLeave={() => {
        if (cardRef.current) {
          cardRef.current.style.transform = 'none'
          cardRef.current.style.boxShadow = restShadow
        }
      }}
      style={{
        background: 'var(--surface-panel)',
        border: '1px solid var(--edge)',
        borderRadius: 12,
        padding: '14px 16px',
        minWidth: 155,
        flexShrink: 0,
        boxShadow: restShadow,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${color} 0%, ${POD_SHIFT_COLORS[color] ?? color} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.90)',
        }}>
          {pod.name.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {pod.name}
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)' }}>
            <span>{contactCount} contacts</span>
            {overdueCount > 0 && (
              <span style={{ color: 'hsla(20, 80%, 45%, 0.80)' }}>{overdueCount} overdue</span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {cadence}
            </span>
            {scoreReady && (
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                {score}
              </span>
            )}
          </div>
        </div>
      </div>
      {scoreReady && sparkline && (
        <Sparkline data={sparkline} color={color} width={119} height={22} />
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
    <div style={{ position: 'relative', marginBottom: 24 }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 48,
        background: 'linear-gradient(to right, transparent, var(--color-bg))',
        pointerEvents: 'none', zIndex: 1,
      }} />
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingTop: 6, paddingBottom: 6, scrollbarWidth: 'none' }}>
        {podStats.map(({ pod, contactCount, overdueCount, score, scoreReady, sparkline }) => (
          <PodCard key={pod.id} pod={pod} contactCount={contactCount} overdueCount={overdueCount} score={score} scoreReady={scoreReady} sparkline={sparkline} />
        ))}
      </div>
    </div>
  )
}
