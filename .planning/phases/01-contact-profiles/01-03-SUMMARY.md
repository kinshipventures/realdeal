---
phase: 01-contact-profiles
plan: 03
subsystem: ui
tags: [react, typescript, svg, equity-scoring, contact-profiles]

# Dependency graph
requires:
  - 01-01 (ContactDetail personal section, section order established)
provides:
  - contactEquityBreakdown() function returning per-type weighted contributions
  - SegmentedEquityRing SVG component on contact profiles
  - Per-contact equity score + health label display in personal section
affects: [dashboard, equity-scoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SegmentedEquityRing: SVG arc segments via strokeDasharray/strokeDashoffset on circle elements"
    - "Last segment absorbs rounding error via filledArc - offset (prevents gap/overflow at ring end)"
    - "strokeLinecap=butt for clean joins between colored segments"
    - "interactions fetched in ContactDetail via useEffect on contact.id — separate from InteractionSection fetch"

key-files:
  created: []
  modified:
    - src/lib/equity.ts
    - src/components/contacts/ContactDetail.tsx

key-decisions:
  - "interactions state in ContactDetail fetches independently from InteractionSection — avoids prop-drilling, keeps ring self-contained"
  - "Ring only shown for existing contacts (!isNew) — new contact creation has no interactions to score"
  - "SegmentedEquityRing placed at top of personal section (before birthdayField) per D-03 section order"
  - "Score display: number + label on separate lines (72 / Healthy), not inline fraction — matches Oura ring energy per D-09"

patterns-established:
  - "RING_COLORS: module-level constant mapping InteractionType to hex — avoids magic strings in JSX"
  - "Ghost ring (empty SVG circle) for zero-interaction contacts rather than hiding the ring entirely"

requirements-completed: [PROF-05]

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 01 Plan 03: Contact Profiles — Equity Ring Summary

**Segmented equity ring with per-type colored arcs and score/label display added to contact profiles**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-22T07:52:17Z
- **Completed:** 2026-03-22T07:54:42Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `EquityBreakdown` interface and `contactEquityBreakdown()` to equity.ts — groups interactions by type, applies recency weighting, excludes notes (weight 0) and zero-contribution types, sorts by score descending
- Added `SegmentedEquityRing` SVG component to ContactDetail — colored arc segments proportional to weighted contributions, ghost ring for empty state
- Score (e.g. "72") and health label (e.g. "Healthy") display alongside the ring in bold typography
- Type legend with colored dot + label for each contributing interaction type shown below the ring
- interactions state + useEffect in ContactDetail fetches per-contact data on mount

## Task Commits

1. **Task 1: Add contactEquityBreakdown to equity.ts** — `6062486` (feat)
2. **Task 2: Add SegmentedEquityRing to ContactDetail** — `df45ce1` (feat)

## Files Created/Modified

- `src/lib/equity.ts` — EquityBreakdown interface, contactEquityBreakdown() function
- `src/components/contacts/ContactDetail.tsx` — RING_COLORS, SegmentedEquityRing component, interactions state/effect, equity display JSX in personal section

## Decisions Made

- interactions fetched independently in ContactDetail (not shared from InteractionSection) — cleaner separation, ring is self-contained
- Ring hidden for new contacts (isNew) — no interactions to score until after creation
- Score displayed as "72" with "Healthy" on a separate line, not "72/100" — matches the Oura ring energy metaphor per plan D-09/D-10

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in Dashboard.tsx, CreateCategoryNode.tsx, and equity.ts (byContact unused in todaysFocus) were present before this plan. My changes introduced no new errors.

## Known Stubs

None — ring is fully wired to real interaction data via getInteractions(contact.id).

## Self-Check: PASSED

- `src/lib/equity.ts` contains `export interface EquityBreakdown` and `export function contactEquityBreakdown`
- `src/components/contacts/ContactDetail.tsx` contains `function SegmentedEquityRing(`, `strokeLinecap="butt"`, `scoreLabel(equityScore)`, `getInteractions(contact.id)`
- Commits `6062486` and `df45ce1` exist in git log

---
*Phase: 01-contact-profiles*
*Completed: 2026-03-22*
