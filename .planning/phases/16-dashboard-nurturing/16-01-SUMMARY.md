---
phase: 16-dashboard-nurturing
plan: "01"
subsystem: ui
tags: [react, dashboard, localStorage, widgets, configuration]

requires:
  - phase: 15-projects
    provides: App.tsx route structure and component patterns

provides:
  - Widget-based dashboard architecture with 8 extractable widget components
  - localStorage-backed dashboard config hook (useDashboardConfig) with full/focus presets
  - DashboardSettings panel with preset switcher and per-widget toggles
  - Snooze utilities extracted to shared lib/snooze.ts
  - NeedsAttention widget merging overdue + dormant sections
  - QuickLinks widget replacing verbose campaigns section

affects:
  - 16-02 (NurturingHub — builds on widget pattern, uses /pulse/nurturing routes)
  - 16-03 (Signal propagation — depends on widget visibility config)

tech-stack:
  added: []
  patterns:
    - "Widget pattern: each section is a pure props-only component in widgets/ subdirectory"
    - "Dashboard.tsx stays as data orchestrator — all useState/useMemo/useEffect live here"
    - "Config hook pattern: localStorage sync on every change, version-drift-safe loading"
    - "Exception: QuickLinksWidget fetches pipelines internally (they weren't loaded by Dashboard.tsx)"

key-files:
  created:
    - src/lib/snooze.ts
    - src/components/dashboard/useDashboardConfig.ts
    - src/components/dashboard/DashboardSettings.tsx
    - src/components/dashboard/widgets/EquityWidget.tsx
    - src/components/dashboard/widgets/PodHealthWidget.tsx
    - src/components/dashboard/widgets/WrappedWidget.tsx
    - src/components/dashboard/widgets/TodaysFocusWidget.tsx
    - src/components/dashboard/widgets/NeedsAttentionWidget.tsx
    - src/components/dashboard/widgets/ComingUpWidget.tsx
    - src/components/dashboard/widgets/RecentActivityWidget.tsx
    - src/components/dashboard/widgets/QuickLinksWidget.tsx
  modified:
    - src/components/dashboard/Dashboard.tsx

key-decisions:
  - "Widget components are props-only (no internal fetching) — Dashboard.tsx is the sole data orchestrator. QuickLinksWidget is the one exception since pipelines weren't loaded by Dashboard.tsx"
  - "DashboardSettings rendered as slide-in panel from right (matching ContactDetail pattern) not a modal"
  - "NeedsAttention merges overdue queue + dormant cleanup per D-04: overdue group first, dormant as collapsible gone quiet section below"
  - "Campaigns section removed entirely and replaced with compact QuickLinksWidget per D-06"
  - "useDashboardConfig stores visible as WidgetId[] in localStorage, Set<WidgetId> in memory — visible Set is always authoritative"

patterns-established:
  - "Widget pattern: pure props component in src/components/dashboard/widgets/"
  - "Config hook: loadConfig() reads localStorage synchronously on useState init, saveConfig() writes on every change"
  - "Version-drift protection: missing widget IDs filled from current preset defaults on load"

requirements-completed:
  - DASH-01
  - DASH-02
  - DASH-03
  - DASH-04
  - DASH-05
  - DASH-06

duration: 35min
completed: "2026-03-30"
---

# Phase 16 Plan 01: Dashboard Widget Architecture Summary

**500-line monolithic Dashboard.tsx decomposed into 8 toggleable widget components with localStorage-backed config, full/focus presets, and a slide-in settings panel**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-03-30T18:20:00Z
- **Completed:** 2026-03-30T18:55:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Extracted snooze utilities to `src/lib/snooze.ts` for shared use across dashboard and future nurturing hub
- Created `useDashboardConfig` hook with localStorage persistence, two presets (Full/Focus), and version-drift-safe loading
- Decomposed Dashboard.tsx into 8 widget components — all props-only except QuickLinksWidget which fetches pipelines on mount
- `DashboardSettings.tsx` slide-in panel (320px, matches ContactDetail pattern) with preset buttons and per-widget toggle switches
- `NeedsAttentionWidget` merges overdue queue + dormant cleanup into one section per D-04 — overdue group with orange count badge, dormant as collapsible "gone quiet" section
- `QuickLinksWidget` replaces verbose campaigns + CampaignCard section with compact link cards navigating to `/pipelines`
- "See all" links on TodaysFocus (`/pulse/nurturing?filter=focus`), ComingUp (`/pulse/nurturing?filter=dates`), and NeedsAttention (`/pulse/nurturing?filter=overdue`)
- Build passes clean

## Task Commits

1. **Task 1: Extract snooze utilities and create widget config hook** - `2519c16` (feat)
2. **Task 2: Decompose dashboard into widget components and wire settings panel** - `fa8fc59` (feat)

## Files Created/Modified

- `src/lib/snooze.ts` — `getSnoozedIds()` and `snoozeContact()` extracted verbatim from Dashboard.tsx
- `src/components/dashboard/useDashboardConfig.ts` — config hook with `PRESET_CONFIGS`, `ALL_WIDGETS`, `useDashboardConfig()`
- `src/components/dashboard/DashboardSettings.tsx` — settings panel with `useEscape()`, preset switcher, toggle list
- `src/components/dashboard/widgets/EquityWidget.tsx` — green header band: equity ring + stats grid
- `src/components/dashboard/widgets/PodHealthWidget.tsx` — horizontal scroll pod cards with sparklines
- `src/components/dashboard/widgets/WrappedWidget.tsx` — thin wrapper around WrappedCard
- `src/components/dashboard/widgets/TodaysFocusWidget.tsx` — focus cards with See all link
- `src/components/dashboard/widgets/NeedsAttentionWidget.tsx` — merged overdue + dormant sections
- `src/components/dashboard/widgets/ComingUpWidget.tsx` — birthdays + follow-ups with See all link
- `src/components/dashboard/widgets/RecentActivityWidget.tsx` — recent interaction feed
- `src/components/dashboard/widgets/QuickLinksWidget.tsx` — compact campaign + pipeline links
- `src/components/dashboard/Dashboard.tsx` — refactored to data orchestrator, imports snooze + config hook, renders widgets conditionally

## Decisions Made

- Widget components are props-only (no internal fetching) — Dashboard.tsx is the sole data orchestrator. QuickLinksWidget is the documented exception since pipelines weren't loaded by Dashboard.tsx previously.
- DashboardSettings as slide-in panel from right to match the ContactDetail overlay pattern.
- NeedsAttention merges overdue + dormant per D-04: overdue group first with orange badge, dormant below as collapsible "gone quiet."
- `visible` Set is always authoritative — `applyPreset` overwrites visible set (not a delta).

## Deviations from Plan

None — plan executed exactly as written. Build passes, all acceptance criteria verified.

## Issues Encountered

None.

## Known Stubs

- `QuickLinksWidget` campaign click navigates to `/` (Dashboard) — campaigns don't have a dedicated route yet. This is intentional; the link will be updated when the campaigns/nurturing route ships in plan 16-02.
- `/pulse/nurturing?filter=*` routes don't exist yet — these are forward-looking links for plan 16-02 (NurturingHub). Clicking them navigates to a non-existent route currently.

## Next Phase Readiness

- Widget architecture is the foundation for plan 16-02 (NurturingHub) — the `/pulse/nurturing` route and filter params are already referenced in widget "See all" links
- `useDashboardConfig` and `WidgetId` types are exported and ready for reuse in the nurturing hub
- Snooze utilities in `lib/snooze.ts` are ready for use by the nurturing hub's dormant cleanup section

---
*Phase: 16-dashboard-nurturing*
*Completed: 2026-03-30*

## Self-Check: PASSED

- src/lib/snooze.ts: FOUND
- src/components/dashboard/useDashboardConfig.ts: FOUND
- src/components/dashboard/DashboardSettings.tsx: FOUND
- src/components/dashboard/widgets/: FOUND (8 files)
- Commit 2519c16: FOUND
- Commit fa8fc59: FOUND
