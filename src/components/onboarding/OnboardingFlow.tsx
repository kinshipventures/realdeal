import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { SolidOrb, POD_SHIFT_COLORS } from '../map/SolidOrb'
import { useEscape } from '../../lib/escapeStack'
import { supabase } from '@/integrations/supabase/client'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { ImportSourcePicker } from '../import/ImportSourcePicker'
import { parseVCard, vcardToRows, isVCard } from '@/lib/vcardParser'
import { parsePastedData } from '@/lib/pasteParser'
import { PROVIDERS, getProviderKey, setProviderKey } from '@/lib/meeting-sync'
import type { HexColor } from '../../lib/types'

interface Props {
  onComplete: () => void
}

const STEP_COUNT = 4
const STEP_LABELS = ['Welcome', 'Daily rhythm', 'Pods', 'Import']

/* ---------- Seed-to-Tree persistent element ---------- */

// Each step reveals more branches and leaves, growing from a seed dot into a full tree
function SeedTree({ step }: { step: number }) {
  // Tree structure: trunk + branches that appear at each step
  // Step 0: seed dot only
  // Step 1: trunk + first fork
  // Step 2: second-level branches + first leaves
  // Step 3: full tree with all leaves

  const branches: { d: string; step: number; len: number }[] = [
    // Trunk
    { d: 'M60 110 Q60 85 60 70', step: 1, len: 40 },
    // First fork
    { d: 'M60 70 Q50 55 38 48', step: 1, len: 35 },
    { d: 'M60 70 Q70 55 82 48', step: 1, len: 35 },
    // Second level
    { d: 'M60 85 Q45 75 35 72', step: 2, len: 30 },
    { d: 'M60 85 Q75 75 85 72', step: 2, len: 30 },
    // Top branches
    { d: 'M38 48 Q30 38 25 32', step: 3, len: 22 },
    { d: 'M82 48 Q90 38 95 32', step: 3, len: 22 },
    { d: 'M38 48 Q42 35 50 30', step: 3, len: 22 },
    { d: 'M82 48 Q78 35 70 30', step: 3, len: 22 },
  ]

  const leaves: { cx: number; cy: number; r: number; color: string; step: number; delay: number }[] = [
    // Step 2 leaves
    { cx: 35, cy: 72, r: 4, color: '#25B439', step: 2, delay: 300 },
    { cx: 85, cy: 72, r: 4, color: '#6366F1', step: 2, delay: 450 },
    // Step 3 leaves - full bloom
    { cx: 25, cy: 32, r: 5, color: '#EC4899', step: 3, delay: 200 },
    { cx: 95, cy: 32, r: 5, color: '#F59E0B', step: 3, delay: 300 },
    { cx: 50, cy: 30, r: 4.5, color: '#14B8A6', step: 3, delay: 400 },
    { cx: 70, cy: 30, r: 4.5, color: '#8B5CF6', step: 3, delay: 500 },
    { cx: 38, cy: 48, r: 3.5, color: '#25B439', step: 3, delay: 100 },
    { cx: 82, cy: 48, r: 3.5, color: '#F97316', step: 3, delay: 250 },
  ]

  return (
    <div className="onboard-seed-tree" style={{
      position: 'absolute', bottom: 0, right: '4%',
      width: 280, height: 320,
      opacity: step === 0 ? 0.05 : step >= 3 ? 0.14 : 0.10,
      transition: 'opacity 0.8s ease',
      pointerEvents: 'none',
    }}>
      <svg width="360" height="400" viewBox="0 0 120 130" preserveAspectRatio="xMidYMid meet">
        {/* Seed dot - always visible */}
        <circle cx="60" cy="112" r={step === 0 ? 5 : 3.5} fill="#25B439"
          style={{ transition: 'r 0.4s ease' }}
        />

        {/* Ground line */}
        <line x1="40" y1="116" x2="80" y2="116" stroke="var(--edge)" strokeWidth="1" />

        {/* Branches */}
        {branches.filter(b => b.step <= step).map((b, i) => (
          <path
            key={i}
            d={b.d}
            fill="none"
            stroke={step >= 3 ? 'rgba(37,180,57,0.5)' : 'var(--color-text-tertiary)'}
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

const STORAGE_KEY = 'realdeal:onboarding-step'

const CADENCE_PRESETS: Record<string, { accent: string; pulse: string; title: string; description: string }> = {
  weekly: {
    accent: '#6366F1',
    pulse: 'Tight circle',
    title: 'Weekly keeps the inner ring humming.',
    description: 'Best for the people you never want to accidentally lose touch with.',
  },
  biweekly: {
    accent: '#14B8A6',
    pulse: 'Steady beat',
    title: 'Biweekly gives you a healthy nudge.',
    description: 'A great middle ground when the relationship matters but life moves fast.',
  },
  monthly: {
    accent: '#25B439',
    pulse: 'Gentle rhythm',
    title: 'Monthly is the easiest habit to keep.',
    description: 'It keeps important relationships warm without making outreach feel like homework.',
  },
  quarterly: {
    accent: '#F59E0B',
    pulse: 'Light touch',
    title: 'Quarterly works for slower-burn relationships.',
    description: 'Useful for broader circles where a thoughtful check-in still carries weight.',
  },
}

const IMPORT_CONSTELLATION_NODES = [
  { x: 0, y: -52, size: 10, color: '#F43F5E', delay: 120 },
  { x: -62, y: -20, size: 11, color: '#6366F1', delay: 260 },
  { x: 62, y: -10, size: 12, color: '#EC4899', delay: 420 },
  { x: -42, y: 42, size: 10, color: '#F59E0B', delay: 520 },
  { x: 46, y: 40, size: 11, color: '#14B8A6', delay: 680 },
  { x: -14, y: 58, size: 8, color: '#8B5CF6', delay: 780 },
] as const

const IMPORT_LOADING_COPY = {
  loading: [
    'Looking for people already living in your Google contacts.',
    'Checking names, emails, and duplicates before we show you a preview.',
    'Keeping the first import clean so your first dashboard feels useful.',
  ],
  importing: [
    'Saving each contact into your workspace.',
    'Skipping duplicates automatically so you do not have to clean this up twice.',
    'Setting up your first useful people view.',
  ],
} as const


function ImportConstellation({ mode }: { mode: 'idle' | 'loading' | 'done' }) {
  const done = mode === 'done'
  const active = mode === 'loading'
  const centerX = 110
  const centerY = 94

  return (
    <div className="onboard-constellation" aria-hidden style={{
      position: 'relative',
      width: 220,
      height: 188,
      opacity: done ? 1 : 0.96,
      filter: done ? 'saturate(1.05)' : 'none',
    }}>
      <svg width="220" height="188" viewBox="0 0 220 188" style={{ position: 'absolute', inset: 0 }}>
        {IMPORT_CONSTELLATION_NODES.map((node) => (
          <line
            key={`line-${node.x}-${node.y}`}
            x1={centerX}
            y1={centerY}
            x2={centerX + node.x}
            y2={centerY + node.y}
            stroke={done ? 'rgba(37,180,57,0.30)' : 'rgba(0,0,0,0.08)'}
            strokeWidth="1.2"
            strokeDasharray={active ? '3 6' : undefined}
            opacity={active ? 0.9 : 1}
          />
        ))}
      </svg>

      {done && [0, 1].map((index) => (
        <div
          key={`done-ring-${index}`}
          style={{
            position: 'absolute',
            left: centerX - 42,
            top: centerY - 42,
            width: 84,
            height: 84,
            borderRadius: '50%',
            border: '1px solid rgba(37,180,57,0.24)',
            animation: `done-ring 1.6s ease-out ${index * 180}ms infinite`,
          }}
        />
      ))}

      {IMPORT_CONSTELLATION_NODES.map((node) => (
        <div
          key={`node-${node.x}-${node.y}`}
          style={{
            position: 'absolute',
            left: centerX + node.x - node.size / 2,
            top: centerY + node.y - node.size / 2,
            width: node.size,
            height: node.size,
            borderRadius: '50%',
            background: node.color,
            boxShadow: `0 0 0 8px ${node.color}12`,
            animation: `${active ? 'constellation-pulse' : 'gentle-float'} ${active ? '2.4s' : '6s'} ease-in-out ${node.delay}ms infinite`,
          }}
        />
      ))}

      <div style={{
        position: 'absolute',
        left: centerX - 34,
        top: centerY - 34,
        width: 68,
        height: 68,
        borderRadius: '50%',
        background: done
          ? 'linear-gradient(135deg, #25B439, #1A8A2A)'
          : 'linear-gradient(135deg, rgba(52,177,93,0.92), rgba(26,138,42,0.94))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: done
          ? '0 18px 44px rgba(37,180,57,0.28)'
          : '0 16px 38px rgba(37,180,57,0.22)',
        animation: `${done ? 'welcome-pulse 2.8s ease-in-out infinite' : active ? 'onboard-core-pulse 1.8s ease-in-out infinite' : 'welcome-pulse 4.4s ease-in-out infinite'}`,
      }}>
        {done ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 6c2.21 0 4 1.79 4 4 0 1.65-1 3.07-2.43 3.69" />
            <path d="M8 6C5.79 6 4 7.79 4 10c0 1.65 1 3.07 2.43 3.69" />
            <path d="M8 18h8" />
            <path d="M12 6v12" />
          </svg>
        )}
      </div>
    </div>
  )
}

function loadProgress(): { step: number; maxStep: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const { step, maxStep } = JSON.parse(raw)
      if (step >= 0 && step < STEP_COUNT) return { step, maxStep: Math.min(maxStep, STEP_COUNT - 1) }
    }
  } catch {}
  return { step: 0, maxStep: 0 }
}

export function OnboardingFlow({ onComplete }: Props) {
  const saved = loadProgress()
  const [step, setStep] = useState(saved.step)
  const [maxStep, setMaxStep] = useState(saved.maxStep)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [isExiting, setIsExiting] = useState(false)
  const pendingRef = useRef<{ step: number; dir: 'forward' | 'back' } | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, maxStep }))
  }, [step, maxStep])

  const transitionTo = useCallback((target: number, dir: 'forward' | 'back') => {
    if (isExiting) return
    setDirection(dir)
    setIsExiting(true)
    pendingRef.current = { step: target, dir }
    setTimeout(() => {
      const pending = pendingRef.current
      if (pending) {
        pendingRef.current = null
        setStep(pending.step)
        setMaxStep(m => Math.max(m, pending.step))
        setDirection(pending.dir)
      }
      setIsExiting(false)
    }, 180)
  }, [isExiting])

  const next = useCallback(() => {
    if (step < STEP_COUNT - 1) transitionTo(step + 1, 'forward')
    else onComplete()
  }, [step, transitionTo, onComplete])

  const back = useCallback(() => {
    if (step > 0) transitionTo(step - 1, 'back')
  }, [step, transitionTo])

  // Escape to go back (integrates with app-wide escape stack)
  useEscape(back)

  // Arrow keys + Enter to navigate
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); back() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, back])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute',
          top: -140,
          left: -120,
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,180,57,0.16), rgba(37,180,57,0))',
          animation: 'ambient-drift 18s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          top: 80,
          right: -120,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12), rgba(99,102,241,0))',
          animation: 'ambient-drift 20s ease-in-out -6s infinite',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -180,
          left: '36%',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.08), rgba(236,72,153,0))',
          animation: 'ambient-drift 24s ease-in-out -12s infinite',
        }} />
      </div>
      <style>{`
        @keyframes onboard-enter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ambient-drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(20px, -18px, 0) scale(1.06); }
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
        @keyframes constellation-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 8px rgba(255,255,255,0.08); }
          50% { transform: scale(1.22); box-shadow: 0 0 0 10px rgba(255,255,255,0.02); }
        }
        @keyframes onboard-core-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 16px 38px rgba(37,180,57,0.22); }
          50% { transform: scale(1.05); box-shadow: 0 24px 48px rgba(37,180,57,0.30); }
        }
        @keyframes done-ring {
          from { transform: scale(0.82); opacity: 0.72; }
          to { transform: scale(1.68); opacity: 0; }
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
        @keyframes onboard-exit-left {
          to { opacity: 0; transform: translateX(-30px); }
        }
        @keyframes onboard-exit-right {
          to { opacity: 0; transform: translateX(30px); }
        }
        .onboard-btn-primary:hover {
          transform: scale(1.03) !important;
          box-shadow: 0 6px 24px rgba(37,180,57,0.40) !important;
        }
        .onboard-btn-primary:active {
          transform: scale(0.97) !important;
        }
        .onboard-btn-secondary:hover {
          background: var(--tint) !important;
          border-color: var(--edge-strong) !important;
          transform: scale(1.02);
        }
        .onboard-btn-secondary:active {
          transform: scale(0.97) !important;
        }
        .onboard-back-btn:hover {
          transform: scale(1.06);
          box-shadow: 0 6px 20px rgba(37,180,57,0.40);
        }
        .onboard-back-btn:active {
          transform: scale(0.94);
        }
        @media (max-width: 479px) {
          .onboard-topbar { padding: 16px 16px !important; }
          .onboard-progress-label { padding: 5px 10px !important; font-size: 10px !important; }
          .onboard-content { padding: 64px 20px 32px !important; gap: 20px !important; }
          .onboard-welcome-heading { font-size: 28px !important; }
          .onboard-pods-row { gap: 10px !important; }
          .onboard-pod-card { width: 96px !important; padding: 14px 10px 12px !important; }
          .onboard-pod-card .onboarding-orb { transform: scale(0.8); }
          .onboard-cadence-row { flex-wrap: wrap !important; justify-content: center; }
          .onboard-cadence-pill { padding: 6px 12px !important; font-size: 11px !important; }
          .onboard-seed-tree { display: none !important; }
          .onboard-orbital { width: 140px !important; height: 140px !important; }
          .onboard-orbital svg { width: 140px !important; height: 140px !important; }
          .onboard-center-orb { width: 64px !important; height: 64px !important; left: 38px !important; top: 38px !important; }
          .onboard-constellation { transform: scale(0.76); transform-origin: center; margin: -18px 0 -10px; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* Top bar: logo + progress */}
      <div className="onboard-topbar" style={{
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4, borderRadius: 10, padding: 4, background: 'var(--tint)' }}>
          {STEP_LABELS.map((label, i) => {
            const visited = i <= maxStep
            return (
              <button
                key={label}
                type="button"
                disabled={!visited}
                className="onboard-progress-label"
                onClick={() => { if (!visited || i === step) return; transitionTo(i, i > step ? 'forward' : 'back') }}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  fontSize: 11, fontWeight: i === step ? 600 : 400,
                  fontFamily: 'var(--font-sans)', letterSpacing: '0.01em',
                  color: i === step ? '#fff' : visited ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
                  background: i === step ? 'var(--color-brand)' : 'transparent',
                  cursor: visited ? 'pointer' : 'default',
                  opacity: visited ? 1 : 0.5,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: i === step ? '0 8px 18px rgba(37,180,57,0.22)' : 'none',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {visited && i < step && (
                    <span style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.24)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      fontWeight: 700,
                    }}>
                      ✓
                    </span>
                  )}
                  <span>{label}</span>
                </span>
              </button>
            )
          })}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onComplete}
          aria-label="Close onboarding"
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-tertiary)',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--tint)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-tertiary)' }}
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
          </svg>
        </button>
        </div>
      </div>

      {/* Seed-to-tree persistent element */}
      <SeedTree step={step} />
      <div className="onboard-content" style={{
        width: '100%', maxWidth: 480, padding: '80px 32px 40px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 28, textAlign: 'center',
        overflowY: 'auto', maxHeight: '100vh',
      }}>
        <div key={step} style={{
          animation: isExiting
            ? `${direction === 'forward' ? 'onboard-exit-left' : 'onboard-exit-right'} 0.18s cubic-bezier(0.4, 0, 1, 1) forwards`
            : step === 0 && maxStep === 0
              ? 'onboard-enter 0.4s ease-out'
              : `${direction === 'forward' ? 'onboard-slide-left' : 'onboard-slide-right'} 0.3s cubic-bezier(0.25, 1, 0.5, 1)`,
          display: 'contents',
        }}>
          {step === 0 && <StepWelcome onNext={next} />}
          {step === 1 && <StepPhilosophy onNext={next} onBack={back} />}
          {step === 2 && <StepPods onNext={next} onBack={back} />}
          {step === 3 && <StepImport onComplete={onComplete} onBack={back} navigate={navigate} />}
        </div>

        {/* Skip */}
        <button type="button" onClick={onComplete} aria-label="Skip onboarding" style={{
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
        <button type="button" onClick={onBack} aria-label="Go back" className="onboard-back-btn" style={{
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
      <div className="onboard-orbital" style={{ position: 'relative', width: 180, height: 180, opacity: 0, animation: 'onboard-enter 0.6s ease-out 0.1s forwards' }}>
        {/* Orbit rings */}
        <svg width="180" height="180" viewBox="0 0 180 180" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="90" cy="90" r="56" fill="none" stroke="var(--tint)" strokeWidth="1" />
          <circle cx="90" cy="90" r="72" fill="none" stroke="var(--tint)" strokeWidth="1" />
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
        <div className="onboard-center-orb" style={{
          position: 'absolute', left: 90 - 40, top: 90 - 40,
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #25B439, #1A8A2A)',
          animation: 'welcome-pulse 3s ease-in-out infinite',
          willChange: 'transform',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
      </div>

      <h1 className="onboard-welcome-heading" style={{
        ...headingStyle, fontSize: 34, letterSpacing: '-0.03em',
        opacity: 0, animation: 'welcome-heading 0.5s ease-out 0.3s forwards',
      }}>
        Real friends, real deal friends
      </h1>
      <p style={{
        ...bodyStyle, fontSize: 15, lineHeight: 1.7, maxWidth: 340,
        opacity: 0, animation: 'onboard-enter 0.4s ease-out 0.5s forwards',
      }}>
        Import your people, set your rhythm, and RealDeal will show you who needs love before the relationship drifts.
      </p>
      <div style={{
        ...stagger(620),
        width: '100%',
        maxWidth: 360,
        display: 'grid',
        gap: 10,
      }}>
        {[
          'See who needs attention today.',
          'Group people into a few intentional pods.',
          'Start with import now. Tidy later.',
        ].map((item, index) => (
          <div
            key={item}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'var(--tint)',
              border: '1px solid rgba(0,0,0,0.05)',
              opacity: 0,
              animation: `onboard-enter 0.35s ease-out ${700 + (index * 90)}ms forwards`,
              textAlign: 'left',
            }}
          >
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'rgba(37,180,57,0.12)',
              color: 'var(--color-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}>
              {index + 1}
            </div>
            <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-primary)' }}>{item}</span>
          </div>
        ))}
      </div>
      <button type="button" onClick={onNext} className="onboard-btn-primary" style={{
        ...primaryBtnStyle, opacity: 0, animation: 'onboard-enter 0.4s ease-out 1s forwards',
      }}>
        Start setup
      </button>
    </>
  )
}

function StepPhilosophy({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const snapshots = [
    {
      color: '#25B439',
      title: 'Today tells you where to show up',
      text: 'You open the app and immediately see the people who are going cold, so outreach becomes obvious instead of another mental tab.',
    },
    {
      color: '#6366F1',
      title: 'Pods keep context intact',
      text: 'Investors, talent, advisors, friends - each circle has its own rhythm, so you stop treating every relationship the same way.',
    },
    {
      color: '#EC4899',
      title: 'Small check-ins compound',
      text: 'A quick note, text, or coffee logged here keeps your network warm long before you need to make an ask.',
    },
  ]

  return (
    <>
      <h2 style={{ ...headingStyle, ...stagger(0) }}>What this becomes each day</h2>
      <p style={{ ...bodyStyle, ...stagger(60) }}>
        The aha moment is simple: you stop wondering who you forgot, and start acting on a clear signal.
      </p>

      <div style={{ ...stagger(120), display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 440, textAlign: 'left' }}>
        {snapshots.map((snapshot, i) => (
          <div key={snapshot.title} style={{
            display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px',
            borderRadius: 14, background: 'var(--tint)',
            border: `1px solid ${snapshot.color}15`,
            opacity: 0, animation: `onboard-enter 0.35s ease-out ${i * 120}ms forwards`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: snapshot.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{i + 1}</span>
            </div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em' }}>
                {snapshot.title}
              </span>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: 4 }}>
                {snapshot.text}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={stagger(180)}><ActionRow onAction={onNext} onBack={onBack} label="Next" /></div>
    </>
  )
}

function StepPods({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [cadence, setCadence] = useState(() =>
    localStorage.getItem('realdeal:default-cadence') || 'monthly'
  )
  const cadencePreview = CADENCE_PRESETS[cadence] || CADENCE_PRESETS.monthly
  const pods = [
    { name: 'Talent', color: '#6366F1', count: '15 people', emoji: '🎨' },
    { name: 'LPs', color: '#F59E0B', count: '12 people', emoji: '💰' },
    { name: 'Advisors', color: '#EC4899', count: '8 people', emoji: '🧠' },
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
      <h2 style={{ ...headingStyle, ...stagger(0) }}>Organize by circles</h2>
      <p style={{ ...bodyStyle, ...stagger(60) }}>
        Start with 2 to 4 circles that already exist in your head. Keep them small, clear, and easy to maintain.
      </p>

      {/* Pod cards with stagger */}
      <div className="onboard-pods-row" style={{ ...stagger(120), display: 'flex', gap: 16, justifyContent: 'center' }}>
        {pods.map((p, i) => (
          <div
            key={p.name}
            className="onboard-pod-card"
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

      {/* Cadence picker */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
          How often do you want to check in?
        </span>
        <div className="onboard-cadence-row" style={{ display: 'flex', gap: 8 }}>
          {cadenceOptions.map(o => {
            const selected = cadence === o.value
            return (
              <button
                key={o.value}
                type="button"
                className="onboard-cadence-pill"
                onClick={() => handleCadence(o.value)}
                style={{
                  padding: '6px 14px', borderRadius: 100, border: 'none',
                  fontSize: 12, fontWeight: selected ? 600 : 500, fontFamily: 'var(--font-sans)',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  background: selected ? 'var(--color-brand)' : 'var(--tint)',
                  color: selected ? '#fff' : 'var(--color-text-secondary)',
                  boxShadow: selected ? '0 2px 8px rgba(37,180,57,0.30)' : 'none',
                }}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{
        ...stagger(140),
        width: '100%',
        maxWidth: 340,
        padding: '15px 16px',
        borderRadius: 18,
        textAlign: 'left',
        background: `linear-gradient(145deg, ${cadencePreview.accent}16, rgba(255,255,255,0.72))`,
        border: `1px solid ${cadencePreview.accent}24`,
        boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-secondary)',
          }}>
            Selected rhythm
          </span>
          <span style={{
            padding: '4px 8px',
            borderRadius: 999,
            background: `${cadencePreview.accent}18`,
            color: cadencePreview.accent,
            fontSize: 11,
            fontWeight: 700,
          }}>
            {cadencePreview.pulse}
          </span>
        </div>
        <div style={{
          marginTop: 10,
          fontFamily: 'var(--font-serif)',
          fontSize: 19,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
        }}>
          {cadencePreview.title}
        </div>
        <div style={{
          marginTop: 6,
          fontSize: 12,
          lineHeight: 1.6,
          color: 'var(--color-text-secondary)',
        }}>
          {cadencePreview.description}
        </div>
      </div>

      <p style={{ ...bodyStyle, ...stagger(160), maxWidth: 320, fontSize: 12 }}>
        You can rename these later. The important part is giving each group its own cadence now.
      </p>

      <div style={stagger(200)}><ActionRow onAction={onNext} onBack={onBack} label="Next" /></div>
    </>
  )
}

function StepImport({ onComplete, onBack, navigate }: { onComplete: () => void; onBack: () => void; navigate: (path: string) => void }) {
  const { activeWorkspace } = useWorkspace()
  const [googleState, setGoogleState] = useState<'idle' | 'loading' | 'preview' | 'importing' | 'done' | 'error'>('idle')
  const [googleContacts, setGoogleContacts] = useState<any[]>([])
  const [googleResult, setGoogleResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [loadingCopyIndex, setLoadingCopyIndex] = useState(0)

  useEffect(() => {
    if (googleState !== 'loading' && googleState !== 'importing') return
    setLoadingCopyIndex(0)
    const copy = googleState === 'loading' ? IMPORT_LOADING_COPY.loading : IMPORT_LOADING_COPY.importing
    const interval = window.setInterval(() => {
      setLoadingCopyIndex((index) => (index + 1) % copy.length)
    }, 2000)
    return () => window.clearInterval(interval)
  }, [googleState])

  const handleGoogleImport = async () => {
    if (!activeWorkspace) return
    setGoogleState('loading')
    setGoogleError(null)
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-contacts', {
        body: { workspace_id: activeWorkspace.id, dry_run: true },
      })
      if (error) throw new Error(error.message || 'Failed to fetch contacts')
      if (data?.error) throw new Error(data.error)
      setGoogleContacts(data.contacts || [])
      setGoogleState('preview')
    } catch (err: any) {
      setGoogleError(err.message)
      setGoogleState('error')
    }
  }

  const confirmGoogleImport = async () => {
    if (!activeWorkspace) return
    setGoogleState('importing')
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-contacts', {
        body: { workspace_id: activeWorkspace.id, dry_run: false },
      })
      if (error) throw new Error(error.message || 'Import failed')
      if (data?.error) throw new Error(data.error)
      setGoogleResult({ imported: data.imported, skipped: data.skipped })
      setGoogleState('done')
    } catch (err: any) {
      setGoogleError(err.message)
      setGoogleState('error')
    }
  }

  // Google import done state
  if (googleState === 'done' && googleResult) {
    return (
      <>
        <div style={stagger(0)}>
          <ImportConstellation mode="done" />
        </div>
        <h2 style={{ ...headingStyle, ...stagger(100) }}>{googleResult.imported} contacts imported</h2>
        <p style={{ ...bodyStyle, ...stagger(160) }}>
          {googleResult.skipped > 0 ? `${googleResult.skipped} duplicates were skipped. ` : ''}
          Your network is ready. Open your people view and start building the habit.
        </p>
        {googleResult.skipped > 0 && (
          <div style={{
            ...stagger(200),
            padding: '6px 12px',
            borderRadius: 999,
            background: 'rgba(37,180,57,0.08)',
            color: 'var(--color-brand)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            Cleaner than expected
          </div>
        )}
        <div style={stagger(220)}><ActionRow onAction={() => { onComplete(); navigate('/contacts') }} onBack={onBack} label="Open my network" /></div>
      </>
    )
  }

  // Google preview state
  if (googleState === 'preview') {
    return (
      <>
        <h2 style={{ ...headingStyle, ...stagger(0) }}>
          {googleContacts.length} contacts found
        </h2>
        <p style={{ ...bodyStyle, ...stagger(60) }}>
          We'll import these into your workspace. Duplicates (by email) will be skipped automatically.
        </p>

        {/* Preview list */}
        <div style={{
          ...stagger(120), width: '100%', maxWidth: 380, maxHeight: 200, overflowY: 'auto',
          borderRadius: 12, border: '1px solid var(--edge)', background: 'var(--tint)',
          padding: 4,
        }}>
          {googleContacts.slice(0, 20).map((c: any, i: number) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderBottom: i < 19 && i < googleContacts.length - 1 ? '1px solid var(--edge)' : 'none',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: `hsl(${(i * 47) % 360}, 60%, 65%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, color: '#fff',
              }}>
                {c.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                {c.email && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</div>}
              </div>
            </div>
          ))}
          {googleContacts.length > 20 && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
              + {googleContacts.length - 20} more
            </div>
          )}
        </div>

        <div style={stagger(180)}>
          <ActionRow onAction={confirmGoogleImport} onBack={() => setGoogleState('idle')} label={`Import ${googleContacts.length} contacts`} />
        </div>
      </>
    )
  }

  // Loading/importing state
  if (googleState === 'loading' || googleState === 'importing') {
    const loadingTitle = googleState === 'loading' ? 'Finding your people' : 'Bringing your circle in'
    const loadingCopy = googleState === 'loading' ? IMPORT_LOADING_COPY.loading : IMPORT_LOADING_COPY.importing
    return (
      <>
        <div style={stagger(0)}>
          <ImportConstellation mode="loading" />
        </div>
        <h2 style={{ ...headingStyle, ...stagger(80) }}>{loadingTitle}</h2>
        <p style={{ ...bodyStyle, ...stagger(140), maxWidth: 320 }}>
          {loadingCopy[loadingCopyIndex]}
        </p>
        <div style={{
          ...stagger(180),
          padding: '6px 12px',
          borderRadius: 999,
          background: 'var(--tint)',
          color: 'var(--color-text-secondary)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          This usually takes a moment
        </div>
      </>
    )
  }

  // Error state
  if (googleState === 'error') {
    return (
      <>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 style={{ ...headingStyle, fontSize: 20, ...stagger(0) }}>Couldn't connect</h2>
        <p style={{ ...bodyStyle, ...stagger(60), maxWidth: 320 }}>{googleError}</p>
        <div style={{ display: 'flex', gap: 8, ...stagger(120) }}>
          <button type="button" onClick={() => setGoogleState('idle')} className="onboard-btn-secondary" style={secondaryBtnStyle}>Back</button>
          <button type="button" onClick={handleGoogleImport} className="onboard-btn-primary" style={{ ...primaryBtnStyle, width: 'auto' }}>Try again</button>
        </div>
      </>
    )
  }

  // Default idle state - use universal ImportSourcePicker
  return (
    <>
      <div style={stagger(0)}>
        <ImportConstellation mode="idle" />
      </div>
      <h2 style={{ ...headingStyle, ...stagger(0) }}>Get to your first useful view</h2>
      <p style={{ ...bodyStyle, ...stagger(60) }}>
        Import 20 to 50 people now. You can clean up fields and categories later.
      </p>

      <div style={{ ...stagger(120), width: '100%', maxWidth: 400 }}>
        <ImportSourcePicker
          onFileSelected={(file) => {
            // Read file and detect format
            const reader = new FileReader()
            reader.onload = () => {
              const text = reader.result as string
              if (isVCard(text)) {
                const contacts = parseVCard(text)
                if (contacts.length > 0) {
                  const { rows } = vcardToRows(contacts)
                  // Store parsed data and navigate to import
                  sessionStorage.setItem('realdeal:import-data', JSON.stringify({ rows, source: 'vcard' }))
                }
              } else {
                sessionStorage.setItem('realdeal:import-file', file.name)
              }
              onComplete()
              navigate('/import')
            }
            reader.readAsText(file)
          }}
          onPasteSelected={() => { onComplete(); navigate('/import?source=paste') }}
          onGoogleSelected={handleGoogleImport}
          onOutlookSelected={() => { onComplete(); navigate('/import?source=outlook') }}
        />
      </div>

      <div style={{ ...stagger(200), width: '100%', maxWidth: 400 }}>
        <MeetingNotesOnboarding />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, ...stagger(320) }}>
        <button type="button" onClick={() => { onComplete(); navigate('/contacts') }} className="onboard-btn-secondary" style={secondaryBtnStyle}>
          I'll add people one by one
        </button>
        <button type="button" onClick={onComplete} style={{ fontSize: 13, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px' }}>
          Skip for now
        </button>
      </div>
    </>
  )
}

/* ---------- Meeting Notes Onboarding ---------- */

function MeetingNotesOnboarding() {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [keyValue, setKeyValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSave(providerId: string) {
    const provider = PROVIDERS.find(p => p.id === providerId)!
    const trimmed = keyValue.trim()
    if (trimmed && !provider.validate(trimmed)) {
      setError(`Key should start with ${provider.keyPrefix}`)
      return
    }
    setProviderKey(provider, trimmed || null)
    setEditingId(null)
    setKeyValue('')
    setError(null)
  }

  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--edge)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          padding: '10px 14px',
          border: 'none',
          borderBottom: open ? '1px solid var(--edge)' : 'none',
          background: 'var(--tint)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Meeting notes (optional)</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            Connect Granola or other providers later if you want call notes in the timeline.
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          {open ? 'Hide' : 'Connect now'}
        </span>
      </button>
      {open && PROVIDERS.map(provider => {
        const connected = !!getProviderKey(provider)
        const isEditing = editingId === provider.id
        return (
          <div key={provider.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--edge)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{provider.name}</span>
                {connected && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-brand)', background: 'rgba(37,180,57,0.08)', borderRadius: 4, padding: '1px 6px' }}>Connected</span>}
                {provider.comingSoon && !connected && <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Coming soon</span>}
              </div>
              {!provider.comingSoon && !isEditing && (
                <button type="button" onClick={() => { setEditingId(provider.id); setKeyValue(getProviderKey(provider) ?? '') }}
                  style={{ fontSize: 11, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  {connected ? 'Change key' : 'Connect'}
                </button>
              )}
            </div>
            {isEditing && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <input type="password" value={keyValue} onChange={e => setKeyValue(e.target.value)}
                  placeholder={`${provider.keyPrefix}...`}
                  style={{ flex: 1, fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--edge-strong)', background: 'var(--tint)', fontFamily: 'monospace', color: 'var(--color-text-primary)', outline: 'none' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(provider.id) }}
                  autoFocus
                />
                <button type="button" onClick={() => handleSave(provider.id)}
                  style={{ fontSize: 11, fontWeight: 600, padding: '6px 10px', borderRadius: 6, border: 'none', background: 'var(--color-brand)', color: '#fff', cursor: 'pointer' }}>Save</button>
                <button type="button" onClick={() => { setEditingId(null); setError(null) }}
                  style={{ fontSize: 11, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--edge)', background: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer' }}>Cancel</button>
              </div>
            )}
            {isEditing && error && <p style={{ fontSize: 11, color: '#dc2626', margin: '4px 0 0' }}>{error}</p>}
          </div>
        )
      })}
    </div>
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
  border: '1px solid var(--edge-strong)', background: 'transparent',
  color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500,
  fontFamily: 'var(--font-sans)', cursor: 'pointer',
  transition: 'transform 0.15s, background 0.15s, border-color 0.15s',
  width: '100%', maxWidth: 280,
}

const linkStyle: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0,
  fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)',
  cursor: 'pointer', fontFamily: 'var(--font-sans)',
  textDecoration: 'underline', textUnderlineOffset: 2,
}
