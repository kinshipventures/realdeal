import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Pod, Category, Contact, Cadence, Owner, Interaction, ShareLink, InteractionType } from '../../lib/types'
import { HUMAN_TYPES } from '../../lib/types'
import type { FieldConfig } from '../../lib/fieldConfig'
import { getPods, getContacts, getCategories, getAllInteractions, updatePod, deletePod, updateContact, createCategory, updateCategory, deleteCategory } from '../../lib/data'
import { getFieldConfigs } from '../../lib/fieldConfig'
import { contactEquityScore, podEquityScore, scoreLabel, daysSinceContact, indexByContact } from '../../lib/equity'
import type { ScoreLabel } from '../../lib/equity'
import { Avatar, Spinner } from '../ui'
import { POD_SHIFT_COLORS } from '../map/SolidOrb'
import { LucideIcon } from '../LucideIcon'
import { IconPicker } from '../map/IconPicker'
import { getActiveShareLinks, revokeShareLink } from '../../lib/sharing'
import { SharePopover } from '../sharing/SharePopover'

const EQUITY_COLORS: Record<string, string> = {
  Thriving: '#16a34a',
  Steady:   '#4ade80',
  Cooling:  '#ea580c',
  Fading:   '#dc2626',
}

const INTERACTION_LABELS: Partial<Record<InteractionType, string>> = {
  call: 'call',
  email: 'email',
  text: 'text',
  meeting: 'meeting',
  intro: 'intro',
  note: 'note',
}

const POD_NUDGES: Record<ScoreLabel, string> = {
  Thriving: 'This pod is humming. Keep showing up.',
  Steady:   'Solid momentum. A few check-ins would keep it going.',
  Cooling:  'Some people in this pod miss hearing from you.',
  Fading:   'This pod needs your attention.',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--tint)',
  border: '1px solid var(--edge-strong)',
  borderRadius: 7,
  color: 'var(--color-text-primary)',
  fontSize: 13,
  padding: '8px 12px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  marginBottom: 4,
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const sectionHeadStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontWeight: 700,
  fontSize: 16,
  color: 'var(--color-text-primary)',
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

function Badge({ label }: { label: string }) {
  return (
    <span style={{
      background: 'var(--tint)',
      borderRadius: 100,
      padding: '1px 8px',
      fontSize: 11,
      fontWeight: 500,
      color: 'var(--color-text-secondary)',
    }}>{label}</span>
  )
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span style={{
      background: 'var(--tint)',
      borderRadius: 4,
      padding: '1px 6px',
      fontSize: 10,
      fontWeight: 500,
      color: 'var(--color-text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>{type}</span>
  )
}

// Oura-style health ring for pod detail (light background variant)
function PodHealthRing({ score, color, size }: { score: number; color: string; size: number }) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--edge)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={mounted ? offset : circumference}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        opacity={0.85}
      />
    </svg>
  )
}

function formatDaysAgo(days: number | null): string {
  if (days === null) return 'never'
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function lastHumanInteraction(interactions: Interaction[]): { type: InteractionType; daysAgo: number } | null {
  const now = Date.now()
  const humanTypes = new Set(HUMAN_TYPES as readonly string[])
  let latest: Interaction | null = null
  for (const ix of interactions) {
    if (!humanTypes.has(ix.type)) continue
    if (!latest || ix.date > latest.date) latest = ix
  }
  if (!latest) return null
  const daysAgo = Math.floor((now - new Date(latest.date).getTime()) / (24 * 60 * 60 * 1000))
  return { type: latest.type, daysAgo }
}

function DraggableMemberRow({ contact, children }: { contact: Contact; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: contact.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}>
      {children}
    </div>
  )
}

function PodDropTarget({ pod, isOver }: { pod: Pod; isOver?: boolean }) {
  const { setNodeRef, isOver: dndIsOver } = useDroppable({ id: pod.id })
  const active = isOver ?? dndIsOver
  return (
    <div
      ref={setNodeRef}
      style={{
        padding: '6px 14px',
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 500,
        border: active ? `2px solid ${pod.color ?? 'var(--color-brand)'}` : '2px dashed var(--edge)',
        background: active ? `${pod.color ?? 'var(--color-brand)'}14` : 'transparent',
        color: active ? (pod.color ?? 'var(--color-brand)') : 'var(--color-text-secondary)',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {pod.name}
    </div>
  )
}

export function PodDetailPage({ podIdProp, onClose }: { podIdProp?: string; onClose?: () => void } = {}) {
  const { id: paramId } = useParams<{ id: string }>()
  const podId = podIdProp ?? paramId
  const navigate = useNavigate()
  const isOverlay = !!onClose

  const [pod, setPod] = useState<Pod | null>(null)
  const [allPods, setAllPods] = useState<Pod[]>([])
  const [members, setMembers] = useState<Contact[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [equityMap, setEquityMap] = useState<Record<string, number>>({})
  const [interactionMap, setInteractionMap] = useState<Map<string, Interaction[]>>(new Map())
  const [podScore, setPodScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Drag-and-drop state
  const [dragContactId, setDragContactId] = useState<string | null>(null)
  const [dndToast, setDndToast] = useState<{ message: string; onUndo: () => void } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  // Editable state
  const [description, setDescription] = useState('')
  const [cadence, setCadence] = useState<Cadence | ''>('')
  const [capacity, setCapacity] = useState<string>('')
  const [owner, setOwner] = useState<Owner | ''>('')
  const [isPriority, setIsPriority] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Add sub-pod state
  const [addingSubPod, setAddingSubPod] = useState(false)
  const [newSubPodName, setNewSubPodName] = useState('')
  const newSubPodInputRef = useRef<HTMLInputElement>(null)

  // Rename/delete state
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [renamingPod, setRenamingPod] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const moreMenuRef = useRef<HTMLDivElement>(null)

  // Icon picker state
  const [iconPickerCatId, setIconPickerCatId] = useState<string | null>(null)
  const [iconPickerAnchor, setIconPickerAnchor] = useState<HTMLElement | null>(null)

  // Share links state
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [showSharePopover, setShowSharePopover] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    if (!podId) { setNotFound(true); setLoading(false); return }
    let stale = false

    async function load() {
      const [pods, allContacts, cats, configs, allInteractions, activeLinks] = await Promise.all([
        getPods(),
        getContacts(),
        getCategories(podId),
        getFieldConfigs(),
        getAllInteractions() as Promise<Interaction[]>,
        getActiveShareLinks(podId).catch(() => [] as ShareLink[]),
      ])
      if (stale) return

      const found = pods.find(p => p.id === podId)
      if (!found) { setNotFound(true); setLoading(false); return }

      const podMembers = allContacts.filter(c =>
        c.status === 'Active' && c.list_ids.includes(podId!)
      )

      const byContact = indexByContact(allInteractions)
      const eqMap: Record<string, number> = {}
      for (const c of podMembers) {
        eqMap[c.id] = contactEquityScore(byContact.get(c.id) ?? [])
      }

      const score = podEquityScore(podMembers, byContact)

      setPod(found)
      setAllPods(pods)
      setDescription(found.description ?? '')
      setCadence(found.cadence ?? '')
      setCapacity(found.capacity != null ? String(found.capacity) : '')
      setOwner(found.owner ?? '')
      setIsPriority(found.is_priority)
      setMembers(podMembers.sort((a, b) => (eqMap[b.id] ?? 0) - (eqMap[a.id] ?? 0)))
      setCategories(cats)
      setFieldConfigs(configs.filter(fc => fc.scope_pod_id === podId))
      setEquityMap(eqMap)
      setInteractionMap(byContact)
      setPodScore(score)
      setShareLinks(activeLinks)
      setLoading(false)
    }

    load().catch(() => {
      if (!stale) { setNotFound(true); setLoading(false) }
    })

    return () => { stale = true }
  }, [podId])

  const save = useCallback(async (data: Parameters<typeof updatePod>[1]) => {
    if (!podId) return
    setSaving(true)
    try {
      const updated = await updatePod(podId, data)
      setPod(updated)
    } finally {
      setSaving(false)
    }
  }, [podId])

  const handleAddSubPod = useCallback(async () => {
    if (!podId || !newSubPodName.trim()) return
    const cat = await createCategory(newSubPodName.trim(), podId)
    setCategories(prev => [...prev, cat])
    setNewSubPodName('')
    setAddingSubPod(false)
  }, [podId, newSubPodName])

  const handleIconChange = useCallback(async (catId: string, icon: string | null) => {
    await updateCategory(catId, { icon })
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, icon } : c))
  }, [])

  const handleRenamePod = useCallback(async () => {
    if (!podId || !renameValue.trim() || renameValue.trim() === pod?.name) {
      setRenamingPod(false)
      return
    }
    await save({ name: renameValue.trim() })
    setRenamingPod(false)
  }, [podId, renameValue, pod?.name, save])

  const handleDeletePod = useCallback(async () => {
    if (!podId) return
    await deletePod(podId)
    navigate('/pods')
  }, [podId, navigate])

  const handleRenameCategory = useCallback(async (catId: string) => {
    if (!editCatName.trim()) { setEditingCatId(null); return }
    await updateCategory(catId, { name: editCatName.trim() })
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, name: editCatName.trim() } : c))
    setEditingCatId(null)
  }, [editCatName])

  const handleDeleteCategory = useCallback(async (catId: string) => {
    await deleteCategory(catId)
    setCategories(prev => prev.filter(c => c.id !== catId))
  }, [])

  useEffect(() => {
    if (addingSubPod) newSubPodInputRef.current?.focus()
  }, [addingSubPod])

  useEffect(() => {
    if (!showMoreMenu) return
    function handleClick(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setShowMoreMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMoreMenu])

  // Sync pod color into ambient wash CSS variable; reset on unmount
  useEffect(() => {
    const color = pod?.color
    if (!color || color === '#1C1C1E') return
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    document.documentElement.style.setProperty('--pod-wash-color', `${r}, ${g}, ${b}`)
    return () => {
      document.documentElement.style.setProperty('--pod-wash-color', '52, 177, 93')
    }
  }, [pod])

  const otherPods = useMemo(() => allPods.filter(p => p.id !== podId), [allPods, podId])

  function handleDragStart(event: DragStartEvent) {
    setDragContactId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDragContactId(null)
    const { active, over } = event
    if (!over) return

    const contactId = String(active.id)
    const targetPodId = String(over.id)

    const contact = members.find(m => m.id === contactId)
    const targetPod = otherPods.find(p => p.id === targetPodId)
    if (!contact || !targetPod) return
    if (contact.list_ids.includes(targetPodId)) return // already in that pod

    const prevListIds = [...contact.list_ids]
    const newListIds = [...contact.list_ids, targetPodId]

    // Optimistic update
    setMembers(prev => prev.map(m =>
      m.id === contactId ? { ...m, list_ids: newListIds } : m
    ))

    // Show toast with undo
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setDndToast({
      message: `Added ${contact.name} to ${targetPod.name}`,
      onUndo: () => {
        setMembers(prev => prev.map(m =>
          m.id === contactId ? { ...m, list_ids: prevListIds } : m
        ))
        updateContact(contactId, { list_ids: prevListIds }).catch(console.error)
        setDndToast(null)
      },
    })
    toastTimerRef.current = setTimeout(() => setDndToast(null), 4000)

    await updateContact(contactId, { list_ids: newListIds }).catch(console.error)
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={24} padding={0} />
      </div>
    )
  }

  if (notFound || !pod) {
    return (
      <div style={{ background: 'var(--color-bg)', minHeight: '100vh', padding: 40 }}>
        <button type="button" onClick={() => navigate('/pods')} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back
        </button>
        <p style={{ color: 'var(--color-text-secondary)' }}>Pod not found.</p>
      </div>
    )
  }

  const podColor = pod.color ?? '#1C1C1E'
  const shiftColor = POD_SHIFT_COLORS[podColor] ?? podColor
  const capacityNum = capacity ? parseInt(capacity, 10) : null
  const atCapacity = capacityNum != null && members.length >= capacityNum
  const capacityColor = atCapacity ? '#ea580c' : '#16a34a'
  const podLabel = scoreLabel(podScore)
  const needsAttention = members.filter(m => {
    const s = equityMap[m.id] ?? 0
    return scoreLabel(s) === 'Cooling' || scoreLabel(s) === 'Fading'
  }).length

  return (
    <div style={{ position: 'relative', background: isOverlay ? 'transparent' : 'var(--color-bg)', minHeight: isOverlay ? undefined : '100vh', paddingBottom: isOverlay ? 32 : 96, overflow: isOverlay ? undefined : 'hidden' }}>
      {!isOverlay && (
        <div aria-hidden style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '40vh',
          background: `radial-gradient(ellipse 90% 70% at 25% -15%, ${podColor}30 0%, ${podColor}10 40%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: isOverlay ? '0' : '32px 32px', position: 'relative', zIndex: 1 }}>
        {/* Breadcrumb */}
        {!isOverlay && (
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <button
            type="button"
            onClick={() => navigate('/pods')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'inherit', fontSize: 13 }}
          >
            Pods
          </button>
          <span style={{ color: 'var(--color-text-tertiary)' }}>›</span>
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{pod.name}</span>
          {saving && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>Saving...</span>}
        </nav>
        )}

        {/* ── Health Hero ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          marginBottom: 32,
          padding: '24px 28px',
          background: 'var(--color-surface)',
          borderRadius: 16,
          border: '1px solid var(--edge)',
        }}>
          {/* Ring with score */}
          <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
            <PodHealthRing score={podScore} color={podColor} size={88} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-sans)', lineHeight: 1, letterSpacing: '-0.02em',
              }}>{podScore}</span>
            </div>
          </div>

          {/* Pod identity + status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${podColor}, ${shiftColor})`,
              }} />
              {renamingPod ? (
                <input
                  autoFocus
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenamePod()
                    if (e.key === 'Escape') setRenamingPod(false)
                  }}
                  onBlur={handleRenamePod}
                  style={{
                    fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 24,
                    color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.2,
                    background: 'var(--tint)', border: '1px solid var(--edge)',
                    borderRadius: 6, padding: '2px 8px', outline: 'none',
                    width: '100%',
                  }}
                />
              ) : (
                <h1 style={{
                  fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 24,
                  color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.2,
                }}>{pod.name}</h1>
              )}
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                color: EQUITY_COLORS[podLabel], background: `${EQUITY_COLORS[podLabel]}14`,
                padding: '2px 8px', borderRadius: 6,
              }}>{podLabel}</span>
            </div>
            <p style={{
              fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5,
            }}>{POD_NUDGES[podLabel]}</p>
            {needsAttention > 0 && (
              <p style={{ fontSize: 12, color: '#ea580c', margin: '6px 0 0', fontWeight: 500 }}>
                {needsAttention} of {members.length} {needsAttention === 1 ? 'member needs' : 'members need'} attention
              </p>
            )}
          </div>

          {/* Share + More menu */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setShowSharePopover(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--tint)', border: '1px solid var(--edge)',
                  borderRadius: 8, padding: '8px 14px', fontSize: 13,
                  fontWeight: 500, color: 'var(--color-text-primary)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Share
              </button>
              {showSharePopover && (
                <SharePopover
                  podId={podId!}
                  members={members}
                  onCreated={(link) => {
                    setShareLinks(prev => [link, ...prev])
                    setShowSharePopover(false)
                  }}
                  onClose={() => setShowSharePopover(false)}
                />
              )}
            </div>
            <div ref={moreMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowMoreMenu(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--tint)', border: '1px solid var(--edge)',
                  borderRadius: 8, width: 36, height: 36,
                  cursor: 'pointer', color: 'var(--color-text-secondary)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              {showMoreMenu && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: 'var(--surface-panel)', border: '1px solid var(--edge)',
                  borderRadius: 10, padding: 4, minWidth: 140, zIndex: 20,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                }}>
                  <div
                    onClick={() => {
                      setRenameValue(pod.name)
                      setRenamingPod(true)
                      setShowMoreMenu(false)
                    }}
                    style={{ padding: '8px 12px', fontSize: 13, borderRadius: 6, cursor: 'pointer', color: 'var(--color-text-primary)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--tint)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    Rename
                  </div>
                  <div
                    onClick={() => { setConfirmDelete(true); setShowMoreMenu(false) }}
                    style={{ padding: '8px 12px', fontSize: 13, borderRadius: 6, cursor: 'pointer', color: '#dc2626' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--tint)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    Delete pod
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Delete confirmation */}
          {confirmDelete && (
            <>
              <div onClick={() => setConfirmDelete(false)} style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dim)', zIndex: 200 }} />
              <div style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                background: 'var(--surface-panel)', border: '1px solid var(--edge)', borderRadius: 14,
                padding: 24, width: 320, zIndex: 201, boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
              }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>Delete "{pod.name}"?</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 20px' }}>
                  This will remove the pod and its sub-pods. Members will remain in your contacts.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    style={{ padding: '8px 16px', background: 'var(--tint)', border: '1px solid var(--edge)', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--color-text-primary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeletePod}
                    style={{ padding: '8px 16px', background: '#dc2626', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#fff' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Members (primary content) ── */}
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <section style={{ marginBottom: 32 }}>
          <div style={{ ...sectionHeadStyle, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Members{' '}
              <Badge label={capacityNum != null ? `${members.length}/${capacityNum}` : String(members.length)} />
            </span>
            {members.length > 0 && (
              <button
                type="button"
                className="see-all-link"
                onClick={() => navigate(`/relationships?pod=${podId}`)}
              >
                View table
              </button>
            )}
          </div>

          {/* Drop targets - appear when dragging */}
          {dragContactId && otherPods.length > 0 && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8,
              padding: '12px 16px', marginBottom: 12,
              background: 'var(--tint)', borderRadius: 10,
              border: '1px dashed var(--edge)',
            }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', alignSelf: 'center', marginRight: 4 }}>
                Drop to add:
              </span>
              {otherPods.map(p => <PodDropTarget key={p.id} pod={p} />)}
            </div>
          )}

          {members.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 8px' }}>No members yet.</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>Add people from the Categorization Queue.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {members.map(m => {
                const score = equityMap[m.id] ?? 0
                const label = scoreLabel(score)
                const labelColor = EQUITY_COLORS[label] ?? 'var(--color-text-secondary)'
                const isPrimary = m.primary_list_id === podId
                const lastIx = lastHumanInteraction(interactionMap.get(m.id) ?? [])
                const days = daysSinceContact(m)
                return (
                  <DraggableMemberRow key={m.id} contact={m}>
                    <button
                      type="button"
                      onClick={() => navigate(`/contact/${m.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', background: 'transparent',
                        border: 'none', borderRadius: 8, cursor: 'pointer',
                        textAlign: 'left', fontFamily: 'inherit',
                        transition: 'background 0.12s', width: '100%',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--tint)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Avatar name={m.name} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.name}
                          </span>
                          {isPrimary && (
                            <span style={{ fontSize: 9, fontWeight: 600, color: podColor, background: `${podColor}18`, borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0 }}>Primary</span>
                          )}
                        </div>
                        {(m.company || m.role) && (
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[m.role, m.company].filter(Boolean).join(' - ')}
                          </div>
                        )}
                      </div>
                      {/* Last interaction context */}
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'right', flexShrink: 0, minWidth: 56 }}>
                        {lastIx ? (
                          <span>{formatDaysAgo(lastIx.daysAgo)} - {INTERACTION_LABELS[lastIx.type] ?? lastIx.type}</span>
                        ) : days !== null ? (
                          <span>{formatDaysAgo(days)}</span>
                        ) : (
                          <span style={{ color: '#ea580c' }}>never</span>
                        )}
                      </div>
                      {/* Score */}
                      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 40 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: labelColor }}>{score}</div>
                        <div style={{ fontSize: 10, color: labelColor, opacity: 0.8 }}>{label}</div>
                      </div>
                    </button>
                  </DraggableMemberRow>
                )
              })}
            </div>
          )}
        </section>

        {/* Drag overlay - ghost of the dragged contact */}
        <DragOverlay>
          {dragContactId && (() => {
            const m = members.find(c => c.id === dragContactId)
            if (!m) return null
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', background: 'var(--color-surface)',
                border: '1px solid var(--edge)', borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
              }}>
                <Avatar name={m.name} size={24} />
                {m.name}
              </div>
            )
          })()}
        </DragOverlay>
        </DndContext>

        {/* DnD undo toast */}
        {dndToast && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--color-text-primary)', color: 'var(--color-bg)',
            padding: '10px 20px', borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 12,
            fontSize: 13, fontWeight: 500, zIndex: 200,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}>
            {dndToast.message}
            <button
              type="button"
              onClick={dndToast.onUndo}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-brand)', fontSize: 13, fontWeight: 600,
                fontFamily: 'inherit', padding: 0,
              }}
            >
              Undo
            </button>
          </div>
        )}

        {/* ── Sub-pods ── */}
        <section style={{ marginBottom: 32 }}>
          <div style={sectionHeadStyle}>
            Sub-pods <Badge label={String(categories.length)} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {categories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  {editingCatId === cat.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editCatName}
                      onChange={e => setEditCatName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameCategory(cat.id)
                        if (e.key === 'Escape') setEditingCatId(null)
                      }}
                      onBlur={() => handleRenameCategory(cat.id)}
                      style={{
                        padding: '6px 12px', background: 'var(--tint)',
                        border: '1px solid var(--color-brand)', borderRadius: 100,
                        fontSize: 13, color: 'var(--color-text-primary)',
                        fontFamily: 'inherit', outline: 'none', width: 140,
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/category/${cat.id}`)}
                      onDoubleClick={e => {
                        e.preventDefault()
                        setEditingCatId(cat.id)
                        setEditCatName(cat.name)
                      }}
                      className="subpod-pill"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', background: 'var(--tint)',
                        border: '1px solid var(--edge)', borderRadius: 100,
                        cursor: 'pointer', fontSize: 13,
                        color: 'var(--color-text-primary)', fontFamily: 'inherit',
                        transition: 'background 0.15s',
                      }}
                    >
                      {cat.icon ? (
                        <span
                          onClick={e => { e.stopPropagation(); setIconPickerCatId(cat.id); setIconPickerAnchor(e.currentTarget as HTMLElement) }}
                          style={{ lineHeight: 0, cursor: 'pointer' }}
                        >
                          <LucideIcon name={cat.icon} size={14} color={cat.color ?? 'var(--color-text-secondary)'} strokeWidth={1.75} />
                        </span>
                      ) : (
                        <span
                          onClick={e => { e.stopPropagation(); setIconPickerCatId(cat.id); setIconPickerAnchor(e.currentTarget as HTMLElement) }}
                          style={{ width: 14, height: 14, borderRadius: '50%', background: cat.color ?? 'var(--edge-strong)', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--color-text-tertiary)' }}
                          title="Set icon"
                        />
                      )}
                      {cat.name}
                      <span
                        onClick={e => { e.stopPropagation(); handleDeleteCategory(cat.id) }}
                        style={{
                          marginLeft: 2, width: 16, height: 16, borderRadius: '50%',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, color: 'var(--color-text-tertiary)',
                          opacity: 0, transition: 'opacity 0.15s',
                        }}
                        className="subpod-delete"
                        title="Remove sub-pod"
                      >
                        x
                      </span>
                    </button>
                  )}
                </div>
              ))}
              {iconPickerCatId && (
                <IconPicker
                  value={categories.find(c => c.id === iconPickerCatId)?.icon ?? null}
                  onChange={icon => handleIconChange(iconPickerCatId, icon)}
                  anchorEl={iconPickerAnchor}
                  onClose={() => { setIconPickerCatId(null); setIconPickerAnchor(null) }}
                />
              )}
            </div>
            {addingSubPod ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  ref={newSubPodInputRef}
                  type="text"
                  value={newSubPodName}
                  onChange={e => setNewSubPodName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddSubPod()
                    if (e.key === 'Escape') { setAddingSubPod(false); setNewSubPodName('') }
                  }}
                  placeholder="Sub-pod name"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddSubPod}
                  disabled={!newSubPodName.trim()}
                  style={{
                    padding: '8px 14px', background: 'var(--color-brand)',
                    color: '#fff', border: 'none', borderRadius: 7,
                    fontSize: 13, fontFamily: 'inherit',
                    cursor: newSubPodName.trim() ? 'pointer' : 'not-allowed',
                    opacity: newSubPodName.trim() ? 1 : 0.5,
                  }}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingSubPod(false); setNewSubPodName('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingSubPod(true)}
                style={{
                  background: 'none', border: '1px dashed var(--edge-strong)',
                  borderRadius: 100, padding: '5px 14px', fontSize: 12,
                  color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                + Add Sub-pod
              </button>
            )}
          </section>

        {/* ── Shared links (if any) ── */}
        {shareLinks.length > 0 && (
          <>
            <section style={{ marginBottom: 32 }}>
              <div style={sectionHeadStyle}>
                Shared links <Badge label={String(shareLinks.length)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {shareLinks.map(link => {
                  const expiresAt = new Date(link.expires_at)
                  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  const isConfirming = confirmRevoke === link.id
                  return (
                    <div
                      key={link.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', background: 'var(--tint)',
                        borderRadius: 8, border: '1px solid var(--edge)',
                      }}
                    >
                      {isConfirming ? (
                        <>
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)' }}>Revoke this link?</span>
                          <button
                            type="button"
                            disabled={revokingId === link.id}
                            onClick={async () => {
                              setRevokingId(link.id)
                              try {
                                await revokeShareLink(link.id)
                                setShareLinks(prev => prev.filter(l => l.id !== link.id))
                                setConfirmRevoke(null)
                              } finally {
                                setRevokingId(null)
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            {revokingId === link.id ? 'Revoking...' : 'Yes, revoke'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRevoke(null)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            /s/{link.token}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {link.pin_hash && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', background: 'var(--edge)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>PIN</span>
                            )}
                            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                              in {daysLeft}d
                            </span>
                            <button
                              type="button"
                              onClick={() => setConfirmRevoke(link.id)}
                              style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              Revoke
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}

        {/* ── Pod Settings (collapsible) ── */}
        <section style={{ marginBottom: 32 }}>
          <button
            type="button"
            onClick={() => setSettingsOpen(v => !v)}
            style={{
              ...sectionHeadStyle,
              background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', width: '100%',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Pod Settings
            </span>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {settingsOpen && (
            <div style={{ paddingTop: 8 }}>
              {/* Description */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={() => save({ description: description || null })}
                  placeholder="What is this pod for?"
                  rows={2}
                  style={{ ...inputStyle, width: '100%', resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>

              {/* Settings grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>Cadence</label>
                  <select
                    value={cadence}
                    onChange={e => {
                      const val = e.target.value as Cadence | ''
                      setCadence(val)
                      save({ cadence: val || null })
                    }}
                    style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
                  >
                    <option value="">None</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>
                    Capacity
                    {capacityNum != null && (
                      <span style={{ fontWeight: 400, marginLeft: 6, color: capacityColor }}>
                        {members.length}/{capacityNum}
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    min={1}
                    onChange={e => setCapacity(e.target.value)}
                    onBlur={() => {
                      const num = capacity ? parseInt(capacity, 10) : null
                      save({ capacity: num })
                    }}
                    placeholder="Unlimited"
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Owner</label>
                  <select
                    value={owner}
                    onChange={e => {
                      const val = e.target.value as Owner | ''
                      setOwner(val)
                      save({ owner: val || null })
                    }}
                    style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
                  >
                    <option value="">None</option>
                    <option value="moj_mahdara">Moj Mahdara</option>
                    <option value="kinship_ventures">Kinship Ventures</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                  <input
                    type="checkbox"
                    id="is-priority"
                    checked={isPriority}
                    onChange={e => {
                      setIsPriority(e.target.checked)
                      save({ is_priority: e.target.checked })
                    }}
                    style={{ width: 14, height: 14, cursor: 'pointer' }}
                  />
                  <label htmlFor="is-priority" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>Priority pod</label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      id="enrichment-opt-in"
                      checked={pod.enrichment_opt_in}
                      onChange={e => save({ enrichment_opt_in: e.target.checked })}
                      style={{ width: 14, height: 14, cursor: 'pointer' }}
                    />
                    <label htmlFor="enrichment-opt-in" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>Enrichment opt-in</label>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 22 }}>Auto-enrich all pod members when enrichment ships</span>
                </div>
              </div>

              {/* Required fields (only shown when there are some) */}
              {fieldConfigs.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ ...sectionHeadStyle, fontSize: 14 }}>
                    Required Questions <Badge label={String(fieldConfigs.length)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {fieldConfigs.map(fc => (
                      <div key={fc.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', background: 'var(--tint)',
                        borderRadius: 8, border: '1px solid var(--edge)',
                      }}>
                        {fc.required && (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                        )}
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{fc.name}</span>
                        <TypeBadge type={fc.field_type} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {members.length > 0 && fieldConfigs.length > 0 && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 0, marginBottom: 0 }}>
                  Manage fields from a{' '}
                  <button
                    type="button"
                    onClick={() => navigate(`/contact/${members[0].id}`)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-brand)', fontSize: 11, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                  >
                    member's record
                  </button>
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
