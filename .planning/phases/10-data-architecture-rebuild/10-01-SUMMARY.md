---
phase: 10-data-architecture-rebuild
plan: 01
subsystem: database
tags: [airtable, migration, schema, typescript, rest-api]

requires: []
provides:
  - Idempotent Airtable schema migration script (src/scripts/migrateSchema.ts)
  - pnpm migrate:schema npm script
affects:
  - 10-02
  - airtable.ts TABLES constant (needs new table IDs from migration output)

tech-stack:
  added: []
  patterns:
    - "Airtable Metadata API via fetch for schema mutation (POST /v0/meta/bases/{id}/tables and /fields)"
    - "Idempotent migration: check existing names before creating fields/tables"
    - "300ms rate-limit delay between all Airtable API batches"
    - "Case-insensitive company dedup: lowercase key, original casing stored on record"

key-files:
  created:
    - src/scripts/migrateSchema.ts
  modified:
    - package.json

key-decisions:
  - "Self-referencing Company Record linked field: attempt via API first, log clear manual fallback if unsupported"
  - "Company records created directly in Contacts table with Type=Company (D-01 single-table approach)"
  - "300ms delay between batch operations (conservative vs 5 req/s limit; one-time migration, speed not a concern)"

patterns-established:
  - "metaRequest() helper for Metadata API calls, recordRequest() for record CRUD — separate base URLs"
  - "addFieldIfMissing(tableId, spec, existingFieldNames) — idempotency pattern for field creation"
  - "createTableIfMissing(name, fields, existingTableNames) — idempotency pattern for table creation"
  - "chunk<T>(arr, size) utility for batching any array"

requirements-completed: [ARCH-01, ARCH-02, ARCH-03, ARCH-04]

duration: 8min
completed: 2026-03-29
---

# Phase 10 Plan 01: Schema Migration Script Summary

**425-line idempotent Airtable migration script that adds Type/Status/company fields to Contacts, creates Company records from existing text values, links them via self-referencing linked field, and creates Pipelines/Pipeline Stages/Opportunities/Projects tables**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-29T17:31:02Z
- **Completed:** 2026-03-29T17:39:00Z
- **Tasks:** 1 of 2 (Task 2 is a human-verify checkpoint)
- **Files modified:** 2

## Accomplishments
- Migration script covers all 8 steps from D-12 in CONTEXT.md decisions
- Fully idempotent — re-running skips already-created fields/tables
- Case-insensitive company dedup prevents duplicate Company records
- Self-referencing linked field attempt with clear API-not-supported error fallback and manual UI instructions
- Summary JSON printed at end so Plan 02 can update TABLES constant with new table IDs

## Task Commits

1. **Task 1: Write the idempotent schema migration script** - `21e5573` (feat)

## Files Created/Modified
- `src/scripts/migrateSchema.ts` — 425-line one-time Airtable schema migration (8 steps, fully idempotent)
- `package.json` — added `migrate:schema` script

## Decisions Made
- Self-referencing linked field (`Company Record` pointing to same Contacts table) attempted via Metadata API with graceful error handling — if API rejects it, logs clear message with manual Airtable UI instructions and continues remaining steps
- Company records are created in the same Contacts table (D-01), not a separate table
- `fetchAllContacts()` paginated with offset to handle large contact lists

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Task 2 (checkpoint:human-verify) is pending.** Before this plan is complete:

1. Run `pnpm migrate:schema` in the project root
2. If "Company Record" self-referencing field fails via API, create it manually in Airtable UI:
   - Go to Contacts table → Add field → "Link to another record" → link to same Contacts table → name it "Company Record"
3. Verify Airtable schema matches expected structure (see PLAN.md Task 2 verification checklist)
4. Copy the table IDs JSON from script output — Plan 02 needs these IDs

## Next Phase Readiness

- Plan 02 (`10-02`) requires the new table IDs from migration output to update `TABLES` constant in `airtable.ts`
- Existing v1.x app functionality unaffected (additive schema changes only)
- Script is idempotent — safe to re-run if partial failures occur

---
*Phase: 10-data-architecture-rebuild*
*Completed: 2026-03-29*
