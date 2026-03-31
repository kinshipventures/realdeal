# Phase 14: Pipelines - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Kanban pipeline boards with relationship-linked opportunity cards. Users can create pipelines with custom stages, drag opportunity cards between stages, and navigate between pipelines and relationship records. Pipeline events write to the timeline (renderer built in Phase 13, data written here).

Depends on Phase 13 (timeline system events, records list with bulk actions). Projects (Phase 15) are separate — no project linking in this phase.

</domain>

<decisions>
## Implementation Decisions

### Navigation & routing
- **D-01:** New top-level nav pill entry: `Pulse | Map | Records | Pipelines`. Route at `/pipelines`. First-class surface — Moj manages multiple pipelines daily.
- **D-02:** Horizontal tabs across the top of the board for switching pipelines. One tab per active pipeline. Fast switching, always visible. Works for 3-5 pipelines.
- **D-03:** Hidden pipelines appear as muted entries in a "Hidden" section at the end of the tab bar. Click to unhide.

### Kanban board layout
- **D-04:** Column-per-stage layout. Each stage is a vertical column with its cards stacked.
- **D-05:** Empty stage columns show the column header, muted "No opportunities" text, and a "+ Add" button. Always visible, never collapsed.
- **D-06:** "+" button at the bottom of each stage column for adding a new opportunity card. Click opens inline card creation (name + link contacts). Contextual to the stage.

### Drag-and-drop behavior
- **D-07:** Optimistic move with undo toast. Card moves instantly on drop, brief "Undo" toast appears for 5 seconds. Writes `pipeline_event` to the linked relationship's timeline on stage change. Reverts card position if undo is clicked or write fails.

### Opportunity card surface
- **D-08:** Card shows: opportunity name, linked contact avatar(s) with names, and priority badge (high/medium/low color). Compact — no notes preview on the card face.
- **D-09:** Click card opens a slide-out panel with full details: name, notes, linked records, stage history, priority, status. Consistent with ContactDetail slide-out pattern.
- **D-10:** Quick actions available directly on the card without opening it:
  1. Click priority badge to cycle through high/medium/low
  2. Archive button (with undo toast)
  3. Click contact avatar to navigate to `/record/:id`
  4. Inline note input on hover/click

### Pipeline management
- **D-11:** "+" tab at the end of the pipeline tab bar to create a new pipeline. Click opens inline name input or small modal. Minimal friction.
- **D-12:** Stage configuration is inline on the board: click column header to rename, drag columns to reorder, color picker on header click. Consistent with PodDetailPage inline-edit-on-blur pattern.
- **D-13:** Hide pipeline via three-dot menu (kebab) on the pipeline tab. Menu contains "Hide pipeline" action.

### Pipeline on record pages
- **D-14:** "Pipelines" widget in the right column of RecordPage, alongside existing widgets (Highlights, Health, Pod Context). Shows opportunity cards this contact is linked to — each showing opportunity name, pipeline name, and current stage.
- **D-15:** "+" button in the Pipelines widget to add the contact to a pipeline. Click opens dropdown to pick pipeline + stage, creates the opportunity. Stays on the record page.

### Cross-module navigation
- **D-16:** Clicking a contact avatar on an opportunity card navigates to `/record/:id`. Standard navigation, browser back returns to the board.
- **D-17:** Clicking an opportunity in the RecordPage Pipelines widget navigates to `/pipelines` with that pipeline's tab active and the opportunity's slide-out open.

### Bulk action
- **D-18:** "Add to pipeline" ships as a new bulk action in Records List alongside existing bulk actions (add to pod, field update, CSV export, archive). Select records, pick pipeline + stage, creates opportunities linking those records.

### Timeline integration
- **D-19:** Stage changes, note additions, priority changes, and archive actions on opportunities write `pipeline_event` entries to the Interactions table for each linked relationship record. Uses the `event_detail` JSON field for metadata (pipeline name, from_stage, to_stage, etc.).

### Pipeline-specific fields
- **D-20:** Pipelines support custom fields scoped to a pipeline (e.g., "Commitment Amount" on LP Fundraising, "Role Level" on Talent Pipeline). Fields are stored on the Opportunities table. Editable on the opportunity slide-out panel. Visible on the card face (if marked "show on card") and in the record page Pipelines widget. Reuses existing custom field patterns from Phase 11 (FieldConfig system).
- **D-21:** Pipeline-specific field values are visible in two places: (1) on the pipeline card/slide-out, and (2) on the relationship record's Pipelines widget showing the association.

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

</decisions>

<specifics>
## Specific Ideas

- Pipeline tabs should feel like the horizontal tabs in Linear's project views — clean, understated, fast to switch.
- Opportunity cards should be compact and scannable — like Trello cards but with the Kinship Brain design language (DM Sans, solid colors, no heavy borders).
- Stage columns should have colored headers matching the stage color, with the rest of the column muted.
- The slide-out panel for opportunity detail should follow the same pattern as ContactDetail and CampaignDetail.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product spec
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` — Pipeline requirements, V1 scope for pipelines
- `docs/Kinship Brain — Initial Outline (Lovable).pdf` — Pipeline concept, stage customization, opportunity model

### Requirements
- `.planning/milestones/v2.0-REQUIREMENTS.md` — PIPE-01 through PIPE-06

### Prior phase context
- `.planning/phases/10-data-architecture-rebuild/10-CONTEXT.md` — D-01: Airtable schema including Pipelines, PipelineStages, Opportunities tables
- `.planning/phases/13-timeline-records-list/13-CONTEXT.md` — D-09: pipeline_event type + renderer built but empty, D-19: "Add to pipeline" bulk action deferred to Phase 14

### Current code (data layer — already built)
- `src/lib/types.ts` — `Pipeline`, `PipelineStage`, `Opportunity`, `PipelineStatus`, `OpportunityStatus`, `OpportunityPriority` types
- `src/lib/airtable.ts` — `getPipelines()`, `createPipeline()`, `getPipelineStages()`, `createPipelineStage()`, `getOpportunities()`, `createOpportunity()` + cache patterns
- `src/lib/sampleData.ts` — `DEMO_PIPELINES` (3), `DEMO_PIPELINE_STAGES` (6), `DEMO_OPPORTUNITIES` (4)

### Current code (UI patterns to follow)
- `src/components/campaigns/CampaignDetail.tsx` — Slide-out panel pattern for opportunity detail
- `src/components/records/RecordPage.tsx` — Right-column widget pattern for Pipelines widget
- `src/components/records/RecordWidgets.tsx` — Widget container pattern
- `src/components/records/RecordsList.tsx` — Bulk action bar pattern for "Add to pipeline"
- `src/components/pods/PodDetailPage.tsx` — Inline edit on blur pattern for stage configuration
- `src/App.tsx` — Router config + floating pill navigator for adding Pipelines entry
- `docs/design-system.md` — Design tokens, typography, spacing, motion curves

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Full pipeline data layer**: Types, Airtable CRUD, caching, and demo data all exist. No data layer work needed — this phase is pure UI.
- **CampaignDetail slide-out**: Direct pattern reference for opportunity slide-out panel (escape stack, animation, layout).
- **RecordWidgets.tsx**: Widget container for the right column — add PipelinesWidget alongside existing widgets.
- **RecordsList bulk actions**: Existing bulk action bar with checkbox selection, count display, action buttons. Extend with "Add to pipeline".
- **PodDetailPage inline edit**: Click-to-edit pattern on blur for stage renaming.
- **Floating pill nav**: Add "Pipelines" entry to the existing pill navigator in App.tsx.
- **escapeStack.ts**: Layered escape handling for slide-out panels and modals.
- **SolidOrb + POD_SHIFT_COLORS**: Avatar/color system for contact avatars on cards.

### Established Patterns
- Stale-while-revalidate caching — already applied to pipeline/stage/opportunity fetches.
- Optimistic updates with revert on failure — apply to drag-and-drop stage moves.
- `pipeline_event` InteractionType — renderer exists in InteractionSection, needs data written on stage changes.
- Route-based navigation with `useNavigate` — add `/pipelines` route.
- Slide-out panels with escape stack — CampaignDetail and ContactDetail precedents.

### Integration Points
- **App.tsx**: Add `/pipelines` route and "Pipelines" nav pill entry.
- **RecordWidgets.tsx**: Add PipelinesWidget component showing linked opportunities.
- **RecordsList.tsx**: Add "Add to pipeline" bulk action button + modal.
- **airtable.ts**: Add `updateOpportunity()` (stage move, priority change, archive) and `updatePipelineStage()` (reorder, rename, color). Add pipeline_event writing via `logInteraction()`.
- **sampleData.ts**: Demo mode mutations for pipeline operations (move card, create opportunity, archive).

</code_context>

<deferred>
## Deferred Ideas

- "Add to project" bulk action — Phase 15 (projects don't exist yet)
- Pipeline-specific custom fields on opportunities (PIPE-04 partial) — track as pipeline-scoped fields, full custom field system already exists from Phase 11
- Pipeline analytics/velocity reporting — Phase 17 (Reporting)
- Pipeline automation (auto-move on conditions) — V2
- Pipeline templates (pre-built stage configurations) — future enhancement
- Multi-pipeline view (see all pipelines at once) — future enhancement

</deferred>

---

*Phase: 14-pipelines*
*Context gathered: 2026-03-29*
