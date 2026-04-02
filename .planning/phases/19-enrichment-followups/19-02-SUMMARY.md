---
phase: 19-enrichment-followups
plan: 02
subsystem: dashboard-widgets
tags: [follow-ups, overdue, dashboard, nurturing-hub]
dependency_graph:
  requires: []
  provides: [FLW-02]
  affects: [NeedsAttentionWidget, ComingUpWidget, NurturingHub, Dashboard]
tech_stack:
  added: []
  patterns: [overdue-flag, signal-priority-ordering]
key_files:
  created: []
  modified:
    - src/components/dashboard/widgets/NeedsAttentionWidget.tsx
    - src/components/dashboard/widgets/ComingUpWidget.tsx
    - src/components/nurturing/NurturingHub.tsx
    - src/components/dashboard/Dashboard.tsx
decisions:
  - "followUpOverdue computed as a separate memo in Dashboard, not merged into overdueContacts -- keeps cadence-overdue and follow-up-overdue cleanly separated"
  - "NurturingHub computes follow-up overdue inline within needsAttentionContacts useMemo to avoid a second useState and keep the section unified"
  - "isFollowUpOverdue flag on needsAttentionContacts drives signal text and color in the render -- avoids a separate component"
metrics:
  duration: "3 minutes"
  completed_date: "2026-04-02"
  tasks: 2
  files: 4
---

# Phase 19 Plan 02: Dashboard Follow-Up Surfacing Summary

Overdue follow-ups surface across three dashboard surfaces with red visual treatment and priority ordering above cadence-overdue contacts.

## What Was Built

**NeedsAttentionWidget** -- Added `followUpOverdue` prop (contacts where `next_follow_up_date < today`). New `FollowUpOverdueRow` component renders with a calendar SVG icon and red "Xd overdue" label. Follow-up overdue rows appear above cadence-overdue rows. Count badge reflects both types combined.

**ComingUpWidget** -- Added `isOverdue?: boolean` to `UpcomingItem` type. Items sort overdue-first within the widget. Overdue rows get a red dot, red sublabel text, and a subtle red background tint. Dashboard `followUpItems` memo now removes the `d >= today` filter so overdue items flow through.

**NurturingHub** -- `needsAttentionContacts` memo restructured: follow-up overdue contacts computed first (sorted by how many days overdue), cadence-overdue contacts appended after (skipping any contact already in follow-up overdue). Signal text for follow-up overdue rows reads "Follow-up overdue: [action]" in red (`#DC2626`).

**Dashboard.tsx** -- New `followUpOverdue` memo (`next_follow_up_date < today`) feeds `NeedsAttentionWidget`. `upcomingItems` memo sets `isOverdue: true` and uses "Xd overdue" sublabel for negative `daysUntil`.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All data comes from live `next_follow_up_date` field on contacts.

## Self-Check: PASSED

Files exist:
- src/components/dashboard/widgets/NeedsAttentionWidget.tsx - FOUND
- src/components/dashboard/widgets/ComingUpWidget.tsx - FOUND
- src/components/nurturing/NurturingHub.tsx - FOUND
- src/components/dashboard/Dashboard.tsx - FOUND

Commits:
- cbb18ad - Task 1 (NeedsAttentionWidget + Dashboard followUpOverdue)
- ff52089 - Task 2 (ComingUpWidget + NurturingHub + Dashboard expansion)
