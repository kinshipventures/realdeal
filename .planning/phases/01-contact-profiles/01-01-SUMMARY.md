---
phase: 01-contact-profiles
plan: 01
subsystem: ui
tags: [react, typescript, airtable, contact-profiles]

# Dependency graph
requires: []
provides:
  - birthday, milestones, interests, relationship_context fields on Contact interface
  - Airtable ContactFields, mapContact, createContact, updateContact mappings for all 4 fields
  - Personal section in ContactDetail between context and notes sections
  - Birthday date input with daysUntilBirthday countdown badge (shows within 30 days)
  - Textarea fields for milestones, interests, relationship_context with auto-save on blur
affects: [02-contact-profiles, equity-scoring, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "daysUntilBirthday: module-level pure function for birthday countdown calculation"
    - "birthdayField: inline local function inside component for birthday-specific render logic"
    - "Section order: contact → context → personal → notes → interactions (D-03)"

key-files:
  created: []
  modified:
    - src/lib/types.ts
    - src/lib/airtable.ts
    - src/components/contacts/ContactDetail.tsx

key-decisions:
  - "Birthday input returns raw YYYY-MM-DD from <input type=date> — not wrapped in new Date().toISOString() (avoids UTC offset shift)"
  - "birthdayField kept as inline local function inside component, not extracted to separate file (single use, co-located with state)"
  - "Countdown shows only when birthday is within 30 days — not always visible, reduces noise"

patterns-established:
  - "Airtable field names: Title Case with spaces (e.g. 'Relationship Context', not 'relationship_context')"
  - "New Airtable fields that don't exist yet map to null via ?? null — no errors, just empty placeholders"

requirements-completed: [PROF-01, PROF-02, PROF-03, PROF-04]

# Metrics
duration: 8min
completed: 2026-03-23
---

# Phase 01 Plan 01: Contact Profiles — Personal Fields Summary

**Birthday countdown, milestones, interests, and relationship context added to ContactDetail with Airtable read/write support**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-23T02:42:00Z
- **Completed:** 2026-03-23T02:50:02Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended Contact interface with 4 new personal fields (birthday, milestones, interests, relationship_context)
- Mapped all 4 fields in ContactFields interface, mapContact, createContact, updateContact in airtable.ts
- Added personal section to ContactDetail between context and notes (matching D-03 section order)
- Birthday field uses native date input with "in X days" countdown badge when within 30 days
- Milestones, interests, relationship context use existing field() textarea renderer — auto-save on blur

## Task Commits

1. **Task 1: Extend Contact type and Airtable field mappings** - `04e1464` (feat)
2. **Task 2: Add personal section with birthday countdown to ContactDetail** - `4ab1738` (feat)

## Files Created/Modified

- `src/lib/types.ts` - Added birthday, milestones, interests, relationship_context to Contact interface
- `src/lib/airtable.ts` - Added ContactFields entries, mapContact/createContact/updateContact field mappings
- `src/components/contacts/ContactDetail.tsx` - daysUntilBirthday helper, birthdayField function, personal section JSX

## Decisions Made

- Birthday input uses raw `YYYY-MM-DD` string from `<input type="date">` — not converted via `new Date().toISOString()` to avoid UTC offset issues
- `birthdayField` kept inline inside the component (not a separate component) — single use, depends on local state
- Countdown badge only shown when birthday is within 30 days — not a permanent UI element

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in Dashboard.tsx, CreateCategoryNode.tsx, and equity.ts were present before this plan and are out of scope. My changes introduced no new errors.

## User Setup Required

Briell needs to add the following fields to the Airtable Contacts table before data will persist:
- `Birthday` (Date field)
- `Milestones` (Long text)
- `Interests` (Long text)
- `Relationship Context` (Long text)

Until then, the fields render as empty (undefined maps to null) with no errors.

## Next Phase Readiness

- Personal section is live in ContactDetail — visible and editable immediately
- Airtable fields can be added by Briell at any time without code changes
- Plan 02 (per-contact equity score on profile) can proceed independently

---
*Phase: 01-contact-profiles*
*Completed: 2026-03-23*
