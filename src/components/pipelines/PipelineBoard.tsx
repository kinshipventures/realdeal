import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { createInteraction, updateOpportunity } from '../../lib/airtable'
import type { Contact, Opportunity, OpportunityPriority, Pipeline, PipelineStage } from '../../lib/types'
import { PipelineStageColumn } from './PipelineStageColumn'
import { OpportunityCard } from './OpportunityCard'
import { OpportunityDetail } from './OpportunityDetail'

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
  pipeline,
  stages,
  opportunities,
  contacts,
  onOpportunitiesChange,
  onStagesChange,
  initialOpenOpportunityId,
}: Props) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Open opportunity from URL param on mount
  useEffect(() => {
    if (initialOpenOpportunityId) {
      const found = opportunities.find(o => o.id === initialOpenOpportunityId)
      if (found) setSelectedOpportunity(found)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpenOpportunityId])

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

    // Write pipeline_event in .then() — avoids double-write if action is undone (Pitfall 3)
    updateOpportunity(activeId, { stage_id: newStageId })
      .then(() => {
        draggedOpp.relationship_ids.forEach(relId => {
          createInteraction({
            contact_id: relId,
            type: 'pipeline_event',
            date: new Date().toISOString().slice(0, 10),
            notes: null,
            summary: null,
            source: null,
            email_link: null,
            granola_link: null,
            event_detail: JSON.stringify({
              pipeline: pipeline.name,
              from_stage: stages.find(s => s.id === prevStageId)?.name,
              to_stage: stages.find(s => s.id === newStageId)?.name,
            }),
            actor: 'You',
          }).catch(console.error)
        })
      })
      .catch(() => {
        onOpportunitiesChange(prevOpps)
      })
  }

  function handleStageUpdate(id: string, data: Partial<Pick<PipelineStage, 'name' | 'color'>>) {
    onStagesChange(stages.map(s => s.id === id ? { ...s, ...data } : s))
  }

  function handleCreateOpportunity(name: string, stageId: string, _contactIds: string[]) {
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

  function handlePriorityChange(id: string, newPriority: OpportunityPriority) {
    const opp = opportunities.find(o => o.id === id)
    if (!opp) return
    const oldPriority = opp.priority
    const prevOpps = [...opportunities]

    // Optimistic
    onOpportunitiesChange(opportunities.map(o => o.id === id ? { ...o, priority: newPriority } : o))

    showUndoToast(`${opp.name} priority changed to ${newPriority}. `, () => {
      onOpportunitiesChange(prevOpps)
      updateOpportunity(id, { priority: oldPriority ?? undefined }).catch(console.error)
    })

    updateOpportunity(id, { priority: newPriority })
      .then(() => {
        opp.relationship_ids.forEach(relId => {
          createInteraction({
            contact_id: relId,
            type: 'pipeline_event',
            date: new Date().toISOString().slice(0, 10),
            notes: null,
            summary: null,
            source: null,
            email_link: null,
            granola_link: null,
            event_detail: JSON.stringify({
              pipeline: pipeline.name,
              field: 'priority',
              old_value: oldPriority,
              new_value: newPriority,
            }),
            actor: 'You',
          }).catch(console.error)
        })
      })
      .catch(() => {
        onOpportunitiesChange(prevOpps)
      })
  }

  function handleArchive(id: string) {
    const opp = opportunities.find(o => o.id === id)
    if (!opp) return
    const prevOpps = [...opportunities]

    // Optimistic: remove from view (status = archived, filtered out in column)
    onOpportunitiesChange(opportunities.map(o => o.id === id ? { ...o, status: 'archived' } : o))

    showUndoToast(`${opp.name} archived.`, () => {
      onOpportunitiesChange(prevOpps)
      updateOpportunity(id, { status: 'open' }).catch(console.error)
    })

    updateOpportunity(id, { status: 'archived' })
      .then(() => {
        opp.relationship_ids.forEach(relId => {
          createInteraction({
            contact_id: relId,
            type: 'pipeline_event',
            date: new Date().toISOString().slice(0, 10),
            notes: null,
            summary: null,
            source: null,
            email_link: null,
            granola_link: null,
            event_detail: JSON.stringify({
              pipeline: pipeline.name,
              action: 'archived',
            }),
            actor: 'You',
          }).catch(console.error)
        })
      })
      .catch(() => {
        onOpportunitiesChange(prevOpps)
      })
  }

  function handleInlineNote(id: string, note: string) {
    const opp = opportunities.find(o => o.id === id)
    if (!opp) return
    const newNotes = opp.notes ? `${opp.notes}\n${note}` : note

    onOpportunitiesChange(opportunities.map(o => o.id === id ? { ...o, notes: newNotes } : o))

    updateOpportunity(id, { notes: newNotes })
      .then(() => {
        opp.relationship_ids.forEach(relId => {
          createInteraction({
            contact_id: relId,
            type: 'pipeline_event',
            date: new Date().toISOString().slice(0, 10),
            notes: null,
            summary: null,
            source: null,
            email_link: null,
            granola_link: null,
            event_detail: JSON.stringify({ pipeline: pipeline.name, action: 'note_added' }),
            actor: 'You',
          }).catch(console.error)
        })
      })
      .catch(console.error)
  }

  function handleCardClick(opp: Opportunity) {
    setSelectedOpportunity(opp)
  }

  function handleOpportunityUpdate(id: string, data: Partial<Opportunity>) {
    // Optimistic local update
    onOpportunitiesChange(opportunities.map(o => o.id === id ? { ...o, ...data } : o))
    // Also keep selectedOpportunity in sync
    setSelectedOpportunity(prev => prev && prev.id === id ? { ...prev, ...data } : prev)
    updateOpportunity(id, data as Parameters<typeof updateOpportunity>[1]).catch(console.error)
  }

  return (
    <>
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
                onInlineNote={handleInlineNote}
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

      {/* Opportunity detail slide-out */}
      {selectedOpportunity && (
        <OpportunityDetail
          opportunity={selectedOpportunity}
          pipeline={pipeline}
          stages={stages}
          contacts={contacts}
          onClose={() => setSelectedOpportunity(null)}
          onUpdate={handleOpportunityUpdate}
        />
      )}
    </>
  )
}
