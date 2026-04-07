import { useRef, useState, useEffect } from 'react'
import type { Pod } from '../../../lib/types'
import { POD_SHIFT_COLORS } from '../../map/SolidOrb'

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
      <path d={areaPath} fill={`${color}33`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function healthLabel(score: number): { text: string; color: string; bg: string } {
  if (score >= 85) return { text: 'Thriving', color: 'var(--health-thriving)', bg: 'var(--health-thriving-bg)' }
  if (score >= 70) return { text: 'Steady', color: 'var(--health-steady)', bg: 'var(--health-steady-bg)' }
  if (score >= 40) return { text: 'Cooling', color: 'var(--health-cooling)', bg: 'var(--health-cooling-bg)' }
  return { text: 'Fading', color: 'var(--health-fading)', bg: 'var(--health-fading-bg)' }
}

function PodCard({ pod, contactCount, overdueCount, score, scoreReady, sparkline }: {
  pod: Pod; contactCount: number; overdueCount: number; score: number; scoreReady: boolean
  sparkline: number[] | null
}) {
  const color = pod.color ?? '#718096'
  const cadence = pod.cadence ?? 'monthly'
  const health = scoreReady ? healthLabel(score) : null

  return (
    <div
      className="widget-card"
      style={{
        background: 'var(--surface-panel)',
        border: '1px solid var(--edge)',
        borderRadius: 12,
        padding: '14px 16px',
        minWidth: 155,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        scrollSnapAlign: 'start',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              {pod.name}
            </span>
            {health && (
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.02em',
                padding: '1px 6px', borderRadius: 6,
                color: health.color, background: health.bg,
              }}>
                {health.text}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)' }}>
            <span>{contactCount} people</span>
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolledLeft, setScrolledLeft] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => setScrolledLeft(el.scrollLeft > 8)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (!dataReady || podStats.length === 0) return null

  return (
    <div style={{ position: 'relative', marginBottom: 0 }}>
      {/* Left fade */}
      {scrolledLeft && (
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: 48,
          background: 'linear-gradient(to left, transparent, var(--color-bg))',
          pointerEvents: 'none', zIndex: 1,
        }} />
      )}
      {/* Right fade */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 48,
        background: 'linear-gradient(to right, transparent, var(--color-bg))',
        pointerEvents: 'none', zIndex: 1,
      }} />
      <div
        ref={scrollRef}
        style={{
          display: 'flex', gap: 12, overflowX: 'auto', padding: '6px 2px',
          scrollbarWidth: 'none', scrollSnapType: 'x mandatory',
        }}
      >
        {podStats.map(({ pod, contactCount, overdueCount, score, scoreReady, sparkline }) => (
          <PodCard key={pod.id} pod={pod} contactCount={contactCount} overdueCount={overdueCount} score={score} scoreReady={scoreReady} sparkline={sparkline} />
        ))}
      </div>
    </div>
  )
}
