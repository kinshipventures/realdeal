---
phase: 22-airtable-to-supabase-data-migration
plan: 01
subsystem: database
tags: [supabase, postgresql, schema, ddl, rls, migration]

# Dependency graph
requires:
  - phase: 18-authentication
    provides: Supabase client configured, auth.users table exists for FK references
provides:
  - Complete PostgreSQL DDL spec (docs/supabase-schema-spec.sql) ready for Lovable execution
  - 18 tables with RLS, enums, triggers, and indexes
affects:
  - 22-02 (migration script depends on schema being live)
  - 22-03 (supabase-data.ts depends on schema shape)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Junction tables replace Airtable linked-record arrays (contact_pods, contact_categories, opportunity_contacts, project_contacts, project_opportunities)"
    - "RLS owner policy pattern: user_id = auth.uid() on every table"
    - "update_updated_at() trigger function shared across all tables with updated_at"
    - "_migration_id_map temp table for airtable_id -> supabase_uuid resolution"

key-files:
  created:
    - docs/supabase-schema-spec.sql
  modified: []

key-decisions:
  - "birthday kept as text on contacts (stores MM/DD or YYYY-MM-DD from Airtable -- not converted to date type)"
  - "contacts retains industry/stage/ticker/domain columns from types.ts interface even though companies table has them too (D-13 split is for Company-type records, Contact-type records still use these fields)"
  - "order column in pipeline_stages quoted as '\"order\"' (reserved SQL word)"
  - "_migration_id_map includes user_id and UNIQUE(airtable_id, table_name) for safe re-runs"

patterns-established:
  - "DDL spec produced by Claude Code, executed by Lovable -- clean split of responsibilities"
  - "All tables include id, user_id, created_at as baseline; tables with mutable data also have updated_at"
  - "ON DELETE CASCADE on junction FKs, ON DELETE SET NULL on optional FKs (company_id, stage_id, scope_pod_id)"

requirements-completed: [MIGR-01]

# Metrics
duration: 5min
completed: 2026-04-01
---

# Phase 22 Plan 01: Schema DDL Spec Summary

**428-line PostgreSQL DDL spec with 18 tables, 15 enums, RLS policies, and update triggers -- ready for Lovable to execute in Supabase**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-01T08:19:09Z
- **Completed:** 2026-04-01T08:20:33Z
- **Tasks:** 1 of 2 (Task 2 blocked on human action -- see checkpoint below)
- **Files modified:** 1

## Accomplishments

- Complete DDL spec covering all 18 tables in FK dependency order
- 15 PostgreSQL enums matching every TypeScript union type in types.ts
- RLS owner policy on every table (user_id = auth.uid())
- shared update_updated_at() trigger function applied to all 12 mutable tables
- Performance indexes on contacts, interactions, contact_pods, contact_categories, pipeline_stages
- UNIQUE constraints on all 7 junction tables with ON DELETE CASCADE

## Task Commits

1. **Task 1: Write complete PostgreSQL schema DDL spec** - `fa59c26` (feat)
2. **Task 2: Lovable executes schema + regenerate types** - BLOCKED (checkpoint:human-action)

## Files Created/Modified

- `docs/supabase-schema-spec.sql` - Complete PostgreSQL DDL: 15 enums, 18 tables, RLS policies, update triggers, indexes

## Decisions Made

- `birthday` kept as `text` on contacts -- Airtable stores MM/DD or YYYY-MM-DD inconsistently; converting to `date` would require normalization during migration that is out of scope for this plan
- `contacts` table retains `industry`, `stage`, `ticker`, `domain` columns alongside `companies` table -- contacts of type='Contact' use these fields per the existing types.ts interface; D-13 company split applies to type='Company' records
- `"order"` quoted in pipeline_stages -- reserved SQL keyword
- `_migration_id_map` has `UNIQUE(airtable_id, table_name)` so the migration script is safe to re-run (idempotent inserts will conflict cleanly)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Checkpoint: Human Action Required (Task 2)

Task 2 cannot be automated -- requires Lovable to execute the schema in Supabase, then `supabase gen types` to regenerate types.ts.

**Steps:**
1. Copy contents of `docs/supabase-schema-spec.sql` and feed to Lovable
2. Lovable creates all tables, enums, RLS policies, and triggers in the Supabase project
3. Verify in Supabase dashboard: Table Editor shows all 18 tables
4. Verify enums: SQL Editor > `SELECT typname FROM pg_type WHERE typtype = 'e';` (should show 15 rows)
5. Verify RLS: All 18 tables show "RLS enabled"
6. Run: `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts`
7. Verify: `wc -l src/integrations/supabase/types.ts` should show 50+ lines
8. Commit types.ts: `git add src/integrations/supabase/types.ts && git commit -m "chore(22-01): regenerate types from live Supabase schema"`

## Next Phase Readiness

- Plan 02 (migration script) can be written in parallel with Lovable execution -- it does not depend on types.ts
- Plan 02 DOES require the schema to be live before the script can run
- Plan 03 (supabase-data.ts swap) requires both schema live AND types.ts regenerated

---
*Phase: 22-airtable-to-supabase-data-migration*
*Completed: 2026-04-01*
