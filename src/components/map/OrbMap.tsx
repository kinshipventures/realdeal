import type React from 'react'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useOnViewportChange,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodeDrag,
  type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getPods, getContacts, getAllInteractions, getCategories, isOverdue } from '../../lib/airtable'
import { indexByContact, podEquityScore, overallEquityScore, scoreLabel, contactEquityScore, type ScoreLabel } from '../../lib/equity'
import type { Category, Contact, Interaction, Pod } from '../../lib/types'
import { POD_SHIFT_COLORS } from './SolidOrb'
import { useAuth } from '../../contexts/AuthContext'
import { isDemoMode } from '../../lib/sampleData'
import { EmptyState } from '../empty/EmptyState'
import { ListNodeComponent } from './ListNode'
import { CategoryNodeComponent } from './CategoryNode'
import { MojNodeComponent, MOJ_ID, MOJ_SIZE } from './MojNode'
import { CreateCategoryNodeComponent } from './CreateCategoryNode'
import { GradientEdgeComponent } from './GradientEdge'
import { clearAllPositions } from '../../hooks/useNodePositions'
import { PodCreateModal } from '../pods/PodCreateModal'
import { PodDetailPage } from '../pods/PodDetailPage'
import { MapLegend } from './MapLegend'
import { useEscape } from '../../lib/escapeStack'

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return mobile
}

const LIST_SIZE = 96

const nodeTypes = {
  list: ListNodeComponent,
  category: CategoryNodeComponent,
  moj: MojNodeComponent,
  'create-category': CreateCategoryNodeComponent,
}

const edgeTypes = {
  gradient: GradientEdgeComponent,
}

const CREATE_POD_ID = '__create-pod__'

function formatLastInteracted(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays < 1) return 'Today'
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Radii for orbital rings — scale down on small screens so orbs stay visible
const BASE_RADII = [210, 330, 460]
const RING_RADII = typeof window !== 'undefined' && window.innerWidth < 500
  ? BASE_RADII.map(r => Math.round(r * 0.55))
  : BASE_RADII

function hubLayout(
  lists: { id: string; is_priority?: boolean }[],
): { mojPos: { x: number; y: number }; listPositions: Map<string, { x: number; y: number }>; activeRings: number[]; ringIndexByPod: Map<string, number> } {
  const mojPos = { x: -MOJ_SIZE / 2, y: -MOJ_SIZE / 2 }
  const listPositions = new Map<string, { x: number; y: number }>()

  // Distribute pods across rings based on count
  const n = lists.length
  let rings: number[]
  if (n <= 5) rings = [RING_RADII[0]]
  else if (n <= 10) rings = [RING_RADII[0], RING_RADII[1]]
  else rings = RING_RADII

  // Assign pods to rings: priority pods on inner ring (max 5), rest fill outward
  const INNER_CAP = 5
  const priority = lists.filter(l => l.is_priority)
  const rest = lists.filter(l => !l.is_priority)
  const sorted = [...priority, ...rest]

  const ringBuckets: { id: string; is_priority?: boolean }[][] = rings.map(() => [])
  sorted.forEach((item, i) => {
    // Priority pods fill inner ring first, up to cap
    if (item.is_priority && ringBuckets[0].length < INNER_CAP) {
      ringBuckets[0].push(item)
    } else {
      // Fill remaining rings round-robin starting from ring 1 (or 0 if single ring)
      const startRing = rings.length > 1 ? 1 : 0
      const available = rings.length - startRing
      const idx = startRing + (ringBuckets.slice(startRing).reduce((min, b, bi) =>
        b.length < ringBuckets[startRing + min].length ? bi : min, 0))
      ringBuckets[idx].push(item)
    }
  })

  // Track which ring each pod landed on (for parallax depth)
  const ringIndexByPod = new Map<string, number>()
  for (let r = 0; r < rings.length; r++) {
    for (const item of ringBuckets[r]) ringIndexByPod.set(item.id, r)
  }

  // Position each pod on its ring
  for (let r = 0; r < rings.length; r++) {
    const radius = rings[r]
    const bucket = ringBuckets[r]
    // Offset each ring's starting angle so orbs don't stack radially
    const angleOffset = r * (Math.PI / rings.length / 2)
    bucket.forEach((item, i) => {
      const angle = (i / bucket.length) * 2 * Math.PI - Math.PI / 2 + angleOffset
      listPositions.set(item.id, {
        x: Math.cos(angle) * radius - LIST_SIZE / 2,
        y: Math.sin(angle) * radius - LIST_SIZE / 2,
      })
    })
  }

  return { mojPos, listPositions, activeRings: rings, ringIndexByPod }
}

type PodCounts = { total: number; overdue: number }

interface BuildHomeNodesParams {
  pods: Pod[]
  countsByPod: Record<string, PodCounts>
  equityByPod: Record<string, number>
  categoriesByPod: Record<string, Category[]>
  memberCountByPod: Record<string, number>
  overallHealth?: number
  totalContacts?: number
  userName?: string
  onCreatePod: () => void
  onPodHoverEnter?: (podId: string, x: number, y: number) => void
  onPodHoverLeave?: () => void
  onDrillIn?: (pod: Pod) => void
}

function buildHomeNodes({
  pods,
  countsByPod,
  equityByPod,
  categoriesByPod,
  memberCountByPod,
  overallHealth,
  totalContacts,
  userName,
  onCreatePod,
  onPodHoverEnter,
  onPodHoverLeave,
  onDrillIn,
}: BuildHomeNodesParams): { nodes: Node[]; activeRings: number[]; ringIndexByPod: Map<string, number> } {
  const { mojPos, listPositions, activeRings, ringIndexByPod } = hubLayout(pods)
  const DEPTH_BY_RING = [1.0, 0.92, 0.85]

  const mojNode: Node = {
    id: MOJ_ID,
    type: 'moj',
    position: mojPos,
    draggable: false,
    style: { overflow: 'visible' },
    data: { overallHealth, totalContacts, userName },
  }

  const hubCenterX = mojPos.x + MOJ_SIZE / 2
  const hubCenterY = mojPos.y + MOJ_SIZE / 2

  const podNodes: Node[] = []

  pods.forEach((pod, i) => {
    const pos = listPositions.get(pod.id)!
    const counts = countsByPod[pod.id] ?? { total: 0, overdue: 0 }
    const orbitStartX = hubCenterX - (pos.x + LIST_SIZE / 2)
    const orbitStartY = hubCenterY - (pos.y + LIST_SIZE / 2)

    podNodes.push({
      id: pod.id,
      type: 'list',
      position: pos,
      style: { overflow: 'visible' },
      data: {
        list: pod,
        contactCount: counts.total,
        overdueCount: counts.overdue,
        healthPercent: equityByPod[pod.id] ?? undefined,
        loading: false,
        animationDelay: `${(i + 1) * 0.1}s`,
        orbitStartX,
        orbitStartY,
        capacity: pod.capacity ?? null,
        memberCount: memberCountByPod[pod.id] ?? 0,
        categories: categoriesByPod[pod.id] ?? [],
        depth: DEPTH_BY_RING[ringIndexByPod.get(pod.id) ?? 0] ?? 1.0,
        onHoverEnter: onPodHoverEnter,
        onHoverLeave: onPodHoverLeave,
        onDrillIn,
      },
    })
  })

  return { nodes: [mojNode, ...podNodes], activeRings, ringIndexByPod }
}

function buildHomeEdges(_pods: Pod[], _equityByPod: Record<string, number>): Edge[] {
  return []
}

const MIN_CAT_SIZE = 52
const MAX_CAT_SIZE = 84
const MAX_PER_RING = 10

function drillRadius(catCount: number): number {
  if (catCount <= 6) return 200
  if (catCount <= 12) return 240
  if (catCount <= 20) return 280
  return 320
}

function buildDrillNodes(
  pod: Pod,
  categories: Category[],
  equityByPod: Record<string, number>,
  totalContacts: number,
  navigateFn: (path: string) => void,
  contactCountByCategory?: Record<string, number>,
  healthByCategory?: Record<string, number>,
): { nodes: Node[] } {
  const centerNode: Node = {
    id: MOJ_ID,
    type: 'moj',
    position: { x: -MOJ_SIZE / 2, y: -MOJ_SIZE / 2 },
    draggable: false,
    style: { overflow: 'visible' },
    data: {
      overallHealth: equityByPod[pod.id],
      totalContacts,
      podName: pod.name,
      podColor: pod.color ?? undefined,
      podId: pod.id,
    },
  }

  const counts = categories.map(c => contactCountByCategory?.[c.id] ?? 0)
  const maxCount = Math.max(1, ...counts)
  const baseRadius = drillRadius(categories.length)

  const catNodes: Node[] = categories.map((cat, i) => {
    const count = contactCountByCategory?.[cat.id] ?? 0
    const size = Math.max(MIN_CAT_SIZE, Math.min(MAX_CAT_SIZE, MIN_CAT_SIZE + (count / maxCount) * (MAX_CAT_SIZE - MIN_CAT_SIZE)))
    const ring = Math.floor(i / MAX_PER_RING)
    const indexInRing = i % MAX_PER_RING
    const countInRing = Math.min(MAX_PER_RING, categories.length - ring * MAX_PER_RING)
    const radius = baseRadius + ring * 140
    const angleOffset = ring * (Math.PI / MAX_PER_RING / 2)
    const angle = (indexInRing / countInRing) * 2 * Math.PI - Math.PI / 2 + angleOffset
    const x = Math.cos(angle) * radius - size / 2
    const y = Math.sin(angle) * radius - size / 2
    return {
      id: cat.id,
      type: 'category',
      position: { x, y },
      style: { overflow: 'visible' },
      data: {
        category: cat,
        listColor: pod.color,
        contactCount: count,
        healthPercent: healthByCategory?.[cat.id],
        orbSize: Math.round(size),
        onClick: () => navigateFn(`/category/${cat.id}`),
        animationDelay: `${(i + 1) * 0.06}s`,
      },
    }
  })

  return { nodes: [centerNode, ...catNodes] }
}

function buildDrillEdges(
  pod: Pod,
  categories: Category[],
  healthByCategory: Record<string, number>,
  contactCountByCategory: Record<string, number>,
): Edge[] {
  // Hide edges when many categories to reduce visual clutter
  if (categories.length > 12) return []
  const color = pod.color ?? '#718096'
  return categories.map(cat => {
    const health = healthByCategory[cat.id] ?? 0
    const count = contactCountByCategory[cat.id] ?? 0
    if (count === 0) return null
    return {
      id: `drill-${cat.id}`,
      source: MOJ_ID,
      target: cat.id,
      type: 'gradient',
      data: { color, healthPercent: health },
    }
  }).filter(Boolean) as Edge[]
}

const VIEWPORT_KEY = 'realdeal:map-viewport'

function loadViewport(): Viewport | null {
  try {
    const raw = localStorage.getItem(VIEWPORT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const HEALTH_COLORS: Record<ScoreLabel, { color: string; bg: string }> = {
  Thriving: { color: 'var(--health-thriving)', bg: 'var(--health-thriving-bg)' },
  Steady: { color: 'var(--health-steady)', bg: 'var(--health-steady-bg)' },
  Cooling: { color: 'var(--health-cooling)', bg: 'var(--health-cooling-bg)' },
  Fading: { color: 'var(--health-fading)', bg: 'var(--health-fading-bg)' },
}

function ViewToggle({ mode, onChange }: { mode: 'map' | 'list'; onChange: (m: 'map' | 'list') => void }) {
  return (
    <div style={{
      display: 'flex',
      borderRadius: 10,
      background: 'var(--tint)',
      border: '1px solid var(--edge)',
      overflow: 'hidden',
    }}>
      <button
        type="button"
        aria-label="Switch to map view"
        title="Map view"
        aria-pressed={mode === 'map'}
        onClick={() => onChange('map')}
        style={{
          width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', cursor: 'pointer',
          background: mode === 'map' ? 'var(--color-brand)' : 'transparent',
          color: mode === 'map' ? '#fff' : 'var(--color-text-secondary)',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="4" r="2.5" /><circle cx="12" cy="4" r="2.5" />
          <circle cx="4" cy="12" r="2.5" /><circle cx="12" cy="12" r="2.5" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Switch to list view"
        title="List view"
        aria-pressed={mode === 'list'}
        onClick={() => onChange('list')}
        style={{
          width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', cursor: 'pointer',
          background: mode === 'list' ? 'var(--color-brand)' : 'transparent',
          color: mode === 'list' ? '#fff' : 'var(--color-text-secondary)',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="2" width="14" height="2" rx="1" />
          <rect x="1" y="7" width="14" height="2" rx="1" />
          <rect x="1" y="12" width="14" height="2" rx="1" />
        </svg>
      </button>
    </div>
  )
}

interface PodListViewProps {
  pods: Pod[]
  countsByPod: Record<string, PodCounts>
  equityByPod: Record<string, number>
  categoriesByPod: Record<string, Category[]>
  selectedPod: Pod | null
  onPodClick: (pod: Pod) => void
  onCategoryClick: (categoryId: string) => void
  onBack: () => void
}

function PodListView({
  pods, countsByPod, equityByPod, categoriesByPod,
  selectedPod, onPodClick, onCategoryClick, onBack,
}: PodListViewProps) {
  if (selectedPod) {
    const cats = categoriesByPod[selectedPod.id] ?? []
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
        <nav role="navigation" aria-label="Breadcrumb" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 16,
        }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 12, color: 'var(--color-text-secondary)',
          }}>All pods</button>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>/</span>
          <span style={{
            fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)',
          }}>{selectedPod.name}</span>
        </nav>

        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cats.length === 0 && (
            <li style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: 16, textAlign: 'center' }}>
              No categories in this pod
            </li>
          )}
          {cats.map((cat, i) => (
            <li key={cat.id} className="widget-enter" style={{ '--stagger': i } as React.CSSProperties}>
              <button
                onClick={() => onCategoryClick(cat.id)}
                className="widget-card"
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: 'var(--surface-panel)',
                  border: '1px solid var(--edge)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-serif)',
                }}>{cat.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24, overflowY: 'auto', height: '100%' }}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pods.map((pod, i) => {
          const counts = countsByPod[pod.id] ?? { total: 0, overdue: 0 }
          const equity = equityByPod[pod.id] ?? 0
          const label = scoreLabel(equity)
          const healthStyle = HEALTH_COLORS[label]
          const color = pod.color ?? '#1C1C1E'
          const shiftColor = POD_SHIFT_COLORS[color] ?? color

          return (
            <li key={pod.id} className="widget-enter" style={{ '--stagger': i } as React.CSSProperties}>
              <button
                onClick={() => onPodClick(pod)}
                className="widget-card"
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: 'var(--surface-panel)',
                  border: '1px solid var(--edge)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                {/* Mini orb */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${color} 0%, ${shiftColor} 100%)`,
                  boxShadow: `0 2px 8px rgba(0,0,0,0.15)`,
                }} />

                {/* Name + cadence */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{pod.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                    {counts.total} {counts.total === 1 ? 'person' : 'people'}
                    {pod.cadence ? ` - ${pod.cadence}` : ''}
                  </div>
                </div>

                {/* Health badge */}
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  padding: '3px 8px', borderRadius: 100,
                  color: healthStyle.color,
                  background: healthStyle.bg,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>{label}</span>

                {/* Equity score */}
                <span style={{
                  fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-sans)', letterSpacing: '-0.03em',
                  minWidth: 28, textAlign: 'right', flexShrink: 0,
                }}>{equity}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function OrbMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const { setViewport, getViewport, fitView, getZoom } = useReactFlow()
  const navigate = useNavigate()
  const { session } = useAuth()
  const userName = isDemoMode() ? 'Moj Mahdara' : (session?.user?.user_metadata?.full_name as string | undefined)
  const [activeHighlights, setActiveHighlights] = useState<Set<string>>(new Set())
  const isMobile = useIsMobile()

  const [viewMode, setViewMode] = useState<'map' | 'list'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'list'
    return (localStorage.getItem('realdeal:pods-view-mode') as 'map' | 'list') || 'map'
  })

  const [mapView, setMapView] = useState<'hub' | 'pod'>('hub')
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null)
  const [showOrbHint] = useState(false)
  const [fitViewEnabled, setFitViewEnabled] = useState(true)
  const isAnimating = useRef(false)
  const drillInRef = useRef<((pod: Pod) => void) | null>(null)
  const drillBackRef = useRef<(() => void) | null>(null)
  const mapViewRef = useRef<'hub' | 'pod'>('hub')

  // Persist viewport to localStorage on pan/zoom; track for orbit rings overlay + parallax
  useOnViewportChange({
    onChange: (vp: Viewport) => {
      if (isAnimating.current) return
      setViewportState(vp)
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        panRef.current.x += vp.x - prevVpRef.current.x
        panRef.current.y += vp.y - prevVpRef.current.y
        prevVpRef.current = { ...vp }
        if (containerRef.current) {
          containerRef.current.style.setProperty('--pan-x', `${panRef.current.x}`)
          containerRef.current.style.setProperty('--pan-y', `${panRef.current.y}`)
        }
      })
    },
    onEnd: (vp: Viewport) => {
      if (isAnimating.current) return
      localStorage.setItem(VIEWPORT_KEY, JSON.stringify(vp))
    },
  })

  const [initError, setInitError] = useState(false)
  const [podsLoaded, setPodsLoaded] = useState(false)
  const [podsCount, setPodsCount] = useState(0)
  const [viewport, setViewportState] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const [showCreatePod, setShowCreatePod] = useState(false)

  const podsRef = useRef<Pod[]>([])
  const countsByPodRef = useRef<Record<string, PodCounts>>({})
  const equityByPodRef = useRef<Record<string, number>>({})
  const categoriesByPodRef = useRef<Record<string, Category[]>>({})
  const memberCountByPodRef = useRef<Record<string, number>>({})
  const ringByPodRef = useRef<Map<string, number>>(new Map())
  const overallHealthRef = useRef<number | undefined>(undefined)
  const totalContactsRef = useRef<number>(0)
  const lastInteractedByPodRef = useRef<Record<string, string | null>>({})
  const allContactsRef = useRef<Contact[]>([])
  const byContactRef = useRef<Map<string, Interaction[]>>(new Map())

  // Auto-open create pod modal from sidebar "+" button
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('create') === '1') {
      setShowCreatePod(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const [hoveredPod, setHoveredPod] = useState<{
    pod: Pod; health: number; contactCount: number; overdueCount: number; lastInteracted: string | null
  } | null>(null)
  const cursorRef = useRef({ x: 0, y: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Track cursor globally while a pod is hovered - update tooltip position via DOM (no re-renders)
  useEffect(() => {
    if (!hoveredPod) return
    const onMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY }
      if (tooltipRef.current) {
        tooltipRef.current.style.left = `${e.clientX + 16}px`
        tooltipRef.current.style.top = `${e.clientY + 16}px`
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [hoveredPod])

  // Parallax: track cumulative pan offset, apply via CSS custom properties
  const panRef = useRef({ x: 0, y: 0 })
  const prevVpRef = useRef<Viewport>({ x: 0, y: 0, zoom: 1 })
  const rafRef = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePodHoverEnter = useCallback((podId: string, clientX: number, clientY: number) => {
    const pod = podsRef.current.find(p => p.id === podId)
    if (!pod) return
    const counts = countsByPodRef.current[podId] ?? { total: 0, overdue: 0 }
    cursorRef.current = { x: clientX, y: clientY }
    setHoveredPod({
      pod,
      health: equityByPodRef.current[podId] ?? 0,
      contactCount: counts.total,
      overdueCount: counts.overdue,
      lastInteracted: lastInteractedByPodRef.current[podId] ?? null,
    })
  }, [])

  const handlePodHoverLeave = useCallback(() => {
    setHoveredPod(null)
  }, [])

  const rebuildHomeView = useCallback(() => {
    const { nodes: homeNodes, activeRings: rings, ringIndexByPod: ringMap } = buildHomeNodes({
      pods: podsRef.current,
      countsByPod: countsByPodRef.current,
      equityByPod: equityByPodRef.current,
      categoriesByPod: categoriesByPodRef.current,
      memberCountByPod: memberCountByPodRef.current,
      overallHealth: overallHealthRef.current,
      totalContacts: totalContactsRef.current,
      userName,
      onCreatePod: () => setShowCreatePod(true),
      onPodHoverEnter: handlePodHoverEnter,
      onPodHoverLeave: handlePodHoverLeave,
      onDrillIn: (pod) => drillInRef.current?.(pod),
    })
    setNodes(homeNodes)
    setActiveRings(rings)
    ringByPodRef.current = ringMap
    setEdges(buildHomeEdges(podsRef.current, equityByPodRef.current))
  }, [setNodes, setEdges, handlePodHoverEnter, handlePodHoverLeave])

  // Keep drillInRef in sync so rebuildHomeView can reference drillIntoPod without a circular dep
  // (rebuildHomeView is defined before drillIntoPod)

  const drillIntoPod = useCallback((pod: Pod) => {
    if (isAnimating.current) return

    isAnimating.current = true
    setFitViewEnabled(false)
    setHoveredPod(null)

    // Find clicked pod node position to zoom toward it
    const podNode = nodes.find(n => n.id === pod.id)
    const podX = podNode ? (podNode.position.x + (LIST_SIZE / 2)) : 0
    const podY = podNode ? (podNode.position.y + (LIST_SIZE / 2)) : 0

    // Zoom viewport toward the clicked pod, centering it in the left area (panel takes ~520px on right)
    const containerEl = document.querySelector('.react-flow') as HTMLElement | null
    const cw = containerEl?.clientWidth ?? window.innerWidth
    const ch = containerEl?.clientHeight ?? window.innerHeight
    const panelWidth = Math.min(520, cw - 32)
    const availableWidth = cw - panelWidth - 32 // space left of the overlay
    const zoomTarget = Math.min(getZoom() * 1.6, 2.2)
    // Center the pod orb in the available left area, vertically centered
    setViewport({
      x: (availableWidth / 2) - podX * zoomTarget,
      y: (ch / 2) - podY * zoomTarget,
      zoom: zoomTarget,
    }, { duration: 450 })

    // Fade sibling pods during zoom
    setMapView('pod')
    mapViewRef.current = 'pod'
    setSelectedPod(pod)
    setNodes(prev => prev.map(n => {
      if (n.id === pod.id) return n
      return { ...n, data: { ...n.data, fading: true } }
    }))

    setTimeout(() => {
      isAnimating.current = false
    }, 500)
  }, [nodes, setNodes, setViewport, getZoom])

  drillInRef.current = drillIntoPod

  const drillBackToHub = useCallback(() => {
    if (isAnimating.current) return
    isAnimating.current = true

    setMapView('hub')
    mapViewRef.current = 'hub'
    setSelectedPod(null)

    // Un-fade all nodes
    setNodes(prev => prev.map(n => ({
      ...n, data: { ...n.data, fading: false },
    })))

    requestAnimationFrame(() => {
      fitView({ padding: 0.22, duration: 400 })
      setTimeout(() => {
        isAnimating.current = false
        setFitViewEnabled(true)
      }, 450)
    })
  }, [setNodes, fitView])

  drillBackRef.current = drillBackToHub

  // Escape key to drill back when in pod view
  const escapeHandler = useCallback(() => {
    if (mapViewRef.current === 'pod') {
      drillBackRef.current?.()
    }
  }, [])
  useEscape(escapeHandler)

  // Auto-switch mobile to list view when viewport changes
  useEffect(() => {
    if (isMobile && viewMode === 'map') {
      setViewMode('list')
    }
  }, [isMobile]) // eslint-disable-line react-hooks/exhaustive-deps

  // Compute aggregate stats for hub stats bar
  const hubStats = useMemo(() => {
    const pods = podsRef.current
    const counts = countsByPodRef.current
    let totalOverdue = 0
    for (const podId in counts) {
      totalOverdue += counts[podId]?.overdue ?? 0
    }
    return {
      podCount: pods.length,
      contactCount: totalContactsRef.current,
      overallHealth: overallHealthRef.current,
      overdueCount: totalOverdue,
    }
  }, [podsLoaded, podsCount]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for search highlight events from SearchPalette (via App.tsx)
  useEffect(() => {
    let clearTimer: ReturnType<typeof setTimeout>
    function handleHighlight(e: Event) {
      const podIds: string[] = (e as CustomEvent<string[]>).detail
      if (!podIds?.length) return
      clearTimeout(clearTimer)
      // If in drill-down, go back to hub first so the pods are visible
      if (mapViewRef.current === 'pod') {
        drillBackRef.current?.()
        setTimeout(() => setActiveHighlights(new Set(podIds)), 500)
      } else {
        setActiveHighlights(new Set(podIds))
      }
      clearTimer = setTimeout(() => setActiveHighlights(new Set()), 2500)
    }
    window.addEventListener('map:highlight-pods', handleHighlight)
    return () => {
      window.removeEventListener('map:highlight-pods', handleHighlight)
      clearTimeout(clearTimer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply highlighted flag to nodes when activeHighlights changes
  useEffect(() => {
    setNodes(prev => prev.map(n => ({
      ...n,
      data: { ...n.data, highlighted: activeHighlights.has(n.id) },
    })))
  }, [activeHighlights, setNodes])

  const handlePodCreated = useCallback(async (newPod: Pod) => {
    setShowCreatePod(false)
    // Re-fetch pods to include the new one
    try {
      const [allPods, allContacts, allInteractions] = await Promise.all([
        getPods(), getContacts(), getAllInteractions(),
      ])
      podsRef.current = allPods

      const countsByPod: Record<string, PodCounts> = {}
      const memberCountByPod: Record<string, number> = {}
      for (const contact of allContacts) {
        for (const podId of contact.list_ids) {
          if (!countsByPod[podId]) countsByPod[podId] = { total: 0, overdue: 0 }
          countsByPod[podId].total++
          if (isOverdue(contact)) countsByPod[podId].overdue++
          memberCountByPod[podId] = (memberCountByPod[podId] ?? 0) + 1
        }
      }
      countsByPodRef.current = countsByPod
      memberCountByPodRef.current = memberCountByPod

      const byContact = indexByContact(allInteractions)
      allContactsRef.current = allContacts
      byContactRef.current = byContact
      const equityByPod: Record<string, number> = {}
      for (const pod of allPods) {
        const podContacts = allContacts.filter(c => c.list_ids.includes(pod.id))
        if (podContacts.length > 0) {
          equityByPod[pod.id] = podEquityScore(podContacts, byContact)
        }
      }
      equityByPodRef.current = equityByPod

      const priorityPods = allPods.filter(p => p.is_priority)
      overallHealthRef.current = overallEquityScore(priorityPods.length > 0 ? priorityPods : allPods, allContacts, byContact)
      totalContactsRef.current = allContacts.length

      const lastInteractedByPod: Record<string, string | null> = {}
      for (const pod of allPods) {
        const podContacts = allContacts.filter(c => c.list_ids.includes(pod.id))
        let maxDate: string | null = null
        for (const contact of podContacts) {
          const interactions = byContact.get(contact.id) ?? []
          for (const interaction of interactions) {
            if (!maxDate || interaction.date > maxDate) maxDate = interaction.date
          }
        }
        lastInteractedByPod[pod.id] = maxDate
      }
      lastInteractedByPodRef.current = lastInteractedByPod

      rebuildHomeView()
      setPodsCount(allPods.length)
    } catch (err) {
      console.error('Failed to refresh pods after creation:', err)
    }
  }, [rebuildHomeView])

  useEffect(() => {
    let stale = false
    async function init() {
      try {
        const [allPods, allContacts, allInteractions, allCategoriesRaw] = await Promise.all([
          getPods(), getContacts(), getAllInteractions(), getCategories(),
        ])
        if (stale) return
        podsRef.current = allPods

        const countsByPod: Record<string, PodCounts> = {}
        const memberCountByPod: Record<string, number> = {}
        for (const contact of allContacts) {
          for (const podId of contact.list_ids) {
            if (!countsByPod[podId]) countsByPod[podId] = { total: 0, overdue: 0 }
            countsByPod[podId].total++
            if (isOverdue(contact)) countsByPod[podId].overdue++
            memberCountByPod[podId] = (memberCountByPod[podId] ?? 0) + 1
          }
        }
        countsByPodRef.current = countsByPod
        memberCountByPodRef.current = memberCountByPod

        const byContact = indexByContact(allInteractions)
        allContactsRef.current = allContacts
        byContactRef.current = byContact
        const equityByPod: Record<string, number> = {}
        for (const pod of allPods) {
          const podContacts = allContacts.filter(c => c.list_ids.includes(pod.id))
          if (podContacts.length > 0) {
            equityByPod[pod.id] = podEquityScore(podContacts, byContact)
          }
        }
        equityByPodRef.current = equityByPod

        const priorityPods = allPods.filter(p => p.is_priority)
        const overallHealth = overallEquityScore(priorityPods.length > 0 ? priorityPods : allPods, allContacts, byContact)
        overallHealthRef.current = overallHealth
        totalContactsRef.current = allContacts.length

        // Compute last interaction date per pod
        const lastInteractedByPod: Record<string, string | null> = {}
        for (const pod of allPods) {
          const podContacts = allContacts.filter(c => c.list_ids.includes(pod.id))
          let maxDate: string | null = null
          for (const contact of podContacts) {
            const interactions = byContact.get(contact.id) ?? []
            for (const interaction of interactions) {
              if (!maxDate || interaction.date > maxDate) maxDate = interaction.date
            }
          }
          lastInteractedByPod[pod.id] = maxDate
        }
        lastInteractedByPodRef.current = lastInteractedByPod

        const catsByPod: Record<string, Category[]> = {}
        for (const cat of allCategoriesRaw) {
          if (!catsByPod[cat.list_id]) catsByPod[cat.list_id] = []
          catsByPod[cat.list_id].push(cat)
        }
        categoriesByPodRef.current = catsByPod

        const { nodes: homeNodes, activeRings: rings, ringIndexByPod: ringMap } = buildHomeNodes({
          pods: allPods,
          countsByPod,
          equityByPod,
          categoriesByPod: catsByPod,

          memberCountByPod,
          overallHealth,
          totalContacts: allContacts.length,
          userName,
          onCreatePod: () => setShowCreatePod(true),
          onPodHoverEnter: handlePodHoverEnter,
          onPodHoverLeave: handlePodHoverLeave,
          onDrillIn: (pod) => drillInRef.current?.(pod),
        })
        setNodes(homeNodes)
        setActiveRings(rings)
        ringByPodRef.current = ringMap
        setEdges(buildHomeEdges(allPods, equityByPod))
        if (!stale) { setPodsLoaded(true); setPodsCount(allPods.length) }
      } catch (err) {
        console.error('Couldn\'t load your network:', err)
        if (!stale) { setInitError(true); setPodsLoaded(true) }
      }
    }
    init()
    return () => { stale = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNodeDragStart: OnNodeDrag = useCallback(() => {}, [])

  const handleNodeDrag: OnNodeDrag = useCallback(() => {}, [])

  const handleNodeDragStop: OnNodeDrag = useCallback((_, node) => {
    if (mapView !== 'hub') return
    if (node.id === MOJ_ID) return
    const ringIdx = ringByPodRef.current.get(node.id)
    if (ringIdx === undefined) return

    // Animate snap-to-ring with gravitational pull feel
    const radius = RING_RADII[ringIdx]
    const cx = node.position.x + LIST_SIZE / 2
    const cy = node.position.y + LIST_SIZE / 2
    const angle = Math.atan2(cy, cx)
    const snapX = Math.cos(angle) * radius - LIST_SIZE / 2
    const snapY = Math.sin(angle) * radius - LIST_SIZE / 2

    const startX = node.position.x
    const startY = node.position.y
    const startTime = performance.now()
    const duration = 400

    function animate(now: number) {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      // Spring-like ease: overshoot slightly then settle
      const ease = 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 0.5)
      const x = startX + (snapX - startX) * ease
      const y = startY + (snapY - startY) * ease

      setNodes(prev => prev.map(n =>
        n.id === node.id ? { ...n, position: { x, y } } : n
      ))

      if (t < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [setNodes, mapView])

  // Orbit ring radii for home view — match hub layout radii from DESIGN.md
  const [activeRings, setActiveRings] = useState<number[]>(RING_RADII)

  const handleViewModeChange = useCallback((mode: 'map' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('realdeal:pods-view-mode', mode)
  }, [])

  const handleListPodClick = useCallback((pod: Pod) => {
    setMapView('pod')
    mapViewRef.current = 'pod'
    setSelectedPod(pod)
  }, [])

  const handleListBack = useCallback(() => {
    setMapView('hub')
    mapViewRef.current = 'hub'
    setSelectedPod(null)
  }, [])

  const handleListCategoryClick = useCallback((categoryId: string) => {
    navigate(`/category/${categoryId}`)
  }, [navigate])

  const handleResetLayout = useCallback(() => {
    clearAllPositions()
    localStorage.removeItem(VIEWPORT_KEY)
    const { nodes: homeNodes, activeRings: rings, ringIndexByPod: ringMap } = buildHomeNodes({
      pods: podsRef.current,
      countsByPod: countsByPodRef.current,
      equityByPod: equityByPodRef.current,
      categoriesByPod: categoriesByPodRef.current,
      
      memberCountByPod: memberCountByPodRef.current,
      overallHealth: overallHealthRef.current,
      totalContacts: totalContactsRef.current,
      userName,
      onCreatePod: () => setShowCreatePod(true),
      onPodHoverEnter: handlePodHoverEnter,
      onPodHoverLeave: handlePodHoverLeave,
      onDrillIn: (pod) => drillInRef.current?.(pod),
    })
    setNodes(homeNodes)
    setActiveRings(rings)
    ringByPodRef.current = ringMap
    setEdges(buildHomeEdges(podsRef.current, equityByPodRef.current))
    requestAnimationFrame(() => {
      fitView({ padding: 0.22, duration: 250 })
    })
  }, [setNodes, setEdges, fitView, handlePodHoverEnter, handlePodHoverLeave])

  return (
    <div ref={containerRef} style={{
      width: '100%',
      height: '100%',
      position: 'relative',
    }}>

      {/* Loading state — centered pulsing orb placeholder */}
      {!podsLoaded && !initError && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', zIndex: 10,
          gap: 16,
        }}>
          <div className="skeleton" style={{
            width: 96, height: 96, borderRadius: '50%',
          }} />
          <div className="skeleton" style={{
            width: 80, height: 12, borderRadius: 6,
          }} />
        </div>
      )}

      {/* Init failure — indistinguishable from loading without this */}
      {initError && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Could not load your network. Check your connection and refresh.
          </p>
        </div>
      )}

      {/* Empty map — no pods yet */}
      {podsLoaded && podsCount === 0 && !initError && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          <div style={{ pointerEvents: 'auto', maxWidth: 340, textAlign: 'center' }}>
            {/* Mini illustration: 3 example orbs */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20,
            }}>
              {['#7C3AED', '#0EA5E9', '#F59E0B'].map((c, i) => (
                <div key={c} style={{
                  width: 36 + i * 6, height: 36 + i * 6, borderRadius: '50%',
                  background: c, opacity: 0.25 + i * 0.15,
                  animation: `modal-fade-in 0.4s ease-out ${i * 0.1}s both`,
                }} />
              ))}
            </div>
            <h3 style={{
              fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)',
              color: 'var(--color-text-primary)', margin: '0 0 6px',
              letterSpacing: '-0.01em',
            }}>
              Your network starts here
            </h3>
            <p style={{
              fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 16px',
              lineHeight: 1.5,
            }}>
              Pods are groups of people you want to nurture - like Investors, Advisors, or Close Friends.
            </p>
            <button
              type="button"
              onClick={() => setShowCreatePod(true)}
              style={{
                padding: '8px 20px', borderRadius: 8,
                border: 'none', cursor: 'pointer',
                background: 'var(--color-brand)', color: '#fff',
                fontSize: 13, fontWeight: 600,
                transition: 'opacity 0.15s',
              }}
            >
              Create your first pod
            </button>
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => window.location.href = '/import'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: 'var(--color-text-tertiary)',
                  textDecoration: 'underline',
                }}
              >
                Import contacts instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hub stats bar - glass card with quick-glance metrics */}
      {viewMode === 'map' && mapView === 'hub' && podsLoaded && podsCount > 0 && (
        <div className="hub-stats-bar">
          <div className="stat-item">
            <span className="stat-value">{hubStats.podCount}</span>
            <span>{hubStats.podCount === 1 ? 'pod' : 'pods'}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">{hubStats.contactCount}</span>
            <span>relationships</span>
          </div>
          {hubStats.overallHealth !== undefined && (
            <>
              <div className="stat-divider" />
              <div className="stat-item">
                <span style={{
                  padding: '1px 8px',
                  borderRadius: 100,
                  fontSize: 10,
                  fontWeight: 600,
                  background: HEALTH_COLORS[scoreLabel(hubStats.overallHealth)]?.bg,
                  color: HEALTH_COLORS[scoreLabel(hubStats.overallHealth)]?.color,
                }}>
                  {scoreLabel(hubStats.overallHealth)} {hubStats.overallHealth}
                </span>
              </div>
            </>
          )}
          {hubStats.overdueCount > 0 && (
            <>
              <div className="stat-divider" />
              <div className="stat-item" style={{ color: 'var(--health-cooling)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span style={{ fontWeight: 600 }}>{hubStats.overdueCount}</span>
                <span>need attention</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Pod detail overlay - glass panel on dimmed map */}
      {viewMode === 'map' && mapView === 'pod' && selectedPod && (
        <>
          {/* Dim backdrop */}
          <div
            onClick={drillBackToHub}
            style={{
              position: 'absolute', inset: 0, zIndex: 30,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              animation: 'pod-overlay-dim 0.35s ease-out both',
            }}
          />
          {/* Glass panel */}
          <div
            style={{
              position: 'absolute',
              top: 16, right: 16, bottom: 16,
              width: 'min(520px, calc(100% - 32px))',
              zIndex: 31,
              background: 'var(--surface-panel)',
              border: '1px solid var(--edge)',
              borderRadius: 16,
              boxShadow: '0 16px 64px rgba(0,0,0,0.25)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              animation: 'pod-overlay-slide 0.4s cubic-bezier(0.22,1,0.36,1) both',
            }}
          >
            {/* Header bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 16px',
              borderBottom: '1px solid var(--edge)',
              flexShrink: 0,
            }}>
              <button
                onClick={drillBackToHub}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: selectedPod.color ?? '#718096',
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {selectedPod.name}
              </span>
              <button
                onClick={() => navigate(`/pod/${selectedPod.id}`)}
                style={{
                  marginLeft: 'auto',
                  background: 'none', border: '1px solid var(--edge)',
                  borderRadius: 6, padding: '4px 10px',
                  fontSize: 11, color: 'var(--color-text-secondary)',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--tint)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Open full page
              </button>
              {!isMobile && (
                <span style={{
                  fontSize: 9, color: 'var(--color-text-tertiary)',
                  opacity: 0.5,
                }}>
                  Esc
                </span>
              )}
            </div>
            {/* Scrollable content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
              <PodDetailPage podIdProp={selectedPod.id} onClose={drillBackToHub} />
            </div>
          </div>
        </>
      )}

      {/* Top-right controls: view toggle + reset layout */}
      {podsLoaded && podsCount > 0 && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {viewMode === 'map' && mapView === 'hub' && (
            <button
              type="button"
              onClick={handleResetLayout}
              title="Reset orb positions"
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--edge)',
                background: 'var(--nav-bg)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-secondary)',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
          )}
          <ViewToggle mode={viewMode} onChange={handleViewModeChange} />
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && podsLoaded && (
        <PodListView
          pods={podsRef.current}
          countsByPod={countsByPodRef.current}
          equityByPod={equityByPodRef.current}
          categoriesByPod={categoriesByPodRef.current}
          selectedPod={selectedPod}
          onPodClick={handleListPodClick}
          onCategoryClick={handleListCategoryClick}
          onBack={handleListBack}
        />
      )}

      {/* Map view */}
      {viewMode === 'map' && (
        <>
          {/* Pod hover tooltip - tracks cursor */}
          {hoveredPod && (
            <div
              ref={tooltipRef}
              className="pod-tooltip"
              style={{
                left: cursorRef.current.x + 16,
                top: cursorRef.current.y + 16,
              }}
            >
              <div className="tooltip-header">
                <span className="tooltip-dot" style={{ background: hoveredPod.pod.color ?? '#718096' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em' }}>
                  {hoveredPod.pod.name}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 100,
                  fontSize: 10,
                  fontWeight: 600,
                  background: HEALTH_COLORS[scoreLabel(hoveredPod.health)]?.bg,
                  color: HEALTH_COLORS[scoreLabel(hoveredPod.health)]?.color,
                }}>
                  {scoreLabel(hoveredPod.health)} {hoveredPod.health}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                  {hoveredPod.contactCount} {hoveredPod.contactCount === 1 ? 'person' : 'people'}
                </span>
              </div>

              {hoveredPod.pod.cadence && (
                <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {hoveredPod.pod.cadence} check-in
                </span>
              )}

              <div style={{ height: 1, background: 'var(--edge)', margin: '2px 0' }} />

              {hoveredPod.overdueCount > 0 ? (
                <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--health-cooling)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {hoveredPod.overdueCount} {hoveredPod.overdueCount === 1 ? 'person needs' : 'people need'} attention
                </span>
              ) : hoveredPod.contactCount > 0 ? (
                <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--health-thriving)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  All caught up
                </span>
              ) : null}

              <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>
                Last reached out {formatLastInteracted(hoveredPod.lastInteracted)}
              </span>

              <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', opacity: 0.5, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                Click to explore
              </span>
            </div>
          )}

          {/* Orbit rings with subtle glow — hidden during drill-down */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 0,
              overflow: 'visible',
              display: mapView === 'pod' ? 'none' : undefined,
            }}
          >
            <defs>
              <filter id="ring-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
              {activeRings.map((r, ri) => (
                <circle
                  key={r}
                  className="ring-enter"
                  style={{ '--ring-delay': `${ri * 0.15}s` } as React.CSSProperties}
                  cx={0}
                  cy={0}
                  r={r}
                  fill="none"
                  stroke="var(--stroke-subtle)"
                  strokeWidth={1.5 / viewport.zoom}
                  strokeOpacity={0.5 - ri * 0.1}
                  filter="url(#ring-glow)"
                />
              ))}
            </g>
          </svg>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeDragStart={handleNodeDragStart}
            onNodeDrag={handleNodeDrag}
            onNodeDragStop={handleNodeDragStop}
            fitView={fitViewEnabled}
            fitViewOptions={{ padding: 0.22 }}
            minZoom={0.3}
            maxZoom={2.5}
            translateExtent={[[-1500, -1500], [1500, 1500]]}
            nodesDraggable
            edgesReconnectable={false}
            edgesFocusable={false}
            nodesFocusable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              color="var(--edge)"
              gap={52}
              size={1}
            />
          </ReactFlow>

          {/* FAB: Add Pod */}
          {mapView === 'hub' && podsLoaded && (
            <button
              type="button"
              onClick={() => setShowCreatePod(true)}
              title="Create new pod"
              style={{
                position: 'absolute',
                bottom: 24,
                right: 24,
                zIndex: 20,
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: 'none',
                background: '#25B439',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(37,180,57,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.1)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,180,57,0.45)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,180,57,0.35)'
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}

          {/* Map legend - bottom left */}
          {mapView === 'hub' && podsLoaded && podsCount > 0 && <MapLegend />}
        </>
      )}

      <PodCreateModal
        isOpen={showCreatePod}
        onClose={() => setShowCreatePod(false)}
        onCreated={handlePodCreated}
      />

    </div>
  )
}
