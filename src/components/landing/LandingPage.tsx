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
              <svg viewBox="0 0 840 440" fill="none" style={{ display: 'block', width: '100%', background: '#0F1210' }}>
                <defs>
                  <radialGradient id="heroHubGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#25B439" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#1a6632" stopOpacity="0.8" />
                  </radialGradient>
                  <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#25B439" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#25B439" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="hp1" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#25B439" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#1a6632" stopOpacity="0.6" />
                  </radialGradient>
                  <radialGradient id="hp2" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.6" />
                  </radialGradient>
                  <radialGradient id="hp3" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#0369a1" stopOpacity="0.6" />
                  </radialGradient>
                  <radialGradient id="hp4" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#EC4899" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#9d174d" stopOpacity="0.6" />
                  </radialGradient>
                  <radialGradient id="hp5" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#D97706" stopOpacity="0.6" />
                  </radialGradient>
                  <radialGradient id="hp6" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.5" />
                  </radialGradient>
                </defs>
                {/* bg glow */}
                <ellipse cx="420" cy="220" rx="220" ry="160" fill="url(#heroGlow)" />
                {/* lines */}
                <line x1="420" y1="220" x2="220" y2="100" stroke="#25B439" strokeWidth="1.5" opacity="0.2" />
                <line x1="420" y1="220" x2="620" y2="100" stroke="#7C3AED" strokeWidth="1.5" opacity="0.2" />
                <line x1="420" y1="220" x2="640" y2="300" stroke="#0EA5E9" strokeWidth="1.5" opacity="0.2" />
                <line x1="420" y1="220" x2="200" y2="330" stroke="#EC4899" strokeWidth="1.5" opacity="0.2" />
                <line x1="420" y1="220" x2="130" y2="220" stroke="#F59E0B" strokeWidth="1.5" opacity="0.15" />
                <line x1="420" y1="220" x2="560" y2="380" stroke="#10B981" strokeWidth="1.5" opacity="0.15" />
                {/* hub */}
                <circle cx="420" cy="220" r="58" fill="url(#heroHubGrad)" />
                <circle cx="420" cy="220" r="64" stroke="#25B439" strokeWidth="2" opacity="0.25" fill="none" />
                <text x="420" y="215" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="system-ui">RealDeal</text>
                <text x="420" y="232" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11" fontFamily="system-ui">Score: 81</text>
                {/* pods */}
                <circle cx="220" cy="100" r="38" fill="url(#hp1)" />
                <circle cx="220" cy="100" r="43" stroke="#25B439" strokeWidth="1.5" strokeDasharray="200 270" strokeLinecap="round" fill="none" opacity="0.4" />
                <text x="220" y="104" textAnchor="middle" fill="white" fontSize="12" fontWeight="600" fontFamily="system-ui">LPs</text>
                <circle cx="620" cy="100" r="32" fill="url(#hp2)" />
                <circle cx="620" cy="100" r="37" stroke="#7C3AED" strokeWidth="1.5" strokeDasharray="155 233" strokeLinecap="round" fill="none" opacity="0.4" />
                <text x="620" y="104" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="system-ui">Talent</text>
                <circle cx="640" cy="300" r="35" fill="url(#hp3)" />
                <text x="640" y="304" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="system-ui">Founders</text>
                <circle cx="200" cy="330" r="30" fill="url(#hp4)" />
                <text x="200" y="334" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="system-ui">Media</text>
                <circle cx="130" cy="220" r="27" fill="url(#hp5)" />
                <text x="130" y="224" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="system-ui">VCs</text>
                <circle cx="560" cy="380" r="25" fill="url(#hp6)" />
                <text x="560" y="384" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="system-ui">Advisors</text>
              </svg>
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
