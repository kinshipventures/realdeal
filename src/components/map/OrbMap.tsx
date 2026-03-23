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
import { getPods, getCategories, getContacts, getAllInteractions, isOverdue, createCategory } from '../../lib/airtable'
import { indexByContact, podEquityScore } from '../../lib/equity'
import type { Category, Pod } from '../../lib/types'
import { EmptyState } from '../empty/EmptyState'
import { ListNodeComponent } from './ListNode'
import { CategoryNodeComponent } from './CategoryNode'
import { MojNodeComponent, MOJ_ID, MOJ_SIZE } from './MojNode'
import { CreateCategoryNodeComponent } from './CreateCategoryNode'
import { SatelliteNodeComponent } from './SatelliteNode'
import { ContactPanel } from '../contacts/ContactPanel'
import { getPositions, savePosition, clearPositionsForIds, clearAllPositions } from '../../hooks/useNodePositions'

const LIST_SIZE = 96

const nodeTypes = {
  list: ListNodeComponent,
  category: CategoryNodeComponent,
  moj: MojNodeComponent,
  'create-category': CreateCategoryNodeComponent,
  satellite: SatelliteNodeComponent,
}

const CREATE_CAT_ID = '__create-category__'

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

function circularLayout(
  items: { id: string }[],
  savedPositions: Record<string, { x: number; y: number }>,
  center: { x: number; y: number },
  radius = 230
): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>()
  items.forEach((item, i) => {
    const angle = (i / items.length) * 2 * Math.PI - Math.PI / 2
    map.set(item.id, savedPositions[item.id] ?? {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    })
  })
  return map
}

type PodCounts = { total: number; overdue: number }

function buildHomeNodes(
  pods: Pod[],
  countsByPod: Record<string, PodCounts>,
  equityByPod: Record<string, number>,
  categoriesByPod: Record<string, Category[]>,
  savedPositions: Record<string, { x: number; y: number }>,
  onPodClick: (pod: Pod, pos: { x: number; y: number }) => void
): { nodes: Node[]; activeRings: number[] } {
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
        onClick: () => onPodClick(pod, pos),
      },
    })

    // Satellite category orbs — cluster near parent pod
    const cats = categoriesByPod[pod.id] ?? []
    if (cats.length > 0) {
      const podCenterX = pos.x + LIST_SIZE / 2
      const podCenterY = pos.y + LIST_SIZE / 2
      const satRadius = 62 + cats.length * 2 // tighten or spread based on count
      const SAT_SIZE = 20

      cats.forEach((cat, ci) => {
        // Angle: spread around the outward side of the pod (away from hub)
        const podAngle = Math.atan2(podCenterY - hubCenterY, podCenterX - hubCenterX)
        const spread = Math.min(cats.length * 0.4, Math.PI * 0.8)
        const startAngle = podAngle - spread / 2
        const angle = startAngle + (ci / Math.max(cats.length - 1, 1)) * spread
        const satColor = cat.color ?? pod.color ?? '#718096'

        satelliteNodes.push({
          id: `sat-${pod.id}-${cat.id}`,
          type: 'satellite',
          position: {
            x: podCenterX + Math.cos(angle) * satRadius - SAT_SIZE / 2,
            y: podCenterY + Math.sin(angle) * satRadius - SAT_SIZE / 2,
          },
          draggable: false,
          data: {
            name: cat.name,
            color: satColor,
            onClick: () => onPodClick(pod, pos),
          },
        })
      })
    }
  })

  return { nodes: [mojNode, ...podNodes, ...satelliteNodes], activeRings }
}

function buildHomeEdges(pods: Pod[]): Edge[] {
  return pods.map(pod => ({
    id: `e-moj-${pod.id}`,
    source: MOJ_ID,
    target: pod.id,
    style: { stroke: 'var(--stroke-subtle)', strokeWidth: 1.5 },
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

  const [view, setView] = useState<'lists' | 'categories'>('lists')
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [initError, setInitError] = useState(false)
  const [podsLoaded, setPodsLoaded] = useState(false)
  const [podsCount, setPodsCount] = useState(0)
  const [catRefresh, setCatRefresh] = useState(0)
  const [viewport, setViewportState] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })

  const podsRef = useRef<Pod[]>([])
  const countsByPodRef = useRef<Record<string, PodCounts>>({})
  const equityByPodRef = useRef<Record<string, number>>({})
  const categoriesByPodRef = useRef<Record<string, Category[]>>({})
  const viewRef = useRef<'lists' | 'categories'>('lists')
  const selectedPodRef = useRef<Pod | null>(null)
  // Generation counter — discards stale responses if user clicks a different list quickly
  const listClickGenRef = useRef(0)
  // Track all active error-clear timeout IDs for cleanup on unmount
  const errorTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  // Cleanup pending timeouts on unmount
  useEffect(() => {
    const timeouts = errorTimeoutsRef.current
    return () => { timeouts.forEach(clearTimeout) }
  }, [])

  const handlePodClick = useCallback((pod: Pod, position: { x: number; y: number }) => {
    if (viewRef.current === 'categories' && selectedPodRef.current?.id === pod.id) return

    const gen = ++listClickGenRef.current

    viewRef.current = 'categories'
    selectedPodRef.current = pod
    setSelectedPod(pod)
    setView('categories')
    setSelectedCategoryId(null)

    setNodes(prev => prev.map(n =>
      n.id === pod.id ? { ...n, data: { ...n.data, loading: true } } : n
    ))

    getCategories(pod.id).then(async (cats: Category[]) => {
      if (gen !== listClickGenRef.current) return  // discard stale response

      const savedPositions = getPositions()
      const CAT_SIZE = 64
      const CAT_GAP = 24
      const layoutItems = [...cats, { id: CREATE_CAT_ID }]
      const minRadius = Math.ceil(layoutItems.length * (CAT_SIZE + CAT_GAP) / (2 * Math.PI))
      const radius = Math.max(230, minRadius)
      const posMap = circularLayout(layoutItems, savedPositions, position, radius)

      const allContacts = await getContacts()
      const countsByCategory: Record<string, number> = {}
      for (const contact of allContacts) {
        if (!contact.list_ids.includes(pod.id)) continue
        for (const catId of contact.category_ids) {
          countsByCategory[catId] = (countsByCategory[catId] ?? 0) + 1
        }
      }

      const podCounts = countsByPodRef.current[pod.id] ?? { total: 0, overdue: 0 }
      const podNode: Node = {
        id: pod.id,
        type: 'list',
        position,
        style: { overflow: 'visible' },
        data: {
          list: pod,
          contactCount: podCounts.total,
          overdueCount: podCounts.overdue,
          loading: false,
          onClick: undefined,
        },
      }

      const catNodes: Node[] = cats.map((cat, i) => ({
        id: cat.id,
        type: 'category',
        position: posMap.get(cat.id)!,
        style: { overflow: 'visible' },
        data: {
          category: cat,
          listColor: pod.color,
          contactCount: countsByCategory[cat.id] ?? 0,
          animationDelay: `${i * 0.03}s`,
          onClick: () => setSelectedCategoryId(prev => prev === cat.id ? null : cat.id),
        },
      }))

      const createNode: Node = {
        id: CREATE_CAT_ID,
        type: 'create-category',
        position: posMap.get(CREATE_CAT_ID)!,
        draggable: false,
        style: { overflow: 'visible' },
        data: {
          listColor: pod.color,
          animationDelay: `${cats.length * 0.03}s`,
          onCreate: async (name: string) => {
            await createCategory(name, pod.id)
            clearPositionsForIds(cats.map(c => c.id))
            setCatRefresh(r => r + 1)
          },
        },
      }

      const edgeColor = pod.color ? `${pod.color}30` : 'var(--edge)'
      const catEdges: Edge[] = cats.map(cat => ({
        id: `e-${pod.id}-${cat.id}`,
        source: pod.id,
        target: cat.id,
        style: { stroke: edgeColor, strokeWidth: 0.75 },
        type: 'straight',
      }))

      setNodes([podNode, ...catNodes, createNode])
      setEdges(catEdges)
    }).catch(() => {
      if (gen !== listClickGenRef.current) return

      const podId = pod.id
      setNodes(prev => prev.map(n =>
        n.id === podId ? { ...n, data: { ...n.data, loading: false, loadError: true } } : n
      ))

      // Clear the error indicator after animation completes; track timeout for cleanup
      const timeoutId = setTimeout(() => {
        errorTimeoutsRef.current.delete(timeoutId)
        setNodes(prev => prev.map(n =>
          n.id === podId ? { ...n, data: { ...n.data, loadError: false } } : n
        ))
      }, 2000)
      errorTimeoutsRef.current.add(timeoutId)
    })
  }, [])

  const handleBack = useCallback(() => {
    viewRef.current = 'lists'
    selectedPodRef.current = null
    setView('lists')
    setSelectedPod(null)
    setSelectedCategoryId(null)
    const savedPositions = getPositions()
    const { nodes: homeNodes, activeRings: rings } = buildHomeNodes(podsRef.current, countsByPodRef.current, equityByPodRef.current, categoriesByPodRef.current, savedPositions, handlePodClick)
    setNodes(homeNodes)
    setActiveRings(rings)
    setEdges(buildHomeEdges(podsRef.current))
  }, [handlePodClick])

  // Re-build category view after a new category is created
  useEffect(() => {
    if (catRefresh === 0) return
    const pod = selectedPodRef.current
    if (!pod) return
    const podNode = nodes.find(n => n.id === pod.id)
    if (!podNode) return
    // Reset view state so handlePodClick's early-return guard doesn't block
    viewRef.current = 'lists'
    handlePodClick(pod, podNode.position)
  }, [catRefresh]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let stale = false
    async function init() {
      try {
        const [allPods, allContacts, allInteractions, allCategories] = await Promise.all([getPods(), getContacts(), getAllInteractions(), getCategories()])
        if (stale) return
        podsRef.current = allPods

        const countsByPod: Record<string, PodCounts> = {}
        for (const contact of allContacts) {
          for (const podId of contact.list_ids) {
            if (!countsByPod[podId]) countsByPod[podId] = { total: 0, overdue: 0 }
            countsByPod[podId].total++
            if (isOverdue(contact)) countsByPod[podId].overdue++
          }
        }
        countsByPodRef.current = countsByPod

        // Compute equity score per pod for health rings
        const byContact = indexByContact(allInteractions)
        const equityByPod: Record<string, number> = {}
        for (const pod of allPods) {
          const podContacts = allContacts.filter(c => c.list_ids.includes(pod.id))
          if (podContacts.length > 0) {
            equityByPod[pod.id] = podEquityScore(podContacts, byContact)
          }
        }
        equityByPodRef.current = equityByPod

        // Group categories by pod for satellite orbs
        const catsByPod: Record<string, Category[]> = {}
        for (const cat of allCategories) {
          if (!catsByPod[cat.list_id]) catsByPod[cat.list_id] = []
          catsByPod[cat.list_id].push(cat)
        }
        categoriesByPodRef.current = catsByPod

        const savedPositions = getPositions()
        const { nodes: homeNodes, activeRings: rings } = buildHomeNodes(allPods, countsByPod, equityByPod, catsByPod, savedPositions, handlePodClick)
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

  const handleNodeDragStop: OnNodeDrag = useCallback((_, node) => {
    if (node.id === MOJ_ID) return
    savePosition(node.id, node.position.x, node.position.y)
  }, [])

  const selectedCategoryNode = nodes.find(n => n.id === selectedCategoryId)
  const selectedCategory = selectedCategoryNode?.data.category as Category | undefined

  // Orbit ring radii for home view — match hub layout radii from DESIGN.md
  const [activeRings, setActiveRings] = useState<number[]>(RING_RADII)

  const handleResetLayout = useCallback(() => {
    clearAllPositions()
    localStorage.removeItem(VIEWPORT_KEY)
    const { nodes: homeNodes, activeRings: rings } = buildHomeNodes(podsRef.current, countsByPodRef.current, equityByPodRef.current, categoriesByPodRef.current, {}, handlePodClick)
    setNodes(homeNodes)
    setActiveRings(rings)
    setEdges(buildHomeEdges(podsRef.current))
    setViewport({ x: 0, y: 0, zoom: 1 })
    setViewportState({ x: 0, y: 0, zoom: 1 })
  }, [handlePodClick, setViewport])

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
              onCta={() => {}}
            />
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      {view === 'categories' && selectedPod && (
        <nav style={{
          position: 'absolute',
          top: 28,
          left: 28,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 18px',
          borderRadius: 100,
          background: 'var(--surface-panel)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--edge)',
          fontSize: 12,
          letterSpacing: '0.01em',
        }}>
          <button
            type="button"
            onClick={handleBack}
            className="action-ghost"
            style={{ padding: 0, fontSize: 12, letterSpacing: '0.01em' }}
          >
            Home
          </button>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 10 }}>›</span>
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{selectedPod.name}</span>
        </nav>
      )}

      {/* Reset layout button */}
      {view === 'lists' && podsLoaded && podsCount > 0 && (
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
      {view === 'lists' && (
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
            {activeRings.map(r => (
              <circle
                key={r}
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
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
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

      {selectedCategoryId && selectedCategory && (
        <ContactPanel
          categoryId={selectedCategoryId}
          categoryName={selectedCategory.name}
          onClose={() => setSelectedCategoryId(null)}
        />
      )}
    </div>
  )
}
