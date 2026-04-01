import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { SolidOrb, POD_SHIFT_COLORS } from '../map/SolidOrb'
import type { HexColor } from '../../lib/types'

interface Props {
  onComplete: () => void
}

const STEP_COUNT = 5
const STEP_LABELS = ['Welcome', 'Philosophy', 'Pods', 'Import', 'Tour']

/* ---------- static data (hoisted out of render) ---------- */

const PRINCIPLES = [
  { icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', label: 'Give more than you take', stat: 'Teams where people give more outperform on every measurable metric.' },
  { icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', label: 'Trust is built on micro-habits', stat: 'Emotional closeness fades within months without contact.' },
  { icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 0 0 6.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 0 0 6.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3', label: 'Relationship debt is real', stat: '5% monthly neglect compounds to 46% annual relationship loss.' },
]

const INTERACTIONS = [
  { label: 'Intro', weight: 5, color: '#25B439' },
  { label: 'Meeting', weight: 4, color: '#6366F1' },
  { label: 'Call', weight: 3, color: '#EC4899' },
  { label: 'Text / Email', weight: 2, color: '#F59E0B' },
]

const TOTAL_WEIGHT = INTERACTIONS.reduce((s, i) => s + i.weight, 0)

/* ---------- Seed-to-Tree persistent element ---------- */

// Each step reveals more branches and leaves, growing from a seed dot into a full tree
function SeedTree({ step }: { step: number }) {
  // Tree structure: trunk + branches that appear at each step
  // Step 0: seed dot only
  // Step 1: short trunk sprouts
  // Step 2: first branches appear
  // Step 3: more branches + first leaves
  // Step 4: full tree with all leaves

  const branches: { d: string; step: number; len: number }[] = [
    // Trunk
    { d: 'M60 110 Q60 85 60 70', step: 1, len: 40 },
    // First fork
    { d: 'M60 70 Q50 55 38 48', step: 2, len: 35 },
    { d: 'M60 70 Q70 55 82 48', step: 2, len: 35 },
    // Second level
    { d: 'M60 85 Q45 75 35 72', step: 3, len: 30 },
    { d: 'M60 85 Q75 75 85 72', step: 3, len: 30 },
    // Top branches
    { d: 'M38 48 Q30 38 25 32', step: 4, len: 22 },
    { d: 'M82 48 Q90 38 95 32', step: 4, len: 22 },
    { d: 'M38 48 Q42 35 50 30', step: 4, len: 22 },
    { d: 'M82 48 Q78 35 70 30', step: 4, len: 22 },
  ]

  const leaves: { cx: number; cy: number; r: number; color: string; step: number; delay: number }[] = [
    // Step 3 leaves
    { cx: 35, cy: 72, r: 4, color: '#25B439', step: 3, delay: 300 },
    { cx: 85, cy: 72, r: 4, color: '#6366F1', step: 3, delay: 450 },
    // Step 4 leaves - full bloom
    { cx: 25, cy: 32, r: 5, color: '#EC4899', step: 4, delay: 200 },
    { cx: 95, cy: 32, r: 5, color: '#F59E0B', step: 4, delay: 300 },
    { cx: 50, cy: 30, r: 4.5, color: '#14B8A6', step: 4, delay: 400 },
    { cx: 70, cy: 30, r: 4.5, color: '#8B5CF6', step: 4, delay: 500 },
    { cx: 38, cy: 48, r: 3.5, color: '#25B439', step: 4, delay: 100 },
    { cx: 82, cy: 48, r: 3.5, color: '#F97316', step: 4, delay: 250 },
  ]

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 360, height: 400,
      opacity: step === 0 ? 0.06 : step >= 4 ? 0.12 : 0.08,
      transition: 'opacity 0.8s ease',
      pointerEvents: 'none',
    }}>
      <svg width="360" height="400" viewBox="0 0 120 130" preserveAspectRatio="xMidYMid meet">
        {/* Seed dot - always visible */}
        <circle cx="60" cy="112" r={step === 0 ? 5 : 3.5} fill="#25B439"
          style={{ transition: 'r 0.4s ease' }}
        />

        {/* Ground line */}
        <line x1="40" y1="116" x2="80" y2="116" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />

        {/* Branches */}
        {branches.filter(b => b.step <= step).map((b, i) => (
          <path
            key={i}
            d={b.d}
            fill="none"
            stroke={step >= 4 ? 'rgba(37,180,57,0.5)' : 'rgba(0,0,0,0.15)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={b.len}
            style={{
              // @ts-ignore
              '--branch-len': b.len,
              animation: `branch-grow 0.6s ease-out ${i * 80}ms forwards`,
              transition: 'stroke 0.4s ease',
            } as React.CSSProperties}
          />
        ))}

        {/* Leaves */}
        {leaves.filter(l => l.step <= step).map((l, i) => (
          <circle
            key={`leaf-${i}`}
            cx={l.cx} cy={l.cy} r={l.r}
            fill={l.color} fillOpacity="0.8"
            style={{
              transformOrigin: `${l.cx}px ${l.cy}px`,
              animation: `leaf-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${l.delay}ms both`,
            }}
          />
        ))}
      </svg>
    </div>
  )
}

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const navigate = useNavigate()

  const next = () => {
    setDirection('forward')
    if (step < STEP_COUNT - 1) { const ns = step + 1; setStep(ns); setMaxStep(m => Math.max(m, ns)) }
    else onComplete()
  }
  const back = () => { if (step > 0) { setDirection('back'); setStep(step - 1) } }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <style>{`
        @keyframes onboard-enter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes onboard-slide-left {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes onboard-slide-right {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes onboard-stagger {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes welcome-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 8px 32px rgba(37,180,57,0.30); }
          50% { transform: scale(1.05); box-shadow: 0 12px 48px rgba(37,180,57,0.40); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(var(--orbit-r)) rotate(0deg); }
          to { transform: rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg); }
        }
        @keyframes welcome-heading {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes gentle-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes branch-grow {
          from { stroke-dashoffset: var(--branch-len); }
          to { stroke-dashoffset: 0; }
        }
        @keyframes leaf-pop {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes onboard-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .onboard-btn-primary:hover {
          transform: scale(1.03) !important;
          box-shadow: 0 6px 24px rgba(37,180,57,0.40) !important;
        }
        .onboard-btn-primary:active {
          transform: scale(0.97) !important;
        }
        .onboard-btn-secondary:hover {
          background: rgba(0,0,0,0.06) !important;
          border-color: rgba(0,0,0,0.2) !important;
        }
        .onboard-btn-secondary:active {
          transform: scale(0.97) !important;
        }
      `}</style>

      {/* Top bar: logo + progress */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 1,
      }}>
        {/* Logo */}
        <span style={{
          fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: 18,
          color: 'var(--color-text-primary)', letterSpacing: '-0.02em',
        }}>
          RealDeal
        </span>

        {/* Progress: labels as segmented bar */}
        <div style={{ display: 'flex', gap: 4, borderRadius: 10, padding: 3, background: 'var(--tint)' }}>
          {STEP_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => { if (i <= maxStep) setStep(i) }}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                fontSize: 11, fontWeight: i === step ? 600 : 400,
                fontFamily: 'var(--font-sans)', letterSpacing: '0.01em',
                color: i === step ? '#fff' : 'var(--color-text-secondary)',
                background: i === step ? 'var(--color-brand)' : 'transparent',
                cursor: i <= maxStep ? 'pointer' : 'default',
                opacity: i <= maxStep ? 1 : 0.4,
                transition: 'all 0.25s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Seed-to-tree persistent element */}
      <SeedTree step={step} />
      <div style={{
        width: '100%', maxWidth: step === 1 ? 600 : 480, padding: '80px 32px 40px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: step === 3 ? 20 : 32, textAlign: 'center',
        transition: 'max-width 0.35s ease',
        overflowY: 'auto', maxHeight: '100vh',
      }}>
        <div key={step} style={{
          animation: step === 0
            ? 'onboard-enter 0.4s ease-out'
            : `${direction === 'forward' ? 'onboard-slide-left' : 'onboard-slide-right'} 0.35s cubic-bezier(0.4, 0, 0.2, 1)`,
          display: 'contents',
        }}>
          {step === 0 && <StepWelcome onNext={next} />}
          {step === 1 && <StepPhilosophy onNext={next} onBack={back} />}
          {step === 2 && <StepPods onNext={next} onBack={back} />}
          {step === 3 && <StepImport onComplete={onComplete} onNext={next} onBack={back} navigate={navigate} />}
          {step === 4 && <StepTour onFinish={onComplete} onBack={back} />}
        </div>

        {/* Skip */}
        <button type="button" onClick={onComplete} style={{
          ...linkStyle,
          opacity: 0,
          animation: 'onboard-fade-in 0.3s ease-out 0.25s forwards',
        }}>
          Skip
        </button>
      </div>
    </div>
  )
}

/* ---------- stagger helper ---------- */

const stagger = (delay: number): React.CSSProperties => ({
  opacity: 0,
  animation: `onboard-stagger 0.4s ease-out ${delay}ms both`,
})

/* ---------- shared back+action row ---------- */

function ActionRow({ onAction, onBack, label }: { onAction: () => void; onBack?: () => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 280 }}>
      {onBack && (
        <button type="button" onClick={onBack} style={{
          width: 44, height: 44, borderRadius: '50%', border: 'none',
          background: 'var(--color-brand)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
          boxShadow: '0 4px 16px rgba(37,180,57,0.30)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <button type="button" onClick={onAction} className="onboard-btn-primary" style={{ ...primaryBtnStyle, flex: 1, maxWidth: 'none' }}>
        {label}
      </button>
    </div>
  )
}

/* ---------- individual steps ---------- */

function StepWelcome({ onNext }: { onNext: () => void }) {
  const orbs = [
    { color: '#6366F1', size: 12, r: 72, dur: 12, delay: 0 },
    { color: '#EC4899', size: 10, r: 72, dur: 15, delay: -4 },
    { color: '#F59E0B', size: 9, r: 72, dur: 18, delay: -8 },
    { color: '#14B8A6', size: 8, r: 56, dur: 20, delay: -6 },
    { color: '#8B5CF6', size: 7, r: 56, dur: 14, delay: -2 },
    { color: '#F97316', size: 6, r: 56, dur: 22, delay: -10 },
  ]

  return (
    <>
      {/* Orbital visual */}
      <div style={{ position: 'relative', width: 180, height: 180, opacity: 0, animation: 'onboard-enter 0.6s ease-out 0.1s forwards' }}>
        {/* Orbit rings */}
        <svg width="180" height="180" viewBox="0 0 180 180" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="90" cy="90" r="56" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
          <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
        </svg>

        {/* Orbiting dots */}
        {orbs.map((o, i) => (
          <div key={i} style={{
            position: 'absolute', left: 90 - o.size / 2, top: 90 - o.size / 2,
            width: o.size, height: o.size, borderRadius: '50%',
            background: o.color, opacity: 0.7,
            // @ts-ignore
            '--orbit-r': `${o.r}px`,
            animation: `orbit ${o.dur}s linear infinite`,
            animationDelay: `${o.delay}s`,
          } as React.CSSProperties} />
        ))}

        {/* Center orb */}
        <div style={{
          position: 'absolute', left: 90 - 40, top: 90 - 40,
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #25B439, #1A8A2A)',
          animation: 'welcome-pulse 3s ease-in-out infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
      </div>

      <h1 style={{
        ...headingStyle, fontSize: 34, letterSpacing: '-0.03em',
        opacity: 0, animation: 'welcome-heading 0.5s ease-out 0.3s forwards',
      }}>
        Feed what feeds you
      </h1>
      <p style={{
        ...bodyStyle, fontSize: 15, lineHeight: 1.7, maxWidth: 340,
        opacity: 0, animation: 'onboard-enter 0.4s ease-out 0.5s forwards',
      }}>
        The relationships that matter most are the ones you invest in. This is your system to make that effortless.
      </p>
      <button type="button" onClick={onNext} className="onboard-btn-primary" style={{
        ...primaryBtnStyle, opacity: 0, animation: 'onboard-enter 0.4s ease-out 0.7s forwards',
      }}>
        Get Started
      </button>
    </>
  )
}

function StepPhilosophy({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const ringSize = 120
  const strokeW = 10
  const r = (ringSize - strokeW) / 2
  const circ = 2 * Math.PI * r

  // Animate segments in sequentially
  const [animStep, setAnimStep] = useState(-1)
  useEffect(() => {
    const timers = INTERACTIONS.map((_, i) =>
      setTimeout(() => setAnimStep(i), 400 + i * 500)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  // Build cumulative arc offsets - no gaps, segments touch
  let cumOffset = 0
  const arcs = INTERACTIONS.map((inter, i) => {
    const fraction = inter.weight / TOTAL_WEIGHT
    const arcLen = fraction * circ
    const offset = cumOffset
    cumOffset += arcLen
    return { ...inter, arcLen, offset, visible: i <= animStep }
  })

  return (
    <>
      <h2 style={{ ...headingStyle, ...stagger(0) }}>This isn't a CRM</h2>
      <p style={{ ...bodyStyle, ...stagger(60) }}>
        We track relationship health, not sales pipelines.
      </p>

      <div style={{ ...stagger(120), display: 'flex', gap: 24, width: '100%', textAlign: 'left', alignItems: 'stretch' }}>
        {/* Left: Principles */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
          {PRINCIPLES.map((p, i) => (
            <div key={p.label} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', flex: 1,
              borderRadius: 10, background: 'rgba(0,0,0,0.03)',
              opacity: 0, animation: `onboard-enter 0.35s ease-out ${i * 80}ms forwards`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                background: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={p.icon} />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
                  {p.label}
                </span>
                <div style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--color-text-secondary)', lineHeight: 1.4, marginTop: 2 }}>
                  {p.stat}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Scoring */}
        <div style={{
          flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          padding: '16px 20px', borderRadius: 14, background: 'rgba(0,0,0,0.02)',
          border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
            How scoring works
          </span>

          <div style={{ position: 'relative', width: ringSize, height: ringSize, flexShrink: 0 }}>
            <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={r}
                fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeW}
              />
              {arcs.map(a => (
                <circle
                  key={a.label}
                  cx={ringSize / 2} cy={ringSize / 2} r={r}
                  fill="none" stroke={a.color} strokeWidth={strokeW}
                  strokeDasharray={`${a.visible ? a.arcLen : 0} ${circ}`}
                  strokeDashoffset={-a.offset}
                  style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              ))}
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
                Equity
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {INTERACTIONS.map((inter, i) => (
              <div key={inter.label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: i <= animStep ? 1 : 0.3,
                transition: 'opacity 0.4s ease',
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: inter.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
                  {inter.label}
                </span>
                <span style={{ fontSize: 9, fontWeight: 600, color: inter.color, fontFamily: 'var(--font-sans)' }}>
                  +{inter.weight}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ActionRow onAction={onNext} onBack={onBack} label="Next" />
    </>
  )
}

function StepPods({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [cadence, setCadence] = useState(() =>
    localStorage.getItem('realdeal:default-cadence') || 'monthly'
  )
  const pods = [
    { name: 'Talent', color: '#6366F1', count: '~15 people', emoji: '🎨' },
    { name: 'LPs', color: '#F59E0B', count: '~12 people', emoji: '💰' },
    { name: 'Advisors', color: '#EC4899', count: '~8 people', emoji: '🧠' },
  ]

  const cadenceOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Biweekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
  ]

  const handleCadence = (value: string) => {
    setCadence(value)
    localStorage.setItem('realdeal:default-cadence', value)
  }

  return (
    <>
      <h2 style={headingStyle}>Your world in pods</h2>
      <p style={bodyStyle}>
        Not more contacts - fewer, better ones. Pods keep your circles small and intentional.
      </p>

      {/* Pod cards with stagger */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        {pods.map((p, i) => (
          <div
            key={p.name}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              padding: '20px 16px 16px', borderRadius: 16, width: 120,
              background: `linear-gradient(160deg, ${p.color}12, ${p.color}06)`,
              border: `1px solid ${p.color}20`,
              opacity: 0, animation: `onboard-enter 0.4s ease-out ${i * 120}ms forwards`,
            }}
          >
            <SolidOrb size={64} color={p.color as HexColor} shiftColor={(POD_SHIFT_COLORS[p.color] || p.color) as HexColor} glowIntensity="high" className="onboarding-orb">
              <span style={{ fontSize: 18 }}>{p.emoji}</span>
            </SolidOrb>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)' }}>{p.name}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>{p.count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Philosophy nudge */}
      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)', fontStyle: 'italic', margin: 0, maxWidth: 320 }}>
        "This isn't about how big your list is. It's about how small it is."
      </p>

      {/* Cadence picker */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
          Default check-in cadence
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {cadenceOptions.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => handleCadence(o.value)}
              style={{
                padding: '6px 14px', borderRadius: 100, border: 'none',
                fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
                cursor: 'pointer', transition: 'all 0.15s ease',
                background: cadence === o.value ? 'var(--color-brand)' : 'rgba(0,0,0,0.06)',
                color: cadence === o.value ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <ActionRow onAction={onNext} onBack={onBack} label="Next" />
    </>
  )
}

function StepImport({ onComplete, onNext, onBack, navigate }: { onComplete: () => void; onNext: () => void; onBack: () => void; navigate: (path: string) => void }) {
  const nodes = [
    { x: 0, y: 0, size: 10, color: '#25B439', delay: 0 },
    { x: -28, y: -20, size: 7, color: '#6366F1', delay: 100 },
    { x: 30, y: -16, size: 8, color: '#EC4899', delay: 200 },
    { x: -18, y: 24, size: 6, color: '#F59E0B', delay: 300 },
    { x: 26, y: 22, size: 7, color: '#8B5CF6', delay: 150 },
    { x: -36, y: 6, size: 5, color: '#14B8A6', delay: 250 },
    { x: 38, y: 4, size: 5, color: '#F97316', delay: 350 },
  ]
  return (
    <>
      {/* Network constellation visual */}
      <div style={{ position: 'relative', width: 100, height: 100, animation: 'gentle-float 4s ease-in-out infinite', flexShrink: 0 }}>
        <svg width="120" height="120" viewBox="-50 -40 100 80">
          {/* Connection lines from center */}
          {nodes.slice(1).map((n, i) => (
            <line key={`l${i}`} x1={nodes[0].x} y1={nodes[0].y} x2={n.x} y2={n.y}
              stroke={n.color} strokeWidth="0.5" strokeOpacity="0.3"
              style={{ opacity: 0, animation: `onboard-enter 0.4s ease-out ${n.delay + 200}ms forwards` }}
            />
          ))}
          {/* Nodes */}
          {nodes.map((n, i) => (
            <circle key={`n${i}`} cx={n.x} cy={n.y} r={n.size} fill={n.color}
              fillOpacity={i === 0 ? 1 : 0.85}
              style={{ opacity: 0, animation: `onboard-enter 0.4s ease-out ${n.delay}ms forwards` }}
            />
          ))}
        </svg>
      </div>

      <h2 style={headingStyle}>Bring your people in</h2>
      <p style={bodyStyle}>
        Everyone you need is already one person away. Import your existing contacts so the system can start working for you from day one.
      </p>

      <ActionRow onAction={() => { onComplete(); navigate('/import') }} onBack={onBack} label="Import from CSV" />

      <button type="button" onClick={onNext} className="onboard-btn-secondary" style={secondaryBtnStyle}>
        I'll add people manually
      </button>
    </>
  )
}

function StepTour({ onFinish, onBack }: { onFinish: () => void; onBack: () => void }) {
  const [active, setActive] = useState<string | null>(null)
  const views = [
    { icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', label: 'Pulse', desc: 'Your daily dashboard with equity scores and focus list', detail: 'See who needs attention today, track pod health at a glance, and get nudged toward the relationships that matter most.' },
    { icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2', label: 'Map', desc: 'Visual network graph of all your pods and contacts', detail: 'Explore your network as an orbital map. Tap pods to drill into categories, then into individual contacts.' },
    { icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', label: 'Contacts', desc: 'Browse and manage all your relationship records', detail: 'Search, filter, and sort everyone in your network. View timelines, log interactions, and update details inline.' },
    { icon: 'M2 3h5v18H2zM9.5 6h5v15h-5zM17 9h5v12h-5z', label: 'Pipelines', desc: 'Track deals and opportunities through stages', detail: 'Kanban boards for deals, fundraising rounds, or any multi-stage workflow. Drag contacts between stages.' },
    { icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z', label: 'Projects', desc: 'Group contacts and tasks around shared goals', detail: 'Organize efforts like events or launches. Attach contacts, track progress, and keep everything in one place.' },
  ]
  return (
    <>
      <h2 style={headingStyle}>Your Views</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', textAlign: 'left' }}>
        {views.map((v, i) => {
          const isActive = active === v.label
          return (
            <button
              key={v.label}
              type="button"
              onClick={() => setActive(isActive ? null : v.label)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '10px 16px',
                borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                background: isActive ? 'rgba(37,180,57,0.08)' : 'rgba(0,0,0,0.03)',
                outline: isActive ? '1.5px solid var(--color-brand)' : 'none',
                transition: 'all 0.2s ease',
                opacity: 0, animation: `onboard-enter 0.35s ease-out ${i * 80}ms forwards`,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={v.icon} />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)' }}>{v.label}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{v.desc}</div>
                {isActive && (
                  <div style={{
                    marginTop: 8, padding: '8px 10px', borderRadius: 8,
                    background: 'rgba(37,180,57,0.06)',
                    fontSize: 11, lineHeight: 1.5, color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-sans)',
                    animation: 'onboard-enter 0.25s ease-out',
                  }}>
                    {v.detail}
                  </div>
                )}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 12, transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )
        })}
      </div>
      <ActionRow onAction={onFinish} onBack={onBack} label="Let's Go" />
    </>
  )
}

/* ---------- shared styles ---------- */

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 800,
  color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0,
}

const bodyStyle: React.CSSProperties = {
  fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-sans)', margin: 0, maxWidth: 360,
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '14px 32px', borderRadius: 100, border: 'none',
  background: 'var(--color-brand)', color: '#fff',
  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
  cursor: 'pointer', letterSpacing: '0.01em',
  boxShadow: '0 4px 16px rgba(37,180,57,0.30)',
  transition: 'transform 0.15s, box-shadow 0.15s',
  width: '100%', maxWidth: 280,
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '12px 32px', borderRadius: 100,
  border: '1px solid rgba(0,0,0,0.12)', background: 'transparent',
  color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500,
  fontFamily: 'var(--font-sans)', cursor: 'pointer',
  width: '100%', maxWidth: 280,
}

const linkStyle: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0,
  fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)',
  cursor: 'pointer', fontFamily: 'var(--font-sans)',
  textDecoration: 'underline', textUnderlineOffset: 2,
}
