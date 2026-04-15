import React, { useEffect, useRef, useState } from 'react'
import { scoreGrade, scoreLabel, type ScoreGrade, type ScoreLabel } from '../../../lib/equity'

function EquityRing({ score, size }: { score: number; size: number }) {
  const safeScore = Number.isFinite(score) ? score : 0
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safeScore / 100) * circumference
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0 0 16px rgba(255,255,255,0.20))' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={strokeWidth} />
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

function ScorePulse({ value }: { value: ScoreGrade }) {
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
      <span>{value}</span>
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

const SCORE_NUDGES: Record<ScoreLabel, string[]> = {
  Thriving: ['Your network is humming.', 'Keep showing up like this.', 'Relationships are strong.'],
  Steady:   ['You\'re keeping up nicely.', 'Solid momentum this week.', 'A few check-ins would keep this going.'],
  Cooling:  ['Some people miss hearing from you.', 'A couple of quick check-ins would help.', 'Your network could use some love.'],
  Fading:   ['Your network needs you.', 'Time to reconnect.', 'A few conversations would change this.'],
}

function getNudge(label: ScoreLabel): string {
  const options = SCORE_NUDGES[label]
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return options[dayOfYear % options.length]
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

interface EquityWidgetProps {
  overallScore: number
  interactionsLoading: boolean
  dataReady: boolean
  scoreTrend?: 'up' | 'down' | 'flat'
  onQuickAction?: () => void
}

export function EquityWidget({ overallScore, interactionsLoading, dataReady, scoreTrend, onQuickAction }: EquityWidgetProps) {
  const label = scoreLabel(overallScore)
  const grade = scoreGrade(overallScore)

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

      {/* Equity score - the hero moment */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {interactionsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div className="skeleton" style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton" style={{ width: 160, height: 16, background: 'rgba(255,255,255,0.12)', borderRadius: 8 }} />
              <div className="skeleton" style={{ width: 60, height: 14, background: 'rgba(255,255,255,0.12)', borderRadius: 6 }} />
            </div>
          </div>
        ) : (
          <>
            {/* Ring with score inside */}
            <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
              <EquityRing score={overallScore} size={120} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
              }}>
                <ScorePulse value={grade} />
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
                  grade
                </div>
              </div>
            </div>
            {/* Label + nudge */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ScoreLabelChip label={label} />
                {scoreTrend && <TrendArrow trend={scoreTrend} />}
                <span className="widget-tooltip-wrap" style={{ fontSize: 0, lineHeight: 0 }}>
                  <span className="widget-tooltip-icon" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.55)' }} aria-label="Info">?</span>
                  <span className="widget-tooltip-bubble">How strong your connections are overall -- based on how recently and how often you've been in touch.</span>
                </span>
              </div>
              <div style={{
                fontSize: 15, fontWeight: 400, color: 'rgba(255,255,255,0.75)',
                lineHeight: 1.4, letterSpacing: '0.01em',
              }}>
                {getNudge(label)}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.52)', letterSpacing: '0.02em' }}>
                {overallScore} / 100 relationship health
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
