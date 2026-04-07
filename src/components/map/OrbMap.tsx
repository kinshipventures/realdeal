import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { indexByContact, podEquityScore, overallEquityScore, scoreLabel, type ScoreLabel } from '../../lib/equity'
import type { Category, Pod } from '../../lib/types'
import { POD_SHIFT_COLORS } from './SolidOrb'
import { useAuth } from '../../contexts/AuthContext'
import { isDemoMode } from '../../lib/sampleData'
import { EmptyState } from '../empty/EmptyState'
import { ListNodeComponent } from './ListNode'
import { CategoryNodeComponent } from './CategoryNode'
import { MojNodeComponent, MOJ_ID, MOJ_SIZE } from './MojNode'
import { CreateCategoryNodeComponent } from './CreateCategoryNode'
import { GradientEdgeComponent } from './GradientEdge'
import { getPositions, savePosition, clearAllPositions } from '../../hooks/useNodePositions'
import { PodCreateModal } from '../pods/PodCreateModal'

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
  savedPositions: Record<string, { x: number; y: number }>,
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
      listPositions.set(item.id, savedPositions[item.id] ?? {
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
  savedPositions: Record<string, { x: number; y: number }>
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
  savedPositions,
  memberCountByPod,
  overallHealth,
  totalContacts,
  userName,
  onCreatePod,
  onPodHoverEnter,
  onPodHoverLeave,
  onDrillIn,
}: BuildHomeNodesParams): { nodes: Node[]; activeRings: number[]; ringIndexByPod: Map<string, number> } {
  const { mojPos, listPositions, activeRings, ringIndexByPod } = hubLayout(pods, savedPositions)
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

const DRILL_RADIUS = 200
const CAT_SIZE = 64

function buildDrillNodes(
  pod: Pod,
  categories: Category[],
  equityByPod: Record<string, number>,
  totalContacts: number,
  navigateFn: (path: string) => void,
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

  const catNodes: Node[] = categories.map((cat, i) => {
    const angle = (i / categories.length) * 2 * Math.PI - Math.PI / 2
    const x = Math.cos(angle) * DRILL_RADIUS - CAT_SIZE / 2
    const y = Math.sin(angle) * DRILL_RADIUS - CAT_SIZE / 2
    return {
      id: cat.id,
      type: 'category',
      position: { x, y },
      style: { overflow: 'visible' },
      data: {
        category: cat,
        listColor: pod.color,
        onClick: () => navigateFn(`/category/${cat.id}`),
        animationDelay: `${(i + 1) * 0.08}s`,
      },
    }
  })

  return { nodes: [centerNode, ...catNodes] }
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
  const { setViewport, fitView } = useReactFlow()
  const navigate = useNavigate()
  const { session } = useAuth()
  const userName = isDemoMode() ? 'Moj Mahdara' : (session?.user?.user_metadata?.full_name as string | undefined)
  const [activeHighlights, setActiveHighlights] = useState<Set<string>>(new Set())

  const [viewMode, setViewMode] = useState<'map' | 'list'>(() =>
    (localStorage.getItem('realdeal:pods-view-mode') as 'map' | 'list') || 'map'
  )

  const [mapView, setMapView] = useState<'hub' | 'pod'>('hub')
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null)
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

  const rebuildHomeView = useCallback((savedPositions: Record<string, { x: number; y: number }>) => {
    const { nodes: homeNodes, activeRings: rings, ringIndexByPod: ringMap } = buildHomeNodes({
      pods: podsRef.current,
      countsByPod: countsByPodRef.current,
      equityByPod: equityByPodRef.current,
      categoriesByPod: categoriesByPodRef.current,
      savedPositions,
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

    // Step 1: fade non-selected pods, switch view state immediately to hide orbit rings
    setMapView('pod')
    mapViewRef.current = 'pod'
    setSelectedPod(pod)
    setNodes(prev => prev.map(n => {
      if (n.id === pod.id) return n
      if (n.id === MOJ_ID) return n
      return { ...n, data: { ...n.data, fading: true } }
    }))

    setTimeout(() => {
      // Step 2: build drill nodes and fit to them
      const cats = categoriesByPodRef.current[pod.id] ?? []
      const { nodes: drillNodes } = buildDrillNodes(
        pod, cats, equityByPodRef.current,
        countsByPodRef.current[pod.id]?.total ?? 0,
        navigate,
      )
      setNodes(drillNodes)
      setEdges([])

      // Step 3: fitView centers on actual node positions with padding
      requestAnimationFrame(() => {
        fitView({ padding: 0.35, duration: 250 })
        setTimeout(() => {
          isAnimating.current = false
        }, 300)
      })
    }, 150)
  }, [setNodes, setEdges, fitView, navigate])

  drillInRef.current = drillIntoPod

  const drillBackToHub = useCallback(() => {
    if (isAnimating.current) return
    isAnimating.current = true

    // Fade out category nodes
    setNodes(prev => prev.map(n =>
      n.id === MOJ_ID ? n : { ...n, data: { ...n.data, fading: true } }
    ))

    setTimeout(() => {
      setMapView('hub')
      mapViewRef.current = 'hub'
      setSelectedPod(null)
      rebuildHomeView(getPositions())

      requestAnimationFrame(() => {
        fitView({ padding: 0.22, duration: 250 })
        setTimeout(() => {
          isAnimating.current = false
          setFitViewEnabled(true)
        }, 300)
      })
    }, 150)
  }, [setNodes, rebuildHomeView, fitView])

  drillBackRef.current = drillBackToHub

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

      rebuildHomeView(getPositions())
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

        const savedPositions = getPositions()
        const { nodes: homeNodes, activeRings: rings, ringIndexByPod: ringMap } = buildHomeNodes({
          pods: allPods,
          countsByPod,
          equityByPod,
          categoriesByPod: catsByPod,
          savedPositions,
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
    if (ringIdx === undefined) { savePosition(node.id, node.position.x, node.position.y); return }

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
      } else {
        savePosition(node.id, snapX, snapY)
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
      savedPositions: {},
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
          <div style={{ pointerEvents: 'auto' }}>
            <EmptyState
              icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
              heading="Your network starts here"
              subtext="Create your first pod to start mapping relationships."
              ctaLabel="Create first pod"
              onCta={() => setShowCreatePod(true)}
            />
          </div>
        </div>
      )}

      {/* Breadcrumb — visible during map drill-down */}
      {viewMode === 'map' && mapView === 'pod' && selectedPod && (
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 8,
          background: 'var(--nav-bg)', backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--edge)',
        }}>
          <button onClick={drillBackToHub} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', userSelect: 'none' }}>Hub</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', userSelect: 'none' }}>/</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', userSelect: 'none' }}>{selectedPod.name}</span>
        </div>
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
              style={{
                position: 'fixed',
                left: cursorRef.current.x + 16,
                top: cursorRef.current.y + 16,
                zIndex: 30,
                background: 'var(--nav-bg)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid var(--edge)',
                borderRadius: 10,
                padding: '10px 14px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                pointerEvents: 'none',
                minWidth: 140,
                opacity: 0,
                animation: 'tooltip-fade-in 0.15s ease forwards',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {hoveredPod.pod.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                {hoveredPod.health} - {scoreLabel(hoveredPod.health)}
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                {hoveredPod.contactCount} people - {hoveredPod.overdueCount} overdue
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                Last: {formatLastInteracted(hoveredPod.lastInteracted)}
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
            minZoom={0.15}
            maxZoom={2.5}
            translateExtent={[[-800, -800], [800, 800]]}
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
