---
phase: 14-pipelines
plan: 01
subsystem: ui
tags: [react, dnd-kit, kanban, airtable, pipelines]

# Dependency graph
requires:
  - phase: 10-data-architecture-rebuild
    provides: Airtable schema for Pipelines, PipelineStages, and Opportunities tables
  - phase: 11-relationship-records
    provides: Contact/relationship record structure used for opportunity relationship_ids
provides:
  - Kanban pipeline board at /pipelines route with DnD between stage columns
  - PipelinesPage with data loading, tab switching, URL param support
  - PipelineTabBar with active/hidden pipeline management
  - PipelineBoard with DndContext, drag-and-drop, undo toast, DragOverlay
  - PipelineStageColumn with droppable, inline rename, color picker, add form
  - OpportunityCard with useSortable, priority badge, contact avatars, archive button
  - CreatePipelineModal for creating new pipelines
  - updatePipeline, updatePipelineStage, updateOpportunity data layer functions
affects: [14-02, 14-03]

# Tech tracking
tech-stack:
  added: ["@dnd-kit/core@6.3.1", "@dnd-kit/sortable@10.0.0", "@dnd-kit/utilities@3.2.2"]
  patterns:
    - "closestCorners collision detection for Kanban cross-column DnD"
    - "Optimistic update + undo toast pattern for drag-end operations"
    - "useDroppable on column containers to support empty column drops"
    - "SortableContext with verticalListSortingStrategy per stage column"
    - "Demo mode branches in all write functions (in-place array mutation)"

key-files:
  created:
    - src/components/pipelines/PipelinesPage.tsx
    - src/components/pipelines/PipelineTabBar.tsx
    - src/components/pipelines/PipelineBoard.tsx
    - src/components/pipelines/PipelineStageColumn.tsx
    - src/components/pipelines/OpportunityCard.tsx
    - src/components/pipelines/CreatePipelineModal.tsx
  modified:
    - src/lib/airtable.ts

key-decisions:
  - "closestCorners (not closestCenter) chosen for Kanban — better cross-column drop detection"
  - "onPriorityChange and onArchive are intentional stubs in Plan 01 — real implementations ship in Plan 02"
  - "D-12 column drag-reorder deferred per user approval; inline rename + color picker ship as partial delivery"
  - "createOpportunity in board is optimistic-only (temp ID) — real persistence with proper API call in Plan 02"
  - "Demo mode branches added to createPipeline, createPipelineStage, createOpportunity for write ops"

patterns-established:
  - "Pipeline state owned by PipelinesPage, passed down as props — single source of truth"
  - "Undo toast replaces immediate persistence — 5s window, optimistic revert on undo"
  - "PipelineStageColumn uses both useDroppable (column drop) and SortableContext (card sort)"

requirements-completed: [PIPE-01, PIPE-02, PIPE-03, PIPE-05, PIPE-07]

# Metrics
duration: 35min
completed: 2026-03-29
---

# Phase 14 Plan 01: Pipelines Kanban Core Summary

**Kanban pipeline board with dnd-kit drag-and-drop, tab switching, undo toast, stage columns with inline edit/color picker, and opportunity cards with priority/avatar/archive — wired to Airtable data layer**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-03-29T22:30:00Z
- **Completed:** 2026-03-29T23:05:00Z
- **Tasks:** 3 (Task 1, Task 2a, Task 2b)
- **Files modified:** 7

## Accomplishments

- Full Kanban board at `/pipelines` (not yet in nav — Plan 03 handles routing)
- dnd-kit DnD with optimistic updates, undo toast, DragOverlay ghost card
- Tab bar with active/hidden pipeline switching, hide/unhide confirmation, new pipeline CTA
- Inline stage rename on click-to-edit blur, 8-swatch color picker popover
- Opportunity cards with contact avatar stacks, priority cycle badge, archive button
- Three new Airtable write functions: `updatePipeline`, `updatePipelineStage`, `updateOpportunity` — all with demo mode support

## Task Commits

1. **Task 1: Data layer additions + dnd-kit install** - `8a8d58b` (feat)
2. **Task 2a: PipelinesPage + PipelineTabBar + CreatePipelineModal** - `3aa1313` (feat)
3. **Task 2b: PipelineBoard + PipelineStageColumn + OpportunityCard** - `51c9028` (feat)

## Files Created/Modified

- `src/lib/airtable.ts` — added updatePipeline, updatePipelineStage, updateOpportunity + demo branches for create functions
- `src/components/pipelines/PipelinesPage.tsx` — top-level route with data loading, tab state, URL params
- `src/components/pipelines/PipelineTabBar.tsx` — active/hidden tabs, kebab hide menu, "+" new pipeline
- `src/components/pipelines/CreatePipelineModal.tsx` — modal with escape stack, autofocus, brand green submit
- `src/components/pipelines/PipelineBoard.tsx` — DndContext, drag handlers, undo toast, DragOverlay
- `src/components/pipelines/PipelineStageColumn.tsx` — droppable column, inline rename, color picker, add form
- `src/components/pipelines/OpportunityCard.tsx` — useSortable, priority badge, avatar row, archive button
- `package.json` / `pnpm-lock.yaml` — @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities

## Decisions Made

- `closestCorners` over `closestCenter` — significantly better detection for multi-column Kanban drops
- `onPriorityChange` and `onArchive` are intentional stubs — Plan 02 ships opportunity detail + status management
- D-12 full column drag-reorder deferred per user approval during discuss-phase; inline rename + color picker ship as partial delivery
- Inline opportunity creation in board uses temp IDs for optimistic render — Plan 02 wires real `createOpportunity` call with proper response handling

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed duplicate `style` prop on OpportunityCard root div**
- **Found during:** Task 2b build review
- **Issue:** Component had both `style={style}` from useSortable and a second `style={{...style, ...extras}}` on the same element — TypeScript/ESbuild allowed it but would cause silent prop collision
- **Fix:** Merged both into single style object `{...style, background, borderRadius, ...}`
- **Files modified:** src/components/pipelines/OpportunityCard.tsx
- **Committed in:** 51c9028

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Correctness fix only. No scope creep.

## Known Stubs

- `onPriorityChange` in PipelineBoard/OpportunityCard: no-op function body — priority cycle click fires but doesn't persist. Plan 02 ships real implementation.
- `onArchive` in PipelineBoard/OpportunityCard: no-op function body — archive button visible but non-functional. Plan 02 ships real implementation.
- `handleCardClick` in PipelineBoard: no-op — card click does nothing yet. Plan 02 ships OpportunityDetail panel.
- `handleCreateOpportunity` in PipelineBoard: creates temp-ID opportunity in local state only, not persisted to Airtable. Plan 02 wires real API call.
- `handleStageUpdate` in PipelineBoard: updates local state only — stage renames/color changes not persisted. Plan 02 wires `updatePipelineStage`.

These stubs are intentional per the plan spec. They do not prevent the plan's goal (rendering a working Kanban board with DnD) from being achieved.

## Issues Encountered

None — plan executed cleanly. Duplicate `style` prop was caught before commit and fixed inline.

## Next Phase Readiness

- Plan 02 can build directly on these components — add OpportunityDetail panel, wire persistence for stubs
- Plan 03 routes `/pipelines` into the nav pill
- PipelinesPage accepts `?pipeline=` and `?opportunity=` URL params — ready for deep linking from Plan 02+

---
*Phase: 14-pipelines*
*Completed: 2026-03-29*
