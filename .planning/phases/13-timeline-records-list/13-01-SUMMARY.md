---
phase: 13-timeline-records-list
plan: 01
subsystem: timeline
tags: [timeline, system-events, filtering, categorization, types]
dependency_graph:
  requires: []
  provides: [system-event-types, logSystemEvent, timeline-filter-chips, dual-rendering]
  affects: [InteractionSection, RecordTimeline, CategorizationModal, equity-scoring]
tech_stack:
  added: [src/lib/timeline.ts]
  patterns: [system-event-writer, dual-render, controlled-filter-state]
key_files:
  created:
    - src/lib/timeline.ts
  modified:
    - src/lib/types.ts
    - src/lib/airtable.ts
    - src/lib/equity.ts
    - src/lib/sampleData.ts
    - src/components/categorization/CategorizationModal.tsx
    - src/components/contacts/InteractionSection.tsx
    - src/components/records/RecordTimeline.tsx
decisions:
  - System events rendered as compact dot-lines (not cards) to preserve visual hierarchy
  - activeFilters and showSystemEvents owned by RecordTimeline (not InteractionSection) — filter state lives at the wrapper level
  - System events bypass per-type filter when toggled on — all-or-nothing visibility for system events
  - logSystemEvent wraps createInteraction — single call site for programmatic event writing
metrics:
  duration: ~15 minutes
  completed: "2026-03-29"
  tasks_completed: 2
  files_modified: 7
---

# Phase 13 Plan 01: Timeline System Events and Filter Chips Summary

Unified the activity timeline from human-interaction-only to a full activity feed with system events, source/actor attribution, and type filtering.

## What Was Built

JWT auth with refresh rotation — no, more precisely: **Chronological timeline with system events, actor attribution, and filter chips using dual-render pattern (human cards + compact system lines).**

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Expand types, data layer, and equity weights | 9c6061b | types.ts, airtable.ts, equity.ts, timeline.ts, sampleData.ts, CategorizationModal.tsx |
| 2 | Timeline UI with dual rendering and filter chips | 8f0bdd1 | InteractionSection.tsx, RecordTimeline.tsx |

## Key Changes

**Type System (src/lib/types.ts)**
- `InteractionType` union expanded with `pod_change`, `field_update`, `categorization`, `pipeline_event`
- New exports: `HumanInteractionType`, `SystemEventType`, `HUMAN_TYPES`, `SYSTEM_TYPES`
- `Interaction` interface gains `event_detail: string | null` and `actor: string | null`

**Data Layer (src/lib/airtable.ts)**
- `InteractionFields` type gets `Event Detail` and `Actor` fields
- `mapInteraction` returns `event_detail` and `actor` from Airtable response
- `createInteraction` sends `Event Detail` and `Actor` to Airtable

**Equity Scoring (src/lib/equity.ts)**
- `INTERACTION_WEIGHTS` extended with all 4 system event types at weight 0 — they don't affect scores

**System Event Writer (src/lib/timeline.ts)**
- New `logSystemEvent()` — single entry point for all programmatic event writes
- Takes `contactId`, `type`, `detail` (JSON), and optional `notes` (human-readable summary)

**Categorization (src/components/categorization/CategorizationModal.tsx)**
- Replaced `createInteraction({ type: 'note' })` with `logSystemEvent({ type: 'categorization' })`
- Removed unused `createInteraction` import

**Demo Data (src/lib/sampleData.ts)**
- `ix()` helper extended to support `event_detail` and `actor`
- 5 sample system events added across contacts 1, 4, 7, 9, 19

**Timeline UI (src/components/contacts/InteractionSection.tsx)**
- `TYPE_LABELS` and `TYPE_COLORS` cover all 10 interaction types
- Props extended: `activeFilters?: Set<InteractionType>`, `showSystemEvents?: boolean`
- `filtered` memo applies both filter dimensions
- System events render as compact lines (dot + text + actor + timestamp)
- Human interaction cards show actor if present (backward compatible — null shows nothing)

**Filter State (src/components/records/RecordTimeline.tsx)**
- Owns `activeFilters` (Set of human types, defaults to all) and `showSystemEvents` (defaults false)
- "All" chip toggles all human types on/off
- Per-type chips toggle individual types
- "+ System events" chip reveals/hides system events

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All system event types are wired end-to-end. `pipeline_event` type exists in the type system and renders correctly — population from Phase 14 pipelines will fill it.

## Self-Check: PASSED
