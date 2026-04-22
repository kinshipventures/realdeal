import { useEffect, useRef, useState } from 'react'
import { WidgetHeading } from './WidgetHeading'

// Icon paths (Lucide, 24x24 viewBox) keyed by dimension key
const DIMENSION_ICONS: Record<string, string> = {
  reach: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  consistency: 'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-6v-4m0-4h.01',
  momentum: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  depth: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  warmth: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
}

// Lightweight tooltip: appears immediately, no native delay
function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 7px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(20,20,20,0.88)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: '#fff',
          fontSize: 11,
          lineHeight: 1.45,
          padding: '6px 10px',
          borderRadius: 7,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 200,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}>
          {text}
        </div>
      )}
    </div>
  )
}

const DIMENSION_DESCRIPTIONS: Record<string, string> = {
  reach: 'How many of your contacts you engaged in the last 30 days',
  consistency: 'How consistently you reach contacts within their expected cadence window',
  momentum: 'Week-over-week growth in interactions logged',
  depth: 'Quality of interactions - weighted toward calls, meetings, and meaningful touchpoints',
  warmth: 'Overall relationship health and equity score across your entire network',
}

export interface RadarDimension {
  key: string
  label: string
  score: number  // 0-100
  sublabel?: string
}

interface RadarChartProps {
  dimensions: RadarDimension[]
  overallScore: number
  overallLabel: string
  size?: number
}

function RadarChart({ dimensions, overallScore, overallLabel, size = 260 }: RadarChartProps) {
  const [mounted, setMounted] = useState(false)
  const [svgTip, setSvgTip] = useState<{ text: string; x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const cx = size / 2
  const cy = size / 2
  const maxR = (size / 2) - 44
  const n = dimensions.length

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function polarToXY(score: number, i: number): { x: number; y: number } {
    const angle = (-90 + i * (360 / n)) * (Math.PI / 180)
    const dist = (score / 100) * maxR
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) }
  }

  function axisEnd(i: number): { x: number; y: number } {
    const angle = (-90 + i * (360 / n)) * (Math.PI / 180)
    return { x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle) }
  }

  function labelPos(i: number): { x: number; y: number; anchor: string; baseline: string } {
    const angle = (-90 + i * (360 / n)) * (Math.PI / 180)
    const r = maxR + 26
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    const dx = x - cx
    const dy = y - cy
    return {
      x, y,
      anchor: dx > 8 ? 'start' : dx < -8 ? 'end' : 'middle',
      baseline: dy < -8 ? 'auto' : dy > 8 ? 'hanging' : 'middle',
    }
  }

  const rings = [25, 50, 75, 100]

  // Closed polygon passing through each vertex (so the shape actually touches the dots)
  function smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length === 0) return ''
    let d = `M ${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x},${pts[i].y}`
    }
    return d + ' Z'
  }

  const shapeVerts = dimensions.map((d, i) => polarToXY(mounted ? d.score : 2, i))
  const shapePath = smoothPath(shapeVerts)

  const scoreColor = overallScore >= 70 ? '#25B439' : overallScore >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div ref={containerRef} style={{ position: 'relative', width: size, height: size }}>
    {svgTip && (
      <div style={{
        position: 'absolute',
        left: svgTip.x,
        top: svgTip.y - 36,
        transform: 'translateX(-50%)',
        background: 'rgba(20,20,20,0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: '#fff',
        fontSize: 11,
        lineHeight: 1.45,
        padding: '5px 9px',
        borderRadius: 7,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 200,
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      }}>
        {svgTip.text}
      </div>
    )}
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <linearGradient id="rdRadarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={scoreColor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={scoreColor} stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="rdRadarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={scoreColor} />
          <stop offset="100%" stopColor={scoreColor} stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* Ring grid - concentric circles */}
      {rings.map(pct => (
        <circle
          key={pct}
          cx={cx}
          cy={cy}
          r={(pct / 100) * maxR}
          fill="none"
          stroke="rgba(0,0,0,0.055)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {dimensions.map((_, i) => {
        const end = axisEnd(i)
        return (
          <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y}
            stroke="rgba(0,0,0,0.055)" strokeWidth="1" />
        )
      })}

      {/* Filled smooth shape */}
      <path
        d={shapePath}
        fill="url(#rdRadarFill)"
        stroke="url(#rdRadarStroke)"
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ transition: 'all 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
      />

      {/* Score centered inside polygon */}
      <text
        x={cx} y={cy - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="36"
        fontWeight="800"
        fontFamily="var(--font-display)"
        fill={scoreColor}
        letterSpacing="-0.04em"
        style={{ transition: 'all 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        {mounted ? overallScore : 0}
      </text>
      <text
        x={cx} y={cy + 20}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="10"
        fontWeight="600"
        fontFamily="var(--font-sans)"
        fill={scoreColor}
        letterSpacing="0.08em"
        opacity="0.75"
      >
        {overallLabel.toUpperCase()}
      </text>

      {/* Score-line dots: sit at score vertices (on/near the bezier curve) */}
      {dimensions.map((d, i) => {
        const pt = shapeVerts[i]
        return (
          <circle key={`dot-${i}`} cx={pt.x} cy={pt.y} r={3}
            fill={scoreColor} stroke="white" strokeWidth="1.5"
            style={{ transition: 'all 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        )
      })}

      {/* Axis tip icons: dimension icon + hover tooltip */}
      {dimensions.map((d, i) => {
        const tip = axisEnd(i)
        const dimColor = d.score >= 70 ? '#25B439' : d.score >= 40 ? '#f59e0b' : '#ef4444'
        const iconPath = DIMENSION_ICONS[d.key] ?? ''
        return (
          <g key={`icon-${i}`} style={{ cursor: 'default' }}
            onMouseEnter={() => setSvgTip({ text: `${d.label}: ${mounted ? d.score : 0} — ${DIMENSION_DESCRIPTIONS[d.key] ?? d.label}`, x: tip.x, y: tip.y })}
            onMouseLeave={() => setSvgTip(null)}
          >
            <circle cx={tip.x} cy={tip.y} r={9}
              fill={dimColor}
              fillOpacity={mounted ? 0.12 : 0.04}
              stroke={dimColor}
              strokeWidth="1"
              strokeOpacity={mounted ? 0.35 : 0.1}
              style={{ transition: 'all 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
            <g transform={`translate(${tip.x - 6}, ${tip.y - 6}) scale(0.5)`}>
              <path
                d={iconPath}
                fill="none"
                stroke={dimColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={mounted ? 0.85 : 0.2}
                style={{ transition: 'opacity 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
            </g>
          </g>
        )
      })}
    </svg>
    </div>
  )
}

function generateNarrative(dimensions: RadarDimension[], overallScore: number, overallLabel: string): string {
  if (dimensions.length === 0) return ''
  const sorted = [...dimensions].sort((a, b) => b.score - a.score)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]
  const reach = dimensions.find(d => d.key === 'reach')
  const consistency = dimensions.find(d => d.key === 'consistency')

  if (overallScore >= 85) {
    return `Your network is firing on all cylinders. ${strongest.label} is your standout at ${strongest.score} — keep that momentum. ${weakest.score < 60 ? `The one thing to watch: ${weakest.label.toLowerCase()} at ${weakest.score}. A few targeted check-ins would make this perfect.` : 'Everything is in solid shape right now.'}`
  }
  if (overallScore >= 70) {
    return `Solid overall at ${overallScore}. Your ${strongest.label.toLowerCase()} is strong at ${strongest.score}, which means your closest relationships are well-maintained. ${weakest.label} is where you're leaving points on the table — ${weakest.sublabel ?? `score of ${weakest.score}`}. Close that gap and you're in great shape.`
  }
  if (overallScore >= 40) {
    const reachStr = reach ? `Only ${reach.score}% of your contacts have been touched recently.` : ''
    return `Your network needs some love. ${reachStr} ${strongest.label} is your strongest signal at ${strongest.score}, but ${weakest.label.toLowerCase()} is dragging you down at ${weakest.score}. A few intentional check-ins this week would move the needle.`
  }
  return `Your network is fading. ${weakest.label} is critically low at ${weakest.score}. The people in your network haven't heard from you in a while — even a brief message to your top ${consistency ? Math.max(2, Math.round((1 - consistency.score / 100) * 5)) : 3} contacts would start to reverse this.`
}

interface RadarWidgetProps {
  dimensions: RadarDimension[]
  loading?: boolean
  overallScore: number
  overallLabel?: string
}

export function RadarWidget({ dimensions, loading, overallScore, overallLabel = 'Steady' }: RadarWidgetProps) {
  const narrative = generateNarrative(dimensions, overallScore, overallLabel)

  if (loading || dimensions.length === 0) {
    return (
      <div>
        <div style={{
          background: 'var(--surface-panel)',
          backdropFilter: 'var(--panel-blur)',
          WebkitBackdropFilter: 'var(--panel-blur)',
          border: 'var(--surface-panel-border)',
          borderRadius: 'var(--panel-radius)',
          padding: '40px 32px',
          display: 'flex', gap: 48, alignItems: 'center',
        }}>
          <div className="skeleton" style={{ width: 260, height: 260, borderRadius: '50%', background: 'var(--tint)', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="skeleton" style={{ width: '60%', height: 14, borderRadius: 6, background: 'var(--tint)' }} />
            <div className="skeleton" style={{ width: '90%', height: 14, borderRadius: 6, background: 'var(--tint)' }} />
            <div className="skeleton" style={{ width: '75%', height: 14, borderRadius: 6, background: 'var(--tint)' }} />
          </div>
        </div>
        </div>
    )
  }

  return (
    <div>
      <div style={{
        background: 'var(--surface-panel)',
        backdropFilter: 'var(--panel-blur)',
        WebkitBackdropFilter: 'var(--panel-blur)',
        border: 'var(--surface-panel-border)',
        borderRadius: 'var(--panel-radius)',
        padding: '36px 36px 32px',
        display: 'flex',
        gap: 48,
        alignItems: 'center',
      }}>
        {/* Left: radar */}
        <div style={{ flexShrink: 0 }}>
          <RadarChart dimensions={dimensions} overallScore={overallScore} overallLabel={overallLabel} size={260} />
        </div>

        {/* Right: narrative */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>
            Summary
          </div>
          <p style={{
            fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-primary)',
            margin: '0 0 24px',
            fontFamily: 'var(--font-sans)',
            maxWidth: '58ch',
          }}>
            {narrative}
          </p>

          {/* Dimension pills - sorted highest to lowest */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[...dimensions].sort((a, b) => b.score - a.score).map(d => {
              const color = d.score >= 70 ? '#16a34a' : d.score >= 40 ? '#b45309' : '#dc2626'
              const bg = d.score >= 70 ? 'rgba(22,163,74,0.08)' : d.score >= 40 ? 'rgba(180,83,9,0.08)' : 'rgba(220,38,38,0.08)'
              const border = d.score >= 70 ? 'rgba(22,163,74,0.18)' : d.score >= 40 ? 'rgba(180,83,9,0.18)' : 'rgba(220,38,38,0.18)'
              return (
                <Tip key={d.key} text={DIMENSION_DESCRIPTIONS[d.key] ?? d.label}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px',
                    background: bg, border: `1px solid ${border}`,
                    borderRadius: 999, fontSize: 11, fontWeight: 600, color,
                    cursor: 'default',
                  }}>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>{d.score}</span>
                    <span style={{ color: color, opacity: 0.7, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 9 }}>{d.label}</span>
                  </div>
                </Tip>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared section divider (enov.one style) ──────────────────────────────────

export function SectionDivider({ title }: { title: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 20,
      marginBottom: 20,
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
      <h2 style={{
        fontSize: 22, fontWeight: 400,
        fontFamily: 'var(--font-serif)',
        color: 'var(--color-text-primary)',
        letterSpacing: '-0.01em',
        margin: 0, whiteSpace: 'nowrap',
      }}>
        {title}
      </h2>
      <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
    </div>
  )
}
