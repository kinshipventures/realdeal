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
import { SatelliteNodeComponent } from './SatelliteNode'
import { getPositions, savePosition, clearAllPositions } from '../../hooks/useNodePositions'
import { PodCreateModal } from '../pods/PodCreateModal'

const LIST_SIZE = 96

const nodeTypes = {
  list: ListNodeComponent,
  category: CategoryNodeComponent,
  moj: MojNodeComponent,
  'create-category': CreateCategoryNodeComponent,
  satellite: SatelliteNodeComponent,
}

const CREATE_POD_ID = '__create-pod__'

// Radii for orbital rings — pods distribute across these
const RING_RADII = [210, 330, 460]

function hubLayout(
  lists: { id: string; is_priority?: boolean }[],
  savedPositions: Record<string, { x: number; y: number }>,
): { mojPos: { x: number; y: number }; listPositions: Map<string, { x: number; y: number }>; activeRings: number[] } {
  const mojPos = { x: -MOJ_SIZE / 2, y: -MOJ_SIZE / 2 }
  const listPositions = new Map<string, { x: number; y: number }>()

  // Distribute pods across rings based on count
  const n = lists.length
  let rings: number[]
  if (n <= 5) rings = [RING_RADII[0]]
  else if (n <= 10) rings = [RING_RADII[0], RING_RADII[1]]
  else rings = RING_RADII

  // Assign each pod to a ring (round-robin)
  const ringBuckets: { id: string; is_priority?: boolean }[][] = rings.map(() => [])
  lists.forEach((item, i) => ringBuckets[i % rings.length].push(item))

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

  return { mojPos, listPositions, activeRings: rings }
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
  const { mojPos, listPositions, activeRings } = hubLayout(pods, savedPositions)

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
  const satelliteNodes: Node[] = []

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
      },
    })

    // Satellite category orbs — cluster near parent pod, fan out on load
    const cats = categoriesByPod[pod.id] ?? []
    if (cats.length > 0) {
      const podCenterX = pos.x + LIST_SIZE / 2
      const podCenterY = pos.y + LIST_SIZE / 2
      const satRadius = 62 + cats.length * 2
      const SAT_SIZE = 20

      cats.forEach((cat, ci) => {
        const podAngle = Math.atan2(podCenterY - hubCenterY, podCenterX - hubCenterX)
        const spread = Math.min(cats.length * 0.4, Math.PI * 0.8)
        const startAngle = podAngle - spread / 2
        const angle = startAngle + (ci / Math.max(cats.length - 1, 1)) * spread
        const satColor = cat.color ?? pod.color ?? '#718096'

        const satX = podCenterX + Math.cos(angle) * satRadius - SAT_SIZE / 2
        const satY = podCenterY + Math.sin(angle) * satRadius - SAT_SIZE / 2
        const orbitStartX = podCenterX - SAT_SIZE / 2 - satX
        const orbitStartY = podCenterY - SAT_SIZE / 2 - satY

        satelliteNodes.push({
          id: `sat-${pod.id}-${cat.id}`,
          type: 'satellite',
          position: { x: satX, y: satY },
          draggable: false,
          data: {
            name: cat.name,
            color: satColor,
            orbitStartX,
            orbitStartY,
            animationDelay: `${(i + 1) * 0.1 + 0.3 + ci * 0.06}s`,
            onClick: () => {},
          },
        })
      })
    }
  })

  // '+' orb to create a new pod — placed at bottom of innermost ring
  const firstRingRadius = activeRings[0]
  const createPodNode: Node = {
    id: CREATE_POD_ID,
    type: 'create-category',
    position: savedPositions[CREATE_POD_ID] ?? {
      x: 0 - 32,
      y: firstRingRadius - 32,
    },
    draggable: false,
    style: { overflow: 'visible' },
    data: {
      animationDelay: `${(pods.length + 1) * 0.1}s`,
      onCreate: async () => { onCreatePod() },
    },
  }

  return { nodes: [mojNode, ...podNodes, ...satelliteNodes, createPodNode], activeRings }
}

function buildHomeEdges(pods: Pod[]): Edge[] {
  return pods.map((pod, i) => ({
    id: `e-moj-${pod.id}`,
    source: MOJ_ID,
    target: pod.id,
    style: { stroke: 'var(--stroke-subtle)', strokeWidth: 1.5, '--edge-delay': `${(i + 1) * 0.1}s` } as React.CSSProperties,
    className: 'edge-enter',
    type: 'straight',
  }))
}

const VIEWPORT_KEY = 'kinshipbrain:map-viewport'

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

  // Persist viewport to localStorage on pan/zoom; track for orbit rings overlay
  useOnViewportChange({
    onChange: (vp: Viewport) => setViewportState(vp),
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

  // Track last known pod position so we can compute drag delta for satellites
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null)

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

  const handleNodeDragStart: OnNodeDrag = useCallback((_, node) => {
    lastDragPosRef.current = { x: node.position.x, y: node.position.y }
  }, [])

  const handleNodeDrag: OnNodeDrag = useCallback((_, node) => {
    if (node.id === MOJ_ID || !lastDragPosRef.current) return
    const satPrefix = `sat-${node.id}-`
    const dx = node.position.x - lastDragPosRef.current.x
    const dy = node.position.y - lastDragPosRef.current.y
    if (dx === 0 && dy === 0) return
    lastDragPosRef.current = { x: node.position.x, y: node.position.y }

    setNodes(prev => prev.map(n =>
      n.id.startsWith(satPrefix)
        ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
        : n
    ))
  }, [setNodes])

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
    <div style={{
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

      {/* Dashed orbit rings — transformed to match React Flow viewport, behind nodes */}
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
              strokeWidth={1 / viewport.zoom}
              strokeDasharray={`${8 / viewport.zoom} ${6 / viewport.zoom}`}
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

      <PodCreateModal
        isOpen={showCreatePod}
        onClose={() => setShowCreatePod(false)}
        onCreated={handlePodCreated}
      />

    </div>
  )
}
