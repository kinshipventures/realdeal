---
phase: 16-dashboard-nurturing
plan: "03"
subsystem: records, pipelines
tags: [nurturing, signals, banners, indicators, equity]
dependency_graph:
  requires: ["16-01"]
  provides: ["NURT-06"]
  affects: ["RecordPage", "HealthWidget", "RecordWidgets", "OpportunityCard"]
tech_stack:
  added: []
  patterns: ["sessionStorage per-contact dismissal", "useMemo for derived signals", "absolute-positioned dot indicators"]
key_files:
  created: []
  modified:
    - src/components/records/RecordPage.tsx
    - src/components/records/HealthWidget.tsx
    - src/components/records/RecordWidgets.tsx
    - src/components/pipelines/OpportunityCard.tsx
decisions:
  - "missingFieldCount computed inline via useMemo from already-loaded fieldConfigs — no new useEffect needed"
  - "upcomingBirthday delegates to getUpcomingBirthdays([contact], pods, 14) — zero parsing duplication"
  - "OpportunityCard uses isOverdue(contact, 'monthly') default cadence — no pods prop needed in card component"
  - "Banner strip padding matches RecordPage content area (32px horizontal) for visual alignment"
metrics:
  duration: "17s"
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_modified: 4
---

# Phase 16 Plan 03: Nurturing Signals Across Records and Pipelines Summary

Propagated nurturing signals to record pages (dismissible banner + HealthWidget badges) and pipeline Kanban cards (avatar dot indicators) using existing equity scoring functions with zero new scoring logic.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add nurturing signal banner to RecordPage and badges to HealthWidget | 8330e14 | RecordPage.tsx, HealthWidget.tsx, RecordWidgets.tsx |
| 2 | Add dot indicators to pipeline OpportunityCard avatars | 1bd276c | OpportunityCard.tsx |

## What Was Built

**RecordPage banner strip:**
- Computed `urgentSignal` via `useMemo` using `isOverdue` (per-pod cadence) and `isDormant` — grace period check prevents false positives on new contacts
- Red (`#FF3B30`) for overdue, orange (`hsla(20, 80%, 45%, 1)`) for dormant/stale
- Dismissible via `×` button — writes to `sessionStorage` keyed as `kinshipbrain:signal-dismissed:{contactId}`
- `useEffect` on `contact.id` re-syncs dismiss state when navigating between records

**HealthWidget signal badges:**
- `upcomingBirthday` prop — birthday badge with cake SVG icon, green text, shows "Birthday today" or "Birthday {date}"
- `missingFieldCount` prop — warning triangle SVG, tertiary text, "{N} required field(s) missing"
- Only renders badge section when at least one badge is relevant
- Computed in RecordPage via `useMemo`, threaded through RecordWidgets

**OpportunityCard dot indicators:**
- `getContactSignal()` module-level helper — checks `isOverdue(contact, 'monthly')` then `isDormant(contact)`
- 8×8px absolute-positioned dot, top-right of avatar wrapper, 1.5px panel-color border for visual separation
- `title` attribute on wrapper carries `"${contact.name} — ${signal.reason}"` for hover tooltip
- Red dot for overdue, orange for dormant; no text on card

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Architecture Notes

- `getFieldConfigs` is in `src/lib/fieldConfig.ts`, not `airtable.ts` — RecordPage already imported it
- `FieldConfig` uses `scope_pod_id` (not `pod_id`) — used correct field name in `missingFieldCount` computation
- `RecordWidgets` required threading — new props pass through without data ownership since RecordPage is the data orchestrator

## Known Stubs

None.

## Self-Check: PASSED
