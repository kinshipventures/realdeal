---
phase: 24-orb-map-experience-overhaul
plan: 03
subsystem: ui
tags: [react-flow, search, highlight, animation, orb-map]

requires:
  - phase: 24-orb-map-experience-overhaul
    plan: 01
    provides: [ListNode highlight prop surface, OrbMap node management]
  - phase: 24-orb-map-experience-overhaul
    plan: 02
    provides: [drillBackToHub, mapView state, drill-down flow]

provides:
  - search-to-map highlight bridge (Cmd+K -> pod orb pulse)
  - orb-highlight-pulse CSS animation

affects: []

tech-stack:
  added: []
  patterns:
    - window custom event bridge (map:highlight-pods) for cross-component state without context
    - mapViewRef + drillBackRef pattern for imperative calls from event listeners

key-files:
  created: []
  modified:
    - src/App.tsx
    - src/components/map/OrbMap.tsx
    - src/components/map/ListNode.tsx
    - src/index.css

decisions:
  - Custom event (window.dispatchEvent) used instead of prop drilling - AppShell and OrbMap are siblings via Outlet, not parent/child; event avoids context overhead for a single signal
  - mapViewRef tracks mapView state for use in event handlers (closures can't capture setState)
  - drillBackRef mirrors drillBackToHub for use inside the event listener effect with stable [] deps
  - MAP-03 (contact presence on canvas) deferred per CONTEXT.md - no implementation
  - MAP-09 (mobile) requires no changes - React Flow touch events already handle basic tap

metrics:
  duration: "12 minutes"
  completed: "2026-04-03"
  tasks: 2
  files: 4
---

# Phase 24 Plan 03: Search-to-Map Highlight Bridge Summary

Cmd+K search on the map route dispatches a pod highlight event - selecting a contact pulses their pod orb(s) 3 times with a brightness/glow animation that auto-clears after 2.5 seconds.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Search-to-map highlight bridge | c478c9a | App.tsx, OrbMap.tsx, ListNode.tsx, index.css |
| 2 | Full map experience verification | - | Human-verified, approved |

## What Was Built

**Search bridge (App.tsx):** When on a map route and a contact is selected from Cmd+K, `window.dispatchEvent` fires `map:highlight-pods` with the contact's `list_ids`. Non-map routes still navigate to contact detail.

**OrbMap listener (OrbMap.tsx):** Listens for `map:highlight-pods` event, sets `activeHighlights` Set, auto-clears after 2500ms. If currently in drill-down (pod) view, calls `drillBackRef.current()` first then delays 500ms before highlighting so the hub is visible.

**ListNode highlight (ListNode.tsx):** `highlighted?: boolean` added to `ListNodeData`. When true, appends `orb-highlight-pulse` to the wrapper's className.

**CSS animation (index.css):** `.orb-highlight-pulse` runs `highlight-pulse` 3 iterations at 0.75s each (2.25s total). Keyframes use `filter: brightness + drop-shadow` for a clean glow effect.

## Post-Checkpoint Fixes (by orchestrator)

The following bugs were discovered during human verification and fixed by the orchestrator before approval:

- **Drill-down viewport centering:** Replaced `setViewport({x:0,y:0,zoom:1})` with `fitView({padding:0.35, duration:250})` in both drillIntoPod and drillBackToHub - nodes were pinned to top-left instead of centered
- **Map view state timing:** Moved `setMapView('pod')` before the fade timeout for correct sequencing
- **Fading class application:** Added `fading` CSS class to ListNode and CategoryNode components
- **Tooltip cleanup:** Added `setHoveredPod(null)` on drill-in to prevent stale tooltips

These fixes are committed in the working tree (4accf1d through 4d88c6d).

## Deviations from Plan

**1. [Rule 1 - Architectural adaptation] Custom event instead of prop drilling**
- **Found during:** Task 1
- **Issue:** `AppShell` (where SearchPalette lives) renders routes via `<Outlet />`. Route elements are defined in `App()` - a sibling scope. `searchHighlightPods` state in `AppShell` is inaccessible to route JSX in `App()`.
- **Fix:** Replaced prop-based bridge with `window.dispatchEvent('map:highlight-pods')` in AppShell, and a `window.addEventListener` in OrbMap. Functionally equivalent - simpler than context, no new files.
- **Files modified:** src/App.tsx, src/components/map/OrbMap.tsx

## Requirements Closed

- MAP-06: Cmd+K search highlights matching pod orbs on canvas - COMPLETE
- MAP-03: Contact presence on canvas - DEFERRED (per CONTEXT.md D-13, no implementation)
- MAP-09: Mobile touch support - NO WORK NEEDED (React Flow handles tap events)

## Known Stubs

None.

## Self-Check: PASSED

- c478c9a exists in git log
- src/App.tsx modified (map:highlight-pods dispatch)
- src/components/map/OrbMap.tsx modified (activeHighlights, event listener)
- src/components/map/ListNode.tsx modified (highlighted prop, orb-highlight-pulse class)
- src/index.css modified (@keyframes highlight-pulse)
- pnpm build exits 0
