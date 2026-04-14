import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useNavigate } from 'react-router'
import {
  addContactToCampaign,
  createCampaignStage,
  deleteCampaignStage,
  updateCampaignContact,
  updateCampaignStage,
  createInteraction,
} from '../../lib/airtable'
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
}: Props) {
  const navigate = useNavigate()
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showAddStage, setShowAddStage] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (undoToast) requestAnimationFrame(() => setToastVisible(true))
    else setToastVisible(false)
  }, [undoToast])

  // Clear selection when campaign changes
  useEffect(() => { setSelectedIds(new Set()) }, [campaign.id])

  const sortedStages = [...stages].sort((a, b) => a.order - b.order)
  const activeDragCc = activeDragId ? campaignContacts.find(cc => cc.id === activeDragId) : null
  const activeDragContact = activeDragCc ? contacts.find(c => c.id === activeDragCc.contact_id) : null

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
          notes: null,
          summary: null,
          source: null,
          email_link: null,
          granola_link: null,
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
    setNewStageName('')
    setShowAddStage(false)
  }

  async function handleDeleteStage(id: string) {
    const stageContacts = campaignContacts.filter(cc => cc.stage_id === id)
    if (stageContacts.length > 0) return
    await deleteCampaignStage(id)
    onStagesChange(stages.filter(s => s.id !== id))
  }

  function handleCardClick(cc: CampaignContact) {
    navigate(`/contact/${cc.contact_id}`)
  }

  // -- Multi-select --

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
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{
          display: 'flex', gap: 14,
          overflowX: 'auto', padding: '12px 0 32px',
          alignItems: 'flex-start',
        }}>
          {sortedStages.map((stage, i) => (
            <CampaignStageColumn
              key={stage.id}
              stage={stage}
              campaignContacts={campaignContacts}
              contacts={contacts}
              interactionsMap={interactionsMap}
              onStageUpdate={handleStageUpdate}
              onDeleteStage={handleDeleteStage}
              onAddContact={handleAddContact}
              onCardClick={handleCardClick}
              onTogglePriority={handleTogglePriority}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAllInStage={handleSelectAllInStage}
              isFirst={i === 0}
              isLast={i === sortedStages.length - 1}
            />
          ))}

          {/* Add Stage */}
          <div style={{ minWidth: 200, flexShrink: 0, paddingTop: 8 }}>
            {showAddStage ? (
              <form
                onSubmit={handleAddStageSubmit}
                style={{
                  width: '100%', background: 'var(--surface-panel)',
                  borderRadius: 12, border: '1px solid var(--edge)',
                  padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
                }}
              >
                <input
                  autoFocus
                  type="text"
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setNewStageName(''); setShowAddStage(false) } }}
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
                    onClick={() => { setNewStageName(''); setShowAddStage(false) }}
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
                  fontSize: 12, color: 'var(--color-text-secondary)',
                  background: 'transparent', border: '1px dashed var(--edge)',
                  borderRadius: 12, cursor: 'pointer', padding: '10px 20px',
                  width: '100%', transition: 'border-color 150ms, color 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brand)'; e.currentTarget.style.color = 'var(--color-brand)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--edge)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
              >
                + Add Stage
              </button>
            )}
          </div>
        </div>

        {/* Drag overlay */}
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
            />
          ) : null}
        </DragOverlay>

        {/* Undo toast */}
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

      {/* Bulk action bar */}
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
