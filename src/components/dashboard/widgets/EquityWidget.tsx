import React, { useEffect, useRef, useState, useCallback } from 'react'
import { scoreLabel } from '../../../lib/equity'

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
      // ease-out cubic
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

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

interface EquityWidgetProps {
  overallScore: number
  podCount: number
  contactCount: number
  recentlyContacted: number
  overdueCount: number
  interactionsLoading: boolean
  dataReady: boolean
}

export function EquityWidget({ overallScore, podCount, contactCount, recentlyContacted, overdueCount, interactionsLoading, dataReady }: EquityWidgetProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Greeting line */}
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.70)', fontWeight: 400, letterSpacing: '0.01em' }}>
        {getGreeting()}
        {dataReady && (
          <span style={{ color: 'rgba(255,255,255,0.50)', marginLeft: 6 }}>
            - {contactCount} contacts across {podCount} pods
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {/* Equity score ring - larger */}
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
                <div aria-live="polite" style={{ fontSize: 36, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1, fontFamily: 'var(--font-serif)' }}>
                  <AnimatedNumber value={Number.isFinite(overallScore) ? overallScore : 0} />
                </div>
                <div className="widget-tooltip-wrap" style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', marginTop: 6, letterSpacing: '0.01em' }}>
                  {scoreLabel(overallScore)}
                  <span className="widget-tooltip-icon" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.55)' }} aria-label="Info">?</span>
                  <span className="widget-tooltip-bubble">Overall relationship health across all pods. Based on recency-weighted interaction history within each pod's cadence window.</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Stats panel - liquid glass */}
        <div style={{
          background: 'rgba(255,255,255,0.10)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.18)',
          padding: '20px 28px',
          flex: 1,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 24px rgba(0,0,0,0.08)',
        }}>
          {!dataReady ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div className="skeleton" style={{ width: 40, height: 24, background: 'rgba(255,255,255,0.12)' }} />
                  <div className="skeleton" style={{ width: 60, height: 12, background: 'rgba(255,255,255,0.12)' }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <StatBlock label="Pods" value={podCount} />
              <StatBlock label="Contacts" value={contactCount} />
              <StatBlock label="Reached this week" value={recentlyContacted} />
              <StatBlock label="Overdue" value={overdueCount} accent />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
