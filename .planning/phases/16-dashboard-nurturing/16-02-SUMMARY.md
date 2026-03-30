---
phase: 16-dashboard-nurturing
plan: "02"
subsystem: nurturing
tags: [nurturing, routing, ui, equity]
dependency_graph:
  requires:
    - "16-01 (snooze.ts, NeedsAttentionWidget, See all links)"
    - "src/lib/equity.ts (isDormant, daysSinceContact)"
    - "src/lib/airtable.ts (isOverdue, isInGracePeriod, getContacts, getPods, getAllInteractions, logInteraction)"
    - "src/lib/fieldConfig.ts (getFieldConfigs, FieldConfig)"
    - "src/lib/birthdays.ts (getUpcomingBirthdays)"
    - "src/lib/snooze.ts (getSnoozedIds, snoozeContact)"
  provides:
    - "NurturingHub route at /pulse/nurturing"
    - "NurturingRow contact row with 3-action pattern"
    - "isPulse nav detection fixed for /pulse/* sub-routes"
  affects:
    - "src/App.tsx (new route, isPulse fix)"
tech_stack:
  added: []
  patterns:
    - "Scrollable drill-down view with section refs + scrollIntoView for filter param navigation"
    - "Optimistic snooze: local state update + localStorage write"
    - "Inline type picker for quick interaction logging in list context"
    - "Collapsed hygiene section with expand toggle"
key_files:
  created:
    - "src/components/nurturing/NurturingHub.tsx"
    - "src/components/nurturing/NurturingRow.tsx"
  modified:
    - "src/App.tsx"
decisions:
  - "getFieldConfigs imported from fieldConfig.ts (separate module), not airtable.ts — plan spec listed airtable.ts but the function lives in fieldConfig.ts"
  - "TYPE_ICONS from InteractionSection only covers call/email/text/meeting — note and intro excluded from quick log types in NurturingRow (aligns with quick-action intent)"
  - "fieldConfig.ts uses scope_pod_id not pod_id — missing field detection checks scope_pod_id against contact.list_ids"
metrics:
  duration: "~15 minutes"
  completed: "2026-03-30"
  tasks_completed: 2
  files_changed: 3
requirements:
  - NURT-01
  - NURT-02
  - NURT-03
  - NURT-04
  - NURT-05
---

# Phase 16 Plan 02: Nurturing Hub Summary

Nurturing Hub drill-down at /pulse/nurturing with overdue, stale, upcoming dates, and data hygiene sections — each contact row has log interaction, snooze, and navigate actions.

## What Was Built

**NurturingRow** (`src/components/nurturing/NurturingRow.tsx`) — reusable contact row for the hub. Three actions: inline type picker (call/email/text/meeting pills) for quick interaction logging, snooze 30d, click-through to contact record. Row body navigates to `/contact/:id`.

**NurturingHub** (`src/components/nurturing/NurturingHub.tsx`) — standalone route component. Fetches contacts, pods, interactions, field configs on mount. Four sections:
- **needs attention**: overdue contacts (isOverdue per pod cadence), sorted by days since contact descending. Orange signal badge.
- **stale**: dormant contacts (isDormant = 90+ days), sorted by staleness. Muted signal.
- **upcoming dates**: birthdays + follow-ups within 14 days, sorted by daysUntil. Green for birthdays, muted for follow-ups.
- **data hygiene** (collapsed): missing required fields per contact, pods at capacity. Expand toggle. Gentle presentation — count badge only, no red alerts.

URL filter param (`?filter=overdue|stale|dates|hygiene|focus`) scrolls to the relevant section via `scrollIntoView`. Empty sections render nothing (auto-collapse).

**App.tsx** — route `pulse/nurturing` added. `isPulse` detection updated to match `/` and any `/pulse/*` path so nav pill stays active when on the nurturing drill-down.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written with one noted adaptation:

**[Rule 2 - Correctness] FieldConfig import from fieldConfig.ts, not airtable.ts**
- The plan spec listed `getFieldConfigs` as an `airtable.ts` export, but the function lives in `src/lib/fieldConfig.ts` (a separate module created in Phase 11).
- Imported from the correct source without changing behavior.

## Known Stubs

None. All sections are wired to real data. The data hygiene section may show empty when no field configs are marked required in Airtable — this is correct behavior (not a stub).

## Self-Check: PASSED

- NurturingHub.tsx: FOUND
- NurturingRow.tsx: FOUND
- App.tsx route + isPulse fix: verified in git diff
- Commit abd8239: feat(16-02): create NurturingRow and NurturingHub components
- Commit 9fa5e27: feat(16-02): wire /pulse/nurturing route and fix isPulse detection
- Build: passes clean (✓ built in 1.32s)
