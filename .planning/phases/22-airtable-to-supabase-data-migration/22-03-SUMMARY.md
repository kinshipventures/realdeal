---
phase: 22-airtable-to-supabase-data-migration
plan: 03
subsystem: data-layer
tags: [supabase, postgrest, migration, data-layer]

requires:
  - phase: 22
    plan: 01
    provides: PostgreSQL schema and generated types

key-files:
  created:
    - src/lib/supabase-data.ts
  modified:
    - src/lib/airtable.ts
    - src/lib/fieldConfig.ts

self-check: PASSED
---

## What was built

Replaced the entire Airtable data layer with Supabase PostgREST queries. `supabase-data.ts` (50k, 55 exports) implements all CRUD operations using the Supabase client. `airtable.ts` is now a 2-line barrel re-export, so all 39 consumer files work without changes.

## Key decisions

- **Barrel re-export pattern**: `airtable.ts` re-exports from `supabase-data.ts` - zero consumer file changes needed
- **Junction table flattening**: PostgREST embedded selects for `contact_pods`, `contact_categories`, `campaign_contacts`, `opportunity_contacts`, `project_contacts` are flattened to match existing array-of-ID interfaces
- **Cache pattern preserved**: Module-level caches with TTL and invalidation functions kept identical to original

## Verification

- `pnpm build` passes (0 TypeScript errors)
- 55 exported functions/constants in supabase-data.ts
- No `api.airtable.com` or `PROXY_URL` references in active code paths
- Demo mode preserved via `isDemoMode()` checks
