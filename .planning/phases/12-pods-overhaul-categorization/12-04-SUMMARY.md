---
phase: 12-pods-overhaul-categorization
plan: "04"
subsystem: ui
tags: [react-flow, react-router, pods, orb-map, navigation]

requires:
  - phase: 12-02
    provides: PodDetailPage at /pod/:id route
  - phase: 12-03
    provides: PodCreateModal component

provides:
  - ListNode navigates to /pod/:id via useNavigate on click
  - OrbMap stripped of all category-drill state — pure pod browser
  - Capacity fraction indicator on capacity-limited pod orbs
  - '+' orb on map opens PodCreateModal to create new pods
  - memberCount passed to each pod node for capacity display

affects: [orb-map, pod-navigation, pod-creation]

tech-stack:
  added: []
  patterns:
    - "ListNode owns its own navigation via useNavigate — no callback prop threading"
    - "OrbMap buildHomeNodes receives all display data as a params object"

key-files:
  created: []
  modified:
    - src/components/map/ListNode.tsx
    - src/components/map/OrbMap.tsx

key-decisions:
  - "ListNode uses useNavigate directly — removes onClick prop dependency, cleaner separation"
  - "'+' create node reuses CreateCategoryNodeComponent but wires onCreate to open PodCreateModal instead of inline name input"
  - "OrbMap re-fetches full data after pod creation for accurate memberCount and equity scores"

patterns-established:
  - "Node navigation pattern: node components call useNavigate directly, not via data callbacks"

requirements-completed: [POD-10, CAT-01]

duration: 5min
completed: 2026-03-29
---

# Phase 12 Plan 04: Orb Map Navigation Overhaul Summary

**Pod orb clicks navigate to /pod/:id, category-drill fully removed, capacity indicators on orbs, '+' orb opens PodCreateModal**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-29T22:18:00Z
- **Completed:** 2026-03-29T22:20:27Z
- **Tasks:** 1 of 2 (task 2 is human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- ListNode no longer uses prop callback — it owns its own navigation via `useNavigate('/pod/${id}')`
- Removed all category-drill state from OrbMap: `view`, `selectedPod`, `catRefresh`, `handlePodClick` (category drill version), `handleBack`, `circularLayout` usage, `buildCategoryNodes`/`buildCategoryEdges` equivalents, breadcrumb nav
- Added `capacity` and `memberCount` fields to pod node data; ListNode shows `memberCount/capacity` fraction for capacity-limited pods
- CreateCategoryNodeComponent on home view now triggers `setShowCreatePod(true)` → `PodCreateModal` renders inline in OrbMap
- OrbMap re-fetches full pods+contacts+interactions after pod creation for accurate state

## Task Commits

1. **Task 1: Rewire ListNode navigation + remove category-drill from OrbMap** - `72a580f` (feat)

## Files Created/Modified

- `src/components/map/ListNode.tsx` - useNavigate for pod routing, capacity fraction display, removed onClick prop
- `src/components/map/OrbMap.tsx` - Category-drill removed, PodCreateModal wired, buildHomeNodes accepts params object with memberCountByPod

## Decisions Made

- ListNode uses `useNavigate` directly — no prop callback threading required. Cleaner and consistent with RecordPage navigation pattern.
- `onCreate` in the '+' node calls `onCreatePod()` immediately (ignores the name arg from CreateCategoryNodeComponent) — reuses existing component shape without modification.
- Re-fetch strategy after pod creation: full Promise.all for pods/contacts/interactions rather than optimistic insert, ensures accurate counts.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Minor: initial implementation used a dynamic `import()` for `getCategories` in the init effect — fixed immediately to static import to avoid bundler warning.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 12 complete. Task 2 (human-verify checkpoint) requires end-to-end QA of the full Phase 12 flow:
- Pending tray widget on dashboard
- Swipe queue + categorization modal with required fields
- Pod orb navigation to /pod/:id
- Pod detail page (all 4 sections)
- PodCreateModal from map '+' orb
- CSV imports land as Pending

---
*Phase: 12-pods-overhaul-categorization*
*Completed: 2026-03-29*

## Self-Check: PASSED

- src/components/map/ListNode.tsx: FOUND
- src/components/map/OrbMap.tsx: FOUND
- .planning/phases/12-pods-overhaul-categorization/12-04-SUMMARY.md: FOUND
- Commit 72a580f: FOUND
