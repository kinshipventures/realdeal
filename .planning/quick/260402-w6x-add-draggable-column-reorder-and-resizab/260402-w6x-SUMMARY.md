---
phase: quick
plan: w6x
subsystem: records
tags: [table, ux, drag-drop, resize, localStorage]
key-files:
  modified:
    - src/components/records/RecordsList.tsx
    - src/index.css
decisions:
  - Used useRef for drag/resize active state to avoid re-renders mid-interaction
  - columnOrder and columnWidths stored in separate localStorage keys for independent reset
  - visibleCols derivation updated to respect columnOrder before filtering
  - table-layout fixed applied only when at least one column has a custom width
metrics:
  tasks: 2
  files_changed: 2
  completed_date: "2026-04-02"
---

# Quick Task w6x: Column Reorder and Resize Summary

**One-liner:** Drag-to-reorder and edge-drag-to-resize columns in the contacts table, both persisted to localStorage and saved views.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add column reorder via drag-and-drop on headers | 3bca5e8 | RecordsList.tsx, index.css |
| 2 | Add column resize via drag handles on header edges | 3bca5e8 | RecordsList.tsx |

## What Was Built

**Column reorder (Task 1):**
- All headers except `name` are draggable (`draggable` attribute + drag event handlers)
- `columnOrder: ColumnId[]` state initialized from `localStorage` key `realdeal:contacts-column-order`
- `dragCol` and `overCol` stored in refs to avoid re-renders during drag
- Drop target shows green left-border indicator (`borderLeft: '2px solid #25B439'`)
- Dragged source column dims to `opacity: 0.4`
- On drop, `columnOrder` array updated and persisted to localStorage
- `visibleCols` derivation changed from `COLUMNS.filter(...)` to `columnOrder.filter(...).map(...)` so all exports follow custom order
- `toggleColumn` ensures newly visible columns append to `columnOrder` if not present
- `SavedView` extended with `columnOrder?: ColumnId[]`

**Column resize (Task 2):**
- All column headers get an absolutely-positioned resize handle div on their right edge (4px wide, `cursor: col-resize`)
- `columnWidths: Partial<Record<ColumnId, number>>` state initialized from `localStorage` key `realdeal:contacts-column-widths`
- Pointer capture on `pointerdown` for smooth cross-element tracking
- Width clamped to minimum 60px
- `table-layout: fixed` applied to `<table>` when any column has a custom width
- Width applied to matching `<th>` and `<td>` elements
- Double-click resize handle resets that column to auto width
- `SavedView` extended with `columnWidths?: Record<ColumnId, number>`
- Resize `pointerdown` calls `e.stopPropagation()` to prevent drag-reorder conflict
- CSS added to `index.css`: `.col-resize-handle` shows `var(--color-text-tertiary)` background on hover

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `src/components/records/RecordsList.tsx` - modified
- `src/index.css` - modified
- Commit `3bca5e8` exists in git log
- `pnpm build` passes with no type errors
