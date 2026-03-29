---
phase: 09-add-contact
plan: 01
subsystem: ui
tags: [react, modal, form, airtable, demo-mode]

requires:
  - phase: 08-contact-enrich
    provides: enriched Contact type with V1 fields
provides:
  - AddContactModal component with structured entry and brain dump modes
  - createContact demo mode guard
  - FAB trigger on dashboard
affects: []

tech-stack:
  added: []
  patterns: [modal-with-escape-stack, demo-mode-guard-on-mutations]

key-files:
  created:
    - src/components/contacts/AddContactModal.tsx
  modified:
    - src/lib/airtable.ts
    - src/components/dashboard/Dashboard.tsx

key-decisions:
  - "Modal state managed in Dashboard (not App.tsx) to avoid route scope issues"
  - "Brain dump creates contact with name='Brain Dump', intel_notes=text, needs_review=true in Unsorted pod"
  - "Page reload after creation for simplest cache invalidation"

patterns-established:
  - "Demo mode guard pattern: check isDemoMode() at top of mutation functions, push to DEMO_ array, return fake object"

requirements-completed: [ADD-01, ADD-02]

duration: 5min
completed: 2026-03-26
---

# Phase 9 Plan 1: Add Contact Summary

**Add Contact modal with structured form (name/email/pod validation) and brain dump path (free text to Unsorted), triggered by dashboard FAB**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-26T21:21:03Z
- **Completed:** 2026-03-26T21:26:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 3

## Accomplishments
- Two-tab modal: "Add Contact" (structured) and "Quick Note" (brain dump)
- Structured mode validates required fields (First Name, Last Name, Email, at least one Pod)
- Brain dump drops into Unsorted pod with needs_review=true for later triage
- Demo mode guard on createContact prevents API calls during demos
- Green FAB on dashboard bottom-right, above nav bar

## Task Commits

Each task was committed atomically:

1. **Task 1: AddContactModal component with structured + brain dump modes** - `37eb18f` (feat)
2. **Task 2: Wire modal into App shell with FAB trigger on dashboard** - `c3dd5c2` (feat)
3. **Task 3: Verify Add Contact flow** - auto-approved checkpoint

## Files Created/Modified
- `src/components/contacts/AddContactModal.tsx` - Two-mode modal (structured entry + brain dump)
- `src/lib/airtable.ts` - Demo mode guard added to createContact
- `src/components/dashboard/Dashboard.tsx` - FAB button + AddContactModal integration

## Decisions Made
- Modal state managed in Dashboard rather than App.tsx: the Route/Outlet pattern made it impossible to pass state from AppShell to child routes cleanly
- Brain dump uses "Brain Dump" as name field with all intel in intel_notes, matched to Unsorted pod ID
- Page reload after creation is simplest path to refresh all dashboard data sections

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Modal state moved from App.tsx to Dashboard.tsx**
- **Found during:** Task 2 (wiring modal into App shell)
- **Issue:** Plan specified state in App.tsx, but AppShell/Route pattern means AppShell state is not accessible in the App() function where routes are defined
- **Fix:** Moved showAddContact state, FAB, and AddContactModal rendering entirely into Dashboard.tsx
- **Files modified:** src/App.tsx, src/components/dashboard/Dashboard.tsx
- **Verification:** pnpm build passes
- **Committed in:** c3dd5c2

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Architectural adjustment needed due to React Router's Outlet pattern. Same user-facing behavior, different ownership of state.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all data paths are wired (createContact to Airtable API or demo mode array).

## Next Phase Readiness
- Add Contact feature complete and functional
- Dashboard has FAB entry point for quick contact creation
- Both structured and brain dump paths work in demo and live mode

---
*Phase: 09-add-contact*
*Completed: 2026-03-26*
