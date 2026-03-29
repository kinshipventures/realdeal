---
phase: 12-pods-overhaul-categorization
plan: 01
subsystem: database
tags: [airtable, typescript, types, data-model, equity-scoring, csv-import]

requires:
  - phase: 11-relationship-records
    provides: Contact and Pod interfaces with v2 relationship fields

provides:
  - Extended Pod interface with description and capacity fields
  - Extended Contact interface with primary_list_id and cadence_override fields
  - createPod and updatePod CRUD functions in airtable.ts
  - getPendingContacts filter function in airtable.ts
  - CSV import routes through Pending status (not Active)
  - cadence_override respected in equity scoring before contact_frequency
  - Airtable schema migration script (scripts/addPodFields.ts)

affects:
  - 12-02-PLAN (pending tray UI will consume getPendingContacts and Pending status)
  - 12-03-PLAN (pod management UI will use createPod, updatePod, description, capacity)
  - equity scoring (todaysFocus uses contactCadenceDays which now reads cadence_override)

tech-stack:
  added: []
  patterns:
    - createPod/updatePod follow same cache-invalidation pattern as createCampaign
    - _listsCache module-level var mirrors _campaignsCache pattern
    - Migration script uses POST to /meta/tables/{tableId}/fields with graceful skip on existing fields

key-files:
  created:
    - scripts/addPodFields.ts
  modified:
    - src/lib/types.ts
    - src/lib/airtable.ts
    - src/lib/equity.ts
    - src/lib/csvImport.ts
    - src/lib/sampleData.ts

key-decisions:
  - "Primary Pod stored as singleLineText (raw record ID), not a linked field — avoids Airtable linked-record complexity"
  - "Cadence Override stored as singleSelect with weekly/biweekly/monthly/quarterly matching Cadence type"
  - "cadence_override takes priority over contact_frequency in contactCadenceDays — per-contact override beats frequency label"

patterns-established:
  - "Per-field null propagation: new nullable fields default to null in both mapPod/mapContact and sampleData helpers"
  - "Migration script uses graceful skip on existing fields so it's safe to re-run"

requirements-completed: [POD-02, POD-04, POD-07, POD-08, POD-09, CAT-02]

duration: 12min
completed: 2026-03-29
---

# Phase 12 Plan 01: Data Model Extension Summary

**Extended Pod and Contact interfaces with 4 new Airtable fields, added pod CRUD, routed CSV imports through Pending status, and wired cadence_override into equity scoring**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-29
- **Completed:** 2026-03-29
- **Tasks:** 2
- **Files modified:** 5 + 1 created

## Accomplishments

- Pod interface now has `description: string | null` and `capacity: number | null`
- Contact interface now has `primary_list_id: string | null` and `cadence_override: Cadence | null`
- `createPod`, `updatePod`, `getPendingContacts` exported from airtable.ts
- CSV imports land as Pending (not Active) — contacts route through categorization tray
- `contactCadenceDays` respects cadence_override before contact_frequency before pod cadence
- Migration script ready to add 4 new fields to Airtable via REST API

## Task Commits

1. **Task 1: Airtable schema migration + TypeScript interface extensions** - `619bba3` (feat)
2. **Task 2: CSV import pending routing + cadence override in equity scoring** - `1f83f6e` (feat)

## Files Created/Modified

- `scripts/addPodFields.ts` - Schema migration script adds Description, Capacity, Primary Pod, Cadence Override to Airtable
- `src/lib/types.ts` - Pod extended with description + capacity; Contact extended with primary_list_id + cadence_override
- `src/lib/airtable.ts` - PodFields + ContactFields interfaces updated; mapPod + mapContact read new fields; createPod, updatePod, getPendingContacts added; updateContact writes new fields
- `src/lib/equity.ts` - contactCadenceDays now checks cadence_override first
- `src/lib/csvImport.ts` - status changed from Active to Pending; new contact fields passed as null
- `src/lib/sampleData.ts` - pod and contact helpers updated with new null fields for demo mode compat

## Decisions Made

- Primary Pod stored as `singleLineText` (raw record ID string) rather than a linked record field — avoids Airtable linked-record constraints and matches the pattern used for company_record_id
- cadence_override priority chain: cadence_override > contact_frequency > pod cadence > monthly default

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added primary_list_id and cadence_override to createContact and csvImport.ts call sites**
- **Found during:** Task 1 (interface extension)
- **Issue:** After adding required fields to Contact interface, createContact signature (Omit<Contact, 'id' | 'created_at'>) required the new fields. csvImport.ts call site would have failed to compile without passing them.
- **Fix:** Added `primary_list_id: null, cadence_override: null` to csvImport.ts createContact call; added field write support in createContact body
- **Files modified:** src/lib/csvImport.ts, src/lib/airtable.ts
- **Verification:** pnpm build exits 0
- **Committed in:** 619bba3 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (missing critical — required call-site update from interface extension)
**Impact on plan:** Necessary correctness fix. No scope creep.

## Issues Encountered

None beyond the auto-fixed call-site update.

## Next Phase Readiness

- Data layer foundation complete — all 4 new Airtable fields modeled and wired
- Run `npx tsx scripts/addPodFields.ts` to apply schema migration to Airtable before 12-02 or 12-03 UI work
- 12-02 (pending tray UI) can use `getPendingContacts()` immediately
- 12-03 (pod management UI) can use `createPod`, `updatePod`, `description`, `capacity` immediately

---
*Phase: 12-pods-overhaul-categorization*
*Completed: 2026-03-29*
