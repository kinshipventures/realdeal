

# Phase 4: Pipeline Polish - Demo-Ready

## Problems for new users

1. **Creating a pipeline gives no stages** - user sees an empty board with no columns. No way to add stages from the UI.
2. **"+ Add opportunity" creates a temp stub** - `handleCreateOpportunity` creates a local-only `temp-` ID object with no persistence. Data is lost on refresh.
3. **No "Add Stage" button** - stages can only be created programmatically. New users are stuck.
4. **Page header says "Pipelines / Pipelines"** - redundant label + subtitle.
5. **Empty state is unhelpful** - "No active pipeline. Create one to get started." but no guidance after creation.
6. **Opportunity cards have no priority by default** - the "set priority" action is hidden behind a hover-only button that's hard to discover.
7. **Tab bar kebab menu is invisible** - requires hover to reveal, undiscoverable on touch.

## Changes

### 1. Auto-create default stages on pipeline creation

Update `handlePipelineCreated` in `PipelinesPage.tsx` to create 3 default stages ("Lead", "In Progress", "Closed") via `createPipelineStage()` after `createPipeline()`. Add resulting stages to local state.

### 2. Add "Add Stage" column

Add an "Add Stage" button as the last column in `PipelineBoard.tsx`. Clicking it shows an inline input. On submit, calls `createPipelineStage(name, pipeline.id, maxOrder + 1)` and appends to stages state.

### 3. Persist opportunity creation

Update `handleCreateOpportunity` in `PipelineBoard.tsx` to call `createOpportunity(name, stageId, contactIds)` from the data layer instead of creating a temp stub. Replace the temp ID with the real one on response.

### 4. Fix page header

Change the redundant "Pipelines / Pipelines" heading to just "Pipelines" with no subtitle label.

### 5. Better empty state

Replace the plain text empty state with a centered card that has an icon, heading ("Create your first pipeline"), description, and a CTA button that opens the create modal.

### 6. Improved empty stage guidance

Update the empty column text to be more inviting: "Drag opportunities here or click below to add one."

### 7. Stage delete/reorder

Add a "Delete stage" option to the stage header context (only when stage has 0 opportunities). No drag reorder for now - keep scope small.

## Files modified

- `src/components/pipelines/PipelinesPage.tsx` - auto-create stages, fix header, better empty state
- `src/components/pipelines/PipelineBoard.tsx` - add "Add Stage" column, persist opportunity creation, add stage delete
- `src/components/pipelines/PipelineStageColumn.tsx` - add delete button in header, updated empty text
- `src/components/pipelines/CreatePipelineModal.tsx` - no changes needed

## Technical details

### Default stages on pipeline creation
```typescript
const handlePipelineCreated = useCallback(async (name: string) => {
  const newPipeline = await createPipeline(name)
  const defaults = [
    { name: 'Lead', order: 0, color: '#4299E1' },
    { name: 'In Progress', order: 1, color: '#ECC94B' },
    { name: 'Closed', order: 2, color: '#48BB78' },
  ]
  const newStages = await Promise.all(
    defaults.map(d => createPipelineStage(d.name, newPipeline.id, d.order, d.color))
  )
  setPipelines(prev => [...prev, newPipeline])
  setStages(prev => [...prev, ...newStages])
  setActivePipelineId(newPipeline.id)
}, [])
```

### Add Stage column in PipelineBoard
Renders after the last stage column. Contains an input form (hidden by default, shown on click). Calls `createPipelineStage` and updates parent state via `onStagesChange`.

### Persist opportunity creation
Replace the temp object creation with an async call:
```typescript
async function handleCreateOpportunity(name: string, stageId: string, contactIds: string[]) {
  const newOpp = await createOpportunity(name, stageId, contactIds)
  onOpportunitiesChange([...opportunities, newOpp])
}
```

