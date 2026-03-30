---
phase: 13-timeline-records-list
plan: 03
subsystem: ui
tags: [bulk-actions, records-list, timeline, csv-export, archive]
dependency_graph:
  requires: [13-02-records-list, 13-01-timeline-system-events]
  provides: [bulk-add-to-pod, bulk-field-update, export-csv, bulk-archive]
  affects: [RecordsList, timeline-system-events]
tech_stack:
  added: []
  patterns:
    - "bulkOperating flag disables all bulk buttons during async loops — prevents double-submit"
    - "Outside-click refs for pod picker and field update dropdowns, same pattern as views/columns"
    - "handleBulkAddToPod skips contacts already in pod (list_ids.includes check)"
    - "handleExportCsv captures visible columns snapshot at call time — consistent with current view"
key_files:
  created: []
  modified:
    - src/components/records/RecordsList.tsx
decisions:
  - "bulkBtnStyle as module-level const, consistent with existing filterBtnStyle/selectStyle/dropdownStyle pattern"
  - "Pod picker and field update are toggle dropdowns (not modals) — keeps bulk bar self-contained"
  - "Field update status uses select, other fields use text input — appropriate input type per field semantics"
  - "handleExportCsv captures visibleColumns snapshot inside function to avoid stale closure"
metrics:
  duration: ~5 minutes
  completed: "2026-03-30"
  tasks_completed: 1
  files_modified: 1
---

# Phase 13 Plan 03: Bulk Actions Summary

**Working bulk action bar with 4 operations (add to pod, field update, CSV export, archive), each writing appropriate system events to affected records' timelines**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-30T01:25:00Z
- **Completed:** 2026-03-30T01:30:51Z
- **Tasks:** 1 complete, 1 pending human verification (Task 2)
- **Files modified:** 1

## Accomplishments

- Replaced placeholder "Bulk actions coming..." bar with 4 functional actions
- Add to pod: dropdown of all loaded pods (color dot + name), skips contacts already in pod, writes `pod_change` system event per contact with pod name in detail
- Bulk field update: two-step form (field selector + value input/select), Enter key submits, Apply button, writes `field_update` system events
- Export CSV: instant download of selected rows with currently visible columns, no UI blocking
- Bulk archive: `window.confirm` gate, sets `status: 'Archived'`, writes `field_update` system events with old/new values
- `bulkOperating` state shows "Working..." label and disables all buttons during async operations
- Outside-click handlers for pod picker and field update dropdowns (consistent with existing Views/Columns pattern)

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement 4 bulk actions in RecordsList | 75bc1da | src/components/records/RecordsList.tsx |
| 2 | Verify Phase 13 | PENDING | — (checkpoint: human-verify) |

## Deviations from Plan

None — plan executed exactly as written. `bulkBtnStyle` added as module-level const (consistent with existing style object pattern in the file).

## Known Stubs

None. All 4 bulk actions are fully wired to `updateContact` and `logSystemEvent`. CSV export uses live `equityMap` and `podMap`. No placeholder text remains in the bulk action bar.

## Self-Check: PASSED
