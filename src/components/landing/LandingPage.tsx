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
import goopLogo from '@/assets/logos/goop.png'
import moonpayLogo from '@/assets/logos/moonpay.png'
import forerunnerLogo from '@/assets/logos/forerunner.png'
import wonderLogo from '@/assets/logos/wonder.png'

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
  { id: 'biz',       label: 'Business Partners', people: 4,  health: 'fading',   color: '#E53935', x: 360, y: 510, r: 36, icon: 'handshake' },
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
            <stop offset="0%" stopColor="#003DA5" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#003DA5" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nm-cool-wash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EDEBFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#EDEBFF" stopOpacity="0" />
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

        {/* HUB */}
        <circle cx={450} cy={280} r={10} fill="#003DA5" opacity="0.75" />
        <circle cx={450} cy={280} r={22} stroke="#003DA5" strokeOpacity="0.2" strokeWidth="1" fill="none" />

        {/* HUB LABEL */}
        <g fontFamily="var(--font-serif), Georgia, serif">
          <text x={450} y={228} textAnchor="middle" fill="#6F675F" fontSize="10" fontFamily="var(--font-sans), system-ui" letterSpacing="0.18em" fontWeight="600">MY NETWORK</text>
          <text x={450} y={256} textAnchor="middle" fill="#201D1A" fontSize="26" fontWeight="600" letterSpacing="-0.02em">Score 81</text>
          <text x={450} y={316} textAnchor="middle" fill="#6F675F" fontSize="11" fontFamily="var(--font-sans), system-ui" letterSpacing="0.08em" fontStyle="italic">steady</text>
        </g>

        {/* PODS - translucent glass spheres */}
        {NETWORK_PODS.map(p => {
          const sat = HEALTH_SATURATION[p.health]
          const isHovered = hovered === p.id
          return (
            <g
              key={p.id}
              style={{ cursor: 'pointer', transition: 'opacity 0.25s ease' }}
              opacity={sat}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
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
              {/* icon at center, low-opacity pod color so it doesn't overpower the translucency */}
              <g transform={`translate(${p.x - 11} ${p.y - 11})`} color={p.color} opacity="0.75" style={{ pointerEvents: 'none' }}>
                <PodIcon kind={p.icon} size={22} />
              </g>
            </g>
          )
        })}
      </svg>

      {/* Hover tooltip */}
      {hovered && (() => {
        const p = NETWORK_PODS.find(x => x.id === hovered)
        if (!p) return null
        const leftPct = (p.x / W) * 100
        const topPct = ((p.y - p.r - 18) / H) * 100
        return (
          <div style={{
            position: 'absolute',
            left: `${leftPct}%`, top: `${topPct}%`,
            transform: 'translate(-50%, -100%)',
            background: '#201D1A', color: '#F5F4F0',
            padding: '10px 14px', borderRadius: 10,
            fontSize: 13, fontFamily: 'var(--font-sans)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
            pointerEvents: 'none', whiteSpace: 'nowrap',
            zIndex: 3,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
              <strong style={{ fontWeight: 600 }}>{p.label}</strong>
            </div>
            <div style={{ fontSize: 12, opacity: 0.72, letterSpacing: '0.01em' }}>
              {p.people} people - {p.health}
            </div>
          </div>
        )
      })()}
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
  role: 'Co-Founder & Managing Partner',
  bio: 'Founder of Beautycon. Investor and operator building the next generation of consumer platforms.',
  initials: 'MM',
  photo: 'https://images.squarespace-cdn.com/content/v1/6255af0f455c757ddc06592c/5554cf9e-73fe-48f0-82ca-c3c0da8e0cae/Moj+Mahdara.png',
}

const PORTFOLIO_BRANDS = [
  { name: 'goop', logo: goopLogo },
  { name: 'MoonPay', logo: moonpayLogo },
  { name: 'Forerunner', logo: forerunnerLogo },
  { name: 'Wonder', logo: wonderLogo },
]

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
  const rows = [
    { name: 'Sarah Chen', pod: 'Inner Circle', podColor: '#FF6B8A', score: 42, grade: 'D', status: 'Overdue 6d', statusColor: '#DC2626', primary: true },
    { name: 'Marcus Lee', pod: 'Founders',     podColor: '#7C3AED', score: 58, grade: 'C', status: 'Due today',  statusColor: '#D97706' },
    { name: 'Jenna Park', pod: 'Advisors',     podColor: '#00BFA5', score: 74, grade: 'B', status: 'Due in 2d',  statusColor: '#6366F1' },
    { name: 'David Osei', pod: 'LPs',          podColor: '#F5A623', score: 81, grade: 'B', status: 'Due in 4d',  statusColor: '#6366F1' },
  ]
  return (
    <div style={{ background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, color: t.fg, letterSpacing: '-0.01em' }}>Today's Focus</div>
        <div style={{ fontSize: 11, color: t.fg45, fontVariantNumeric: 'tabular-nums' }}>4 of 12</div>
      </div>
      <div>
        {rows.map((r, i) => (
          <div key={r.name} style={{
            display: 'grid', gridTemplateColumns: '28px 1fr auto', alignItems: 'center', gap: 12,
            padding: '12px 18px',
            background: r.primary ? (t.dark ? 'rgba(220,38,38,0.06)' : 'rgba(220,38,38,0.035)') : 'transparent',
            borderBottom: i < rows.length - 1 ? `1px solid ${t.border}` : 'none',
            opacity: v ? 1 : 0,
            transform: v ? 'translateY(0)' : 'translateY(8px)',
            transition: `opacity 0.45s ease ${0.08 + i * 0.07}s, transform 0.45s cubic-bezier(0.22,1,0.36,1) ${0.08 + i * 0.07}s`,
          }}>
            <Orb size={26} color={r.podColor} ring={r.primary ? `${r.statusColor}66` : undefined} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: t.fg, letterSpacing: '-0.005em' }}>{r.name}</div>
              <div style={{ fontSize: 11, color: t.fg50, marginTop: 1 }}>
                <span style={{ color: r.podColor, fontWeight: 600 }}>{r.pod}</span>
                <span style={{ color: t.fg45 }}> - {r.grade} grade</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Chip label={r.status} color={r.statusColor} />
              <ScoreRing score={r.score} color={r.statusColor} size={32} stroke={3} visible={v} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PodHealthCard({ t, visible }: { t: FeatureTheme; visible?: boolean }) {
  const v = visible ?? false
  const green = '#16A34A', amber = '#D97706'
  const circ48 = 2 * Math.PI * 48
  // Members mirror FocusPanel pod colors: Sarah (#FF6B8A), Marcus (#7C3AED), Jenna (#00BFA5), David (#F5A623), +1
  const members = [
    { color: '#FF6B8A', score: 42, ring: '#DC2626' },  // Sarah - overdue, drags score
    { color: '#7C3AED', score: 84, ring: green },
    { color: '#00BFA5', score: 92, ring: green },
    { color: '#F5A623', score: 71, ring: green },
    { color: '#003DA5', score: 58, ring: amber },
  ]
  const stats = [
    { label: 'Trend', value: '+4 this month', color: green },
    { label: 'Last touch', value: '2 days ago', color: t.fg },
    { label: 'At risk', value: '1 member', color: amber },
  ]
  return (
    <div style={{ background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)' }}>
      {/* header - matches FocusPanel/NeedsAttentionCard pattern */}
      <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, color: t.fg, letterSpacing: '-0.01em' }}>Inner Circle</div>
        <Chip label="Thriving" color={green} />
      </div>
      {/* score ring + stats */}
      <div style={{
        padding: '20px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'center',
        opacity: v ? 1 : 0, transition: 'opacity 0.4s ease 0.06s',
      }}>
        <div style={{ position: 'relative', width: 108, height: 108 }}>
          <svg width={108} height={108} style={{ display: 'block' }}>
            <circle cx={54} cy={54} r={48} fill="none" stroke={t.fg08} strokeWidth={8} />
            <circle cx={54} cy={54} r={48} fill="none" stroke={green} strokeWidth={8} strokeLinecap="round"
              strokeDasharray={`${v ? 0.87 * circ48 : 0} ${circ48}`} transform="rotate(-90 54 54)"
              style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1) 0.15s' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 700, color: t.fg, letterSpacing: '-0.02em', lineHeight: 1 }}>87</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: t.fg45, textTransform: 'uppercase', marginTop: 3 }}>Grade A</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              opacity: v ? 1 : 0, transform: v ? 'translateX(0)' : 'translateX(8px)',
              transition: `opacity 0.4s ease ${0.2 + i * 0.08}s, transform 0.4s cubic-bezier(0.22,1,0.36,1) ${0.2 + i * 0.08}s`,
            }}>
              <span style={{ fontSize: 11, color: t.fg45, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</span>
              <span style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
      {/* members */}
      <div style={{ padding: '12px 20px 18px', borderTop: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 11, color: t.fg45, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Members</div>
        <div style={{ display: 'flex', gap: 14 }}>
          {members.map((m, i) => {
            const mc = 2 * Math.PI * 16
            return (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1,
                opacity: v ? 1 : 0, transform: v ? 'translateY(0)' : 'translateY(6px)',
                transition: `opacity 0.35s ease ${0.3 + i * 0.06}s, transform 0.35s cubic-bezier(0.22,1,0.36,1) ${0.3 + i * 0.06}s`,
              }}>
                <div style={{ position: 'relative', width: 36, height: 36 }}>
                  <svg width={36} height={36} style={{ position: 'absolute', inset: 0 }}>
                    <circle cx={18} cy={18} r={16} fill="none" stroke={m.ring} strokeWidth={2} strokeOpacity={0.8}
                      strokeDasharray={`${v ? (m.score / 100) * mc : 0} ${mc}`}
                      strokeLinecap="round" transform="rotate(-90 18 18)"
                      style={{ transition: `stroke-dasharray 0.7s cubic-bezier(0.22,1,0.36,1) ${0.32 + i * 0.06}s` }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 4, display: 'flex' }}>
                    <Orb size={28} color={m.color} />
                  </div>
                </div>
                <div style={{ fontSize: 10, color: t.fg50, fontVariantNumeric: 'tabular-nums' }}>{m.score}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function NeedsAttentionCard({ t, visible }: { t: FeatureTheme; visible?: boolean }) {
  const v = visible ?? false
  // Inner Circle connects to FocusPanel story: Sarah is overdue, dragging the pod
  const rows = [
    { pod: 'Inner Circle', cadence: 'Weekly cadence',   status: 'overdue', days: 6, color: '#D65A4A', pct: 0.98, people: '1 overdue', action: 'Reach out' },
    { pod: 'LPs Pod',      cadence: 'Monthly cadence',  status: 'overdue', days: 3, color: '#E3A63A', pct: 0.72, people: '5 members', action: 'Schedule'  },
    { pod: 'Founders Pod', cadence: 'Biweekly cadence', status: 'due in',  days: 4, color: '#5B79FF', pct: 0.42, people: '7 members', action: 'On track'  },
  ]
  return (
    <div style={{ background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)' }}>
      {/* header - editorial weight */}
      <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: t.fg, letterSpacing: '-0.02em' }}>Needs Attention</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: t.fg45, textTransform: 'uppercase', letterSpacing: '0.14em' }}>sorted by urgency</div>
      </div>
      <div>
        {rows.map((r, i) => {
          const isTop = i === 0
          return (
            <div key={r.pod} style={{
              position: 'relative',
              padding: isTop ? '20px 20px 20px 24px' : '18px 20px',
              background: isTop ? (t.dark ? 'rgba(214,90,74,0.08)' : 'rgba(214,90,74,0.04)') : 'transparent',
              borderBottom: i < rows.length - 1 ? `1px solid ${t.border}` : 'none',
              opacity: v ? 1 : 0,
              transform: v ? 'translateY(0)' : 'translateY(8px)',
              transition: `opacity 0.4s ease ${0.08 + i * 0.09}s, transform 0.4s cubic-bezier(0.22,1,0.36,1) ${0.08 + i * 0.09}s`,
            }}>
              {/* urgency accent stripe on top row */}
              {isTop && (
                <span aria-hidden style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                  background: r.color,
                }} />
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: isTop ? 20 : 17,
                    fontWeight: 600,
                    color: t.fg,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                  }}>{r.pod}</div>
                  <div style={{ fontSize: 12, color: t.fg50, marginTop: 4, letterSpacing: '0.005em' }}>
                    {r.cadence} - {r.people}
                  </div>
                </div>
                {/* big-number status, editorial metric style */}
                <div style={{ textAlign: 'right', flexShrink: 0, color: r.color, fontVariantNumeric: 'tabular-nums' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6, lineHeight: 1 }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: isTop ? 34 : 28, letterSpacing: '-0.03em' }}>{r.days}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>d</span>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: 4, opacity: 0.9 }}>
                    {r.status}
                  </div>
                </div>
              </div>
              {/* progress bar - beefier, intentional */}
              <div style={{ position: 'relative', height: 6, borderRadius: 4, background: t.fg08, overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: r.color,
                  borderRadius: 4,
                  transformOrigin: 'left',
                  transform: v ? `scaleX(${r.pct})` : 'scaleX(0)',
                  transition: `transform 0.7s cubic-bezier(0.22,1,0.36,1) ${0.18 + i * 0.1}s`,
                }} />
              </div>
              {/* action row - small but present */}
              <div style={{
                marginTop: 10,
                fontSize: 11,
                fontWeight: 600,
                color: r.color,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
              }}>
                {r.action} -&gt;
              </div>
            </div>
          )
        })}
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
          width: 28, height: 28, borderRadius: '50%', background: '#003DA5',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7.2l2.8 2.8L11.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
        ) : 'Join waitlist'}
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
      {/* layered aurora gradient - fixed, translucent, non-chromatic */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `
            radial-gradient(900px 600px at 12% 8%, rgba(0, 61, 165, ${dark ? 0.22 : 0.18}) 0%, transparent 60%),
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
          background: `radial-gradient(500px circle at ${mouse.x}% ${mouse.y}%, rgba(0, 61, 165,${dark ? 0.14 : 0.10}) 0%, transparent 65%)`,
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
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="rd-cta-primary"
            onClick={() => {
              const el = document.getElementById('waitlist-cta')
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: '#003DA5', color: '#fff', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 4px 20px rgba(0, 61, 165,0.3)',
            }}
          >
            Join waitlist
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
            <p style={{
              fontSize: 12, color: t.fg45, margin: '14px 0 0',
              letterSpacing: '0.02em', textAlign: 'center',
            }}>
              Private beta. No spam, no data sold.
            </p>
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

      {/* Science / evidence band */}
      <section
        style={{
          maxWidth: 1100, margin: '0 auto', padding: '40px 40px 96px',
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
              stat: '85+', label: 'Years of research',
              source: <>Harvard Study of Adult Development, running since 1938. <a href="https://www.adultdevelopmentstudy.org/" target="_blank" rel="noopener noreferrer" style={{ color: '#003DA5', textDecoration: 'underline', textUnderlineOffset: 2 }}>See the study -&gt;</a></>,
            },
            {
              stat: '#1', label: 'Predictor of a happy life',
              source: <>Ahead of income, IQ, social class, genes. <a href="https://www.ted.com/talks/robert_waldinger_what_makes_a_good_life_lessons_from_the_longest_study_on_happiness" target="_blank" rel="noopener noreferrer" style={{ color: '#003DA5', textDecoration: 'underline', textUnderlineOffset: 2 }}>Dr. Robert Waldinger, TED -&gt;</a></>,
            },
            {
              stat: '15', label: 'Cigarettes a day',
              source: <>Mortality risk of chronic loneliness. <a href="https://www.hhs.gov/sites/default/files/surgeon-general-social-connection-advisory.pdf" target="_blank" rel="noopener noreferrer" style={{ color: '#003DA5', textDecoration: 'underline', textUnderlineOffset: 2 }}>US Surgeon General, 2023 -&gt;</a></>,
            },
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

      {/* Logo ticker */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 56px', overflow: 'hidden' }}>
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

      {/* Founded by */}
      <div
        ref={partnersRef as RefObject<HTMLElement>}
        style={{ maxWidth: 720, margin: '0 auto', padding: '0 40px 96px' }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40, justifyContent: 'center',
          ...reveal(partnersVisible, 0),
        }}>
          <div style={{ flex: 1, maxWidth: 120, height: 1, background: t.border14 }} />
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: t.fg45,
          }}>Founded by</span>
          <div style={{ flex: 1, maxWidth: 120, height: 1, background: t.border14 }} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 24,
          border: `1px solid ${t.border}`,
          borderRadius: 20,
          padding: '28px 32px',
          background: t.fg03,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          maxWidth: 560, margin: '0 auto',
          ...reveal(partnersVisible, 0.08),
        }}>
          {FOUNDER.photo ? (
            <img src={FOUNDER.photo} alt={FOUNDER.name} width={72} height={72} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${t.fg08}` }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#003DA5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
              {FOUNDER.initials}
            </div>
          )}
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: t.fg, marginBottom: 3, letterSpacing: '-0.005em' }}>{FOUNDER.name}</div>
            <div style={{ fontSize: 13, color: t.fg45, marginBottom: 8 }}>{FOUNDER.role}</div>
            <div style={{ fontSize: 13, color: t.fg50, lineHeight: 1.5 }}>{FOUNDER.bio}</div>
          </div>
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

      {/* CTA footer */}
      <section
        id="waitlist-cta"
        ref={ctaRef as RefObject<HTMLElement>}
        style={{
          padding: '100px 40px 120px', textAlign: 'center',
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
            display: 'inline-flex', alignItems: 'center', gap: 10,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: '#003DA5',
            marginBottom: 32,
            ...reveal(ctaVisible),
          }}>
            <span style={{ width: 24, height: 1, background: '#003DA5', opacity: 0.5 }} />
            Private beta
            <span style={{ width: 24, height: 1, background: '#003DA5', opacity: 0.5 }} />
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
