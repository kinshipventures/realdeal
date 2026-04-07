import React, { useEffect, useRef, useState } from 'react'
import { scoreLabel, type ScoreLabel } from '../../../lib/equity'

function EquityRing({ score, size }: { score: number; size: number }) {
  const safeScore = Number.isFinite(score) ? score : 0
  const strokeWidth = 7
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safeScore / 100) * circumference
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.25))' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke="url(#equityGradientLg)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={mounted ? offset : circumference}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      />
      <defs>
        <linearGradient id="equityGradientLg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prevValue = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const start = prevValue.current
    const end = Number.isFinite(value) ? value : 0
    if (start === end) { el.textContent = String(end); return }
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      const current = Math.round(start + (end - start) * ease)
      if (el) el.textContent = String(current)
      if (t < 1) requestAnimationFrame(tick)
      else prevValue.current = end
    }
    requestAnimationFrame(tick)
  }, [value, duration])

  return <span ref={ref}>{Number.isFinite(value) ? value : 0}</span>
}

function StatBlock({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 0 }}>
      <div style={{
        fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1,
        color: accent && value > 0 ? 'hsla(0, 85%, 60%, 0.95)' : '#ffffff',
        fontVariantNumeric: 'tabular-nums',
      }}>
        <AnimatedNumber value={value} />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 5, letterSpacing: '0.02em', textTransform: 'uppercase', fontWeight: 500 }}>
        {label}
      </div>
    </div>
  )
}

function ScorePulse({ value }: { value: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const prev = useRef(value)

  useEffect(() => {
    if (prev.current !== value && ref.current) {
      ref.current.style.transform = 'scale(1.12)'
      ref.current.style.opacity = '0.85'
      const t = setTimeout(() => {
        if (ref.current) {
          ref.current.style.transform = 'scale(1)'
          ref.current.style.opacity = '1'
        }
      }, 60)
      prev.current = value
      return () => clearTimeout(t)
    }
  }, [value])

  return (
    <div
      ref={ref}
      aria-live="polite"
      style={{
        fontSize: 38, fontWeight: 900, color: '#ffffff',
        letterSpacing: '-0.03em', lineHeight: 1,
        fontFamily: 'var(--font-serif)',
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease',
        display: 'inline-flex', alignItems: 'baseline', gap: 8,
      }}
    >
      <AnimatedNumber value={value} />
    </div>
  )
}

// Trend arrow: up, down, or flat
function TrendArrow({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'flat') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>
      </span>
    )
  }
  const isUp = trend === 'up'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      color: isUp ? 'hsla(140, 70%, 75%, 0.95)' : 'hsla(0, 70%, 70%, 0.90)',
      fontSize: 12,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {isUp
          ? <><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></>
          : <><polyline points="7 13 12 18 17 13"/><line x1="12" y1="18" x2="12" y2="6"/></>
        }
      </svg>
    </span>
  )
}

// Score label as colored chip
const LABEL_COLORS: Record<ScoreLabel, { bg: string; text: string }> = {
  Thriving: { bg: 'rgba(150, 255, 150, 0.18)', text: 'hsla(140, 80%, 80%, 1)' },
  Steady:   { bg: 'rgba(150, 200, 255, 0.18)', text: 'hsla(210, 80%, 82%, 1)' },
  Cooling:  { bg: 'rgba(255, 200, 100, 0.18)', text: 'hsla(35, 90%, 78%, 1)' },
  Fading:   { bg: 'rgba(255, 130, 130, 0.18)', text: 'hsla(0, 80%, 78%, 1)' },
}

function ScoreLabelChip({ label }: { label: ScoreLabel }) {
  const colors = LABEL_COLORS[label]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: colors.bg, color: colors.text,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 6,
      border: `1px solid ${colors.text.replace('1)', '0.20)')}`,
    }}>
      {label}
    </span>
  )
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export interface EquityWidgetProps {
  overallScore: number
  podCount: number
  contactCount: number
  recentlyContacted: number
  overdueCount: number
  interactionsLoading: boolean
  dataReady: boolean
  scoreTrend?: 'up' | 'down' | 'flat'
  onQuickAction?: () => void
}

export function EquityWidget({ overallScore, podCount, contactCount, recentlyContacted, overdueCount, interactionsLoading, dataReady, scoreTrend, onQuickAction }: EquityWidgetProps) {
  const label = scoreLabel(overallScore)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Greeting + date + quick action */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: 400, letterSpacing: '0.01em' }}>
            {getGreeting()}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', marginTop: 2, letterSpacing: '0.02em' }}>
            {formatDate()}
          </div>
        </div>
        {dataReady && onQuickAction && (
          <button
            type="button"
            onClick={onQuickAction}
            style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 8,
              padding: '7px 16px',
              fontSize: 12, fontWeight: 600,
              color: 'rgba(255,255,255,0.90)',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
              transition: 'background 0.15s ease, transform 0.15s ease',
              minHeight: 44,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Log interaction
          </button>
        )}
      </div>

      <div className="equity-layout" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {/* Equity score ring */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: '0 0 auto' }}>
          {interactionsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div className="skeleton" style={{ width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ width: 52, height: 32, background: 'rgba(255,255,255,0.12)' }} />
                <div className="skeleton" style={{ width: 60, height: 14, background: 'rgba(255,255,255,0.12)' }} />
              </div>
            </div>
          ) : (
            <>
              <EquityRing score={overallScore} size={96} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ScorePulse value={Number.isFinite(overallScore) ? overallScore : 0} />
                  {scoreTrend && <TrendArrow trend={scoreTrend} />}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <ScoreLabelChip label={label} />
                  <span className="widget-tooltip-wrap" style={{ fontSize: 0, lineHeight: 0 }}>
                    <span className="widget-tooltip-icon" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.55)' }} aria-label="Info">?</span>
                    <span className="widget-tooltip-bubble">How strong your connections are overall -- based on how recently and how often you've been in touch.</span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Stats panel */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '20px 28px',
          flex: 1,
        }}>
          {!dataReady ? (
            <div className="equity-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div className="skeleton" style={{ width: 40, height: 24, background: 'rgba(255,255,255,0.12)' }} />
                  <div className="skeleton" style={{ width: 60, height: 12, background: 'rgba(255,255,255,0.12)' }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="equity-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <StatBlock label="Pods" value={podCount} />
              <StatBlock label="People" value={contactCount} />
              <StatBlock label="Reached this week" value={recentlyContacted} />
              <StatBlock label="Overdue" value={overdueCount} accent />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
