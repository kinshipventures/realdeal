---
phase: quick
plan: 260401-o5j
subsystem: dashboard
tags: [widgets, settings, drag-and-drop, localStorage]
tech-stack:
  added: []
  patterns: [native-html-dnd, order-driven-rendering]
key-files:
  created: []
  modified:
    - src/components/dashboard/WrappedCard.tsx
    - src/components/dashboard/useDashboardConfig.ts
    - src/components/dashboard/DashboardSettings.tsx
    - src/components/dashboard/Dashboard.tsx
decisions:
  - Equity widget excluded from orderable list - it lives in header band, not widget flow
  - Native HTML5 DnD chosen over library - simple enough, no extra deps
  - Storage key bumped to v2 to force clean migration from configs without order
  - Sections rendered in order of first widget appearance in config.order
metrics:
  duration: "~25 minutes"
  completed: "2026-04-02T00:28:11Z"
  tasks: 2
  files: 4
---

# Quick Task 260401-o5j: Dashboard Widget Settings and Reordering Summary

**One-liner:** Widget visibility centralized to settings panel with native drag-to-reorder and localStorage-persisted order.

## Tasks Completed

| # | Name | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Remove Wrapped hide button, add order to config hook | 706da71 | WrappedCard.tsx, useDashboardConfig.ts |
| 2 | Drag-to-reorder in DashboardSettings, order-driven Dashboard | 45d07a2 | DashboardSettings.tsx, Dashboard.tsx |

## What Was Built

**WrappedCard.tsx** - Removed `dismissed` state, `hovered` state, hover show/hide button, and `onMouseEnter`/`onMouseLeave` handlers from both empty and insights states. Visibility is now exclusively controlled via the settings panel toggle.

**useDashboardConfig.ts** - Added `order: WidgetId[]` to `DashboardConfig` and `StoredConfig`. Added `DEFAULT_ORDER` constant (8 orderable widgets; equity excluded). Updated `loadConfig()` and `saveConfig()` to handle the order array with drift protection. Added `reorderWidgets(fromIndex, toIndex)` using standard splice-insert pattern. Bumped storage key to `realdeal:dashboard-config:v2`.

**DashboardSettings.tsx** - Accepts `onReorder` prop. Shows equity row first (non-draggable), then orderable widgets from `config.order`. Each orderable row has a 6-dot drag handle, native HTML5 `draggable` behavior, `onDragStart`/`onDragOver`/`onDrop`/`onDragEnd` handlers. Visual drop indicator: 2px brand-colored border on the target row's leading edge. Toggle switches preserved on right side.

**Dashboard.tsx** - Destructures `reorderWidgets` from `useDashboardConfig` and passes it to `DashboardSettings`. Replaced static section blocks with `renderOrderedWidgets()` - a module-level function that builds section/standalone buckets from `config.order`, then renders sections in the order their first widget appears. Section headings only render when at least one widget in that section is visible.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- WrappedCard.tsx: no `dismissed` state, no hover hide button - confirmed
- useDashboardConfig.ts: exports `reorderWidgets`, `config.order`, `DEFAULT_ORDER` - confirmed
- DashboardSettings.tsx: renders drag handles, calls `onReorder` on drop - confirmed
- Dashboard.tsx: order-driven rendering via `renderOrderedWidgets` - confirmed
- Commits 706da71 and 45d07a2 exist - confirmed
- `pnpm build` passes with no type errors - confirmed
