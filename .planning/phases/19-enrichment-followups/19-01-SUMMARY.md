---
phase: 19-enrichment-followups
plan: "01"
subsystem: contacts/nurturing
tags: [follow-up, crud, timeline, nurturing-hub]
dependency_graph:
  requires: []
  provides: [follow-up-set, follow-up-edit, follow-up-complete, nurturing-inline-followup]
  affects: [ContactDetail, NurturingRow, NurturingHub]
tech_stack:
  added: []
  patterns: [inline-edit, three-state-bar, expand-toggle]
key_files:
  created: []
  modified:
    - src/components/contacts/ContactDetail.tsx
    - src/components/nurturing/NurturingRow.tsx
decisions:
  - Used onSaved (existing prop) instead of onContactUpdated alias in ContactDetail -- matches existing component contract
  - Pinned bar uses three-state render (empty/read/edit) in a single conditional block -- avoids separate components for small surface
metrics:
  duration: "~8 minutes"
  completed: "2026-04-02T17:37:08Z"
  tasks: 2
  files: 2
---

# Phase 19 Plan 01: Follow-up CRUD Summary

Follow-up set/edit/complete from ContactDetail pinned bar and inline creation from nurturing hub rows.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Editable follow-up pinned bar in ContactDetail | dbae59c | ContactDetail.tsx |
| 2 | Inline follow-up creation from nurturing hub | 4a6d01a | NurturingRow.tsx |

## What Was Built

**ContactDetail pinned bar (three states):**
- Empty: "Set follow-up" ghost button with calendar icon -- clicking opens edit mode
- Read: shows action text + date chip, both clickable to enter edit mode; checkmark button completes follow-up
- Edit: date input + action text input + Save/Cancel -- Save calls `updateContact` and pushes result to parent via `onSaved`
- Complete: calls `logSystemEvent({ type: 'field_update', detail: { source: 'follow_up_completed', ... } })` then clears fields via `updateContact`

**NurturingRow inline follow-up:**
- Calendar icon button added to action row alongside log/snooze buttons
- Clicking expands inline form (date picker + action text + Save/Cancel) -- same visual pattern as `showLog`
- Opening pre-fills date/action from existing contact follow-up if set
- Save calls `updateContact` and propagates via optional `onContactUpdated` prop
- Log toggle closes follow-up form and vice versa

## Deviations from Plan

**1. [Rule 1 - Bug] Used `onSaved` instead of `onContactUpdated` in ContactDetail**
- Found during: Task 1 implementation
- Issue: Plan referenced `onContactUpdated` but ContactDetail's Props interface uses `onSaved`
- Fix: Used `onSaved` throughout pinned bar -- no interface change needed
- Files modified: ContactDetail.tsx

None other -- plan executed as written.

## Self-Check: PASSED

- src/components/contacts/ContactDetail.tsx -- modified, contains editFollowUpDate, Set follow-up, logSystemEvent, follow_up_completed
- src/components/nurturing/NurturingRow.tsx -- modified, contains showFollowUp, followUpDate, updateContact
- Commit dbae59c -- verified
- Commit 4a6d01a -- verified
- `pnpm build` exits 0 on both tasks
