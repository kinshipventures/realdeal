import React from 'react'
import { scoreLabel } from '../../../lib/equity'

function EquityRing({ score, size }: { score: number; size: number }) {
  const safeScore = Number.isFinite(score) ? score : 0
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safeScore / 100) * circumference

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke="url(#equityGradient)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      />
      <defs>
        <linearGradient id="equityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.60)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function StatBlock({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1,
        color: accent && value > 0 ? 'hsla(20, 80%, 45%, 0.80)' : '#ffffff',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4, letterSpacing: '0.01em' }}>
        {label}
      </div>
    </div>
  )
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
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Equity score ring */}
      <div style={{ padding: '0', display: 'flex', alignItems: 'center', gap: 24, flex: '0 0 auto' }}>
        {interactionsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton" style={{ width: 48, height: 28, background: 'rgba(255,255,255,0.15)' }} />
              <div className="skeleton" style={{ width: 56, height: 14, background: 'rgba(255,255,255,0.15)' }} />
            </div>
          </div>
        ) : (
          <>
            <EquityRing score={overallScore} size={80} />
            <div>
              <div aria-live="polite" style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {Number.isFinite(overallScore) ? overallScore : 0}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)', marginTop: 4, letterSpacing: '0.01em' }}>
                {scoreLabel(overallScore)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Stats panel */}
      <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--panel-radius)', padding: '20px 24px', flex: 1 }}>
        {!dataReady ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div className="skeleton" style={{ width: 40, height: 22, background: 'rgba(255,255,255,0.15)' }} />
                <div className="skeleton" style={{ width: 60, height: 12, background: 'rgba(255,255,255,0.15)' }} />
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
  )
}
