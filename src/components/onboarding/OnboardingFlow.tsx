import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { SolidOrb, POD_SHIFT_COLORS } from '../map/SolidOrb'
import type { HexColor } from '../../lib/types'

interface Props {
  onComplete: () => void
}

const STEP_COUNT = 5

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

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(0)
  const navigate = useNavigate()

  const next = () => {
    if (step < STEP_COUNT - 1) setStep(step + 1)
    else onComplete()
  }
  const back = () => { if (step > 0) setStep(step - 1) }

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
      `}</style>
      <div style={{
        width: '100%', maxWidth: 480, padding: '48px 32px 40px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 32, textAlign: 'center',
      }}>
        <div key={step} style={{ animation: 'onboard-enter 0.3s ease-out', display: 'contents' }}>
          {step === 0 && <StepWelcome onNext={next} />}
          {step === 1 && <StepPhilosophy onNext={next} />}
          {step === 2 && <StepPods onNext={next} />}
          {step === 3 && <StepImport onComplete={onComplete} onNext={next} navigate={navigate} />}
          {step === 4 && <StepTour onFinish={onComplete} />}
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
            {step + 1} of {STEP_COUNT}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <div key={i} style={{
                width: i === step ? 24 : 8, height: 8, borderRadius: 4,
                background: i === step ? 'var(--color-brand)' : i < step ? 'var(--color-brand)' : 'rgba(0,0,0,0.22)',
                opacity: i < step ? 0.4 : 1,
                transition: 'all 0.25s ease',
              }} />
            ))}
          </div>
        </div>

        {/* Back / Skip row */}
        <div style={{ display: 'flex', gap: 24 }}>
          {step > 0 && (
            <button type="button" onClick={back} style={linkStyle}>
              Back
            </button>
          )}
          <button type="button" onClick={onComplete} style={linkStyle}>
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- individual steps ---------- */

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div style={{
        width: 96, height: 96, borderRadius: '50%',
        background: 'linear-gradient(135deg, #25B439, #1A8A2A)',
        boxShadow: '0 8px 32px rgba(37,180,57,0.30)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </div>
      <h1 style={headingStyle}>Feed what feeds you</h1>
      <p style={bodyStyle}>
        RealDeal helps you invest in the relationships that actually matter. Not more contacts - deeper ones.
      </p>
      <button type="button" onClick={onNext} style={primaryBtnStyle}>
        Get Started
      </button>
    </>
  )
}

function StepPhilosophy({ onNext }: { onNext: () => void }) {
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
      <h2 style={headingStyle}>This isn't a CRM</h2>
      <p style={bodyStyle}>
        We track relationship health, not sales pipelines.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', textAlign: 'left' }}>
        {PRINCIPLES.map((p, i) => (
          <div key={p.label} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 16px',
            borderRadius: 10, background: 'rgba(0,0,0,0.03)',
            opacity: 0, animation: `onboard-enter 0.35s ease-out ${i * 80}ms forwards`,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginTop: 2,
              background: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={p.icon} />
              </svg>
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
                {p.label}
              </span>
              <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--color-text-secondary)', lineHeight: 1.4, marginTop: 2 }}>
                {p.stat}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: '60%', height: 1, background: 'rgba(0,0,0,0.08)' }} />

      {/* How scoring works */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
          How scoring works
        </span>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)', margin: 0, maxWidth: 300 }}>
          Every interaction builds equity. Some carry more weight.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
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
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
              Equity
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {INTERACTIONS.map((inter, i) => (
            <div key={inter.label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: i <= animStep ? 1 : 0.3,
              transition: 'opacity 0.4s ease',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: inter.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
                {inter.label}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: inter.color, fontFamily: 'var(--font-sans)' }}>
                +{inter.weight}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button type="button" onClick={onNext} style={primaryBtnStyle}>
        Next
      </button>
    </>
  )
}

function StepPods({ onNext }: { onNext: () => void }) {
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

      <button type="button" onClick={onNext} style={primaryBtnStyle}>
        Next
      </button>
    </>
  )
}

function StepImport({ onComplete, onNext, navigate }: { onComplete: () => void; onNext: () => void; navigate: (path: string) => void }) {
  return (
    <>
      <h2 style={headingStyle}>Import Your Contacts</h2>
      <p style={bodyStyle}>
        Bring your network in. Import contacts from a CSV to get started fast, or add them manually later.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}>
        <button type="button" onClick={() => { onComplete(); navigate('/import') }} style={primaryBtnStyle}>
          Import Contacts
        </button>
        <button type="button" onClick={onNext} style={secondaryBtnStyle}>
          I'll do this later
        </button>
      </div>
    </>
  )
}

function StepTour({ onFinish }: { onFinish: () => void }) {
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
      <button type="button" onClick={onFinish} style={primaryBtnStyle}>
        Let's Go
      </button>
    </>
  )
}

/* ---------- shared styles ---------- */

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700,
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
