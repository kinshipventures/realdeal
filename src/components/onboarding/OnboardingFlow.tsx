import { useState } from 'react'
import { useNavigate } from 'react-router'
import { SolidOrb, POD_SHIFT_COLORS } from '../map/SolidOrb'
import type { HexColor } from '../../lib/types'

interface Props {
  onComplete: () => void
}

const STEP_COUNT = 4

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(0)
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
      <div style={{
        width: '100%', maxWidth: 480, padding: '48px 32px 40px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 32, textAlign: 'center',
      }}>
        {step === 0 && <StepWelcome onNext={next} />}
        {step === 1 && <StepPods onNext={next} />}
        {step === 2 && <StepImport onComplete={onComplete} onNext={next} navigate={navigate} />}
        {step === 3 && <StepTour onFinish={onComplete} />}

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i === step ? 'var(--color-brand)' : 'rgba(0,0,0,0.12)',
              transition: 'all 0.25s ease',
            }} />
          ))}
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
      {/* Decorative orb */}
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
      <h1 style={headingStyle}>Welcome to RealDeal</h1>
      <p style={bodyStyle}>
        Your relationship intelligence platform. Track, nurture, and grow your professional network with pods, equity scoring, and smart reminders.
      </p>
      <button type="button" onClick={onNext} style={primaryBtnStyle}>
        Get Started
      </button>
    </>
  )
}

function StepPods({ onNext }: { onNext: () => void }) {
  const pods = [
    { name: 'Talent', color: '#6366F1' },
    { name: 'LPs', color: '#F59E0B' },
    { name: 'Advisors', color: '#EC4899' },
  ]




  return (
    <>
      <h2 style={headingStyle}>Organize with Pods</h2>
      <p style={bodyStyle}>
        Pods are groups for your relationships - like "Talent", "Investors", or "Advisors". Each pod tracks health, cadence, and equity so you know who needs attention.
      </p>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
        {pods.map(p => (
          <div key={p.name} onClick={handleOrbClick} style={{ cursor: 'pointer' }}>
            <SolidOrb size={72} color={p.color as HexColor} shiftColor={(POD_SHIFT_COLORS[p.color] || p.color) as HexColor} glowIntensity="high" className="onboarding-orb">
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{p.name}</span>
            </SolidOrb>
          </div>
        ))}
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
  const views = [
    { icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', label: 'Pulse', desc: 'Your daily dashboard with equity scores and focus list' },
    { icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2', label: 'Map', desc: 'Visual network graph of all your pods and contacts' },
    { icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', label: 'Contacts', desc: 'Browse and manage all your relationship records' },
    { icon: 'M2 3h5v18H2zM9.5 6h5v15h-5zM17 9h5v12h-5z', label: 'Pipelines', desc: 'Track deals and opportunities through stages' },
    { icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z', label: 'Projects', desc: 'Group contacts and tasks around shared goals' },
  ]
  return (
    <>
      <h2 style={headingStyle}>Your Views</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', textAlign: 'left' }}>
        {views.map(v => (
          <div key={v.label} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px',
            borderRadius: 12, background: 'rgba(0,0,0,0.03)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={v.icon} />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)' }}>{v.label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{v.desc}</div>
            </div>
          </div>
        ))}
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
