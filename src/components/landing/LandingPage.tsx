import { useNavigate } from 'react-router'
import { useRef, useEffect, useState, type RefObject } from 'react'
import { setDemoMode } from '@/lib/sampleData'

function useTheme(): 'light' | 'dark' {
  const getTheme = (): 'light' | 'dark' => {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr === 'dark') return 'dark'
    if (attr === 'light') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  const [theme, setTheme] = useState<'light' | 'dark'>(getTheme)
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(getTheme()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onMq = () => setTheme(getTheme())
    mq.addEventListener('change', onMq)
    return () => { obs.disconnect(); mq.removeEventListener('change', onMq) }
  }, [])
  return theme
}
import goopLogo from '@/assets/logos/goop.png'
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
]

const PORTFOLIO_BRANDS = [
  { name: 'goop', logo: goopLogo },
  { name: 'MoonPay', logo: moonpayLogo },
  { name: 'Forerunner', logo: forerunnerLogo },
  { name: 'Wonder', logo: wonderLogo },
]

function getFeatures(svgFg: string, svgFg40: string, svgStroke: string, svgRect: string) { return [
  {
    label: '01',
    title: 'Your whole network, mapped.',
    desc: 'See every relationship as an interactive orb map. Pods, categories, and individual connections organized exactly how you think - not how a database does.',
    visual: (
      <svg viewBox="0 0 480 320" fill="none" style={{ width: '100%', height: 'auto' }}>
        <defs>
          <radialGradient id="f1hub" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3147FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1a6632" stopOpacity="0.7" />
          </radialGradient>
          <radialGradient id="f1p1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3147FF" stopOpacity="0.7" />
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
            <stop offset="0%" stopColor="#3147FF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3147FF" stopOpacity="0" />
          </radialGradient>
          <filter id="f1blur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        {/* ambient glow */}
        <ellipse cx="240" cy="160" rx="120" ry="100" fill="url(#f1glow)" />
        {/* connection lines */}
        <line x1="240" y1="160" x2="120" y2="70" stroke="#3147FF" strokeWidth="1" opacity="0.2" />
        <line x1="240" y1="160" x2="370" y2="80" stroke="#7C3AED" strokeWidth="1" opacity="0.2" />
        <line x1="240" y1="160" x2="380" y2="240" stroke="#0EA5E9" strokeWidth="1" opacity="0.2" />
        <line x1="240" y1="160" x2="100" y2="250" stroke="#EC4899" strokeWidth="1" opacity="0.2" />
        <line x1="240" y1="160" x2="160" y2="270" stroke="#3147FF" strokeWidth="1" opacity="0.12" />
        {/* hub */}
        <circle cx="240" cy="160" r="54" fill="url(#f1hub)" />
        <circle cx="240" cy="160" r="60" stroke="#3147FF" strokeWidth="1.5" opacity="0.3" fill="none" />
        <text x="240" y="154" textAnchor="middle" fill={svgFg} fontSize="11" fontWeight="700" fontFamily="system-ui">My Network</text>
        <text x="240" y="170" textAnchor="middle" fill={svgFg40} fontSize="10" fontFamily="system-ui">Score 84</text>
        {/* pods */}
        <circle cx="120" cy="70" r="34" fill="url(#f1p1)" />
        <circle cx="120" cy="70" r="38" stroke="#3147FF" strokeWidth="1" opacity="0.25" fill="none" />
        <text x="120" y="74" textAnchor="middle" fill={svgFg} fontSize="10" fontWeight="600" fontFamily="system-ui">Family</text>
        <circle cx="370" cy="80" r="28" fill="url(#f1p2)" />
        <text x="370" y="84" textAnchor="middle" fill={svgFg} fontSize="10" fontWeight="600" fontFamily="system-ui">Creatives</text>
        <circle cx="380" cy="240" r="32" fill="url(#f1p3)" />
        <text x="380" y="244" textAnchor="middle" fill={svgFg} fontSize="10" fontWeight="600" fontFamily="system-ui">Founders</text>
        <circle cx="100" cy="250" r="26" fill="url(#f1p4)" />
        <text x="100" y="254" textAnchor="middle" fill={svgFg} fontSize="9" fontWeight="600" fontFamily="system-ui">Friends</text>
        <circle cx="165" cy="275" r="20" fill="url(#f1p1)" opacity="0.7" />
        <text x="165" y="279" textAnchor="middle" fill={svgFg} fontSize="8" fontWeight="600" fontFamily="system-ui">Mentors</text>
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
            <stop offset="0%" stopColor="#3147FF" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#3147FF" stopOpacity="0" />
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
            <text x="32" y={row.y + 5} fill={svgFg40} fontSize="12" fontFamily="system-ui">{row.name}</text>
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
            <stop offset="0%" stopColor="#3147FF" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#3147FF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="240" cy="140" rx="110" ry="90" fill="url(#f3glow)" />
        {[
          { name: 'LPs Pod', cadence: 'Monthly', next: 'Overdue 3d', color: '#f87171', pct: 0.95 },
          { name: 'Founders Pod', cadence: 'Biweekly', next: 'In 4 days', color: '#f59e0b', pct: 0.6 },
          { name: 'Advisors Pod', cadence: 'Quarterly', next: 'In 38 days', color: '#3147FF', pct: 0.12 },
        ].map((row, i) => (
          <g key={i}>
            <rect x="32" y={60 + i * 72} width="416" height="56" rx="12" fill={svgRect} stroke={svgStroke} strokeWidth="1" />
            <text x="52" y={92 + i * 72} fill={svgFg} fontSize="13" fontWeight="600" fontFamily="system-ui">{row.name}</text>
            <text x="52" y={110 + i * 72} fill={svgFg40} fontSize="10" fontFamily="system-ui">{row.cadence}</text>
            <rect x="240" y={82 + i * 72} width="120" height="8" rx="4" fill={svgStroke} />
            <rect x="240" y={82 + i * 72} width={120 * row.pct} height="8" rx="4" fill={row.color} opacity="0.8" />
            <text x="380" y={91 + i * 72} fill={row.color} fontSize="11" fontFamily="system-ui" fontWeight="600">{row.next}</text>
          </g>
        ))}
      </svg>
    ),
  },
] }  // end getFeatures

export function LandingPage() {
  const navigate = useNavigate()
  const [heroRef, heroVisible] = useInView(0.05)
  const [f1Ref, f1Visible] = useInView()
  const [f2Ref, f2Visible] = useInView()
  const [f3Ref, f3Visible] = useInView()
  const [partnersRef, partnersVisible] = useInView()
  const [problemRef, problemVisible] = useInView()
  const [ctaRef, ctaVisible] = useInView()

  const [mouse, setMouse] = useState({ x: 50, y: 30, active: false })
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    const onMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
        active: true,
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const reveal = (visible: boolean, delay = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(28px)',
    transition: `opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
  })

  const theme = useTheme()
  const dark = theme === 'dark'

  const t = {
    bg:        dark ? '#0D0E0F'                    : '#FAF8F4',
    navBg:     dark ? '#0D0E0Fcc'                  : '#FAF8F4cc',
    navBorder: dark ? 'rgba(255,255,255,0.06)'     : 'rgba(0,0,0,0.07)',
    fg:        dark ? '#fff'                       : '#201D1A',
    fg70:      dark ? 'rgba(255,255,255,0.7)'      : 'rgba(0,0,0,0.7)',
    fg50:      dark ? 'rgba(255,255,255,0.5)'      : 'rgba(0,0,0,0.5)',
    fg45:      dark ? 'rgba(255,255,255,0.45)'     : 'rgba(0,0,0,0.45)',
    fg25:      dark ? 'rgba(255,255,255,0.25)'     : 'rgba(0,0,0,0.25)',
    fg08:      dark ? 'rgba(255,255,255,0.08)'     : 'rgba(0,0,0,0.06)',
    fg04:      dark ? 'rgba(255,255,255,0.04)'     : 'rgba(0,0,0,0.03)',
    fg03:      dark ? 'rgba(255,255,255,0.03)'     : 'rgba(0,0,0,0.02)',
    border:    dark ? 'rgba(255,255,255,0.08)'     : 'rgba(0,0,0,0.08)',
    border07:  dark ? 'rgba(255,255,255,0.07)'     : 'rgba(0,0,0,0.07)',
    border06:  dark ? 'rgba(255,255,255,0.06)'     : 'rgba(0,0,0,0.06)',
    border14:  dark ? 'rgba(255,255,255,0.14)'     : 'rgba(0,0,0,0.14)',
    mockupBg:  dark ? '#1A1B1C'                    : '#F0EDE8',
    chromeBg:  dark ? '#111213'                    : '#E8E5E0',
    mockupSvg: dark ? '#0F1210'                    : '#EAE7E2',
    logoFilter:dark ? 'brightness(0) invert(1)'    : 'brightness(0)',
    // SVG text colors (SVG doesn't inherit CSS vars)
    svgFg:     dark ? 'rgba(255,255,255,0.9)'      : 'rgba(0,0,0,0.82)',
    svgFg40:   dark ? 'rgba(255,255,255,0.4)'      : 'rgba(0,0,0,0.4)',
    svgStroke: dark ? 'rgba(255,255,255,0.08)'     : 'rgba(0,0,0,0.08)',
    svgRect:   dark ? 'rgba(255,255,255,0.03)'     : 'rgba(0,0,0,0.03)',
  }

  const FEATURES = getFeatures(t.svgFg, t.svgFg40, t.svgStroke, t.svgRect)
  const featureRefs = [f1Ref, f2Ref, f3Ref]
  const featureVis = [f1Visible, f2Visible, f3Visible]

  return (
    <div style={{ background: t.bg, minHeight: '100vh', fontFamily: 'var(--font-sans)', color: t.fg, position: 'relative', overflow: 'hidden' }}>
      {/* layered aurora gradient - fixed, translucent, non-chromatic */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `
            radial-gradient(900px 600px at 12% 8%, rgba(49, 71, 255, ${dark ? 0.22 : 0.18}) 0%, transparent 60%),
            radial-gradient(800px 520px at 88% 14%, rgba(255, 107, 138, ${dark ? 0.18 : 0.14}) 0%, transparent 60%),
            radial-gradient(1100px 700px at 50% 92%, rgba(237, 235, 255, ${dark ? 0.12 : 0.70}) 0%, transparent 55%)
          `,
          filter: 'blur(40px)',
        }}
      />
      {/* grain overlay for depth */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          opacity: dark ? 0.25 : 0.35,
          mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.2 0 0 0 0 0.2 0 0 0 0 0.3 0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        }}
      />
      {/* mouse-tracked spotlight over the aurora */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `radial-gradient(500px circle at ${mouse.x}% ${mouse.y}%, rgba(49, 71, 255,${dark ? 0.14 : 0.10}) 0%, transparent 65%)`,
          transition: mouse.active ? 'background 0.2s cubic-bezier(0.22,1,0.36,1)' : 'none',
          mixBlendMode: dark ? 'screen' : 'multiply',
        }}
      />
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
          box-shadow: 0 8px 32px rgba(49, 71, 255,0.45) !important;
        }
        .rd-cta-ghost {
          transition: background 0.15s;
        }
        .rd-cta-ghost:hover {
          background: ${t.fg08} !important;
        }
        .rd-nav-btn:focus-visible,
        .rd-cta-primary:focus-visible,
        .rd-cta-ghost:focus-visible,
        .rd-footer-link:focus-visible {
          outline: 2px solid #3147FF;
          outline-offset: 2px;
        }
        .rd-footer-link { transition: color 0.15s; }
        .rd-footer-link:hover { color: ${t.fg} !important; }
        @media (prefers-reduced-motion: reduce) {
          .rd-float-mockup { animation: none !important; }
          .rd-ticker-inner { animation: none !important; }
          * { transition-duration: 0.01ms !important; }
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
        borderBottom: `1px solid ${t.navBorder}`,
        background: t.navBg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="5" fill={t.fg} />
            <circle cx="42" cy="24" r="2.8" fill="#3147FF" />
            <circle cx="33" cy="39.6" r="2.8" fill="#FF6B8A" />
            <circle cx="15" cy="39.6" r="2.8" fill="#F5A623" />
            <circle cx="6"  cy="24" r="2.8" fill="#7E57C2" />
            <circle cx="15" cy="8.4" r="2.8" fill="#E53935" />
            <circle cx="33" cy="8.4" r="2.8" fill="#00BFA5" />
          </svg>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.025em', color: t.fg }}>
            realdeal
          </span>
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="rd-nav-btn"
            onClick={() => navigate('/login')}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: `1px solid ${t.border14}`,
              background: 'transparent', cursor: 'pointer',
              fontSize: 14, fontWeight: 500, color: t.fg70,
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
              background: '#3147FF', color: '#fff', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 4px 20px rgba(49, 71, 255,0.3)',
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
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            fontSize: 12, fontWeight: 500, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: '#3147FF',
            marginBottom: 28,
            ...reveal(heroVisible, 0),
          }}>
            <span style={{ width: 24, height: 1, background: '#3147FF', opacity: 0.5 }} />
            Your relationship pharmacy
            <span style={{ width: 24, height: 1, background: '#3147FF', opacity: 0.5 }} />
          </div>

          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(44px, 6.2vw, 78px)',
            fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.02,
            color: t.fg, margin: '0 auto 40px', maxWidth: 900,
            ...reveal(heroVisible, 0.05),
          }}>
            Your network, remembered.
          </h1>

          <div style={{ maxWidth: 560, margin: '0 auto 52px', textAlign: 'center', ...reveal(heroVisible, 0.1) }}>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(17px, 1.6vw, 20px)',
              fontWeight: 400, letterSpacing: '-0.005em', lineHeight: 1.55,
              color: t.fg, margin: '0 0 14px',
            }}>
              We got obsessed with food as medicine. Sleep as medicine. Movement as medicine.
            </p>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(17px, 1.6vw, 20px)',
              fontWeight: 400, letterSpacing: '-0.005em', lineHeight: 1.55,
              color: t.fg45, margin: '0 0 32px',
              fontStyle: 'italic',
            }}>
              And then we completely forgot about the thing that actually keeps us alive.
            </p>

            <div style={{
              display: 'inline-block',
              borderTop: `1px solid ${t.border14}`,
              borderBottom: `1px solid ${t.border14}`,
              padding: '20px 0',
              maxWidth: 480,
            }}>
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'clamp(16px, 1.5vw, 19px)',
                fontWeight: 500, letterSpacing: '-0.005em', lineHeight: 1.4,
                color: t.fg, margin: '0 0 6px',
              }}>
                Real Deal isn't a network. It's a prescription.
              </p>
              <p style={{
                fontSize: 13, lineHeight: 1.5,
                color: t.fg45, margin: 0,
                letterSpacing: '0.01em',
              }}>
                Curated for your nervous system. Built for your life.
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 72,
            ...reveal(heroVisible, 0.2),
          }}>
            <button
              className="rd-cta-primary"
              onClick={() => navigate('/login?signup=1')}
              style={{
                padding: '14px 36px', borderRadius: 10, border: 'none',
                background: '#3147FF', color: '#fff', cursor: 'pointer',
                fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 24px rgba(49, 71, 255,0.35)',
              }}
            >
              Get Started - Free
            </button>
            <button
              className="rd-cta-ghost"
              onClick={() => { setDemoMode(true); window.location.href = '/pods' }}
              style={{
                padding: '14px 36px', borderRadius: 10,
                border: `1px solid ${t.border14}`,
                background: t.fg04,
                cursor: 'pointer', fontSize: 16, fontWeight: 500,
                color: t.fg70, fontFamily: 'var(--font-sans)',
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
              background: 'radial-gradient(ellipse at 50% 100%, rgba(49, 71, 255,0.2) 0%, transparent 70%)',
              pointerEvents: 'none', zIndex: 0,
              filter: 'blur(20px)',
            }} />
            <div className="rd-float-mockup" style={{
              position: 'relative', zIndex: 1,
              maxWidth: 840, margin: '0 auto',
              borderRadius: 16,
              border: `1px solid ${t.border}`,
              overflow: 'hidden',
              boxShadow: dark ? '0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' : '0 40px 120px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
              background: t.mockupBg,
              animation: 'rd-float 6s ease-in-out infinite',
            }}>
              {/* browser chrome */}
              <div style={{
                height: 40, background: t.chromeBg,
                display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
                borderBottom: `1px solid ${t.border06}`,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57', opacity: 0.8 }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E', opacity: 0.8 }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840', opacity: 0.8 }} />
                <span style={{
                  flex: 1, textAlign: 'center', fontSize: 11,
                  color: t.fg25, fontFamily: 'var(--font-sans)',
                  marginRight: 48,
                }}>
                  RealDeal - Network Map
                </span>
              </div>
              {/* mockup SVG */}
              <svg viewBox="0 0 840 440" fill="none" style={{ display: 'block', width: '100%', background: t.mockupSvg }}>
                <defs>
                  <radialGradient id="heroHubGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#3147FF" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#1a6632" stopOpacity="0.8" />
                  </radialGradient>
                  <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#3147FF" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#3147FF" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="hp1" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#3147FF" stopOpacity="0.8" />
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
                <line x1="420" y1="220" x2="220" y2="100" stroke="#3147FF" strokeWidth="1.5" opacity="0.2" />
                <line x1="420" y1="220" x2="620" y2="100" stroke="#7C3AED" strokeWidth="1.5" opacity="0.2" />
                <line x1="420" y1="220" x2="640" y2="300" stroke="#0EA5E9" strokeWidth="1.5" opacity="0.2" />
                <line x1="420" y1="220" x2="200" y2="330" stroke="#EC4899" strokeWidth="1.5" opacity="0.2" />
                <line x1="420" y1="220" x2="130" y2="220" stroke="#F59E0B" strokeWidth="1.5" opacity="0.15" />
                <line x1="420" y1="220" x2="560" y2="380" stroke="#10B981" strokeWidth="1.5" opacity="0.15" />
                <line x1="420" y1="220" x2="340" y2="390" stroke="#0EA5E9" strokeWidth="1.5" opacity="0.15" />
                <line x1="420" y1="220" x2="490" y2="140" stroke="#7C3AED" strokeWidth="1.5" opacity="0.15" />
                {/* hub */}
                <circle cx="420" cy="220" r="58" fill="url(#heroHubGrad)" />
                <circle cx="420" cy="220" r="64" stroke="#3147FF" strokeWidth="2" opacity="0.25" fill="none" />
                <text x="420" y="215" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="system-ui">My Network</text>
                <text x="420" y="232" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11" fontFamily="system-ui">Score: 81</text>
                {/* pods */}
                <circle cx="220" cy="100" r="38" fill="url(#hp1)" />
                <circle cx="220" cy="100" r="43" stroke="#3147FF" strokeWidth="1.5" strokeDasharray="200 270" strokeLinecap="round" fill="none" opacity="0.4" />
                <text x="220" y="104" textAnchor="middle" fill="white" fontSize="12" fontWeight="600" fontFamily="system-ui">Family</text>
                <circle cx="620" cy="100" r="32" fill="url(#hp2)" />
                <circle cx="620" cy="100" r="37" stroke="#7C3AED" strokeWidth="1.5" strokeDasharray="155 233" strokeLinecap="round" fill="none" opacity="0.4" />
                <text x="620" y="104" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="system-ui">Creatives</text>
                <circle cx="640" cy="300" r="35" fill="url(#hp3)" />
                <text x="640" y="304" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="system-ui">Founders</text>
                <circle cx="200" cy="330" r="30" fill="url(#hp4)" />
                <text x="200" y="334" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="system-ui">Friends</text>
                <circle cx="130" cy="220" r="27" fill="url(#hp5)" />
                <text x="130" y="224" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="system-ui">Investors</text>
                <circle cx="560" cy="380" r="25" fill="url(#hp6)" />
                <text x="560" y="384" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="system-ui">Mentors</text>
                <circle cx="340" cy="390" r="26" fill="url(#hp3)" opacity="0.85" />
                <text x="340" y="388" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" fontFamily="system-ui">Business</text>
                <text x="340" y="399" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" fontFamily="system-ui">Partners</text>
                <circle cx="490" cy="140" r="24" fill="url(#hp2)" opacity="0.85" />
                <text x="490" y="144" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="system-ui">Work</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Logo ticker */}
      <div style={{ padding: '40px 0 56px', overflow: 'hidden' }}>
        <div style={{
          overflow: 'hidden',
          maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}>
          <div className="rd-ticker-inner" style={{
            display: 'flex', alignItems: 'center', gap: 120,
            animation: 'rd-ticker 33s linear infinite', width: 'max-content',
          }}>
            {[...PORTFOLIO_BRANDS, ...PORTFOLIO_BRANDS, ...PORTFOLIO_BRANDS].map((brand, i) => (
              <img
                key={`${brand.name}-${i}`}
                src={brand.logo}
                alt={brand.name}
                loading="lazy"
                width={220}
                height={96}
                style={{
                  height: 96, width: 'auto', objectFit: 'contain',
                  userSelect: 'none', flexShrink: 0,
                  filter: t.logoFilter, opacity: 0.45,
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
              border: `1px solid ${t.border}`,
              borderRadius: 20,
              padding: '20px 28px',
              background: t.fg03,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              minWidth: 280, flex: '1 1 280px', maxWidth: 380,
              ...reveal(partnersVisible, i * 0.08),
            }}>
              {p.photo ? (
                <img src={p.photo} alt={p.name} width={60} height={60} style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${t.fg08}` }} />
              ) : (
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#3147FF', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                  {p.initials}
                </div>
              )}
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: t.fg, marginBottom: 3 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: t.fg45 }}>{p.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Science / evidence band */}
      <section
        style={{
          maxWidth: 1100, margin: '0 auto', padding: '40px 40px 112px',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20, marginBottom: 56, justifyContent: 'center',
        }}>
          <div style={{ flex: 1, maxWidth: 120, height: 1, background: t.border14 }} />
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: t.fg45,
          }}>The science</span>
          <div style={{ flex: 1, maxWidth: 120, height: 1, background: t.border14 }} />
        </div>

        <p style={{
          fontSize: 'clamp(26px, 3.5vw, 40px)',
          fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.25,
          color: t.fg, margin: '0 auto 72px', textAlign: 'center', maxWidth: 720,
          fontFamily: 'var(--font-serif)',
        }}>
          The longest study on happiness ever run found one thing that beats money, fame, or career: <em style={{ color: '#3147FF', fontStyle: 'italic' }}>close relationships</em>.
        </p>

        <div className="rd-stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 48,
          alignItems: 'start',
        }}>
          {[
            { stat: '85+', label: 'Years of research', source: 'Harvard Study of Adult Development, running since 1938' },
            { stat: '#1', label: 'Predictor of a happy life', source: 'Ahead of income, IQ, social class, genes - Dr. Robert Waldinger' },
            { stat: '15', label: 'Cigarettes a day', source: 'Mortality risk of chronic loneliness, per the US Surgeon General (2023)' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'left', borderTop: `1px solid ${t.border14}`, paddingTop: 24 }}>
              <div style={{
                fontFamily: 'var(--font-serif)', fontWeight: 400,
                fontSize: 'clamp(52px, 6vw, 80px)', lineHeight: 1,
                letterSpacing: '-0.03em', color: t.fg, marginBottom: 16,
              }}>
                {s.stat}
              </div>
              <div style={{
                fontSize: 15, fontWeight: 600, color: t.fg,
                marginBottom: 8, letterSpacing: '-0.005em',
              }}>
                {s.label}
              </div>
              <div style={{
                fontSize: 13, lineHeight: 1.55, color: t.fg45,
              }}>
                {s.source}
              </div>
            </div>
          ))}
        </div>
      </section>


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
                  color: '#3147FF', textTransform: 'uppercase', marginBottom: 20,
                }}>
                  {f.label}
                </div>
                <h2 style={{
                  fontSize: 'clamp(28px, 3.5vw, 44px)',
                  fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1,
                  color: t.fg, marginBottom: 20,
                }}>
                  {f.title}
                </h2>
                <p style={{
                  fontSize: 17, lineHeight: 1.65,
                  color: t.fg50, maxWidth: 420,
                }}>
                  {f.desc}
                </p>
              </div>
              {/* visual */}
              <div style={{
                direction: 'ltr',
                borderRadius: 20,
                border: `1px solid ${t.border07}`,
                background: t.fg03,
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
          borderTop: `1px solid ${t.border06}`,
        }}
      >
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(49, 71, 255,0.14) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05,
            color: t.fg, marginBottom: 24,
            ...reveal(ctaVisible),
          }}>
            Invest in your<br />relationships.
          </h2>
          <p style={{
            fontSize: 18, color: t.fg45, marginBottom: 40,
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
                background: '#3147FF', color: '#fff', cursor: 'pointer',
                fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 28px rgba(49, 71, 255,0.35)',
              }}
            >
              Get Started - Free
            </button>
            <button
              className="rd-cta-ghost"
              onClick={() => { setDemoMode(true); window.location.href = '/pods' }}
              style={{
                padding: '16px 44px', borderRadius: 12,
                border: `1px solid ${t.border14}`,
                background: t.fg04,
                cursor: 'pointer', fontSize: 17, fontWeight: 500,
                color: t.fg70, fontFamily: 'var(--font-sans)',
              }}
            >
              Try the Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${t.border}`,
        padding: '32px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 48 48" fill="none" aria-hidden>
            <circle cx="24" cy="24" r="5" fill={t.fg} />
            <circle cx="42" cy="24" r="2.8" fill="#3147FF" />
            <circle cx="33" cy="39.6" r="2.8" fill="#FF6B8A" />
            <circle cx="15" cy="39.6" r="2.8" fill="#F5A623" />
            <circle cx="6"  cy="24" r="2.8" fill="#7E57C2" />
            <circle cx="15" cy="8.4" r="2.8" fill="#E53935" />
            <circle cx="33" cy="8.4" r="2.8" fill="#00BFA5" />
          </svg>
          <span style={{ fontSize: 13, color: t.fg45 }}>
            &copy; {new Date().getFullYear()} RealDeal. All rights reserved.
          </span>
        </span>
        <nav style={{ display: 'flex', gap: 24 }} aria-label="Footer">
          {[
            { label: 'Privacy', href: '/privacy' },
            { label: 'Terms', href: '/terms' },
            { label: 'X / Twitter', href: 'https://x.com' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              className="rd-footer-link"
              style={{ fontSize: 13, color: t.fg45, textDecoration: 'none' }}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </footer>
    </div>
  )
}
