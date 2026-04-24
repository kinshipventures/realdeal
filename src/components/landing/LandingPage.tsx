import { useNavigate } from 'react-router'
import { useRef, useEffect, useState, type RefObject } from 'react'
import { setDemoMode } from '@/lib/sampleData'
import { useWaitlistSubmit } from '@/components/waitlist/useWaitlistSubmit'

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

type PodHealth = 'thriving' | 'steady' | 'cooling' | 'fading'
interface NetworkPod {
  id: string
  label: string
  people: number
  health: PodHealth
  color: string
  x: number
  y: number
  r: number
  icon: 'heart' | 'users' | 'sparkles' | 'compass' | 'trending' | 'briefcase' | 'book' | 'handshake'
}

const NETWORK_PODS: NetworkPod[] = [
  { id: 'friends',   label: 'Friends',           people: 14, health: 'thriving', color: '#25B439', x: 230, y: 420, r: 62, icon: 'users' },
  { id: 'family',    label: 'Family',            people: 12, health: 'thriving', color: '#FF6B8A', x: 260, y: 180, r: 58, icon: 'heart' },
  { id: 'creatives', label: 'Creatives',         people: 8,  health: 'steady',   color: '#7E57C2', x: 680, y: 180, r: 50, icon: 'sparkles' },
  { id: 'founders',  label: 'Founders',          people: 7,  health: 'steady',   color: '#00BFA5', x: 660, y: 380, r: 48, icon: 'compass' },
  { id: 'work',      label: 'Work',              people: 6,  health: 'steady',   color: '#003DA5', x: 500, y: 110, r: 40, icon: 'briefcase' },
  { id: 'investors', label: 'Investors',         people: 5,  health: 'steady',   color: '#F5A623', x: 140, y: 290, r: 42, icon: 'trending' },
  { id: 'biz',       label: 'Partners',          people: 4,  health: 'fading',   color: '#E53935', x: 360, y: 510, r: 36, icon: 'handshake' },
  { id: 'mentors',   label: 'Mentors',           people: 3,  health: 'cooling',  color: '#FF6B8A', x: 790, y: 120, r: 38, icon: 'book' },
]

const HEALTH_SATURATION: Record<PodHealth, number> = {
  thriving: 1,
  steady: 0.92,
  cooling: 0.55,
  fading: 0.4,
}

function PodIcon({ kind, size = 18 }: { kind: NetworkPod['icon']; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (kind) {
    case 'heart':     return <svg {...common}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
    case 'users':     return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    case 'sparkles':  return <svg {...common}><path d="M12 3L9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5z" /></svg>
    case 'compass':   return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z" /></svg>
    case 'trending':  return <svg {...common}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
    case 'briefcase': return <svg {...common}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
    case 'book':      return <svg {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
    case 'handshake': return <svg {...common}><path d="M11 17l2-2 2 2 3-3-2-2-3 3-2-2M5 11l7 7 7-7-7-7z" /></svg>
  }
}

function NetworkMap() {
  const [hovered, setHovered] = useState<string | null>(null)
  const theme = useTheme()
  const isDark = theme === 'dark'
  const fgPrimary = isDark ? '#F0EEEA' : '#201D1A'
  const fgMuted = isDark ? '#9A928A' : '#6F675F'
  const ringStroke = isDark ? '#6B8FD9' : '#003DA5'
  const ringOpacity = isDark ? 0.28 : 0.18
  const W = 900
  const H = 560

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} fill="none" style={{ display: 'block', width: '100%' }}>
        <defs>
          <filter id="nm-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <filter id="nm-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
          <radialGradient id="nm-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isDark ? '#4A5FA8' : '#003DA5'} stopOpacity={isDark ? 0.08 : 0.18} />
            <stop offset="100%" stopColor={isDark ? '#4A5FA8' : '#003DA5'} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nm-cool-wash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isDark ? '#2A3550' : '#EDEBFF'} stopOpacity={isDark ? 0.18 : 0.4} />
            <stop offset="100%" stopColor={isDark ? '#2A3550' : '#EDEBFF'} stopOpacity="0" />
          </radialGradient>
          {NETWORK_PODS.map(p => (
            <radialGradient key={p.id} id={`nm-orb-${p.id}`} cx="38%" cy="32%" r="75%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="30%" stopColor={p.color} stopOpacity="0.35" />
              <stop offset="70%" stopColor={p.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={p.color} stopOpacity="0.08" />
            </radialGradient>
          ))}
          <radialGradient id="nm-orb-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#003DA5" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#003DA5" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* cool ambient wash across the whole canvas */}
        <rect x={0} y={0} width={W} height={H} fill="url(#nm-cool-wash)" />

        {/* Atmospheric halo behind hub */}
        <ellipse cx={450} cy={280} rx={380} ry={260} fill="url(#nm-halo)" filter="url(#nm-blur)" />

        {/* Orbit rings - cadence tiers */}
        <g opacity={ringOpacity} stroke={ringStroke} strokeWidth="0.75" fill="none">
          <circle cx={450} cy={280} r={150} strokeDasharray="2 6" />
          <circle cx={450} cy={280} r={230} strokeDasharray="2 6" />
          <circle cx={450} cy={280} r={310} strokeDasharray="2 6" />
        </g>

        {/* HUB - editorial wordmark, swaps to pod detail on hover */}
        {(() => {
          const hoveredPod = hovered ? NETWORK_PODS.find(x => x.id === hovered) : null
          return (
            <>
              {/* default state */}
              <g style={{ transition: 'opacity 260ms cubic-bezier(0.22,1,0.36,1)', opacity: hoveredPod ? 0 : 1, pointerEvents: 'none' }}>
                <text x={450} y={270} textAnchor="middle" fill={fgPrimary} fontSize="52" fontWeight="700" fontFamily="var(--font-serif), Georgia, serif" letterSpacing="-0.03em">My</text>
                <text x={450} y={322} textAnchor="middle" fill={fgPrimary} fontSize="52" fontWeight="700" fontFamily="var(--font-serif), Georgia, serif" letterSpacing="-0.03em">Network</text>
              </g>
              {/* hover state */}
              <g style={{ transition: 'opacity 260ms cubic-bezier(0.22,1,0.36,1)', opacity: hoveredPod ? 1 : 0, pointerEvents: 'none' }}>
                {hoveredPod && (
                  <>
                    <circle cx={450 - 42} cy={244} r={4} fill={hoveredPod.color} />
                    <text x={450 - 32} y={248} textAnchor="start" fill={fgMuted} fontSize="11" fontFamily="var(--font-sans), system-ui" letterSpacing="0.22em" fontWeight="700">
                      {hoveredPod.health.toUpperCase()}
                    </text>
                    <text x={450} y={308} textAnchor="middle" fill={fgPrimary} fontSize="56" fontWeight="700" fontFamily="var(--font-serif), Georgia, serif" letterSpacing="-0.03em">
                      {hoveredPod.label}
                    </text>
                    <text x={450} y={340} textAnchor="middle" fill={fgMuted} fontSize="13" fontFamily="var(--font-sans), system-ui" letterSpacing="0.04em" fontWeight="500">
                      {hoveredPod.people} {hoveredPod.people === 1 ? 'person' : 'people'}
                    </text>
                  </>
                )}
              </g>
            </>
          )
        })()}

        {/* PODS - translucent glass spheres */}
        {NETWORK_PODS.map(p => {
          const sat = HEALTH_SATURATION[p.health]
          const isHovered = hovered === p.id
          return (
            <g
              key={p.id}
              role="button"
              tabIndex={0}
              aria-label={`${p.label}, ${p.people} people, ${p.health}`}
              style={{ cursor: 'pointer', transition: 'opacity 0.25s ease', outline: 'none' }}
              opacity={sat}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setHovered(h => h === p.id ? null : p.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setHovered(h => h === p.id ? null : p.id)
                } else if (e.key === 'Escape') {
                  setHovered(null)
                }
              }}
            >
              {/* soft cool drop-shadow under orb */}
              <ellipse cx={p.x} cy={p.y + p.r * 0.5} rx={p.r * 0.85} ry={p.r * 0.22} fill="url(#nm-orb-shadow)" filter="url(#nm-soft)" />
              {/* ambient outer glow */}
              <circle cx={p.x} cy={p.y} r={p.r * 1.25} fill={p.color} opacity="0.10" filter="url(#nm-soft)" />
              {/* translucent glass orb */}
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill={`url(#nm-orb-${p.id})`}
                style={{ transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)', transformOrigin: `${p.x}px ${p.y}px`, transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
              />
              {/* thin edge ring - cool shell blue */}
              <circle cx={p.x} cy={p.y} r={p.r} fill="none" stroke={p.color} strokeOpacity="0.35" strokeWidth="0.5" />
              {/* soft inner highlight ellipse (top-left) - glass reflection */}
              <ellipse cx={p.x - p.r * 0.32} cy={p.y - p.r * 0.4} rx={p.r * 0.38} ry={p.r * 0.22} fill="#ffffff" opacity="0.45" filter="url(#nm-soft)" />
              {/* pod name label below orb */}
              <text
                x={p.x}
                y={p.y + p.r + 22}
                textAnchor="middle"
                fill={fgPrimary}
                fontSize="11"
                fontWeight="700"
                fontFamily="var(--font-sans), system-ui"
                letterSpacing="0.16em"
                style={{ pointerEvents: 'none', textTransform: 'uppercase' }}
              >{p.label.toUpperCase()}</text>
              {/* member count sub-label */}
              <text
                x={p.x}
                y={p.y + p.r + 38}
                textAnchor="middle"
                fill={fgMuted}
                fontSize="10"
                fontWeight="500"
                fontFamily="var(--font-sans), system-ui"
                letterSpacing="0.04em"
                style={{ pointerEvents: 'none' }}
              >{p.people} people</text>
            </g>
          )
        })}
      </svg>

    </div>
  )
}

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

const FOUNDER = {
  name: 'Moj Mahdara',
  role: 'Founder & CEO, Kinship Ventures',
  bio: 'Founder of Beautycon. Backing the next generation of consumer platforms.',
  initials: 'MM',
  photo: 'https://images.squarespace-cdn.com/content/v1/6255af0f455c757ddc06592c/5554cf9e-73fe-48f0-82ca-c3c0da8e0cae/Moj+Mahdara.png',
}

type FeatureTheme = {
  fg: string
  fg45: string
  fg50: string
  fg08: string
  border: string
  panelBg: string
  rowBg: string
  dark: boolean
}

function Orb({ size, color, ring }: { size: number; color: string; ring?: string }) {
  return (
    <span style={{
      position: 'relative',
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `radial-gradient(circle at 32% 26%, #fff 0%, rgba(255,255,255,0.55) 38%, ${color}44 70%, ${color} 100%)`,
      boxShadow: ring ? `0 0 0 1.5px ${ring}, 0 1px 3px rgba(0,0,0,0.08)` : '0 1px 3px rgba(0,0,0,0.08)',
      display: 'inline-block',
    }} />
  )
}

function ScoreRing({ score, color, size = 44, stroke = 4, visible = true }: { score: number; color: string; size?: number; stroke?: number; visible?: boolean }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = visible ? (score / 100) * circ : 0
  return (
    <svg width={size} height={size} style={{ flexShrink: 0, display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fill={color} fontSize={size * 0.3} fontWeight="700" fontFamily="var(--font-sans)">{score}</text>
    </svg>
  )
}

function Chip({ label, color, bg }: { label: string; color: string; bg?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 8px', borderRadius: 999,
      fontSize: 10.5, fontWeight: 600, letterSpacing: '0.01em',
      color, background: bg ?? `${color}1a`,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function FocusPanel({ t, visible }: { t: FeatureTheme; visible?: boolean }) {
  const v = visible ?? false
  const red = '#D65A4A'
  const amber = '#D97706'
  const rows = [
    { initials: 'SC', name: 'Sarah Chen', pod: 'Inner Circle', meta: 'Last heard Apr 17', time: 'Overdue 6d',    tier: 'urgent'  as const },
    { initials: 'ML', name: 'Marcus Lee', pod: 'Founders Pod', meta: null,                 time: 'Today',         tier: 'today'   as const },
    { initials: 'JP', name: 'Jenna Park', pod: 'Advisors',     meta: null,                 time: 'in 2 days',     tier: 'later'   as const },
    { initials: 'DO', name: 'David Osei', pod: 'LPs',          meta: null,                 time: 'in 4 days',     tier: 'later'   as const },
  ]
  return (
    <div style={{ background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)' }}>
      <style>{`
        @keyframes rd-fp-urgent-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(214,90,74,0.55); }
          50%      { box-shadow: 0 0 0 5px rgba(214,90,74,0); }
        }
        .rd-fp-row { transition: background 260ms cubic-bezier(0.22,1,0.36,1); }
        .rd-fp-row:hover { background: rgba(0,0,0,0.015); }
        .rd-fp-urgent:hover { background: rgba(214,90,74,0.06) !important; }
        @media (prefers-reduced-motion: reduce) {
          .rd-fp-avatar-urgent { animation: none !important; }
        }
      `}</style>

      {/* header */}
      <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 20, fontWeight: 700, color: t.fg,
          letterSpacing: '-0.02em',
        }}>Today's Focus</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.fg45, textTransform: 'uppercase', letterSpacing: '0.16em' }}>
          4 priorities
        </div>
      </div>

      {/* rows */}
      <div style={{ borderTop: `1px solid ${t.border}` }}>
        {rows.map((r, i) => {
          const isUrgent = r.tier === 'urgent'
          const isToday = r.tier === 'today'
          const timeColor = isUrgent ? red : isToday ? amber : t.fg45
          const timeWeight = r.tier === 'later' ? 500 : 700
          return (
            <div
              key={r.name}
              className={`rd-fp-row ${isUrgent ? 'rd-fp-urgent' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: isUrgent ? '20px 24px' : '16px 24px',
                background: isUrgent ? (t.dark ? 'rgba(214,90,74,0.06)' : 'rgba(214,90,74,0.035)') : 'transparent',
                borderBottom: i < rows.length - 1 ? `1px solid ${t.border}` : 'none',
                opacity: v ? 1 : 0,
                transform: v ? 'translateY(0)' : 'translateY(8px)',
                transition: `opacity 0.45s ease ${0.08 + i * 0.08}s, transform 0.45s cubic-bezier(0.22,1,0.36,1) ${0.08 + i * 0.08}s, background 260ms cubic-bezier(0.22,1,0.36,1)`,
              }}
            >
              {/* initials avatar */}
              <div
                className={isUrgent ? 'rd-fp-avatar-urgent' : undefined}
                style={{
                  width: isUrgent ? 40 : 34, height: isUrgent ? 40 : 34,
                  borderRadius: '50%', flexShrink: 0,
                  background: t.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  border: isUrgent ? `1.5px solid ${red}` : `1px solid ${t.border}`,
                  color: isUrgent ? red : t.fg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-serif)',
                  fontSize: isUrgent ? 14 : 12, fontWeight: 600,
                  letterSpacing: '0.01em',
                  animation: v && isUrgent ? 'rd-fp-urgent-ring 2400ms ease-in-out 1s infinite' : undefined,
                }}
              >{r.initials}</div>

              {/* name + pod + meta */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: isUrgent ? 15 : 14,
                  fontWeight: 600, color: t.fg,
                  letterSpacing: '-0.01em', lineHeight: 1.2,
                }}>{r.name}</div>
                <div style={{
                  fontSize: 11.5, color: t.fg50,
                  marginTop: 2, lineHeight: 1.3,
                }}>
                  {r.pod}{r.meta ? <span style={{ color: t.fg45 }}> - {r.meta}</span> : null}
                </div>
              </div>

              {/* time */}
              <div style={{
                fontSize: isUrgent ? 12 : 11,
                fontWeight: timeWeight,
                color: timeColor,
                letterSpacing: r.tier === 'later' ? '0.005em' : '0.06em',
                textTransform: r.tier === 'later' ? 'none' : 'uppercase',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {r.time}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PodHealthCard({ t, visible }: { t: FeatureTheme; visible?: boolean }) {
  const v = visible ?? false
  const green = '#16A34A'
  const amber = '#D97706'
  const red = '#D65A4A'
  const podScore = 87
  const animatedScore = useCountUp(podScore, v, 900)
  // Spectrum positions: Fading 0-40, Cooling 40-70, Steady 70-85, Thriving 85-100
  const members = [
    { initial: 'S', name: 'Sarah',  score: 42, atRisk: true  },
    { initial: 'M', name: 'Marcus', score: 58, atRisk: false },
    { initial: 'D', name: 'David',  score: 71, atRisk: false },
    { initial: 'J', name: 'Jenna',  score: 84, atRisk: false },
    { initial: 'P', name: 'Priya',  score: 92, atRisk: false },
  ]
  const bands = [
    { label: 'Fading',   from: 0,  to: 40,  color: 'rgba(214,90,74,0.10)',  accent: red   },
    { label: 'Cooling',  from: 40, to: 70,  color: 'rgba(217,119,6,0.10)',  accent: amber },
    { label: 'Steady',   from: 70, to: 85,  color: 'rgba(22,163,74,0.08)',  accent: green },
    { label: 'Thriving', from: 85, to: 100, color: 'rgba(22,163,74,0.18)',  accent: green },
  ]
  return (
    <div style={{ background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)' }}>
      <style>{`
        @keyframes rd-ph-pin-drop {
          0%   { transform: translateX(-50%) translateY(-14px); opacity: 0; }
          60%  { transform: translateX(-50%) translateY(2px);   opacity: 1; }
          100% { transform: translateX(-50%) translateY(0);     opacity: 1; }
        }
        @keyframes rd-ph-member-rise {
          0%   { transform: translateX(-50%) translateY(10px); opacity: 0; }
          100% { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        @keyframes rd-ph-sarah-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(214,90,74,0.55); }
          50%      { box-shadow: 0 0 0 6px rgba(214,90,74,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rd-ph-pin, .rd-ph-member, .rd-ph-sarah { animation: none !important; }
        }
      `}</style>

      {/* header */}
      <div style={{ padding: '20px 24px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.fg45, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Inner Circle</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 600, color: green,
          letterSpacing: '0.02em',
          opacity: v ? 1 : 0, transition: 'opacity 0.5s ease 0.5s',
        }}>
          <span aria-hidden style={{ fontSize: 10 }}>&#9650;</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>+4</span>
          <span style={{ color: t.fg45, fontWeight: 500, marginLeft: 2 }}>this month</span>
        </div>
      </div>

      {/* hero score */}
      <div style={{ padding: '0 24px 20px', display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 64, fontWeight: 700, color: t.fg,
          letterSpacing: '-0.04em', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>{v ? animatedScore : 0}</div>
        <div style={{ fontSize: 11, color: t.fg45, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600, paddingBottom: 4 }}>
          pod average
        </div>
      </div>

      {/* spectrum */}
      <div style={{ padding: '0 24px 12px' }}>
        {/* pod pin above the bar */}
        <div style={{ position: 'relative', height: 26 }}>
          <div
            className="rd-ph-pin"
            style={{
              position: 'absolute',
              left: `${podScore}%`,
              top: 4,
              transform: 'translateX(-50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              animation: v ? 'rd-ph-pin-drop 0.7s cubic-bezier(0.22,1,0.36,1) 0.25s both' : 'none',
              opacity: v ? undefined : 0,
            }}
          >
            <div style={{
              fontSize: 9, fontWeight: 700, color: t.fg,
              textTransform: 'uppercase', letterSpacing: '0.14em',
              marginBottom: 3, whiteSpace: 'nowrap',
            }}>you</div>
            <div style={{
              width: 0, height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: `7px solid ${t.fg}`,
            }} />
          </div>
        </div>

        {/* banded bar */}
        <div style={{
          position: 'relative', height: 10, borderRadius: 6,
          overflow: 'hidden', background: t.fg08,
          display: 'flex',
        }}>
          {bands.map((b) => (
            <div
              key={b.label}
              style={{
                flexBasis: `${b.to - b.from}%`,
                background: b.color,
                transition: 'opacity 0.6s ease',
                opacity: v ? 1 : 0,
              }}
            />
          ))}
          {/* band dividers */}
          {[40, 70, 85].map(x => (
            <div key={x} aria-hidden style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${x}%`, width: 1,
              background: 'rgba(0,0,0,0.06)',
            }} />
          ))}
        </div>

        {/* band labels */}
        <div style={{ position: 'relative', height: 16, marginTop: 6 }}>
          {bands.map((b) => {
            const mid = (b.from + b.to) / 2
            return (
              <div
                key={b.label}
                style={{
                  position: 'absolute',
                  left: `${mid}%`,
                  top: 0,
                  transform: 'translateX(-50%)',
                  fontSize: 9, fontWeight: 600,
                  color: t.fg45,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  whiteSpace: 'nowrap',
                  opacity: v ? 1 : 0,
                  transition: 'opacity 0.5s ease 0.4s',
                }}
              >{b.label}</div>
            )
          })}
        </div>

        {/* member pins below */}
        <div style={{ position: 'relative', height: 46, marginTop: 2 }}>
          {members.map((m, i) => (
            <div
              key={m.name}
              className={m.atRisk ? 'rd-ph-member rd-ph-sarah' : 'rd-ph-member'}
              style={{
                position: 'absolute',
                left: `${m.score}%`,
                top: 0,
                transform: 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                animation: v
                  ? `rd-ph-member-rise 0.5s cubic-bezier(0.22,1,0.36,1) ${0.5 + i * 0.07}s both${m.atRisk ? ', rd-ph-sarah-pulse 2200ms ease-in-out 1.6s infinite' : ''}`
                  : 'none',
                opacity: v ? undefined : 0,
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: m.atRisk ? red : t.fg,
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.02em',
                border: m.atRisk ? `2px solid ${red}` : 'none',
              }}>{m.initial}</div>
              <div style={{
                fontSize: 9, color: m.atRisk ? red : t.fg50,
                fontWeight: m.atRisk ? 700 : 500,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.02em',
              }}>{m.score}</div>
            </div>
          ))}
        </div>
      </div>

      {/* at-risk callout */}
      <div style={{
        margin: '4px 12px 12px',
        padding: '12px 16px',
        borderRadius: 10,
        background: t.dark ? 'rgba(214,90,74,0.08)' : 'rgba(214,90,74,0.06)',
        opacity: v ? 1 : 0,
        transform: v ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.5s ease 0.8s, transform 0.5s cubic-bezier(0.22,1,0.36,1) 0.8s',
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: red,
          textTransform: 'uppercase', letterSpacing: '0.18em',
          marginBottom: 4,
        }}>At risk</div>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 15, fontWeight: 500,
          color: t.fg, letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}>
          Sarah hasn't heard from you in 8 days.
        </div>
      </div>
    </div>
  )
}

function useCountUp(target: number, start: boolean, durationMs: number) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) { setValue(0); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, start, durationMs])
  return value
}

function NeedsAttentionCard({ t, visible }: { t: FeatureTheme; visible?: boolean }) {
  const v = visible ?? false
  const urgentColor = '#D65A4A'
  const overdueCount = useCountUp(2, v, 700)
  const featuredDays = useCountUp(6, v, 1000)
  return (
    <div style={{ background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)' }}>
      <style>{`
        @keyframes rd-urgent-pulse {
          0%   { transform: scale(1); opacity: 0.85; }
          70%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes rd-cta-sheen {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        .rd-na-cta { position: relative; overflow: hidden; transition: transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms cubic-bezier(0.22,1,0.36,1); }
        .rd-na-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(214,90,74,0.28); }
        .rd-na-cta .rd-na-arrow { display: inline-block; transition: transform 220ms cubic-bezier(0.22,1,0.36,1); }
        .rd-na-cta:hover .rd-na-arrow { transform: translateX(3px); }
        .rd-na-footer { transition: background 240ms cubic-bezier(0.22,1,0.36,1); }
        .rd-na-footer:hover { background: rgba(0,0,0,0.02); }
        .rd-na-footer:hover .rd-na-footer-arrow { transform: translateX(3px); }
        .rd-na-footer-arrow { display: inline-block; transition: transform 220ms cubic-bezier(0.22,1,0.36,1); }
        @media (prefers-reduced-motion: reduce) {
          .rd-na-urgent-dot { animation: none !important; }
        }
      `}</style>

      {/* headline - the hero number */}
      <div style={{
        padding: '24px 24px 20px',
        borderBottom: `1px solid ${t.border}`,
        opacity: v ? 1 : 0,
        transform: v ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.fg45, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 10 }}>
          Needs Attention
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontFamily: 'var(--font-serif)', letterSpacing: '-0.03em', lineHeight: 1 }}>
          <span style={{ fontSize: 56, fontWeight: 700, color: urgentColor, fontVariantNumeric: 'tabular-nums' }}>{v ? overdueCount : 0}</span>
          <span style={{ fontSize: 28, fontWeight: 500, color: t.fg }}>pods overdue.</span>
        </div>
      </div>

      {/* featured - one named story */}
      <div style={{
        padding: '20px 24px 20px',
        opacity: v ? 1 : 0,
        transform: v ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.5s ease 0.12s, transform 0.5s cubic-bezier(0.22,1,0.36,1) 0.12s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span aria-hidden style={{ position: 'relative', width: 6, height: 6, display: 'inline-block' }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: urgentColor }} />
            <span className="rd-na-urgent-dot" style={{
              position: 'absolute', inset: 0, borderRadius: '50%', background: urgentColor,
              animation: 'rd-urgent-pulse 1800ms cubic-bezier(0.22,1,0.36,1) 0.8s infinite',
            }} />
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: urgentColor, textTransform: 'uppercase', letterSpacing: '0.18em', fontVariantNumeric: 'tabular-nums' }}>
            Inner Circle - {v ? featuredDays : 0} days overdue
          </span>
        </div>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          fontWeight: 500,
          color: t.fg,
          letterSpacing: '-0.02em',
          lineHeight: 1.25,
          marginBottom: 18,
        }}>
          Sarah hasn't heard from you.
        </div>
        <button
          type="button"
          className="rd-na-cta"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '11px 18px', borderRadius: 999, border: 'none',
            background: urgentColor, color: '#fff', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
            boxShadow: '0 2px 8px rgba(214,90,74,0.22)',
          }}
        >
          Reach out to Sarah <span className="rd-na-arrow">-&gt;</span>
        </button>
      </div>

      {/* footer roll-up */}
      <div
        className="rd-na-footer"
        style={{
          padding: '14px 24px',
          borderTop: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
          opacity: v ? 1 : 0,
          transition: 'opacity 0.5s ease 0.24s, background 240ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div style={{ fontSize: 12, color: t.fg50, letterSpacing: '0.005em' }}>
          <span style={{ color: t.fg, fontWeight: 500 }}>+1 more overdue</span>
          <span style={{ color: t.fg45 }}> - 1 upcoming this week</span>
        </div>
        <span className="rd-na-footer-arrow" style={{ fontSize: 14, color: t.fg45 }}>-&gt;</span>
      </div>
    </div>
  )
}

function getFeatures(t: FeatureTheme, vis: boolean[]) { return [
  {
    label: '01',
    title: 'Your day, prioritized automatically.',
    desc: "RealDeal surfaces the people who need you most today. Weighted by cadence, recency, and pod priority - so you never open the app wondering who to reach out to.",
    visual: <FocusPanel t={t} visible={vis[0]} />,
  },
  {
    label: '02',
    title: 'Equity scoring that keeps you honest.',
    desc: 'Every pod and every relationship gets a 0-100 Social Equity score based on recency, frequency, and depth of interactions. Thriving, Steady, Cooling, or Fading - you always know where you stand.',
    visual: <PodHealthCard t={t} visible={vis[1]} />,
  },
  {
    label: '03',
    title: 'Never let a relationship slip.',
    desc: 'Set cadences for every pod. RealDeal tracks recency automatically and surfaces who needs attention before you even have to think about it.',
    visual: <NeedsAttentionCard t={t} visible={vis[2]} />,
  },
] }  // end getFeatures

function WaitlistForm({ variant, dark }: { variant: 'hero' | 'footer'; dark: boolean }) {
  const { email, setEmail, status, submit } = useWaitlistSubmit()
  const isDone = status === 'done'
  const isLoading = status === 'loading'
  const isExiting = status === 'exiting'
  const inputBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)'
  const inputBorder = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'
  const captionColor = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'
  const textColor = dark ? '#fff' : '#201D1A'
  const maxW = variant === 'hero' ? 460 : 420
  const isFooter = variant === 'footer'

  if (isDone) {
    return (
      <div style={{
        maxWidth: maxW, margin: '0 auto',
        padding: '16px 22px', borderRadius: 14,
        background: 'rgba(0,61,165,0.08)', border: '1px solid rgba(0,61,165,0.22)',
        display: 'flex', alignItems: 'center', gap: 14,
        animation: 'rd-rise 450ms cubic-bezier(0.22,1,0.36,1) both',
      }}>
        <span style={{
          position: 'relative',
          width: 28, height: 28, borderRadius: '50%', background: '#003DA5',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7.2l2.8 2.8L11.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="rd-sparkle" style={{ top: -2, left: -4, ['--dx' as any]: '-14px', ['--dy' as any]: '-12px', animationDelay: '220ms' }} />
          <span className="rd-sparkle" style={{ top: -4, right: -2, ['--dx' as any]: '14px', ['--dy' as any]: '-14px', animationDelay: '320ms', background: '#FF6B8A' }} />
          <span className="rd-sparkle" style={{ bottom: -2, left: -2, ['--dx' as any]: '-14px', ['--dy' as any]: '14px', animationDelay: '420ms', background: '#F5A623' }} />
          <span className="rd-sparkle" style={{ bottom: -4, right: -4, ['--dx' as any]: '16px', ['--dy' as any]: '14px', animationDelay: '520ms' }} />
        </span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 16, color: textColor }}>You're in.</div>
          <div style={{ fontSize: 13, color: captionColor, marginTop: 1 }}>Good company is on the way.</div>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      style={{
        maxWidth: maxW, margin: '0 auto', width: '100%',
        display: 'flex',
        flexDirection: isFooter ? 'column' : 'row',
        gap: isFooter ? 12 : 10,
        flexWrap: isFooter ? 'nowrap' : 'wrap',
        justifyContent: 'center',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'opacity 220ms ease, transform 220ms cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <input
        type="email"
        required
        placeholder="your@email.com"
        aria-label="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rd-waitlist-input"
        style={{
          width: isFooter ? '100%' : undefined,
          flex: isFooter ? undefined : '1 1 220px', minWidth: 0,
          height: 52, padding: '0 18px',
          fontSize: 15, fontFamily: 'inherit',
          color: textColor,
          background: inputBg,
          border: `1px solid ${inputBorder}`,
          borderRadius: 12, outline: 'none',
          transition: 'border-color 180ms ease, box-shadow 180ms ease',
          boxSizing: 'border-box',
          textAlign: isFooter ? 'center' : 'left',
        }}
      />
      <button
        type="submit"
        disabled={isLoading}
        className="rd-cta-primary"
        style={{
          width: isFooter ? '100%' : undefined,
          height: 52, padding: '0 26px',
          fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
          color: '#fff', background: '#003DA5',
          border: 'none', borderRadius: 12,
          cursor: isLoading ? 'default' : 'pointer',
          opacity: isLoading ? 0.85 : 1,
          boxShadow: '0 4px 20px rgba(0,61,165,0.3)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          whiteSpace: 'nowrap',
        }}
      >
        {isLoading ? (
          <span style={{ display: 'inline-flex', gap: 5 }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
                animation: `rd-dot-bounce 600ms ease-in-out ${i * 120}ms infinite alternate`,
              }} />
            ))}
          </span>
        ) : (variant === 'hero' ? 'Get early access' : 'Reserve your spot')}
      </button>
    </form>
  )
}

export function LandingPage() {
  const navigate = useNavigate()
  const [heroRef, heroVisible] = useInView(0.05)
  const [f1Ref, f1Visible] = useInView()
  const [f2Ref, f2Visible] = useInView()
  const [f3Ref, f3Visible] = useInView()
  const [partnersRef, partnersVisible] = useInView()
  const [scienceRef, scienceVisible] = useInView()
  const scienceYears = useCountUp(85, scienceVisible, 1400)
  const scienceCigs = useCountUp(15, scienceVisible, 1000)
  const [problemRef, problemVisible] = useInView()
  const [ctaRef, ctaVisible] = useInView()

  const spotlightRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    let raf = 0
    let pending = { x: 50, y: 30 }
    const apply = () => {
      raf = 0
      const el = spotlightRef.current
      if (el) {
        el.style.setProperty('--mx', pending.x + '%')
        el.style.setProperty('--my', pending.y + '%')
      }
    }
    const onMove = (e: MouseEvent) => {
      pending = {
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      }
      if (!raf) raf = requestAnimationFrame(apply)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    console.log(
      '%c  realdeal  %c\n%cyour people are medicine.%c\n\nlike what you see? we\'re building slowly.\njoin the waitlist: https://realdeal.app',
      'background:#003DA5;color:#fff;font:700 14px/1.8 Georgia,serif;padding:6px 14px;border-radius:4px;',
      '',
      'font-style:italic;color:#003DA5;font-size:12px;',
      'color:#6F675F;font-size:12px;',
    )
  }, [])

  const reveal = (visible: boolean, delay = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(28px)',
    transition: `opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
  })

  const theme = useTheme()
  const dark = theme === 'dark'

  const t = {
    bg:        dark ? '#0D0E0F'                    : '#F7F7F5',
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

  const FEATURES = getFeatures({
    fg: t.fg, fg45: t.fg45, fg50: t.fg50, fg08: t.fg08,
    border: t.border07,
    panelBg: dark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
    rowBg: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
    dark,
  }, [f1Visible, f2Visible, f3Visible])
  const featureRefs = [f1Ref, f2Ref, f3Ref]
  const featureVis = [f1Visible, f2Visible, f3Visible]

  return (
    <div style={{ background: t.bg, minHeight: '100vh', fontFamily: 'var(--font-sans)', color: t.fg, position: 'relative', overflow: 'hidden' }}>
      <a href="#features" className="rd-skip-link" onClick={(e) => { e.preventDefault(); const el = document.getElementById('features'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); (el as HTMLElement | null)?.focus?.(); }}>Skip to content</a>
      {/* layered aurora gradient - fixed, translucent, non-chromatic */}
      <div
        aria-hidden
        className="rd-aurora"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          display: dark ? 'none' : 'block',
          background: `
            radial-gradient(900px 600px at 12% 8%, rgba(0, 61, 165, 0.18) 0%, transparent 60%),
            radial-gradient(800px 520px at 88% 14%, rgba(255, 107, 138, 0.14) 0%, transparent 60%),
            radial-gradient(1100px 700px at 50% 92%, rgba(237, 235, 255, 0.70) 0%, transparent 55%)
          `,
          filter: 'blur(40px)',
        }}
      />
      {/* grain overlay for depth */}
      <div
        aria-hidden
        className="rd-grain"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          display: dark ? 'none' : 'block',
          opacity: 0.35,
          mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.2 0 0 0 0 0.2 0 0 0 0 0.3 0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        }}
      />
      {/* mouse-tracked ambient wash - two reactive layers that shift the whole background */}
      <div
        ref={spotlightRef}
        aria-hidden
        className="rd-spotlight"
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          ['--mx' as any]: '50%',
          ['--my' as any]: '30%',
          ['--imx' as any]: 'calc(100% - var(--mx))',
          ['--imy' as any]: 'calc(100% - var(--my))',
          background: `
            radial-gradient(1600px circle at var(--mx) var(--my), rgba(0, 61, 165, ${dark ? 0.05 : 0.07}) 0%, transparent 60%),
            radial-gradient(1400px circle at var(--imx) var(--imy), rgba(255, 107, 138, ${dark ? 0.04 : 0.06}) 0%, transparent 60%)
          `,
          mixBlendMode: dark ? 'screen' : 'multiply',
          transition: 'background 800ms cubic-bezier(0.22,1,0.36,1)',
        }}
      />
      <style>{`
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
          box-shadow: 0 8px 32px rgba(0, 61, 165,0.45) !important;
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
          outline: 2px solid #003DA5;
          outline-offset: 2px;
        }
        .rd-footer-link { transition: color 0.15s; }
        .rd-footer-link:hover { color: ${t.fg} !important; }
        .rd-portfolio-logo { transition: opacity 240ms cubic-bezier(0.22,1,0.36,1), transform 240ms cubic-bezier(0.22,1,0.36,1); }
        .rd-portfolio-logo:hover { opacity: 1 !important; transform: translateY(-4px); }
        .rd-nav-link { transition: color 160ms ease; border-radius: 4px; padding: 4px 2px; }
        .rd-nav-link:focus-visible { outline: 2px solid #003DA5; outline-offset: 3px; }
        .rd-waitlist-input { transition: border-color 180ms ease, box-shadow 180ms ease; }
        .rd-waitlist-input:focus-visible { border-color: #003DA5 !important; box-shadow: 0 0 0 3px rgba(0,61,165,0.18); outline: none; }
        .rd-skip-link {
          position: absolute; top: 8px; left: 8px; z-index: 100;
          padding: 8px 14px; border-radius: 8px;
          background: #003DA5; color: #fff; font-size: 13px; font-weight: 600;
          text-decoration: none;
          transform: translateY(-200%);
          transition: transform 180ms ease;
        }
        .rd-skip-link:focus-visible { transform: translateY(0); outline: 2px solid #fff; outline-offset: 2px; }
        @keyframes rd-brand-orbit {
          0%, 100% { transform: rotate(0deg); }
          50%      { transform: rotate(12deg); }
        }
        .rd-brand svg { transition: transform 340ms cubic-bezier(0.22,1,0.36,1); transform-origin: 50% 50%; }
        .rd-brand:hover svg { animation: rd-brand-orbit 1400ms cubic-bezier(0.45,0,0.55,1) infinite; }
        @keyframes rd-sparkle {
          0%   { transform: scale(0) translate(0, 0); opacity: 0; }
          50%  { transform: scale(1) translate(var(--dx, 0), var(--dy, 0)); opacity: 1; }
          100% { transform: scale(0) translate(calc(var(--dx, 0) * 1.4), calc(var(--dy, 0) * 1.4)); opacity: 0; }
        }
        .rd-sparkle {
          position: absolute; width: 5px; height: 5px; border-radius: 50%;
          background: #003DA5; pointer-events: none;
          animation: rd-sparkle 1100ms cubic-bezier(0.22,1,0.36,1) 180ms forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .rd-float-mockup { animation: none !important; }
          * { transition-duration: 0.01ms !important; }
        }
        @media (max-width: 767px) {
          .rd-feature-row {
            grid-template-columns: 1fr !important;
            direction: ltr !important;
            gap: 40px !important;
          }
          .rd-feature-outer {
            padding: 48px 20px 64px !important;
          }
          .rd-portfolio-logo {
            height: 48px !important;
          }
          .rd-nav-anchors { display: none !important; }
          .rd-hero-section {
            padding: 64px 20px 64px !important;
          }
          .rd-science-section {
            padding: 48px 20px 64px !important;
          }
          .rd-team-section {
            padding: 48px 20px 64px !important;
          }
          .rd-cta-section {
            padding: 64px 20px 80px !important;
          }
          .rd-moj-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 18px !important;
          }
          .rd-portfolio-row {
            gap: 20px !important;
          }
          .rd-stats-grid {
            gap: 32px !important;
          }
          .rd-aurora, .rd-grain, .rd-spotlight {
            display: none !important;
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
        <a href="#top" className="rd-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="5" fill={t.fg} />
            <circle cx="42" cy="24" r="2.8" fill="#003DA5" />
            <circle cx="33" cy="39.6" r="2.8" fill="#FF6B8A" />
            <circle cx="15" cy="39.6" r="2.8" fill="#F5A623" />
            <circle cx="6"  cy="24" r="2.8" fill="#7E57C2" />
            <circle cx="15" cy="8.4" r="2.8" fill="#E53935" />
            <circle cx="33" cy="8.4" r="2.8" fill="#00BFA5" />
          </svg>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.025em', color: t.fg }}>
            realdeal
          </span>
        </a>
        <div className="rd-nav-anchors" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {[
            { label: 'Product', href: '#features' },
            { label: 'Science', href: '#science' },
            { label: 'Team',    href: '#team' },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              className="rd-nav-link"
              onClick={(e) => {
                e.preventDefault()
                const el = document.querySelector(link.href)
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              style={{
                fontSize: 13, fontWeight: 500, color: t.fg50,
                textDecoration: 'none', letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = t.fg }}
              onMouseLeave={(e) => { e.currentTarget.style.color = t.fg50 }}
            >{link.label}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="rd-cta-primary"
            onClick={() => navigate('/login')}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: '#003DA5', color: '#fff', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 4px 20px rgba(0, 61, 165,0.3)',
            }}
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section
        ref={heroRef as RefObject<HTMLElement>}
        className="rd-hero-section"
        style={{
          maxWidth: 1200, margin: '0 auto', padding: '96px 40px 96px',
          textAlign: 'center', position: 'relative',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(44px, 6.2vw, 78px)',
            fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.02,
            color: t.fg, margin: '0 auto 32px', maxWidth: 900,
            ...reveal(heroVisible, 0),
          }}>
            Your network, remembered.
          </h1>

          <div style={{ maxWidth: 600, margin: '0 auto 56px', textAlign: 'center', ...reveal(heroVisible, 0.1) }}>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(17px, 1.45vw, 20px)',
              fontWeight: 400, letterSpacing: '-0.005em', lineHeight: 1.55,
              color: t.fg, margin: '0 0 14px',
            }}>
              We are obsessed with food as medicine.<br />Sleep as medicine.<br />Movement as medicine.
            </p>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(17px, 1.45vw, 20px)',
              fontWeight: 400, letterSpacing: '-0.005em', lineHeight: 1.55,
              color: t.fg, margin: '0 0 24px',
            }}>
              We need to remember that <em style={{ fontStyle: 'italic', color: '#003DA5' }}>your people are also medicine</em>.
            </p>

            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(17px, 1.45vw, 20px)',
              fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.005em', lineHeight: 1.55,
              color: '#003DA5', margin: 0,
            }}>
              Real Deal isn't a CRM or a network,<br />it's your relationship pharmacy.
            </p>
          </div>

          {/* Inline waitlist capture */}
          <div style={{ marginBottom: 72, ...reveal(heroVisible, 0.18) }}>
            <WaitlistForm variant="hero" dark={dark} />
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
              background: 'radial-gradient(ellipse at 50% 100%, rgba(0, 61, 165,0.2) 0%, transparent 70%)',
              pointerEvents: 'none', zIndex: 0,
              filter: 'blur(20px)',
            }} />
            <div className="rd-float-mockup" style={{
              position: 'relative', zIndex: 1,
              maxWidth: 900, margin: '0 auto',
              animation: 'rd-float 8s ease-in-out infinite',
            }}>
              <NetworkMap />
            </div>
          </div>
        </div>
      </section>

      {/* Feature sections - editorial alternating */}
      <div id="features" className="rd-feature-outer" style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 40px 96px', scrollMarginTop: 80 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.24em',
          textTransform: 'uppercase', color: t.fg45,
          textAlign: 'center', marginBottom: 56,
        }}>
          How it works
        </div>
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
                  color: '#003DA5', textTransform: 'uppercase', marginBottom: 20,
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

      {/* Science / evidence band */}
      <section
        id="science"
        ref={scienceRef as RefObject<HTMLElement>}
        className="rd-science-section"
        style={{
          maxWidth: 1100, margin: '0 auto', padding: '64px 40px 96px',
          scrollMarginTop: 80,
        }}
      >
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.24em',
          textTransform: 'uppercase', color: t.fg45,
          textAlign: 'center', marginBottom: 56,
        }}>
          The science
        </div>

        <p style={{
          fontSize: 'clamp(26px, 3.5vw, 40px)',
          fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.25,
          color: t.fg, margin: '0 auto 64px', textAlign: 'center', maxWidth: 720,
          fontFamily: 'var(--font-serif)',
        }}>
          The longest study on happiness ever run found one thing that beats money, fame, or career: <em style={{ color: '#003DA5', fontStyle: 'italic' }}>close relationships</em>.
        </p>

        <div className="rd-stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 48,
          alignItems: 'start',
        }}>
          {[
            {
              stat: <>{scienceYears}+</>,
              label: 'Years of research',
              source: <>Harvard Study of Adult Development, running since 1938. <a href="https://www.adultdevelopmentstudy.org/" target="_blank" rel="noopener noreferrer" style={{ color: '#003DA5', textDecoration: 'underline', textUnderlineOffset: 2 }}>See the study -&gt;</a></>,
            },
            {
              stat: '#1', label: 'Predictor of a happy life',
              source: <>Ahead of income, IQ, social class, genes. <a href="https://www.ted.com/talks/robert_waldinger_what_makes_a_good_life_lessons_from_the_longest_study_on_happiness" target="_blank" rel="noopener noreferrer" style={{ color: '#003DA5', textDecoration: 'underline', textUnderlineOffset: 2 }}>Dr. Robert Waldinger, TED -&gt;</a></>,
            },
            {
              stat: <>{scienceCigs}</>,
              label: 'Cigarettes a day',
              source: <>Mortality risk of chronic loneliness. <a href="https://www.hhs.gov/sites/default/files/surgeon-general-social-connection-advisory.pdf" target="_blank" rel="noopener noreferrer" style={{ color: '#003DA5', textDecoration: 'underline', textUnderlineOffset: 2 }}>US Surgeon General, 2023 -&gt;</a></>,
            },
          ].map((s, idx) => (
            <div key={idx} style={{ textAlign: 'left', borderTop: `1px solid ${t.border14}`, paddingTop: 24 }}>
              <div style={{
                fontFamily: 'var(--font-serif)', fontWeight: 400,
                fontSize: 'clamp(52px, 6vw, 80px)', lineHeight: 1,
                letterSpacing: '-0.03em', color: t.fg, marginBottom: 16,
                fontVariantNumeric: 'tabular-nums',
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

      {/* Team - fused Founded by + portfolio */}
      <section
        id="team"
        ref={partnersRef as RefObject<HTMLElement>}
        className="rd-team-section"
        style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 40px 96px', scrollMarginTop: 80 }}
      >
        <div style={{ maxWidth: 720, marginBottom: 64 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.24em',
            textTransform: 'uppercase', color: t.fg45,
            marginBottom: 24,
            ...reveal(partnersVisible, 0),
          }}>
            Founded by
          </div>
          <div className="rd-moj-row" style={{
            display: 'flex', alignItems: 'center', gap: 28,
            ...reveal(partnersVisible, 0.08),
          }}>
            {FOUNDER.photo ? (
              <img src={FOUNDER.photo} alt={FOUNDER.name} width={88} height={88} style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#003DA5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
                {FOUNDER.initials}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 32, fontWeight: 700,
                color: t.fg, letterSpacing: '-0.03em',
                lineHeight: 1.05, marginBottom: 6,
              }}>{FOUNDER.name}</div>
              <div style={{ fontSize: 13, color: t.fg45, marginBottom: 10, letterSpacing: '0.01em' }}>{FOUNDER.role}</div>
              <div style={{ fontSize: 14, color: t.fg, lineHeight: 1.5, maxWidth: 440 }}>{FOUNDER.bio}</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section
        id="waitlist-cta"
        ref={ctaRef as RefObject<HTMLElement>}
        className="rd-cta-section"
        style={{
          padding: '96px 40px 120px', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
          borderTop: `1px solid ${t.border06}`,
          scrollMarginTop: 80,
        }}
      >
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(0, 61, 165,0.14) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.24em',
            textTransform: 'uppercase', color: '#003DA5',
            marginBottom: 32,
            ...reveal(ctaVisible),
          }}>
            Private beta
          </div>

          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5.5vw, 68px)',
            fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05,
            color: t.fg, marginBottom: 20,
            ...reveal(ctaVisible, 0.05),
          }}>
            We're growing slowly.<br /><em style={{ fontStyle: 'italic', fontWeight: 500 }}>On purpose.</em>
          </h2>

          <p style={{
            fontSize: 17, color: t.fg70, lineHeight: 1.6,
            maxWidth: 520, margin: '0 auto 40px',
            ...reveal(ctaVisible, 0.1),
          }}>
            Real Deal is in private beta. We're onboarding a handful of people at a time so every relationship gets the attention it deserves.
          </p>

          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            ...reveal(ctaVisible, 0.2),
          }}>
            <WaitlistForm variant="footer" dark={dark} />
            <p style={{ fontSize: 12, color: t.fg45, margin: 0, letterSpacing: '0.02em' }}>
              When your spot opens, you'll be the first to know.
            </p>
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
            <circle cx="42" cy="24" r="2.8" fill="#003DA5" />
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
