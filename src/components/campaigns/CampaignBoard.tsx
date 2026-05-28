import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  addContactToCampaign,
  createCampaignStage,
  deleteCampaignStage,
  updateCampaignContact,
  updateCampaignStage,
  createInteraction,
} from '../../lib/data'
import type { Campaign, CampaignContact, CampaignOpportunity, CampaignStage, Contact, Interaction } from '../../lib/types'
import { CampaignStageColumn } from './CampaignStageColumn'
import { CampaignContactCard } from './CampaignContactCard'

interface Props {
  campaign: Campaign
  stages: CampaignStage[]
  campaignContacts: CampaignContact[]
  contacts: Contact[]
  interactionsMap: Map<string, Interaction[]>
  onStagesChange: (stages: CampaignStage[]) => void
  onContactsChange: (contacts: CampaignContact[]) => void
  onCardClick: (cc: CampaignContact) => void
  sortKey: string
  sortAsc: boolean
  visibleCardFields: Set<string>
}

interface UndoToast {
  message: string
  onUndo: () => void
}

export function CampaignBoard({
  campaign,
  stages,
  campaignContacts,
  contacts,
  interactionsMap,
  onStagesChange,
  onContactsChange,
  onCardClick,
  sortKey,
  sortAsc,
  visibleCardFields,
}: Props) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showAddStage, setShowAddStage] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pendingDragCardId, setPendingDragCardId] = useState<string | null>(null)

  const { setNodeRef: setNewStageRef, isOver: isOverNewStage } = useDroppable({ id: '__new_stage__' })

  useEffect(() => {
    if (undoToast) requestAnimationFrame(() => setToastVisible(true))
    else setToastVisible(false)
  }, [undoToast])

  useEffect(() => { setSelectedIds(new Set()) }, [campaign.id])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const sortedStages = [...stages].sort((a, b) => a.order - b.order)
  const activeDragCc = activeDragId ? campaignContacts.find(cc => cc.id === activeDragId) : null
  const activeDragContact = activeDragCc ? contacts.find(c => c.id === activeDragCc.contact_id) : null

  // Sort contacts within stages
  function getSortedContacts(): CampaignContact[] {
    if (!sortKey || sortKey === 'default') return campaignContacts
    return [...campaignContacts].sort((a, b) => {
      const ca = contacts.find(c => c.id === a.contact_id)
      const cb = contacts.find(c => c.id === b.contact_id)
      let av = '', bv = ''
      if (sortKey === 'name') { av = ca?.name ?? ''; bv = cb?.name ?? '' }
      else if (sortKey === 'company') { av = ca?.company ?? ''; bv = cb?.company ?? '' }
      else if (sortKey === 'email') { av = ca?.email ?? ''; bv = cb?.email ?? '' }
      else if (sortKey === 'role') { av = ca?.role ?? ''; bv = cb?.role ?? '' }
      else if (sortKey === 'stage') {
        const sa = stages.find(s => s.id === a.stage_id)
        const sb = stages.find(s => s.id === b.stage_id)
        av = String(sa?.order ?? 0); bv = String(sb?.order ?? 0)
      }
      else if (sortKey === 'owner') { av = a.owner ?? ''; bv = b.owner ?? '' }
      else if (sortKey === 'next_step') { av = a.next_step ?? ''; bv = b.next_step ?? '' }
      else if (sortKey === 'moved_at') { av = a.moved_at ?? ''; bv = b.moved_at ?? '' }
      else if (sortKey === 'next_step_due') { av = a.next_step_due ?? ''; bv = b.next_step_due ?? '' }
      else if (sortKey === 'notes') { av = a.notes ?? ''; bv = b.notes ?? '' }
      const cmp = av.localeCompare(bv)
      return sortAsc ? cmp : -cmp
    })
  }

  const sortedContacts = getSortedContacts()

  function showUndoToastMsg(message: string, onUndo: () => void) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setUndoToast({ message, onUndo })
    toastTimerRef.current = setTimeout(() => setUndoToast(null), 5000)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const draggedCc = campaignContacts.find(cc => cc.id === activeId)
    if (!draggedCc) return

    if (overId === '__new_stage__') {
      setPendingDragCardId(activeId)
      setShowAddStage(true)
      setNewStageName('')
      return
    }

    const isOverStage = stages.some(s => s.id === overId)
    const newStageId = isOverStage
      ? overId
      : campaignContacts.find(cc => cc.id === overId)?.stage_id ?? null

    if (!newStageId || newStageId === draggedCc.stage_id) return

    const prevStageId = draggedCc.stage_id
    const prevContacts = [...campaignContacts]
    const targetStageName = stages.find(s => s.id === newStageId)?.name ?? ''
    const contactName = contacts.find(c => c.id === draggedCc.contact_id)?.name ?? ''
    const now = new Date().toISOString()

    onContactsChange(campaignContacts.map(cc =>
      cc.id === activeId ? { ...cc, stage_id: newStageId, moved_at: now } : cc
    ))

    showUndoToastMsg(`${contactName} moved to ${targetStageName}`, () => {
      onContactsChange(prevContacts)
      updateCampaignContact(activeId, { stage_id: prevStageId, moved_at: draggedCc.moved_at })
        .catch(() => onContactsChange(campaignContacts.map(cc =>
          cc.id === activeId ? { ...cc, stage_id: newStageId, moved_at: now } : cc
        )))
    })

    updateCampaignContact(activeId, { stage_id: newStageId, moved_at: now })
      .then(() => {
        createInteraction({
          contact_id: draggedCc.contact_id,
          type: 'pipeline_event',
          date: now.slice(0, 10),
          notes: null, summary: null, source: null, email_link: null, granola_link: null,
          event_detail: JSON.stringify({
            campaign: campaign.name,
            from_stage: stages.find(s => s.id === prevStageId)?.name,
            to_stage: targetStageName,
          }),
          actor: 'You',
        }).catch(() => {})
      })
      .catch(() => onContactsChange(prevContacts))
  }

  function handleStageUpdate(id: string, data: Partial<Pick<CampaignStage, 'name' | 'color'>>) {
    const prev = [...stages]
    onStagesChange(stages.map(s => s.id === id ? { ...s, ...data } : s))
    updateCampaignStage(id, data).catch(() => onStagesChange(prev))
  }

  function handleMoveStage(stageId: string, direction: 'left' | 'right') {
    const sorted = [...stages].sort((a, b) => a.order - b.order)
    const index = sorted.findIndex(stage => stage.id === stageId)
    if (index === -1) return

    const swapIndex = direction === 'left' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sorted.length) return

    const reordered = [...sorted]
    const [movedStage] = reordered.splice(index, 1)
    reordered.splice(swapIndex, 0, movedStage)

    const normalized = reordered.map((stage, order) => ({ ...stage, order }))
    const previous = [...stages]
    onStagesChange(normalized)

    Promise.all(
      normalized.map(stage => updateCampaignStage(stage.id, { order: stage.order }))
    ).catch(() => onStagesChange(previous))
  }

  async function handleAddContact(contactId: string, stageId: string) {
    const cc = await addContactToCampaign(campaign.id, contactId, stageId)
    onContactsChange([...campaignContacts, cc])
  }

  async function handleAddStageSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newStageName.trim()
    if (!trimmed) return
    const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order)) + 1 : 0
    const newStage = await createCampaignStage(campaign.id, trimmed, maxOrder)
    onStagesChange([...stages, newStage])

    if (pendingDragCardId) {
      const now = new Date().toISOString()
      onContactsChange(campaignContacts.map(cc =>
        cc.id === pendingDragCardId ? { ...cc, stage_id: newStage.id, moved_at: now } : cc
      ))
      updateCampaignContact(pendingDragCardId, { stage_id: newStage.id, moved_at: now }).catch(() => {})
      setPendingDragCardId(null)
    }

    setNewStageName('')
    setShowAddStage(false)
  }

  async function handleDeleteStage(id: string) {
    const stageContacts = campaignContacts.filter(cc => cc.stage_id === id)
    if (stageContacts.length > 0) return
    await deleteCampaignStage(id)
    onStagesChange(stages.filter(s => s.id !== id))
  }

  function handleToggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAllInStage(stageId: string) {
    const ids = campaignContacts.filter(cc => cc.stage_id === stageId).map(cc => cc.id)
    setSelectedIds(prev => {
      const next = new Set(prev)
      const allSelected = ids.length > 0 && ids.every(id => next.has(id))
      if (allSelected) ids.forEach(id => next.delete(id))
      else ids.forEach(id => next.add(id))
      return next
    })
  }

  function handleTogglePriority(ccId: string) {
    const cc = campaignContacts.find(c => c.id === ccId)
    if (!cc) return
    const next = !cc.is_priority
    onContactsChange(campaignContacts.map(c => c.id === ccId ? { ...c, is_priority: next } : c))
    updateCampaignContact(ccId, { is_priority: next }).catch(() => {
      onContactsChange(campaignContacts)
    })
  }

  async function handleBulkMove(targetStageId: string) {
    const ids = Array.from(selectedIds)
    const now = new Date().toISOString()
    const prevContacts = [...campaignContacts]
    const targetName = stages.find(s => s.id === targetStageId)?.name ?? ''

    onContactsChange(campaignContacts.map(cc =>
      ids.includes(cc.id) ? { ...cc, stage_id: targetStageId, moved_at: now } : cc
    ))

    showUndoToastMsg(`${ids.length} moved to ${targetName}`, () => {
      onContactsChange(prevContacts)
      ids.forEach(id => {
        const original = prevContacts.find(cc => cc.id === id)
        if (original) updateCampaignContact(id, { stage_id: original.stage_id, moved_at: original.moved_at }).catch(() => {})
      })
    })

    setSelectedIds(new Set())
    await Promise.all(ids.map(id =>
      updateCampaignContact(id, { stage_id: targetStageId, moved_at: now }).catch(() => {})
    ))
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{
          display: 'flex', gap: 14,
          overflowX: 'auto', padding: '4px 0 32px',
          alignItems: 'flex-start',
        }}>
          {sortedStages.map((stage, i) => (
            <CampaignStageColumn
              key={stage.id}
              stage={stage}
              stagger={i}
              campaignContacts={sortedContacts}
              contacts={contacts}
              interactionsMap={interactionsMap}
              onStageUpdate={handleStageUpdate}
              onDeleteStage={handleDeleteStage}
              onAddContact={handleAddContact}
              onMoveStage={handleMoveStage}
              onCardClick={onCardClick}
              onTogglePriority={handleTogglePriority}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAllInStage={handleSelectAllInStage}
              isFirst={i === 0}
              isLast={i === sortedStages.length - 1}
              visibleCardFields={visibleCardFields}
            />
          ))}

          {/* Add Stage */}
          <div ref={setNewStageRef} style={{ minWidth: 200, flexShrink: 0, paddingTop: 8, alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>
            {showAddStage ? (
              <form
                onSubmit={handleAddStageSubmit}
                style={{
                  width: '100%', background: 'var(--surface-panel)',
                  borderRadius: 12, border: '1px solid var(--edge)',
                  padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
                }}
              >
                {pendingDragCardId && (() => {
                  const cc = campaignContacts.find(c => c.id === pendingDragCardId)
                  const contact = cc ? contacts.find(c => c.id === cc.contact_id) : null
                  return contact ? (
                    <div style={{
                      fontSize: 12, color: 'var(--color-text-secondary)',
                      padding: '6px 8px', background: 'rgba(37,180,57,0.06)',
                      borderRadius: 6, border: '1px solid rgba(37,180,57,0.15)',
                    }}>
                      Moving <strong style={{ color: 'var(--color-text-primary)' }}>{contact.name}</strong> here
                    </div>
                  ) : null
                })()}
                <input
                  autoFocus
                  type="text"
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setNewStageName(''); setShowAddStage(false); setPendingDragCardId(null) } }}
                  placeholder="Stage name"
                  style={{
                    fontSize: 13, padding: '6px 10px', borderRadius: 8,
                    border: '1px solid var(--edge)', background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)', outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="submit" style={{
                    fontSize: 12, fontWeight: 600, padding: '4px 12px',
                    borderRadius: 6, border: 'none', background: 'var(--color-brand)',
                    color: '#fff', cursor: 'pointer',
                  }}>Add</button>
                  <button
                    type="button"
                    onClick={() => { setNewStageName(''); setShowAddStage(false); setPendingDragCardId(null) }}
                    style={{
                      fontSize: 12, padding: '4px 10px', borderRadius: 6,
                      border: '1px solid var(--edge)', background: 'transparent',
                      color: 'var(--color-text-secondary)', cursor: 'pointer',
                    }}
                  >Cancel</button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddStage(true)}
                style={{
                  fontSize: 12,
                  color: isOverNewStage ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                  background: isOverNewStage ? 'rgba(37,180,57,0.06)' : 'transparent',
                  border: isOverNewStage ? '1.5px dashed var(--color-brand)' : '1px dashed var(--edge)',
                  borderRadius: 12, cursor: 'pointer',
                  padding: '10px 20px',
                  width: '100%', flex: 1, minHeight: 80,
                  transition: 'border-color 150ms, color 150ms, background 150ms',
                }}
                onMouseEnter={e => { if (!isOverNewStage) { e.currentTarget.style.borderColor = 'var(--color-brand)'; e.currentTarget.style.color = 'var(--color-brand)' } }}
                onMouseLeave={e => { if (!isOverNewStage) { e.currentTarget.style.borderColor = 'var(--edge)'; e.currentTarget.style.color = 'var(--color-text-secondary)' } }}
              >
                + {isOverNewStage ? 'Drop to create new stage' : 'Add Stage'}
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeDragCc && activeDragContact ? (
            <CampaignContactCard
              cc={activeDragCc}
              contact={activeDragContact}
              equityScore={0}
              equityLabel="Fading"
              onClick={() => {}}
              onTogglePriority={() => {}}
              isDragOverlay
              visibleFields={visibleCardFields}
            />
          ) : null}
        </DragOverlay>

        {undoToast && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed', bottom: selectedIds.size > 0 ? 80 : 24, right: 24, zIndex: 300,
              background: 'rgba(0,0,0,0.82)', color: '#ffffff',
              borderRadius: 10, padding: '8px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              opacity: toastVisible ? 1 : 0,
              transform: toastVisible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 200ms ease-out, transform 200ms ease-out, bottom 200ms ease-out',
            }}
          >
            <span style={{ fontSize: 13 }}>{undoToast.message}</span>
            <button
              onClick={() => { undoToast.onUndo(); setUndoToast(null) }}
              style={{
                fontSize: 13, fontWeight: 600, color: 'var(--color-brand)',
                background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              Undo
            </button>
          </div>
        )}
      </DndContext>

      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 300, background: 'rgba(0,0,0,0.88)', borderRadius: 12,
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
          animation: 'slideUp 200ms ease-out',
        }}>
          <span style={{ fontSize: 13, color: '#fff', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {selectedIds.size} selected
          </span>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>Move to</span>
          {sortedStages.map(stage => (
            <button
              key={stage.id}
              onClick={() => handleBulkMove(stage.id)}
              style={{
                fontSize: 12, fontWeight: 500, padding: '5px 12px',
                borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: 'inherit', whiteSpace: 'nowrap',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color ?? '#999' }} />
              {stage.name}
            </button>
          ))}
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              fontSize: 11, color: 'rgba(255,255,255,0.45)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 6px', whiteSpace: 'nowrap',
            }}
          >
            Clear
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  )
}
