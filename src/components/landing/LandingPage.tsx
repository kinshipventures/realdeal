import { useNavigate } from 'react-router'
import { useRef, useEffect, useState, type RefObject } from 'react'
import { setDemoMode } from '@/lib/sampleData'
import goopLogo from '@/assets/logos/goop.png'
import figsLogo from '@/assets/logos/figs.png'
import moonpayLogo from '@/assets/logos/moonpay.png'
import forerunnerLogo from '@/assets/logos/forerunner.png'
import wonderLogo from '@/assets/logos/wonder.png'

function useInView(threshold = 0.12): [RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

const PARTNERS = [
  { name: 'Moj Mahdara', role: 'Co-Founder & Managing Partner', initials: 'MM', photo: 'https://images.squarespace-cdn.com/content/v1/6255af0f455c757ddc06592c/5554cf9e-73fe-48f0-82ca-c3c0da8e0cae/Moj+Mahdara.png' },
  { name: 'Gwyneth Paltrow', role: 'Partner', initials: 'GP', photo: 'https://images.squarespace-cdn.com/content/v1/6255af0f455c757ddc06592c/91232f51-0b9d-4a2a-86d3-e31abd321d08/Gwyneth+Paltrow.png' },
]

const PORTFOLIO_BRANDS = [
  { name: 'goop', logo: goopLogo },
  { name: 'FIGS', logo: figsLogo },
  { name: 'MoonPay', logo: moonpayLogo },
  { name: 'Forerunner', logo: forerunnerLogo },
  { name: 'Wonder', logo: wonderLogo },
]

const FEATURES = [
  {
    label: '01',
    title: 'Your whole network, mapped.',
    desc: 'See every relationship as an interactive orb map. Pods, categories, and individual connections organized exactly how you think - not how a database does.',
    visual: (
      <svg viewBox="0 0 480 320" fill="none" style={{ width: '100%', height: 'auto' }}>
        <defs>
          <radialGradient id="f1hub" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#25B439" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1a6632" stopOpacity="0.7" />
          </radialGradient>
          <radialGradient id="f1p1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#25B439" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#1a6632" stopOpacity="0.5" />
          </radialGradient>
          <radialGradient id="f1p2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.5" />
          </radialGradient>
          <radialGradient id="f1p3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.5" />
          </radialGradient>
          <radialGradient id="f1p4" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EC4899" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#9d174d" stopOpacity="0.5" />
          </radialGradient>
          <radialGradient id="f1glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#25B439" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#25B439" stopOpacity="0" />
          </radialGradient>
          <filter id="f1blur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        {/* ambient glow */}
        <ellipse cx="240" cy="160" rx="120" ry="100" fill="url(#f1glow)" />
        {/* connection lines */}
        <line x1="240" y1="160" x2="120" y2="70" stroke="#25B439" strokeWidth="1" opacity="0.2" />
        <line x1="240" y1="160" x2="370" y2="80" stroke="#7C3AED" strokeWidth="1" opacity="0.2" />
        <line x1="240" y1="160" x2="380" y2="240" stroke="#0EA5E9" strokeWidth="1" opacity="0.2" />
        <line x1="240" y1="160" x2="100" y2="250" stroke="#EC4899" strokeWidth="1" opacity="0.2" />
        <line x1="240" y1="160" x2="160" y2="270" stroke="#25B439" strokeWidth="1" opacity="0.12" />
        {/* hub */}
        <circle cx="240" cy="160" r="54" fill="url(#f1hub)" />
        <circle cx="240" cy="160" r="60" stroke="#25B439" strokeWidth="1.5" opacity="0.3" fill="none" />
        <text x="240" y="154" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="system-ui">Network</text>
        <text x="240" y="170" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10" fontFamily="system-ui">Score 84</text>
        {/* pods */}
        <circle cx="120" cy="70" r="34" fill="url(#f1p1)" />
        <circle cx="120" cy="70" r="38" stroke="#25B439" strokeWidth="1" opacity="0.25" fill="none" />
        <text x="120" y="74" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="system-ui">LPs</text>
        <circle cx="370" cy="80" r="28" fill="url(#f1p2)" />
        <text x="370" y="84" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="system-ui">Talent</text>
        <circle cx="380" cy="240" r="32" fill="url(#f1p3)" />
        <text x="380" y="244" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="system-ui">Founders</text>
        <circle cx="100" cy="250" r="26" fill="url(#f1p4)" />
        <text x="100" y="254" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" fontFamily="system-ui">Media</text>
        <circle cx="165" cy="275" r="20" fill="url(#f1p1)" opacity="0.7" />
        <text x="165" y="279" textAnchor="middle" fill="white" fontSize="8" fontWeight="600" fontFamily="system-ui">VCs</text>
      </svg>
    ),
  },
  {
    label: '02',
    title: 'Equity scoring that keeps you honest.',
    desc: 'Every relationship gets a 0-100 Social Equity score based on recency, frequency, and depth of interactions. Thriving, Steady, Cooling, or Fading - you always know where you stand.',
    visual: (
      <svg viewBox="0 0 480 280" fill="none" style={{ width: '100%', height: 'auto' }}>
        <defs>
          <radialGradient id="f2glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#25B439" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#25B439" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="240" cy="140" rx="100" ry="80" fill="url(#f2glow)" />
        {[
          { name: 'Sarah Chen', score: 92, label: 'Thriving', color: '#25B439', y: 60 },
          { name: 'Marcus Lee', score: 74, label: 'Steady', color: '#60a5fa', y: 120 },
          { name: 'Jenna Park', score: 41, label: 'Cooling', color: '#f59e0b', y: 180 },
          { name: 'David Osei', score: 18, label: 'Fading', color: '#f87171', y: 240 },
        ].map((row, i) => (
          <g key={i}>
            <text x="32" y={row.y + 5} fill="rgba(255,255,255,0.6)" fontSize="12" fontFamily="system-ui">{row.name}</text>
            <rect x="160" y={row.y - 10} width={240 * (row.score / 100)} height="16" rx="8" fill={row.color} opacity="0.25" />
            <rect x="160" y={row.y - 10} width={160 * (row.score / 100)} height="16" rx="8" fill={row.color} opacity="0.7" />
            <text x="410" y={row.y + 5} fill={row.color} fontSize="12" fontWeight="700" fontFamily="system-ui">{row.score}</text>
            <text x="440" y={row.y + 5} fill={row.color} fontSize="10" fontFamily="system-ui" opacity="0.8">{row.label}</text>
          </g>
        ))}
      </svg>
    ),
  },
  {
    label: '03',
    title: 'Never let a relationship slip.',
    desc: 'Set cadences for every pod. RealDeal tracks recency automatically and surfaces who needs attention before you even have to think about it.',
    visual: (
      <svg viewBox="0 0 480 280" fill="none" style={{ width: '100%', height: 'auto' }}>
        <defs>
          <radialGradient id="f3glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#25B439" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#25B439" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="240" cy="140" rx="110" ry="90" fill="url(#f3glow)" />
        {[
          { name: 'LPs Pod', cadence: 'Monthly', next: 'Overdue 3d', color: '#f87171', pct: 0.95 },
          { name: 'Founders Pod', cadence: 'Biweekly', next: 'In 4 days', color: '#f59e0b', pct: 0.6 },
          { name: 'Advisors Pod', cadence: 'Quarterly', next: 'In 38 days', color: '#25B439', pct: 0.12 },
        ].map((row, i) => (
          <g key={i}>
            <rect x="32" y={60 + i * 72} width="416" height="56" rx="12" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x="52" y={92 + i * 72} fill="rgba(255,255,255,0.9)" fontSize="13" fontWeight="600" fontFamily="system-ui">{row.name}</text>
            <text x="52" y={110 + i * 72} fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="system-ui">{row.cadence}</text>
            <rect x="240" y={82 + i * 72} width="120" height="8" rx="4" fill="rgba(255,255,255,0.08)" />
            <rect x="240" y={82 + i * 72} width={120 * row.pct} height="8" rx="4" fill={row.color} opacity="0.8" />
            <text x="380" y={91 + i * 72} fill={row.color} fontSize="11" fontFamily="system-ui" fontWeight="600">{row.next}</text>
          </g>
        ))}
      </svg>
    ),
  },
]

export function LandingPage() {
  const navigate = useNavigate()
  const [heroRef, heroVisible] = useInView(0.05)
  const [f1Ref, f1Visible] = useInView()
  const [f2Ref, f2Visible] = useInView()
  const [f3Ref, f3Visible] = useInView()
  const [partnersRef, partnersVisible] = useInView()
  const [ctaRef, ctaVisible] = useInView()

  const reveal = (visible: boolean, delay = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(28px)',
    transition: `opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
  })

  const BG = '#0D0E0F'
  const featureRefs = [f1Ref, f2Ref, f3Ref]
  const featureVis = [f1Visible, f2Visible, f3Visible]

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: 'var(--font-sans)', color: '#fff' }}>
      <style>{`
        @keyframes rd-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes rd-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes rd-breath {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50%      { transform: scale(1.035); opacity: 1; }
        }
        @keyframes rd-sonar {
          0%   { transform: scale(0.6); opacity: 0.55; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes rd-dash {
          to { stroke-dashoffset: -260; }
        }
        @keyframes rd-pulse-dot {
          0%   { offset-distance: 0%;   opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes rd-twinkle {
          0%, 100% { opacity: 0.15; }
          50%      { opacity: 0.55; }
        }
        .rd-orb-breath { transform-origin: center; transform-box: fill-box; animation: rd-breath 5.5s cubic-bezier(0.45,0,0.55,1) infinite; }
        .rd-sonar      { transform-origin: center; transform-box: fill-box; animation: rd-sonar 3.6s cubic-bezier(0.22,1,0.36,1) infinite; }
        .rd-dash       { animation: rd-dash 6s linear infinite; }
        .rd-twinkle    { animation: rd-twinkle 3.2s ease-in-out infinite; }
        .rd-pulse-dot  { animation: rd-pulse-dot 3.4s cubic-bezier(0.55,0,0.45,1) infinite; }
        .rd-nav-btn {
          transition: opacity 0.15s;
        }
        .rd-nav-btn:hover { opacity: 0.7; }
        .rd-cta-primary {
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .rd-cta-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(52,177,93,0.45) !important;
        }
        .rd-cta-ghost {
          transition: background 0.15s;
        }
        .rd-cta-ghost:hover {
          background: rgba(255,255,255,0.08) !important;
        }
        @media (max-width: 767px) {
          .rd-feature-row {
            grid-template-columns: 1fr !important;
            direction: ltr !important;
            gap: 40px !important;
          }
          .rd-feature-outer {
            padding: 0 24px 80px !important;
          }
        }
      `}</style>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(16px, 3vw, 20px) clamp(16px, 4vw, 40px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: `${BG}cc`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="5" fill="#fff" />
            <circle cx="42" cy="24" r="2.8" fill="#25B439" />
            <circle cx="33" cy="39.6" r="2.8" fill="#FF6B8A" />
            <circle cx="15" cy="39.6" r="2.8" fill="#F5A623" />
            <circle cx="6"  cy="24" r="2.8" fill="#7E57C2" />
            <circle cx="15" cy="8.4" r="2.8" fill="#E53935" />
            <circle cx="33" cy="8.4" r="2.8" fill="#00BFA5" />
          </svg>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.025em', color: '#fff' }}>
            realdeal
          </span>
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="rd-nav-btn"
            onClick={() => navigate('/login')}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'transparent', cursor: 'pointer',
              fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.75)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Sign in
          </button>
          <button
            className="rd-cta-primary"
            onClick={() => navigate('/login?signup=1')}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: '#25B439', color: '#fff', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 4px 20px rgba(52,177,93,0.3)',
            }}
          >
            Get started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section
        ref={heroRef as RefObject<HTMLElement>}
        style={{
          maxWidth: 1200, margin: '0 auto', padding: '96px 40px 80px',
          textAlign: 'center', position: 'relative',
        }}
      >
        {/* ambient light */}
        <div aria-hidden style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 400,
          background: 'radial-gradient(ellipse at 50% 40%, rgba(52,177,93,0.18) 0%, rgba(52,177,93,0.06) 50%, transparent 75%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 100,
            border: '1px solid rgba(52,177,93,0.3)',
            background: 'rgba(52,177,93,0.08)',
            marginBottom: 32,
            ...reveal(heroVisible),
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#25B439' }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.02em' }}>
              Backed by Kinship Ventures
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(44px, 7vw, 88px)',
            fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.0,
            color: '#fff', margin: '0 0 28px',
            ...reveal(heroVisible, 0.05),
          }}>
            Feed what<br />feeds you.
          </h1>

          <p style={{
            fontSize: 'clamp(17px, 2vw, 21px)', lineHeight: 1.6,
            color: 'rgba(255,255,255,0.5)', maxWidth: 520, margin: '0 auto 44px',
            ...reveal(heroVisible, 0.12),
          }}>
            The relationship OS for people who build through connection.
          </p>

          <div style={{
            display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 72,
            ...reveal(heroVisible, 0.2),
          }}>
            <button
              className="rd-cta-primary"
              onClick={() => navigate('/login?signup=1')}
              style={{
                padding: '14px 36px', borderRadius: 10, border: 'none',
                background: '#25B439', color: '#fff', cursor: 'pointer',
                fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 24px rgba(52,177,93,0.35)',
              }}
            >
              Get Started - Free
            </button>
            <button
              className="rd-cta-ghost"
              onClick={() => { setDemoMode(true); window.location.href = '/pods' }}
              style={{
                padding: '14px 36px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.04)',
                cursor: 'pointer', fontSize: 16, fontWeight: 500,
                color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-sans)',
              }}
            >
              Try the Demo
            </button>
          </div>

          {/* Product screenshot / mockup */}
          <div style={{
            position: 'relative',
            ...reveal(heroVisible, 0.28),
          }}>
            {/* glow behind mockup */}
            <div aria-hidden style={{
              position: 'absolute', bottom: -60, left: '50%', transform: 'translateX(-50%)',
              width: '80%', height: 200,
              background: 'radial-gradient(ellipse at 50% 100%, rgba(52,177,93,0.2) 0%, transparent 70%)',
              pointerEvents: 'none', zIndex: 0,
              filter: 'blur(20px)',
            }} />
            <div style={{
              position: 'relative', zIndex: 1,
              maxWidth: 840, margin: '0 auto',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
              boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
              background: '#1A1B1C',
              animation: 'rd-float 6s ease-in-out infinite',
            }}>
              {/* browser chrome */}
              <div style={{
                height: 40, background: '#111213',
                display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57', opacity: 0.8 }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E', opacity: 0.8 }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840', opacity: 0.8 }} />
                <span style={{
                  flex: 1, textAlign: 'center', fontSize: 11,
                  color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-sans)',
                  marginRight: 48,
                }}>
                  RealDeal - Network Map
                </span>
              </div>
              {/* mockup SVG */}
              {(() => {
                const HUB = { x: 420, y: 220 }
                const PODS = [
                  { id: 'lps',      label: 'LPs',       count: 24, x: 215, y: 96,  r: 46, color: '#25B439', shift: '#7CE28D', health: 0.92, state: 'Thriving', ring: '#25B439' },
                  { id: 'talent',   label: 'Talent',    count: 38, x: 625, y: 92,  r: 40, color: '#7C3AED', shift: '#B794F6', health: 0.78, state: 'Steady',   ring: '#A78BFA' },
                  { id: 'founders', label: 'Founders',  count: 52, x: 648, y: 300, r: 44, color: '#0EA5E9', shift: '#7DD3FC', health: 0.88, state: 'Thriving', ring: '#38BDF8' },
                  { id: 'media',    label: 'Media',     count: 17, x: 196, y: 332, r: 36, color: '#EC4899', shift: '#F9A8D4', health: 0.42, state: 'Cooling',  ring: '#F472B6' },
                  { id: 'vcs',      label: 'VCs',       count: 19, x: 112, y: 218, r: 34, color: '#F59E0B', shift: '#FCD34D', health: 0.65, state: 'Steady',   ring: '#FBBF24' },
                  { id: 'advisors', label: 'Advisors',  count: 11, x: 556, y: 386, r: 30, color: '#10B981', shift: '#6EE7B7', health: 0.3,  state: 'Cooling',  ring: '#34D399' },
                ]
                const trim = (x1: number, y1: number, x2: number, y2: number, startPad: number, endPad: number) => {
                  const dx = x2 - x1, dy = y2 - y1
                  const d = Math.hypot(dx, dy)
                  const ux = dx / d, uy = dy / d
                  return { x1: x1 + ux * startPad, y1: y1 + uy * startPad, x2: x2 - ux * endPad, y2: y2 - uy * endPad }
                }
                return (
                <svg viewBox="0 0 840 440" fill="none" style={{ display: 'block', width: '100%', background: 'radial-gradient(ellipse at 50% 45%, #0F1810 0%, #080A09 70%)' }}>
                  <defs>
                    <radialGradient id="heroAtmo" cx="50%" cy="48%" r="55%">
                      <stop offset="0%" stopColor="#25B439" stopOpacity="0.22" />
                      <stop offset="55%" stopColor="#25B439" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#25B439" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="heroHubGrad" cx="35%" cy="30%" r="75%">
                      <stop offset="0%"  stopColor="#9EF2AE" stopOpacity="1" />
                      <stop offset="45%" stopColor="#25B439" stopOpacity="1" />
                      <stop offset="100%" stopColor="#0B4A1C" stopOpacity="1" />
                    </radialGradient>
                    <radialGradient id="heroHubSpec" cx="35%" cy="25%" r="40%">
                      <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                    </radialGradient>
                    {PODS.map(p => (
                      <radialGradient key={`g-${p.id}`} id={`hp-${p.id}`} cx="32%" cy="28%" r="80%">
                        <stop offset="0%"  stopColor={p.shift} stopOpacity="1" />
                        <stop offset="55%" stopColor={p.color} stopOpacity="1" />
                        <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
                      </radialGradient>
                    ))}
                    {PODS.map(p => (
                      <radialGradient key={`s-${p.id}`} id={`hps-${p.id}`} cx="32%" cy="22%" r="40%">
                        <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                      </radialGradient>
                    ))}
                    {PODS.map(p => {
                      const t = trim(HUB.x, HUB.y, p.x, p.y, 68, p.r + 6)
                      return (
                        <linearGradient key={`l-${p.id}`} id={`ln-${p.id}`} gradientUnits="userSpaceOnUse" x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}>
                          <stop offset="0%"  stopColor="#25B439" stopOpacity="0.65" />
                          <stop offset="100%" stopColor={p.color} stopOpacity="0.9" />
                        </linearGradient>
                      )
                    })}
                    <filter id="heroGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="6" />
                    </filter>
                  </defs>

                  {/* atmospheric wash */}
                  <rect x="0" y="0" width="840" height="440" fill="url(#heroAtmo)" />

                  {/* starfield */}
                  {[
                    [64,48],[780,60],[88,378],[760,380],[420,40],[420,410],[150,160],[690,165],
                    [140,280],[700,280],[330,50],[520,48],[330,400],[520,402],[40,220],[800,220],
                  ].map(([x,y], i) => (
                    <circle key={`st-${i}`} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1} fill="#C3F8CE" opacity="0.22" className="rd-twinkle" style={{ animationDelay: `${(i % 5) * 0.4}s` }} />
                  ))}

                  {/* faint orbit rings */}
                  <circle cx={HUB.x} cy={HUB.y} r="128" stroke="#25B439" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 6" fill="none" />
                  <circle cx={HUB.x} cy={HUB.y} r="186" stroke="#25B439" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="2 6" fill="none" />

                  {/* connection lines with travelling pulses */}
                  {PODS.map(p => {
                    const t = trim(HUB.x, HUB.y, p.x, p.y, 68, p.r + 6)
                    const path = `M ${t.x1} ${t.y1} L ${t.x2} ${t.y2}`
                    return (
                      <g key={`edge-${p.id}`}>
                        <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={`url(#ln-${p.id})`} strokeWidth="1.4" strokeLinecap="round" />
                        <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={p.color} strokeWidth="0.8" strokeOpacity="0.35" strokeDasharray="2 10" strokeLinecap="round" className="rd-dash" />
                        <circle r="2.4" fill={p.shift} className="rd-pulse-dot" style={{ offsetPath: `path('${path}')`, animationDelay: `${(PODS.indexOf(p)) * 0.45}s` }}>
                          <animate attributeName="r" values="2;3.2;2" dur="3.4s" repeatCount="indefinite" />
                        </circle>
                      </g>
                    )
                  })}

                  {/* hub sonar */}
                  <circle cx={HUB.x} cy={HUB.y} r="62" stroke="#25B439" strokeWidth="1.5" fill="none" opacity="0.5" className="rd-sonar" />
                  <circle cx={HUB.x} cy={HUB.y} r="62" stroke="#25B439" strokeWidth="1.5" fill="none" opacity="0.4" className="rd-sonar" style={{ animationDelay: '1.2s' }} />
                  <circle cx={HUB.x} cy={HUB.y} r="62" stroke="#25B439" strokeWidth="1.5" fill="none" opacity="0.3" className="rd-sonar" style={{ animationDelay: '2.4s' }} />

                  {/* hub halo */}
                  <circle cx={HUB.x} cy={HUB.y} r="110" fill="#25B439" opacity="0.18" filter="url(#heroGlow)" />

                  {/* hub orb */}
                  <g className="rd-orb-breath">
                    <circle cx={HUB.x} cy={HUB.y} r="62" fill="url(#heroHubGrad)" />
                    <circle cx={HUB.x} cy={HUB.y} r="62" fill="url(#heroHubSpec)" />
                    <circle cx={HUB.x} cy={HUB.y} r="62" stroke="#fff" strokeOpacity="0.14" strokeWidth="1" fill="none" />
                    {/* health ring - full thriving */}
                    <circle cx={HUB.x} cy={HUB.y} r="72" stroke="#25B439" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${0.94 * 2 * Math.PI * 72} ${2 * Math.PI * 72}`} transform={`rotate(-90 ${HUB.x} ${HUB.y})`} fill="none" />
                  </g>

                  {/* hub readout */}
                  <text x={HUB.x} y={HUB.y - 6} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="9" fontWeight="600" letterSpacing="2.5" fontFamily="var(--font-sans)">NETWORK</text>
                  <text x={HUB.x} y={HUB.y + 18} textAnchor="middle" fill="#fff" fontSize="30" fontWeight="800" letterSpacing="-1" fontFamily="var(--font-sans)" fontStyle="italic">81</text>
                  <text x={HUB.x} y={HUB.y + 34} textAnchor="middle" fill="#9EF2AE" fontSize="8" fontWeight="700" letterSpacing="2" fontFamily="var(--font-sans)">THRIVING</text>

                  {/* pods */}
                  {PODS.map((p, i) => {
                    const ringR = p.r + 7
                    const circ = 2 * Math.PI * ringR
                    const labelOffset = p.r + 22
                    const isTopHalf = p.y < HUB.y
                    const labelY = p.y + (isTopHalf ? -labelOffset : labelOffset)
                    return (
                      <g key={p.id}>
                        {/* halo */}
                        <circle cx={p.x} cy={p.y} r={p.r + 26} fill={p.color} opacity="0.14" filter="url(#heroGlow)" />
                        {/* health ring track */}
                        <circle cx={p.x} cy={p.y} r={ringR} stroke="rgba(255,255,255,0.08)" strokeWidth="2" fill="none" />
                        {/* health ring fill */}
                        <circle cx={p.x} cy={p.y} r={ringR} stroke={p.ring} strokeOpacity="0.95" strokeWidth="2.25" strokeLinecap="round" strokeDasharray={`${p.health * circ} ${circ}`} transform={`rotate(-90 ${p.x} ${p.y})`} fill="none" />
                        {/* orb */}
                        <g className="rd-orb-breath" style={{ animationDelay: `${i * 0.35}s` }}>
                          <circle cx={p.x} cy={p.y} r={p.r} fill={`url(#hp-${p.id})`} />
                          <circle cx={p.x} cy={p.y} r={p.r} fill={`url(#hps-${p.id})`} />
                          <circle cx={p.x} cy={p.y} r={p.r} stroke="#fff" strokeOpacity="0.12" strokeWidth="1" fill="none" />
                        </g>
                        {/* count inside */}
                        <text x={p.x} y={p.y + 5} textAnchor="middle" fill="#fff" fontSize={p.r >= 40 ? 20 : 16} fontWeight="800" letterSpacing="-0.5" fontFamily="var(--font-sans)" fontStyle="italic">{p.count}</text>
                        {/* label outside */}
                        <text x={p.x} y={labelY} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" letterSpacing="-0.2" fontFamily="var(--font-sans)">{p.label}</text>
                        <text x={p.x} y={labelY + 13} textAnchor="middle" fill={p.ring} fillOpacity="0.85" fontSize="9" fontWeight="700" letterSpacing="1.5" fontFamily="var(--font-sans)">{p.state.toUpperCase()}</text>
                      </g>
                    )
                  })}
                </svg>
                )
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Logo ticker */}
      <div style={{ padding: '40px 0 56px', overflow: 'hidden' }}>
        <p style={{
          textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 24,
        }}>
          Portfolio companies
        </p>
        <div style={{
          overflow: 'hidden',
          maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 80,
            animation: 'rd-ticker 22s linear infinite', width: 'max-content',
          }}>
            {[...PORTFOLIO_BRANDS, ...PORTFOLIO_BRANDS].map((brand, i) => (
              <img
                key={`${brand.name}-${i}`}
                src={brand.logo}
                alt={brand.name}
                loading="lazy"
                width={120}
                height={36}
                style={{
                  height: 36, width: 'auto', objectFit: 'contain',
                  userSelect: 'none', flexShrink: 0,
                  filter: 'brightness(0) invert(1)', opacity: 0.35,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Partners */}
      <div
        ref={partnersRef as RefObject<HTMLElement>}
        style={{ maxWidth: 900, margin: '0 auto', padding: '0 40px 96px' }}
      >
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap',
          ...reveal(partnersVisible),
        }}>
          {PARTNERS.map((p, i) => (
            <div key={p.name} style={{
              display: 'flex', alignItems: 'center', gap: 18,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '20px 28px',
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              minWidth: 280, flex: '1 1 280px', maxWidth: 380,
              ...reveal(partnersVisible, i * 0.08),
            }}>
              {p.photo ? (
                <img src={p.photo} alt={p.name} width={60} height={60} style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }} />
              ) : (
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#25B439', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                  {p.initials}
                </div>
              )}
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{p.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature sections - editorial alternating */}
      <div className="rd-feature-outer" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 120px' }}>
        {FEATURES.map((f, i) => {
          const featureRef = featureRefs[i]
          const isVisible = featureVis[i]
          const isEven = i % 2 === 0

          return (
            <section
              key={f.label}
              ref={featureRef as RefObject<HTMLElement>}
              className="rd-feature-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 80,
                alignItems: 'center',
                marginBottom: i < FEATURES.length - 1 ? 100 : 0,
                direction: isEven ? 'ltr' : 'rtl',
              }}
            >
              {/* text */}
              <div style={{
                direction: 'ltr',
                ...reveal(isVisible, 0),
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                  color: '#25B439', textTransform: 'uppercase', marginBottom: 20,
                }}>
                  {f.label}
                </div>
                <h2 style={{
                  fontSize: 'clamp(28px, 3.5vw, 44px)',
                  fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1,
                  color: '#fff', marginBottom: 20,
                }}>
                  {f.title}
                </h2>
                <p style={{
                  fontSize: 17, lineHeight: 1.65,
                  color: 'rgba(255,255,255,0.5)', maxWidth: 420,
                }}>
                  {f.desc}
                </p>
              </div>
              {/* visual */}
              <div style={{
                direction: 'ltr',
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.02)',
                padding: '32px 24px',
                ...reveal(isVisible, 0.12),
              }}>
                {f.visual}
              </div>
            </section>
          )
        })}
      </div>

      {/* CTA footer */}
      <section
        ref={ctaRef as RefObject<HTMLElement>}
        style={{
          padding: '100px 40px 120px', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(52,177,93,0.14) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05,
            color: '#fff', marginBottom: 24,
            ...reveal(ctaVisible),
          }}>
            Invest in your<br />relationships.
          </h2>
          <p style={{
            fontSize: 18, color: 'rgba(255,255,255,0.45)', marginBottom: 40,
            ...reveal(ctaVisible, 0.1),
          }}>
            Join RealDeal and start building deeper connections today.
          </p>
          <div style={{
            display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap',
            ...reveal(ctaVisible, 0.2),
          }}>
            <button
              className="rd-cta-primary"
              onClick={() => navigate('/login?signup=1')}
              style={{
                padding: '16px 44px', borderRadius: 12, border: 'none',
                background: '#25B439', color: '#fff', cursor: 'pointer',
                fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 28px rgba(52,177,93,0.35)',
              }}
            >
              Get Started - Free
            </button>
            <button
              className="rd-cta-ghost"
              onClick={() => { setDemoMode(true); window.location.href = '/pods' }}
              style={{
                padding: '16px 44px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.04)',
                cursor: 'pointer', fontSize: 17, fontWeight: 500,
                color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)',
              }}
            >
              Try the Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
