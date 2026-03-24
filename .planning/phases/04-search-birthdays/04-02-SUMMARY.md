---
phase: 04-search-birthdays
plan: 02
subsystem: ui
tags: [react, dashboard, birthdays, typescript]

requires:
  - phase: 01-foundation
    provides: Contact type with birthday field, Pod type with color field

provides:
  - src/lib/birthdays.ts — getUpcomingBirthdays, BirthdayItem, formatDaysUntil
  - Dashboard "Coming Up" section — birthday rows between pod cards and Today's Focus

affects: [dashboard, contacts]

tech-stack:
  added: []
  patterns: [Intl.DateTimeFormat for locale-aware date formatting, year-rollover birthday logic]

key-files:
  created:
    - src/lib/birthdays.ts
  modified:
    - src/components/dashboard/Dashboard.tsx

key-decisions:
  - "Year rollover: if birthday month/day has already passed this year, compute next year's date — avoids showing stale birthdays"
  - "formatDaysUntil: simplified to 'Today' or 'Nd' — skips 1w/2w week formatting for brevity"
  - "Pod lookup via contact.list_ids[0] — first pod wins, matches existing dashboard patterns"

patterns-established:
  - "Birthday utility: pure function, no side effects, takes contacts + pods, returns sorted BirthdayItem array"
  - "Conditional section: upcomingBirthdays.length > 0 guard, section absent from DOM when empty"

requirements-completed: [BDAY-01, BDAY-02]

duration: 8min
completed: 2026-03-24
---

# Phase 04 Plan 02: Birthdays Summary

**Birthday utility (getUpcomingBirthdays) + Dashboard "Coming Up" section showing contacts with birthdays in the next 14 days**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-24T17:16:00Z
- **Completed:** 2026-03-24T17:24:13Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Birthday utility module with year-rollover logic, Intl.DateTimeFormat formatting, and sorted BirthdayItem output
- Dashboard "Coming Up" section inserted between pod health cards and Today's Focus
- BirthdayRow sub-component: pod-colored dot, name, date, days-until, pod name — warm amber tint for today
- Section hidden entirely when no upcoming birthdays in 14-day window
- Clicking any birthday row opens ContactDetail for that contact

## Task Commits

1. **Task 1: Create birthday utility module** - `382e4d1` (feat)
2. **Task 2: Add Coming Up section to Dashboard** - `e149bff` (feat)

## Files Created/Modified

- `src/lib/birthdays.ts` — BirthdayItem interface, getUpcomingBirthdays function, formatDaysUntil helper
- `src/components/dashboard/Dashboard.tsx` — imports, upcomingBirthdays useMemo, Coming Up JSX section, BirthdayRow sub-component

## Decisions Made

- Year rollover: parse month/day from YYYY-MM-DD, ignore stored year — if this year's date has passed, advance to next year. Ensures Moj always sees the next occurrence, not a stale past date.
- formatDaysUntil simplified: "Today" or "Nd" (e.g. "4d"). The plan suggested week labels (1w/2w) but also said "simple implementation: if days === 0 return Today, else return Nd". Simpler reads better in context.
- Pod lookup uses contact.list_ids[0] — consistent with how other dashboard sections resolve pod context for a contact.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

During Task 2 verification, `pnpm build` initially appeared to fail with TS6133 "unused" errors in App.tsx — these were from the parallel search plan (04-01) having stashed/unstashed state. Full build with all working tree changes in place passed cleanly.

## Next Phase Readiness

- Birthday section live on dashboard, ready for Moj to use
- No blockers for remaining v1.1 phases
