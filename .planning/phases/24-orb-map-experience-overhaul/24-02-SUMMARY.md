---
phase: 24-orb-map-experience-overhaul
plan: 02
subsystem: ui
tags: [react-flow, animation, navigation, drill-down, breadcrumb]

requires:
  - phase: 24-01
    provides: GradientEdge, MojNode with health score, ListNode with hover callbacks, OrbMap with hub layout and equityByPod

provides:
  - Two-level drill-down navigation (hub -> pod -> categories)
  - drillIntoPod/drillBackToHub animation sequences
  - Breadcrumb toolbar "Hub / Pod Name" with back arrow
  - MojNode pod-identity mode (shows pod name + pod color gradient in drill-down)
  - isAnimating guard protecting viewport writes and position persistence during transitions
  - mapView state machine ('hub' | 'pod') gating UI elements

affects: [24-03, orb-map, CategoryNode, ListNode]

tech-stack:
  added: []
  patterns:
    - drillInRef pattern - useRef bridges rebuildHomeView (defined early) to drillIntoPod (defined later) without circular deps
    - mapView state gates - orbit rings, reset button, FAB all conditioned on mapView === 'hub'
    - isAnimating ref guard - prevents viewport persistence and RAF logic from firing during programmatic transitions

key-files:
  created: []
  modified:
    - src/components/map/OrbMap.tsx
    - src/components/map/ListNode.tsx
    - src/components/map/MojNode.tsx
    - src/index.css

key-decisions:
  - "drillInRef useRef bridges rebuildHomeView and drillIntoPod without circular dependency in useCallback chains"
  - "Category click in drill-down navigates to /pod/:id (pod detail page) not individual category - categories are entry points to contacts via pod"
  - "No edges in drill-down view per D-07 - setEdges([]) on drill-in"

patterns-established:
  - "drillInRef: useRef<((pod: Pod) => void) | null>(null) pattern for late-binding callbacks"

requirements-completed: [MAP-01, MAP-07]

duration: 12min
completed: 2026-04-03
---

# Phase 24 Plan 02: Orb Map Drill-Down Navigation Summary

**Two-level drill-down with animated transitions: pod orbs zoom into category orbital views with breadcrumb navigation and pod-identity hub orb**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-03T06:30:00Z
- **Completed:** 2026-04-03T06:42:35Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Clicking a pod orb triggers animated drill-in (fade non-selected nodes, swap to category orbital layout, re-center viewport)
- Breadcrumb "Hub / Pod Name" appears at top-left during drill-down with back arrow triggering drill-out animation
- Hub orb displays pod name (Fraunces serif) with pod color gradient in drill-down mode
- Orbit rings, reset button, and FAB all hidden during drill-down
- isAnimating ref prevents viewport persistence and parallax RAF from firing during programmatic transitions
- Position persistence guarded - drag snap only runs in 'hub' mapView

## Task Commits

1. **Task 1: View state machine and drill-down node building** - `6e021bf` (feat)
2. **Task 2: Breadcrumb toolbar and transition CSS** - `890164d` (feat)

## Files Created/Modified

- `src/components/map/OrbMap.tsx` - mapView state, drillIntoPod, drillBackToHub, buildDrillNodes, breadcrumb JSX, orbit ring/FAB/reset guards, isAnimating ref
- `src/components/map/ListNode.tsx` - onDrillIn added to ListNodeData; SolidOrb onClick prefers onDrillIn over navigate
- `src/components/map/MojNode.tsx` - podName/podColor fields; renders pod identity in drill-down mode
- `src/index.css` - .orb-fading and .orbit-start-skip CSS classes

## Decisions Made

- drillInRef useRef pattern used to bridge rebuildHomeView (defined before drillIntoPod) to drillIntoPod without circular useCallback deps
- Category orb click navigates to /pod/:id (pod detail page) - categories are the entry point to contacts through the pod context
- No edges in drill-down (setEdges([])) per design spec D-07

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Plan 03 can build on the mapView state machine for additional interactions (icon picker, create category within drill-down)
- onDrillIn callback pattern established in ListNode is clean for extension
- .orb-fading and .orbit-start-skip CSS classes ready for use

---
*Phase: 24-orb-map-experience-overhaul*
*Completed: 2026-04-03*
