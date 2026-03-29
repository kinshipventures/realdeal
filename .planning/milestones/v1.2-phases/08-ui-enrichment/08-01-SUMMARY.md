---
phase: 08-ui-enrichment
plan: 01
subsystem: ui
tags: [react, dashboard, equity-scoring, birthdays, follow-ups]

requires:
  - phase: 07-data
    provides: expanded contact schema with contact_frequency, next_follow_up_date, next_action fields
provides:
  - Recent Activity dashboard section (5 most recent interactions)
  - Merged Upcoming section (birthdays + follow-ups)
  - Per-contact frequency overdue calculation
  - contactCadenceDays helper exported from equity.ts
affects: [08-02-contact-card, dashboard]

tech-stack:
  added: []
  patterns: [per-contact cadence override, merged upcoming timeline]

key-files:
  created: []
  modified:
    - src/lib/equity.ts
    - src/lib/birthdays.ts
    - src/components/dashboard/Dashboard.tsx

key-decisions:
  - "Per-contact frequency takes priority over pod cadence when set"
  - "Overdue sorted by days past individual cadence threshold, not raw days since contact"
  - "BirthdayRow removed in favor of unified UpcomingRow handling both birthdays and follow-ups"

patterns-established:
  - "contactCadenceDays: per-contact frequency override pattern for cadence calculations"
  - "Merged timeline: different event types (birthday, follow-up) unified into one sorted list"

requirements-completed: [DASH-01, DASH-02, DASH-03]

duration: 5min
completed: 2026-03-26
---

# Phase 8 Plan 1: Dashboard Enrichment Summary

**Recent Activity feed, merged birthdays+follow-ups Upcoming section, and per-contact frequency in overdue queue**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-26T21:06:21Z
- **Completed:** 2026-03-26T21:11:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Recent Activity section shows 5 most recent interactions with type icon, contact name, relative date, summary text, and source pill
- Upcoming section merges birthdays (30-day window) and follow-ups (this week) into one chronological list with type-colored dots
- Overdue queue uses per-contact contact_frequency field instead of pod-only cadence -- a weekly contact 3 days overdue ranks above a monthly contact 10 days overdue

## Task Commits

Each task was committed atomically:

1. **Task 1: Per-contact frequency in equity.ts and 30-day birthday window** - `dad3e67` (feat)
2. **Task 2: Dashboard Recent Activity section and merged Upcoming** - `432a0d3` (feat)

## Files Created/Modified
- `src/lib/equity.ts` - Added FREQUENCY_DAYS map, contactCadenceDays helper, updated todaysFocus to use per-contact frequency
- `src/lib/birthdays.ts` - Changed default birthday window from 14 to 30 days
- `src/components/dashboard/Dashboard.tsx` - Added RecentActivityRow, UpcomingRow, merged Upcoming section, per-contact overdue logic, removed BirthdayRow

## Decisions Made
- Per-contact frequency takes priority over pod cadence when set, falls back to pod cadence otherwise
- Overdue sorting uses absolute days past cadence threshold (not ratio), which achieves the requirement that weekly contacts rank higher in urgency
- Removed BirthdayRow entirely -- UpcomingRow handles both birthday and follow-up item types

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed variable declaration order causing use-before-declaration error**
- **Found during:** Task 2
- **Issue:** followUpItems and upcomingItems memos referenced upcomingBirthdays which was declared later in the component
- **Fix:** Moved followUpItems and upcomingItems declarations to after upcomingBirthdays
- **Files modified:** src/components/dashboard/Dashboard.tsx
- **Verification:** pnpm build passes clean
- **Committed in:** 432a0d3

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Ordering fix necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None beyond the declaration ordering fix above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dashboard enrichment complete, ready for 08-02 (contact card enrichment)
- contactCadenceDays exported for reuse in other components

---
*Phase: 08-ui-enrichment*
*Completed: 2026-03-26*
