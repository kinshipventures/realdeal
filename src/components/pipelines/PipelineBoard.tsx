import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { updateOpportunity } from '../../lib/airtable'
import type { Contact, Opportunity, OpportunityPriority, Pipeline, PipelineStage } from '../../lib/types'
import { PipelineStageColumn } from './PipelineStageColumn'
import { OpportunityCard } from './OpportunityCard'

interface Props {
  pipeline: Pipeline
  stages: PipelineStage[]
  opportunities: Opportunity[]
  contacts: Contact[]
  onOpportunitiesChange: (opps: Opportunity[]) => void
  onStagesChange: (stages: PipelineStage[]) => void
  initialOpenOpportunityId?: string
}

interface UndoToast {
  message: string
  onUndo: () => void
}

export function PipelineBoard({
  stages,
  opportunities,
  contacts,
  onOpportunitiesChange,
  onStagesChange,
  initialOpenOpportunityId: _initialOpenOpportunityId,
}: Props) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track if toast is mounted for animation
  const [toastVisible, setToastVisible] = useState(false)
  useEffect(() => {
    if (undoToast) {
      requestAnimationFrame(() => setToastVisible(true))
    } else {
      setToastVisible(false)
    }
  }, [undoToast])

  const sortedStages = [...stages].sort((a, b) => a.order - b.order)
  const activeDragOpp = activeDragId ? opportunities.find(o => o.id === activeDragId) : null

  function showUndoToast(message: string, onUndo: () => void) {
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

    const draggedOpp = opportunities.find(o => o.id === activeId)
    if (!draggedOpp) return

    const isOverStage = stages.some(s => s.id === overId)
    const newStageId = isOverStage
      ? overId
      : opportunities.find(o => o.id === overId)?.stage_id ?? null

    if (!newStageId || newStageId === draggedOpp.stage_id) return

    const prevStageId = draggedOpp.stage_id
    const prevOpps = [...opportunities]
    const targetStageName = stages.find(s => s.id === newStageId)?.name ?? ''

    // Optimistic update
    const updated = opportunities.map(o =>
      o.id === activeId ? { ...o, stage_id: newStageId } : o
    )
    onOpportunitiesChange(updated)

    showUndoToast(`${draggedOpp.name} moved to ${targetStageName}`, () => {
      onOpportunitiesChange(prevOpps)
      updateOpportunity(activeId, { stage_id: prevStageId }).catch(console.error)
    })

    updateOpportunity(activeId, { stage_id: newStageId }).catch(() => {
      onOpportunitiesChange(prevOpps)
    })
  }

  function handleStageUpdate(id: string, data: Partial<Pick<PipelineStage, 'name' | 'color'>>) {
    onStagesChange(stages.map(s => s.id === id ? { ...s, ...data } : s))
    // Note: actual persistence (updatePipelineStage) ships in Plan 02
  }

  function handleCreateOpportunity(name: string, stageId: string, _contactIds: string[]) {
    // Optimistic add — real persistence with createOpportunity ships in Plan 02
    const newOpp: Opportunity = {
      id: 'temp-' + Date.now(),
      name,
      stage_id: stageId,
      relationship_ids: [],
      notes: null,
      priority: null,
      status: 'open',
      created_at: new Date().toISOString(),
    }
    onOpportunitiesChange([...opportunities, newOpp])
  }

  // onPriorityChange and onArchive are intentional stubs — real implementations ship in Plan 02
  function handlePriorityChange(_id: string, _priority: OpportunityPriority) {
    // stub: Plan 02
  }

  function handleArchive(_id: string) {
    // stub: Plan 02
  }

  function handleCardClick(_opp: Opportunity) {
    // stub: Plan 02 (OpportunityDetail panel)
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          padding: '24px 0 32px',
          alignItems: 'flex-start',
        }}
      >
        {sortedStages.map(stage => {
          const stageOpps = opportunities
            .filter(o => o.stage_id === stage.id && o.status !== 'archived')
          return (
            <PipelineStageColumn
              key={stage.id}
              stage={stage}
              opportunities={stageOpps}
              contacts={contacts}
              onStageUpdate={handleStageUpdate}
              onCardClick={handleCardClick}
              onCreateOpportunity={handleCreateOpportunity}
              onPriorityChange={handlePriorityChange}
              onArchive={handleArchive}
            />
          )
        })}
      </div>

      {/* Ghost card during drag */}
      <DragOverlay>
        {activeDragOpp ? (
          <OpportunityCard
            opportunity={activeDragOpp}
            contacts={contacts}
            onPriorityChange={handlePriorityChange}
            onArchive={handleArchive}
            onClick={() => {}}
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
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 300,
            background: 'rgba(0,0,0,0.82)',
            color: '#ffffff',
            borderRadius: 10,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            opacity: toastVisible ? 1 : 0,
            transform: toastVisible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 200ms ease-out, transform 200ms ease-out',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 400 }}>{undoToast.message}</span>
          <button
            onClick={() => { undoToast.onUndo(); setUndoToast(null) }}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-brand)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Undo
          </button>
        </div>
      )}
    </DndContext>
  )
}
