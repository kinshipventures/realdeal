---
phase: 22-airtable-to-supabase-data-migration
plan: 02
subsystem: data-migration
tags: [migration, airtable, supabase, data]
dependency_graph:
  requires: [22-01]
  provides: [populated-supabase-schema]
  affects: []
tech_stack:
  added: [dotenv]
  patterns: [airtable-rest-pagination, supabase-service-role-insert, id-mapping-table]
key_files:
  created:
    - scripts/migrate-airtable-to-supabase.ts
  modified:
    - package.json
    - pnpm-lock.yaml
decisions:
  - "dotenv added as devDependency for .env.local loading in Node scripts"
  - "Script fetches all Airtable tables in parallel before inserting sequentially for FK safety"
  - "resolveId returns undefined (not throws) so junction tables can skip unresolved IDs gracefully"
metrics:
  duration: 3 minutes
  completed: 2026-04-01
  tasks_completed: 1
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 22 Plan 02: Migration Script Summary

One-line: Standalone 635-line migration script that reads all Airtable tables via REST and inserts into Supabase in FK order with _migration_id_map tracking.

## What Was Built

`scripts/migrate-airtable-to-supabase.ts` -- run with `npx tsx scripts/migrate-airtable-to-supabase.ts`.

**Covers:**
- 14 primary tables in FK insertion order: pods, categories, companies, contacts, interactions, pipelines, pipeline_stages, opportunities, campaigns, campaign_contacts, projects, field_config
- 5 junction tables: contact_pods (with is_primary), contact_categories, opportunity_contacts, project_contacts, project_opportunities
- _migration_id_map entry written for every inserted record

**Key behaviors:**
- Validates all 5 env vars before starting, exits with clear message if missing
- Fetches all Airtable tables in parallel (paginated offset loop per table)
- Service role Supabase client bypasses RLS -- no auth required for inserts
- Per-record error handling: logs failure, continues migration (no fatal abort for single bad record)
- Validation step at end: counts every table, prints airtable vs supabase comparison

**Env vars required:**
- `VITE_AIRTABLE_TOKEN` -- existing Airtable PAT
- `VITE_AIRTABLE_BASE_ID` -- existing base ID
- `VITE_SUPABASE_URL` -- Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` -- from Supabase Dashboard -> Settings -> API (never commit this)
- `MIGRATION_USER_ID` -- UUID of your Supabase auth user

## Decisions Made

- `dotenv` added as devDependency to load `.env.local` in Node context (Vite's env loading doesn't apply to scripts)
- All Airtable table names match the Airtable base exactly (Lists, Categories, Contacts, Interactions, Campaigns, CampaignContacts, Pipelines, Pipeline Stages, Opportunities, Projects, Field Config)
- `resolveId` returns `undefined` rather than throwing, so junction rows for unmapped records are skipped cleanly
- Companies are migrated before contacts so `company_id` FK resolves correctly

## Checkpoint: Task 2 Pending

Task 2 is a `checkpoint:human-verify` -- the script needs to be run by the user (via Lovable or locally) with live env vars. See plan for exact steps.

## Deviations from Plan

None -- plan executed exactly as written. `dotenv` was added as specified in the plan's action section.

## Self-Check: PASSED

- scripts/migrate-airtable-to-supabase.ts: FOUND (635 lines)
- Commit 62c50a7: verified in git log
- Script imports createClient from @supabase/supabase-js: FOUND
- Script reads SUPABASE_SERVICE_ROLE_KEY: FOUND
- Script reads MIGRATION_USER_ID: FOUND
- fetchAirtableTable with offset loop: FOUND
- _migration_id_map inserts: FOUND
- resolveId/resolveIds helpers: FOUND
- Validation count step: FOUND
- user_id on every insert: FOUND
- Companies split (Type='Company'): FOUND
- contact_pods junction with is_primary: FOUND
- contact_categories junction: FOUND
- opportunity_contacts junction: FOUND
- project_contacts and project_opportunities: FOUND
