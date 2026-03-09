import { useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getLists, getCategories, getContacts, isOverdue } from '../../lib/airtable'
import type { Category, List } from '../../lib/types'
import { ListNodeComponent } from './ListNode'
import { CategoryNodeComponent } from './CategoryNode'
import { MojNodeComponent, MOJ_ID, MOJ_SIZE } from './MojNode'
import { ContactPanel } from '../contacts/ContactPanel'
import { getPositions, savePosition } from '../../hooks/useNodePositions'
import { useState } from 'react'

const LIST_SIZE = 96

const nodeTypes = {
  list: ListNodeComponent,
  category: CategoryNodeComponent,
  moj: MojNodeComponent,
}

// Home view: Moj at origin, lists in a circle around it
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

// Category view: selected list at center, categories arranged around it
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

type ListCounts = { total: number; overdue: number }

function buildHomeNodes(
  lists: List[],
  countsByList: Record<string, ListCounts>,
  savedPositions: Record<string, { x: number; y: number }>,
  onListClick: (list: List, pos: { x: number; y: number }) => void
): Node[] {
  const { mojPos, listPositions } = hubLayout(lists, savedPositions)

  const mojNode: Node = {
    id: MOJ_ID,
    type: 'moj',
    position: mojPos,
    draggable: false,
    style: { overflow: 'visible' },
    data: {},
  }

  const listNodes: Node[] = lists.map((list, i) => {
    const pos = listPositions.get(list.id)!
    const counts = countsByList[list.id] ?? { total: 0, overdue: 0 }
    return {
      id: list.id,
      type: 'list',
      position: pos,
      style: { overflow: 'visible' },
      data: {
        list,
        contactCount: counts.total,
        overdueCount: counts.overdue,
        loading: false,
        animationDelay: `${i * 0.04}s`,
        onClick: () => onListClick(list, pos),
      },
    }
  })

  return [mojNode, ...listNodes]
}

function buildHomeEdges(lists: List[]): Edge[] {
  return lists.map(list => ({
    id: `e-moj-${list.id}`,
    source: MOJ_ID,
    target: list.id,
    style: { stroke: 'rgba(0,0,0,0.07)', strokeWidth: 0.75 },
    type: 'straight',
  }))
}

export function OrbMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const [view, setView] = useState<'lists' | 'categories'>('lists')
  const [selectedList, setSelectedList] = useState<List | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const listsRef = useRef<List[]>([])
  const countsByListRef = useRef<Record<string, ListCounts>>({})
  // Refs for stale-closure-safe navigation state
  const viewRef = useRef<'lists' | 'categories'>('lists')
  const selectedListRef = useRef<List | null>(null)

  const handleListClick = useCallback((list: List, position: { x: number; y: number }) => {
    // Read current state through refs — avoids stale closure bug when
    // handleListClick is captured inside node data.onClick
    if (viewRef.current === 'categories' && selectedListRef.current?.id === list.id) return

    viewRef.current = 'categories'
    selectedListRef.current = list
    setSelectedList(list)
    setView('categories')
    setSelectedCategoryId(null)

    setNodes(prev => prev.map(n =>
      n.id === list.id ? { ...n, data: { ...n.data, loading: true } } : n
    ))

    getCategories(list.id).then(async (cats: Category[]) => {
      const savedPositions = getPositions()
      // Radius grows with category count so orbs never crowd
      const CAT_SIZE = 64
      const CAT_GAP = 24
      const minRadius = Math.ceil(cats.length * (CAT_SIZE + CAT_GAP) / (2 * Math.PI))
      const radius = Math.max(230, minRadius)
      const posMap = circularLayout(cats, savedPositions, position, radius)

      // Derive category counts from warm cache (no extra API call)
      const allContacts = await getContacts()
      const countsByCategory: Record<string, number> = {}
      for (const contact of allContacts) {
        if (!contact.list_ids.includes(list.id)) continue
        for (const catId of contact.category_ids) {
          countsByCategory[catId] = (countsByCategory[catId] ?? 0) + 1
        }
      }

      const listCounts = countsByListRef.current[list.id] ?? { total: 0, overdue: 0 }
      const listNode: Node = {
        id: list.id,
        type: 'list',
        position,
        style: { overflow: 'visible' },
        data: {
          list,
          contactCount: listCounts.total,
          overdueCount: listCounts.overdue,
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
          listColor: list.color,
          contactCount: countsByCategory[cat.id] ?? 0,
          animationDelay: `${i * 0.03}s`,
          onClick: () => setSelectedCategoryId(prev => prev === cat.id ? null : cat.id),
        },
      }))

      const edgeColor = list.color ? `${list.color}30` : 'rgba(0,0,0,0.07)'
      const catEdges: Edge[] = cats.map(cat => ({
        id: `e-${list.id}-${cat.id}`,
        source: list.id,
        target: cat.id,
        style: { stroke: edgeColor, strokeWidth: 0.75 },
        type: 'straight',
      }))

      setNodes([listNode, ...catNodes])
      setEdges(catEdges)
    }).catch(() => {
      // Reset loading state on the orb so the user can retry
      setNodes(prev => prev.map(n =>
        n.id === list.id ? { ...n, data: { ...n.data, loading: false } } : n
      ))
    })
  }, [])

  const handleBack = useCallback(() => {
    viewRef.current = 'lists'
    selectedListRef.current = null
    setView('lists')
    setSelectedList(null)
    setSelectedCategoryId(null)
    const savedPositions = getPositions()
    setNodes(buildHomeNodes(listsRef.current, countsByListRef.current, savedPositions, handleListClick))
    setEdges(buildHomeEdges(listsRef.current))
  }, [handleListClick])

  useEffect(() => {
    let stale = false
    async function init() {
      try {
        const [allLists, allContacts] = await Promise.all([getLists(), getContacts()])
        if (stale) return
        listsRef.current = allLists

        // Single pass: derive { total, overdue } per list from the warm contact cache
        const countsByList: Record<string, ListCounts> = {}
        for (const contact of allContacts) {
          for (const listId of contact.list_ids) {
            if (!countsByList[listId]) countsByList[listId] = { total: 0, overdue: 0 }
            countsByList[listId].total++
            if (isOverdue(contact)) countsByList[listId].overdue++
          }
        }
        countsByListRef.current = countsByList

        const savedPositions = getPositions()
        setNodes(buildHomeNodes(allLists, countsByList, savedPositions, handleListClick))
        setEdges(buildHomeEdges(allLists))
      } catch (err) {
        console.error('Failed to load network:', err)
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
      width: '100vw',
      height: '100vh',
      position: 'relative',
      background: [
        'radial-gradient(ellipse 70% 55% at 12% 8%,  rgba(180,160,255,0.13) 0%, transparent 60%)',
        'radial-gradient(ellipse 55% 45% at 88% 88%, rgba(255,160,100,0.10) 0%, transparent 55%)',
        'radial-gradient(ellipse 45% 40% at 75% 10%, rgba(140,200,255,0.08) 0%, transparent 50%)',
        '#F5F4F0',
      ].join(', '),
    }}>

      {/* Breadcrumb */}
      {view === 'categories' && selectedList && (
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
            onClick={handleBack}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(0,0,0,0.35)',
              cursor: 'pointer', padding: 0, fontSize: 12,
              letterSpacing: '0.01em',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(0,0,0,0.7)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(0,0,0,0.35)' }}
          >
            Home
          </button>
          <span style={{ color: 'rgba(0,0,0,0.2)', fontSize: 10 }}>›</span>
          <span style={{ color: 'rgba(0,0,0,0.8)', fontWeight: 500 }}>{selectedList.name}</span>
        </nav>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeDragStop={handleNodeDragStop}
        fitView
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
