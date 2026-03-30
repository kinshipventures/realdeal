# Phase 14: Pipelines - Research

**Researched:** 2026-03-29
**Domain:** Kanban board UI, drag-and-drop, Airtable data mutation, timeline integration
**Confidence:** HIGH

## Summary

Phase 14 is a pure UI phase. The entire data layer (types, Airtable CRUD, caching, and demo data) was built in Phase 10 and is already in production. No schema work, no new Airtable tables, no type changes needed. The only data layer additions are `updateOpportunity()`, `updatePipelineStage()`, and `pipeline_event` writes via the existing `logInteraction()`.

The codebase has strong established patterns for every UI primitive this phase needs: slide-out panels (CampaignDetail), right-column widgets (RecordWidgets), bulk action bar (RecordsList), inline-edit-on-blur (PodDetailPage), and escape stack management. The planner should map each UI feature directly to its existing pattern counterpart, not invent new patterns.

The one true discretion item is drag-and-drop library choice. **Use `@dnd-kit/core` + `@dnd-kit/sortable`** — it is the current standard for React kanban, is React 19 compatible with Vite, has no peer dependency friction, and has a rich kanban tutorial ecosystem to reference.

**Primary recommendation:** Wire the existing data layer into new UI components using established patterns. New code is ~80% UI composition, ~20% data mutation additions.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New top-level nav pill entry: `Pulse | Map | Records | Pipelines`. Route at `/pipelines`.
- **D-02:** Horizontal tabs across the top of the board for switching pipelines. One tab per active pipeline.
- **D-03:** Hidden pipelines appear as muted entries in a "Hidden" section at the end of the tab bar.
- **D-04:** Column-per-stage layout. Each stage is a vertical column with cards stacked.
- **D-05:** Empty stage columns show header, muted "No opportunities" text, and a "+ Add" button. Always visible.
- **D-06:** "+" button at the bottom of each stage column for adding a new opportunity card. Click opens inline card creation (name + link contacts). Contextual to the stage.
- **D-07:** Optimistic move with undo toast. Card moves instantly on drop, brief "Undo" toast appears for 5 seconds. Writes `pipeline_event` to linked relationship's timeline on stage change. Reverts on undo or write failure.
- **D-08:** Card shows: opportunity name, linked contact avatar(s) with names, and priority badge (high/medium/low color). Compact — no notes preview.
- **D-09:** Click card opens a slide-out panel with full details: name, notes, linked records, stage history, priority, status. Consistent with ContactDetail slide-out pattern.
- **D-10:** Quick actions on card without opening it: (1) click priority badge cycles high/medium/low, (2) archive button + undo toast, (3) click contact avatar navigates to `/record/:id`, (4) inline note input on hover/click.
- **D-11:** "+" tab at end of pipeline tab bar to create a new pipeline.
- **D-12:** Stage configuration inline on board: click column header to rename, drag columns to reorder, color picker on header click.
- **D-13:** Hide pipeline via three-dot menu (kebab) on the pipeline tab.
- **D-14:** "Pipelines" widget in the right column of RecordPage. Shows opportunity cards linked to this contact (opportunity name, pipeline name, current stage).
- **D-15:** "+" button in Pipelines widget to add contact to a pipeline. Opens dropdown (pick pipeline + stage), creates opportunity. Stays on record page.
- **D-16:** Clicking contact avatar on opportunity card navigates to `/record/:id`.
- **D-17:** Clicking opportunity in RecordPage Pipelines widget navigates to `/pipelines` with that pipeline's tab active and the opportunity's slide-out open.
- **D-18:** "Add to pipeline" bulk action in Records List (pick pipeline + stage, creates opportunities for selected records).
- **D-19:** Stage changes, note additions, priority changes, and archive actions write `pipeline_event` entries to Interactions table for each linked relationship record. Uses `event_detail` JSON field.
- **D-20:** Pipeline-specific custom fields scoped to a pipeline. Stored on Opportunities table. Editable on slide-out. Visible on card face (if "show on card"). Reuses Phase 11 FieldConfig system.
- **D-21:** Pipeline-specific field values visible on pipeline card/slide-out AND on RecordPage Pipelines widget.

### Claude's Discretion

- Drag-and-drop library choice (react-beautiful-dnd, dnd-kit, or @hello-pangea/dnd)
- Card hover/press animations and shadow treatment
- Slide-out panel layout for opportunity detail
- Column width and responsive/mobile treatment
- Undo toast styling and position
- Stage color picker UI (preset palette vs. full picker)
- Inline card creation form layout
- Pipeline tab overflow behavior if many pipelines
- "Add to pipeline" bulk action modal layout

### Deferred Ideas (OUT OF SCOPE)

- "Add to project" bulk action — Phase 15 (projects don't exist yet)
- Pipeline-specific custom fields on opportunities (PIPE-04 partial) — track as pipeline-scoped fields, full custom field system already exists from Phase 11
- Pipeline analytics/velocity reporting — Phase 17 (Reporting)
- Pipeline automation (auto-move on conditions) — V2
- Pipeline templates (pre-built stage configurations) — future enhancement
- Multi-pipeline view (see all pipelines at once) — future enhancement
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-01 | User can create unlimited pipelines (LP fundraising, deal flow, talent outreach, partnerships) | `createPipeline()` exists. UI: "+" tab in tab bar, minimal modal/inline input. |
| PIPE-02 | Each pipeline has customizable stages (name + color) displayed as Kanban board | `createPipelineStage()`, `getPipelineStages()` exist. UI: column-per-stage with inline rename + color picker. `updatePipelineStage()` needed for edits. |
| PIPE-03 | Pipeline cards are "Relationship Opportunities" — linked to one or more relationship records | `Opportunity.relationship_ids` already in type. `createOpportunity()` exists. UI: card + contact avatars. |
| PIPE-04 | Each opportunity card has its own fields: notes, stage, priority, status | All fields exist in `Opportunity` type. `updateOpportunity()` needed. Slide-out panel exposes all fields. |
| PIPE-05 | Cards show project/investment name in pipeline view, linked back to person/company in record view | Opportunity name on card face. Contact avatar click → `/record/:id`. PipelinesWidget on RecordPage shows back-link. |
| PIPE-06 | All pipeline changes (stage, notes, status, archive) sync to relationship record timeline | `logInteraction()` with type `pipeline_event` + `event_detail` JSON. Already defined in InteractionType. |
| PIPE-07 | User can hide pipelines without deleting them (hidden pipelines maintain record connections) | `PipelineStatus = 'active' | 'hidden'` exists. `updatePipeline()` needed. Hidden tab section in tab bar. |
| PIPE-08 | User can open full relationship record from any pipeline card | Avatar click on card + link in slide-out → `navigate('/record/:id')`. |
| PIPE-09 | User can see and navigate to all pipeline associations from a relationship record | PipelinesWidget in RecordWidgets right column. Click → `/pipelines?pipeline=X&opportunity=Y`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | Drag-and-drop context, draggable/droppable primitives | React 19 compatible, works in Vite CSR, modern replacement for react-beautiful-dnd |
| @dnd-kit/sortable | 8.0.0 | Sortable list/kanban utilities built on core | Provides useSortable, SortableContext for card reordering within and between columns |
| @dnd-kit/utilities | 3.2.2 | CSS transform helpers (CSS.Transform.toString) | Needed for drag overlay transforms |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Already installed: react-router 7 | 7.13.1 | Route `/pipelines`, URL state for active pipeline | Use `useSearchParams` to encode active pipeline + open opportunity in URL |
| Already installed: lucide-react | 1.7.0 | Icons (kebab, archive, add, color dot) | Consistent with codebase icon usage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/core | @hello-pangea/dnd | Pangea has React 18 peer dep, requires `--legacy-peer-deps` with React 19. Works in practice but generates npm warnings and could break at future installs. dnd-kit has no peer dep friction. |
| @dnd-kit/core | react-beautiful-dnd | Abandoned by Atlassian, Pangea is the maintained fork. Same issue as above. |
| URL state for pipeline/opportunity | useState | URL state enables D-17 (deep-link from RecordPage to specific pipeline+opportunity). useState loses state on navigation. |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Version verification:** Confirmed via npm registry: @dnd-kit/core@6.3.1, @dnd-kit/sortable@8.0.0, @dnd-kit/utilities@3.2.2 (March 2026).

## Architecture Patterns

### Recommended Project Structure
```
src/components/pipelines/
├── PipelinesPage.tsx        # top-level route component, data loading, tab state
├── PipelineBoard.tsx        # single pipeline Kanban board (stages + cards)
├── PipelineStageColumn.tsx  # one droppable column with its cards
├── OpportunityCard.tsx      # compact card face with quick actions
├── OpportunityDetail.tsx    # slide-out panel (follows CampaignDetail pattern)
├── PipelineTabBar.tsx       # horizontal tabs + hidden section + "+" tab
├── CreatePipelineModal.tsx  # minimal pipeline creation modal
└── AddToPipelineModal.tsx   # used by RecordPage widget + bulk action
```

### Pattern 1: Slide-Out Panel (Opportunity Detail)
**What:** Full-width side panel overlaying the board, escape-dismissible.
**When to use:** Card click opens OpportunityDetail.
**Example:**
```typescript
// Follows CampaignDetail.tsx pattern exactly
// Source: src/components/campaigns/CampaignDetail.tsx
import { useEscape } from '../../lib/escapeStack'

const handleClose = useCallback(() => onClose(), [onClose])
useEscape(handleClose)

// Panel CSS: position fixed, right 0, top 0, height 100vh, width 480px
// Entry animation: translateX(100%) → translateX(0)
```

### Pattern 2: Optimistic Drag with Undo Toast
**What:** Card moves instantly in local state. Async write happens in background. Toast with 5-second undo window.
**When to use:** Any card stage change via drag-and-drop.
**Example:**
```typescript
// Optimistic: update local opportunities state immediately
setOpportunities(prev => prev.map(opp =>
  opp.id === activeId ? { ...opp, stage_id: overId } : opp
))
// Background write
updateOpportunity(activeId, { stage_id: overId })
  .then(() => logInteraction(/* pipeline_event */))
  .catch(() => {
    setOpportunities(prev => /* revert to pre-move state */)
    dismissUndoToast()
  })
```

### Pattern 3: Inline Edit on Blur (Stage Renaming)
**What:** Click header → input appears, blur → save. Same as PodDetailPage.
**When to use:** Column header rename (D-12).
**Example:**
```typescript
// Source: src/components/pods/PodDetailPage.tsx inline edit pattern
const [editing, setEditing] = useState(false)
const [draft, setDraft] = useState(stage.name)

// On blur: call updatePipelineStage(stage.id, { name: draft })
```

### Pattern 4: RecordPage Widget
**What:** Widget card in the right column, same container as DetailsWidget, HealthWidget.
**When to use:** PipelinesWidget on RecordPage.
**Example:**
```typescript
// Source: src/components/records/RecordWidgets.tsx
// Add <PipelinesWidget contact={contact} /> to RecordWidgets render
// Widget fetches getOpportunities() filtered by contact.id in relationship_ids
```

### Pattern 5: Bulk Action Extension
**What:** Add "Add to pipeline" button to existing bulk action bar in RecordsList.
**When to use:** D-18.
**Example:**
```typescript
// Source: src/components/records/RecordsList.tsx ~line 683-810
// Follow bulkBtnStyle const pattern
// Opens AddToPipelineModal with selectedIds, then calls createOpportunity() per selected record
```

### Pattern 6: URL State for Cross-Module Navigation
**What:** Encode active pipeline tab and open opportunity in URL params.
**When to use:** D-17 — RecordPage navigates to `/pipelines?pipeline=X&opportunity=Y`.
**Example:**
```typescript
// In PipelinesPage, read params on mount
const [searchParams] = useSearchParams()
const targetPipelineId = searchParams.get('pipeline')
const targetOpportunityId = searchParams.get('opportunity')
// On mount: set active tab to targetPipelineId, open slide-out for targetOpportunityId
```

### Pattern 7: dnd-kit Kanban Setup
**What:** DndContext wraps the board; each column is a SortableContext droppable; cards use useSortable.
**When to use:** The entire PipelineBoard.
**Example:**
```typescript
// Source: https://dndkit.com/overview
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

// PipelineBoard
<DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
  {stages.map(stage => (
    <SortableContext
      key={stage.id}
      id={stage.id}
      items={cardsInStage(stage.id).map(c => c.id)}
      strategy={verticalListSortingStrategy}
    >
      <PipelineStageColumn stage={stage} opportunities={cardsInStage(stage.id)} />
    </SortableContext>
  ))}
</DndContext>

// OpportunityCard
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: opportunity.id })
const style = { transform: CSS.Transform.toString(transform), transition }
```

### Anti-Patterns to Avoid
- **Don't use DragOverlay for stage column drag (D-12):** Column reordering via drag is separate from card DnD. Use a second DndContext or sortable context for columns, not the card context.
- **Don't write timeline events inside onDragEnd:** Write them in the async updateOpportunity callback after the optimistic update, not in the drag handler. Keeps UI snappy.
- **Don't load all opportunities in RecordWidgets:** Filter `getOpportunities()` client-side by `relationship_ids.includes(contact.id)` — the cache is already warm.
- **Don't add a new data fetching layer:** `getOpportunities()` loads all opportunities with stale-while-revalidate. Filter client-side per pipeline. No per-pipeline API call needed.
- **Don't skip invalidating caches after mutations:** After `updateOpportunity()`, call `invalidateOpportunitiesCache()`. After `updatePipelineStage()`, call `invalidatePipelineStagesCache()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop | Custom mousedown/mousemove handlers | @dnd-kit/core + @dnd-kit/sortable | Keyboard accessibility, touch support, DragOverlay, collision detection — 1000+ edge cases |
| Escape key layering | New escape listener | `useEscape` from `src/lib/escapeStack.ts` | Already handles panel/modal stacking. Duplicate listeners cause double-fire bugs. |
| Undo toast | Custom toast component | Inline fixed-position div with setTimeout | This app has no toast library. One-off is fine. Follow existing inline notification patterns. |
| Color picker | Color wheel component | Preset palette (6-8 hex swatches) | Full color picker adds complexity for minimal gain. Presets match the design system. |
| Contact avatar | Custom avatar component | `Avatar` from `src/components/ui.tsx` | Already exists with initials fallback. |
| Cache invalidation | Custom state management | Module-level cache pattern from airtable.ts | Already implemented — `invalidateOpportunitiesCache()`, `invalidatePipelineStagesCache()` |

**Key insight:** Every UI primitive for this phase has a precedent in the codebase. The planner should reference and follow patterns, not introduce new abstractions.

## Data Layer Gaps (airtable.ts additions needed)

The following functions do NOT currently exist and must be added in Wave 0 of the plan:

| Function | What it does | Cache side effects |
|----------|-------------|-------------------|
| `updateOpportunity(id, patch)` | PATCH opportunity (stage_id, priority, status, notes) | `invalidateOpportunitiesCache()` |
| `updatePipelineStage(id, patch)` | PATCH stage (name, color, order) | `invalidatePipelineStagesCache()` |
| `updatePipeline(id, patch)` | PATCH pipeline (status: 'hidden'/'active') | `_pipelinesCache = null` |
| `pipeline_event logInteraction call` | Write Interaction with type='pipeline_event' + event_detail JSON | Uses existing `logInteraction()` — no new function needed |

Demo mode mutations also needed in `sampleData.ts`:
- Move opportunity between stages (update `stage_id` on DEMO_OPPORTUNITIES entry)
- Archive opportunity (update `status`)
- Create opportunity (push to DEMO_OPPORTUNITIES)
- Hide/unhide pipeline (update `status` on DEMO_PIPELINES entry)

## Common Pitfalls

### Pitfall 1: React 19 + @hello-pangea/dnd peer dependency
**What goes wrong:** `npm install @hello-pangea/dnd` produces peer dependency warnings because Pangea declares React `^18.0.0`. The app uses React `^19.2.0`. The install works with `--legacy-peer-deps` but creates ongoing maintenance risk.
**Why it happens:** Pangea is a React 18-era fork of react-beautiful-dnd and hasn't updated its peer dep declaration.
**How to avoid:** Use `@dnd-kit/core` + `@dnd-kit/sortable` instead. No peer dep friction with React 19.
**Warning signs:** `npm install` prints peer dep warnings during setup.

### Pitfall 2: Cross-column card drag detection
**What goes wrong:** When dragging a card between columns (different SortableContexts), the `onDragEnd` event's `over.id` returns the droppable container ID, not a card ID. Code that assumes `over.id` is always a card ID breaks.
**Why it happens:** dnd-kit's collision detection returns the closest droppable, which could be a column or a card depending on where the cursor lands.
**How to avoid:** In `handleDragEnd`, check if `over.id` is a stage ID or an opportunity ID. If it's a stage ID, set `newStageId = over.id`. If it's a card ID, look up which stage that card belongs to.
**Warning signs:** Cards can't be dropped onto empty column areas or onto the column header.

### Pitfall 3: Double timeline writes
**What goes wrong:** `pipeline_event` written twice per stage change — once in `onDragEnd` and once in the async update callback.
**Why it happens:** Forgetting that `logInteraction` is already called inside a wrapper, or calling it in two places.
**How to avoid:** Write timeline events only in the `.then()` callback of `updateOpportunity()`, after the Airtable write succeeds. Never write in `onDragEnd` directly.
**Warning signs:** Duplicate `pipeline_event` entries appearing in the relationship timeline.

### Pitfall 4: Missing cache invalidation after bulk "Add to pipeline"
**What goes wrong:** After bulk-creating opportunities from RecordsList, the PipelinesPage still shows stale data when navigated to.
**Why it happens:** `_opportunitiesCache` is not invalidated after `createOpportunity()` calls in the bulk flow.
**How to avoid:** `createOpportunity()` already calls `_opportunitiesCache = null` on success — verify this is called for each record in the bulk loop.
**Warning signs:** Newly created opportunities don't appear on the board without a page refresh.

### Pitfall 5: Slide-out z-index conflict
**What goes wrong:** OpportunityDetail slide-out appears behind the DragOverlay.
**Why it happens:** dnd-kit's DragOverlay renders at the document body level with a high z-index.
**How to avoid:** Set OpportunityDetail z-index to at least 200. DragOverlay defaults to z-index `9999` but the slide-out should appear above the board overlay. Ensure DragOverlay is only mounted during active drag.
**Warning signs:** Dragging a card while the slide-out is open shows the ghost card on top of the slide-out panel.

### Pitfall 6: isRecords vs isPipelines nav active state
**What goes wrong:** The nav pill for Pipelines shows active state incorrectly (or the Records pill stays active) when on `/pipelines`.
**Why it happens:** Phase 13 introduced `isPulse`/`isRecords` — same pattern must be replicated for `isPipelines`. The current `isContacts` check is `location.pathname === '/contacts'`.
**How to avoid:** Add `const isPipelines = location.pathname.startsWith('/pipelines')` and wire it to the new nav pill. Also fix the existing `/contacts` → `/records` alias if Phase 13 renamed the route.
**Warning signs:** Wrong nav pill is highlighted when on the Pipelines page.

## Code Examples

### dnd-kit Kanban: Cross-container card move
```typescript
// Source: https://dndkit.com/overview + LogRocket kanban tutorial
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over) return

  const activeOppId = active.id as string
  const overId = over.id as string

  // Determine which stage we're dropping into
  const isOverStage = stages.some(s => s.id === overId)
  const newStageId = isOverStage
    ? overId
    : opportunities.find(o => o.id === overId)?.stage_id

  if (!newStageId) return

  const activeOpp = opportunities.find(o => o.id === activeOppId)
  if (!activeOpp || activeOpp.stage_id === newStageId) return

  // Capture pre-move state for undo
  const prevStageId = activeOpp.stage_id

  // Optimistic update
  setOpportunities(prev =>
    prev.map(o => o.id === activeOppId ? { ...o, stage_id: newStageId } : o)
  )

  // Show undo toast
  showUndoToast(() => {
    setOpportunities(prev =>
      prev.map(o => o.id === activeOppId ? { ...o, stage_id: prevStageId } : o)
    )
  })

  // Persist
  updateOpportunity(activeOppId, { stage_id: newStageId })
    .then(() => {
      // Write timeline event for each linked relationship
      activeOpp.relationship_ids.forEach(relId => {
        logInteraction(relId, 'pipeline_event', new Date().toISOString().slice(0, 10), null, {
          event_detail: JSON.stringify({
            pipeline: pipeline.name,
            from_stage: stages.find(s => s.id === prevStageId)?.name,
            to_stage: stages.find(s => s.id === newStageId)?.name,
          }),
          actor: 'You',
        })
      })
    })
    .catch(() => {
      setOpportunities(prev =>
        prev.map(o => o.id === activeOppId ? { ...o, stage_id: prevStageId } : o)
      )
      dismissUndoToast()
    })
}
```

### Priority badge cycling (D-10)
```typescript
const PRIORITY_CYCLE: OpportunityPriority[] = ['low', 'medium', 'high']
const PRIORITY_COLOR: Record<OpportunityPriority, string> = {
  high: 'hsla(0, 70%, 50%, 0.15)',
  medium: 'hsla(40, 80%, 50%, 0.15)',
  low: 'hsla(210, 60%, 50%, 0.12)',
}

function nextPriority(current: OpportunityPriority | null): OpportunityPriority {
  if (!current) return 'low'
  const idx = PRIORITY_CYCLE.indexOf(current)
  return PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]
}
```

### pipeline_event event_detail shape
```typescript
// Consistent with existing system event shapes in sampleData.ts (ix('45'...))
// Stage change
{ pipeline: "LP Fundraising", from_stage: "Outreach", to_stage: "In Diligence" }
// Priority change
{ pipeline: "LP Fundraising", field: "priority", old_value: "low", new_value: "high" }
// Note added
{ pipeline: "LP Fundraising", action: "note_added" }
// Archived
{ pipeline: "LP Fundraising", action: "archived" }
```

### PipelinesWidget: filtering opportunities client-side
```typescript
// In PipelinesWidget
const [opportunities, setOpportunities] = useState<Opportunity[]>([])
const [stages, setStages] = useState<PipelineStage[]>([])
const [pipelines, setPipelines] = useState<Pipeline[]>([])

useEffect(() => {
  Promise.all([getOpportunities(), getPipelineStages(), getPipelines()])
    .then(([opps, stgs, pipes]) => {
      // Filter to this contact only
      setOpportunities(opps.filter(o => o.relationship_ids.includes(contact.id)))
      setStages(stgs)
      setPipelines(pipes)
    })
}, [contact.id])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit/core | 2022-2023 | rbd abandoned by Atlassian; dnd-kit is the ecosystem standard now |
| @hello-pangea/dnd (rbd fork) | @dnd-kit/core | React 19+ projects | Pangea has React 18 peer dep constraint; dnd-kit has no such issue |
| Global toast libraries (react-hot-toast, sonner) | Inline fixed div | N/A | This app has no toast library; simple one-off implementation is appropriate |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Abandoned by Atlassian. `@hello-pangea/dnd` is the maintained fork but carries React 18 peer dep. Neither recommended for React 19 Vite apps.

## Open Questions

1. **Does Phase 13 rename `/contacts` to `/records` in the route?**
   - What we know: CONTEXT.md D-01 says nav entry is `Records` and STATE.md notes reference `/records`. Current App.tsx has `path="contacts"`.
   - What's unclear: Whether Phase 13's plan renames the route path itself or just the nav label.
   - Recommendation: Read Phase 13 plan before finalizing the isPipelines nav logic in App.tsx. If route is still `/contacts`, add `/pipelines` without touching `/contacts`.

2. **Is `logInteraction()` the right function for pipeline_event writes, or does it need `createInteraction()` directly?**
   - What we know: `logInteraction()` wraps `createInteraction()` and auto-updates `last_contacted_at` for non-note types. `pipeline_event` is a `SystemEventType`, not a human interaction.
   - What's unclear: Whether `logInteraction()` skips the `last_contacted_at` update for system types.
   - Recommendation: Use `createInteraction()` directly for `pipeline_event` to avoid touching `last_contacted_at` on pipeline moves. Check `logInteraction()` implementation before deciding.

3. **Stage reorder persistence: order field or position array?**
   - What we know: `PipelineStage.order` is a number field. `updatePipelineStage()` doesn't exist yet.
   - What's unclear: Whether reordering stages updates all affected orders in a batch or individually.
   - Recommendation: Implement optimistic reorder in local state (array splice), then PATCH the `order` field on each affected stage. Accept that this is N Airtable calls for an N-stage reorder — acceptable for 3-6 stages.

## Sources

### Primary (HIGH confidence)
- `/Users/gabrielmurray/dev/mrm/src/lib/types.ts` — Pipeline, PipelineStage, Opportunity, OpportunityStatus, OpportunityPriority types — verified by direct read
- `/Users/gabrielmurray/dev/mrm/src/lib/airtable.ts` — getPipelines, getPipelineStages, getOpportunities, createPipeline, createPipelineStage, createOpportunity — verified by direct read
- `/Users/gabrielmurray/dev/mrm/src/lib/sampleData.ts` — DEMO_PIPELINES, DEMO_PIPELINE_STAGES, DEMO_OPPORTUNITIES — verified by direct read
- `/Users/gabrielmurray/dev/mrm/src/components/campaigns/CampaignDetail.tsx` — slide-out panel pattern — verified by direct read
- `/Users/gabrielmurray/dev/mrm/src/components/records/RecordWidgets.tsx` — widget pattern — verified by direct read
- `/Users/gabrielmurray/dev/mrm/src/App.tsx` — routing, nav pill pattern — verified by direct read
- npm registry — @dnd-kit/core@6.3.1, @dnd-kit/sortable@8.0.0 — current versions confirmed

### Secondary (MEDIUM confidence)
- WebSearch (verified via npm): @hello-pangea/dnd@18.0.1 has React 18 peer dep, confirmed in GitHub discussions — React 19 compatibility issue
- WebSearch: dnd-kit stable @dnd-kit/core works fine with React 19 Vite CSR apps (the @dnd-kit/react adapter 0.3.2 has RSC issues, but the stable @dnd-kit/core does not)
- [LogRocket: Build Kanban board with dnd kit and React](https://blog.logrocket.com/build-kanban-board-dnd-kit-react/) — kanban implementation pattern

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — data layer already exists; DnD library choice verified via npm + search
- Architecture: HIGH — all patterns are direct replications of existing codebase patterns
- Pitfalls: MEDIUM — DnD pitfalls from search + codebase inspection; timeline pitfalls from code reading

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable; only dnd-kit version could drift)
