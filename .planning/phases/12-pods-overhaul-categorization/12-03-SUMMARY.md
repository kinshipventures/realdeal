---
phase: 12-pods-overhaul-categorization
plan: "03"
subsystem: pods
tags: [pods, navigation, ui, modal]
dependency_graph:
  requires: [12-01]
  provides: [PodDetailPage, PodCreateModal, pod-route]
  affects: [App.tsx, map navigation]
tech_stack:
  added: []
  patterns: [two-column-detail-page, inline-edit-on-blur, modal-with-escape-stack]
key_files:
  created:
    - src/components/pods/PodDetailPage.tsx
    - src/components/pods/PodCreateModal.tsx
  modified:
    - src/App.tsx
key_decisions:
  - PodDetailPage uses inline edit on blur for all pod settings — consistent with RecordPage pattern
  - Sub-pod creation uses existing createCategory() inline rather than a separate route
  - Field management links to member record page rather than re-implementing PodFieldsWidget
metrics:
  duration: "~10 minutes"
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_changed: 3
---

# Phase 12 Plan 03: Pod Detail Page + Create Modal Summary

PodDetailPage at `/pod/:id` and PodCreateModal component — pods are now first-class navigable entities.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | PodDetailPage at /pod/:id | 3e9edc0 | PodDetailPage.tsx, App.tsx |
| 2 | PodCreateModal for new pod creation | 40b8cea | PodCreateModal.tsx |

## What Was Built

### PodDetailPage (`src/components/pods/PodDetailPage.tsx`)

Full pod detail page at `/pod/:id` with:
- Editable pod settings: description (textarea, auto-save on blur), cadence (dropdown), capacity (number input with member count display), owner (dropdown), priority (checkbox). All settings save on change via `updatePod()`.
- **Required Fields section**: filters `fieldConfigs` by `fc.scope_pod_id === podId`. Shows field name, type badge, red dot if required. Links to member record for field management.
- **Sub-pods section**: grid of category chips linking to `/category/:id`. Inline "Add Sub-pod" input using `createCategory()`.
- **Members section**: contacts where `c.status === 'Active' && c.list_ids.includes(podId)`, sorted by equity score descending. Each row shows Avatar, name, company/role, equity score + label. Click navigates to `/record/:id`. "Primary" badge for `primary_list_id` match.

### PodCreateModal (`src/components/pods/PodCreateModal.tsx`)

Pod creation modal with:
- Name (required, save disabled when empty), color swatches from `POD_SHIFT_COLORS` (gradient preview, checkmark on selected), description textarea
- Cadence dropdown (weekly/biweekly/monthly/quarterly), capacity number input, owner dropdown, priority checkbox
- `useEscape(stableClose)` for keyboard dismiss, click-outside closes
- Calls `createPod()` on save, returns pod via `onCreated` callback

### Route

`/pod/:id` route added to `App.tsx` after `record/:id`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. PodCreateModal is standalone (not yet wired into OrbMap or any surface — that's plan 12-04 per the plan spec).

## Self-Check

- [x] `src/components/pods/PodDetailPage.tsx` exists (380+ lines)
- [x] `src/components/pods/PodCreateModal.tsx` exists
- [x] App.tsx contains `path="pod/:id"` route
- [x] `pnpm build` exits 0
- [x] Commit 3e9edc0 exists
- [x] Commit 40b8cea exists
