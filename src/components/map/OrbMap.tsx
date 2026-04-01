import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { indexByContact, podEquityScore } from '../../lib/equity'
import type { Category, Pod } from '../../lib/types'
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

// Radii for orbital rings — pods distribute across these
const RING_RADII = [210, 330, 460]

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
  onCreatePod: () => void
}

function buildHomeNodes({
  pods,
  countsByPod,
  equityByPod,
  categoriesByPod,
  savedPositions,
  memberCountByPod,
  onCreatePod,
}: BuildHomeNodesParams): { nodes: Node[]; activeRings: number[] } {
  const { mojPos, listPositions, activeRings, ringIndexByPod } = hubLayout(pods, savedPositions)
  const DEPTH_BY_RING = [1.0, 0.92, 0.85]

  const mojNode: Node = {
    id: MOJ_ID,
    type: 'moj',
    position: mojPos,
    draggable: false,
    style: { overflow: 'visible' },
    data: {},
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
      },
    })
  })

  return { nodes: [mojNode, ...podNodes], activeRings }
}

function buildHomeEdges(_pods: Pod[]): Edge[] {
  return []
}

const VIEWPORT_KEY = 'realdeal:map-viewport'

function loadViewport(): Viewport | null {
  try {
    const raw = localStorage.getItem(VIEWPORT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function OrbMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const { setViewport } = useReactFlow()

  // Persist viewport to localStorage on pan/zoom; track for orbit rings overlay + parallax
  useOnViewportChange({
    onChange: (vp: Viewport) => {
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
    onEnd: (vp: Viewport) => localStorage.setItem(VIEWPORT_KEY, JSON.stringify(vp)),
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

  // Parallax: track cumulative pan offset, apply via CSS custom properties
  const panRef = useRef({ x: 0, y: 0 })
  const prevVpRef = useRef<Viewport>({ x: 0, y: 0, zoom: 1 })
  const rafRef = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)


  const rebuildHomeView = useCallback((savedPositions: Record<string, { x: number; y: number }>) => {
    const { nodes: homeNodes, activeRings: rings } = buildHomeNodes({
      pods: podsRef.current,
      countsByPod: countsByPodRef.current,
      equityByPod: equityByPodRef.current,
      categoriesByPod: categoriesByPodRef.current,
      savedPositions,
      memberCountByPod: memberCountByPodRef.current,
      onCreatePod: () => setShowCreatePod(true),
    })
    setNodes(homeNodes)
    setActiveRings(rings)
    setEdges(buildHomeEdges(podsRef.current))
  }, [setNodes, setEdges])

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

        const catsByPod: Record<string, Category[]> = {}
        for (const cat of allCategoriesRaw) {
          if (!catsByPod[cat.list_id]) catsByPod[cat.list_id] = []
          catsByPod[cat.list_id].push(cat)
        }
        categoriesByPodRef.current = catsByPod

        const savedPositions = getPositions()
        const { nodes: homeNodes, activeRings: rings } = buildHomeNodes({
          pods: allPods,
          countsByPod,
          equityByPod,
          categoriesByPod: catsByPod,
          savedPositions,
          memberCountByPod,
          onCreatePod: () => setShowCreatePod(true),
        })
        setNodes(homeNodes)
        setActiveRings(rings)
        setEdges(buildHomeEdges(allPods))
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
    if (node.id === MOJ_ID) return
    lastDragPosRef.current = null
    savePosition(node.id, node.position.x, node.position.y)
  }, [])

  // Orbit ring radii for home view — match hub layout radii from DESIGN.md
  const [activeRings, setActiveRings] = useState<number[]>(RING_RADII)

  const handleResetLayout = useCallback(() => {
    clearAllPositions()
    localStorage.removeItem(VIEWPORT_KEY)
    const { nodes: homeNodes, activeRings: rings } = buildHomeNodes({
      pods: podsRef.current,
      countsByPod: countsByPodRef.current,
      equityByPod: equityByPodRef.current,
      categoriesByPod: categoriesByPodRef.current,
      savedPositions: {},
      memberCountByPod: memberCountByPodRef.current,
      onCreatePod: () => setShowCreatePod(true),
    })
    setNodes(homeNodes)
    setActiveRings(rings)
    setEdges(buildHomeEdges(podsRef.current))
    setViewport({ x: 0, y: 0, zoom: 1 })
    setViewportState({ x: 0, y: 0, zoom: 1 })
  }, [setViewport, setNodes, setEdges])

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

      {/* Reset layout button */}
      {podsLoaded && podsCount > 0 && (
        <button
          type="button"
          onClick={handleResetLayout}
          title="Reset orb positions"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 20,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid var(--edge)',
            background: 'var(--nav-bg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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

      {/* Orbit rings with subtle glow */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'visible',
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
        onInit={() => {
          const saved = loadViewport()
          if (saved) {
            setViewport(saved)
            setViewportState(saved)
          }
        }}
        fitView={!loadViewport()}
        fitViewOptions={{ padding: 0.22 }}
        minZoom={0.15}
        maxZoom={2.5}
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
      {podsLoaded && (
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
            background: 'var(--green-band)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(37,180,57,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
            fontSize: 24,
            fontWeight: 300,
            lineHeight: 1,
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
          +
        </button>
      )}

      <PodCreateModal
        isOpen={showCreatePod}
        onClose={() => setShowCreatePod(false)}
        onCreated={handlePodCreated}
      />

    </div>
  )
}
