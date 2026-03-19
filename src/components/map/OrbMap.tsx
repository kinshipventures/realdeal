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
import { getPods, getCategories, getContacts, isOverdue, createCategory } from '../../lib/airtable'
import type { Category, Pod } from '../../lib/types'
import { ListNodeComponent } from './ListNode'
import { CategoryNodeComponent } from './CategoryNode'
import { MojNodeComponent, MOJ_ID, MOJ_SIZE } from './MojNode'
import { CreateCategoryNodeComponent } from './CreateCategoryNode'
import { ContactPanel } from '../contacts/ContactPanel'
import { getPositions, savePosition, clearPositionsForIds } from '../../hooks/useNodePositions'

const LIST_SIZE = 96

const nodeTypes = {
  list: ListNodeComponent,
  category: CategoryNodeComponent,
  moj: MojNodeComponent,
  'create-category': CreateCategoryNodeComponent,
}

const CREATE_CAT_ID = '__create-category__'

function hubLayout(
  lists: { id: string }[],
  savedPositions: Record<string, { x: number; y: number }>,
  radius = 310
): { mojPos: { x: number; y: number }; listPositions: Map<string, { x: number; y: number }> } {
  const mojPos = { x: -MOJ_SIZE / 2, y: -MOJ_SIZE / 2 }
  const listPositions = new Map<string, { x: number; y: number }>()

  lists.forEach((item, i) => {
    const angle = (i / lists.length) * 2 * Math.PI - Math.PI / 2
    listPositions.set(item.id, savedPositions[item.id] ?? {
      x: Math.cos(angle) * radius - LIST_SIZE / 2,
      y: Math.sin(angle) * radius - LIST_SIZE / 2,
    })
  })

  return { mojPos, listPositions }
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
  savedPositions: Record<string, { x: number; y: number }>,
  onPodClick: (pod: Pod, pos: { x: number; y: number }) => void
): Node[] {
  const { mojPos, listPositions } = hubLayout(pods, savedPositions)

  const mojNode: Node = {
    id: MOJ_ID,
    type: 'moj',
    position: mojPos,
    draggable: false,
    style: { overflow: 'visible' },
    data: {},
  }

  const podNodes: Node[] = pods.map((pod, i) => {
    const pos = listPositions.get(pod.id)!
    const counts = countsByPod[pod.id] ?? { total: 0, overdue: 0 }
    return {
      id: pod.id,
      type: 'list',
      position: pos,
      style: { overflow: 'visible' },
      data: {
        list: pod,
        contactCount: counts.total,
        overdueCount: counts.overdue,
        loading: false,
        animationDelay: `${i * 0.04}s`,
        onClick: () => onPodClick(pod, pos),
      },
    }
  })

  return [mojNode, ...podNodes]
}

function buildHomeEdges(pods: Pod[]): Edge[] {
  return pods.map(pod => ({
    id: `e-moj-${pod.id}`,
    source: MOJ_ID,
    target: pod.id,
    style: { stroke: 'rgba(0,0,0,0.07)', strokeWidth: 0.75 },
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

  // Persist viewport to localStorage on pan/zoom end
  useOnViewportChange({ onEnd: (vp: Viewport) => localStorage.setItem(VIEWPORT_KEY, JSON.stringify(vp)) })

  const [view, setView] = useState<'lists' | 'categories'>('lists')
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [initError, setInitError] = useState(false)
  const [catRefresh, setCatRefresh] = useState(0)

  const podsRef = useRef<Pod[]>([])
  const countsByPodRef = useRef<Record<string, PodCounts>>({})
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

      const edgeColor = pod.color ? `${pod.color}30` : 'rgba(0,0,0,0.07)'
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
    setNodes(buildHomeNodes(podsRef.current, countsByPodRef.current, savedPositions, handlePodClick))
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
        const [allPods, allContacts] = await Promise.all([getPods(), getContacts()])
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

        const savedPositions = getPositions()
        setNodes(buildHomeNodes(allPods, countsByPod, savedPositions, handlePodClick))
        setEdges(buildHomeEdges(allPods))
      } catch (err) {
        console.error('Failed to load network:', err)
        if (!stale) setInitError(true)
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
          <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>
            Could not load your network. Check your connection and refresh.
          </p>
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
          background: 'rgba(255,255,255,0.70)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(0,0,0,0.07)',
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
          <span style={{ color: 'rgba(0,0,0,0.2)', fontSize: 10 }}>›</span>
          <span style={{ color: 'rgba(0,0,0,0.8)', fontWeight: 500 }}>{selectedPod.name}</span>
        </nav>
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
          if (saved) setViewport(saved)
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
          color="rgba(0,0,0,0.08)"
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
