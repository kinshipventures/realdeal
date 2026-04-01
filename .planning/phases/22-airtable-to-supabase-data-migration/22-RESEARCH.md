# Phase 22: Airtable to Supabase Data Migration - Research

**Researched:** 2026-04-01
**Domain:** Data layer swap -- Airtable REST to Supabase PostgreSQL/PostgREST
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- D-01: Adapter pattern -- keep all TypeScript interfaces identical. Replace `airtable.ts` internals with Supabase calls. Zero changes to consumer components.
- D-02: The `airtable-proxy` Edge Function gets removed after migration.
- D-03: Demo mode (`sampleData.ts`) stays unchanged.
- D-04: Lovable builds the Supabase schema -- tables, columns, types, RLS policies.
- D-05: Claude Code writes the migration script (Airtable -> Supabase) and swaps `airtable.ts` to `supabase-data.ts`.
- D-06: Schema design happens first. Lovable executes schema. Claude Code executes migration and code swap.
- D-07: Properly normalized relational tables with foreign keys.
- D-08: Junction tables for many-to-many (contact_pods, contact_categories, opportunity_contacts, project_contacts, project_opportunities).
- D-09: PostgreSQL enums for Airtable single-select fields.
- D-10: `uuid` primary keys. Migration script maintains `_migration_id_map` table.
- D-11: `created_at` and `updated_at` on all tables.
- D-12: `user_id` on all tables for RLS.
- D-13: Companies get their own table split from Contacts.
- D-14: Contact-to-pod membership moves to `contact_pods` junction table with `is_primary` flag.
- D-15: One-time migration script (TypeScript, runs locally).
- D-16: `_migration_id_map` table maps `airtable_id` -> `supabase_uuid`.
- D-17: Migration order: pods -> categories -> companies -> contacts -> junction tables -> interactions -> pipelines -> stages -> opportunities -> campaigns -> campaign_contacts -> projects -> field_config.
- D-18: Validation step: count checks + spot-check linked record resolution.
- D-19: All tables scoped to authenticated user via `user_id = auth.uid()`.
- D-20: RLS designed in Lovable.

### Claude's Discretion

- Exact Supabase column types and constraints beyond what is specified
- Cache strategy replacement (module-level caches may not be needed with Supabase)
- Whether to use Supabase realtime subscriptions or fetch-on-demand
- Error handling patterns in the new data layer
- Whether `airtable.ts` is renamed or replaced with a new file

### Deferred Ideas (OUT OF SCOPE)

- Supabase Realtime subscriptions for live updates
- Supabase Storage for file attachments
- Row-level team permissions (multi-workspace)
- Supabase Edge Functions for server-side enrichment
</user_constraints>

---

## Summary

This phase replaces a 1,681-line Airtable REST proxy layer with direct Supabase PostgREST queries. The TypeScript interface contract in `types.ts` is the immovable boundary -- 39 consumer import sites must continue receiving identical shapes. The work splits into two parallel tracks: (1) a Lovable-executed schema setup and (2) a Claude Code-executed migration script plus `airtable.ts` replacement.

The core complexity is denormalization reversal. Airtable stores relationships as linked record ID arrays (`string[]`). Supabase stores them as proper FK joins. The new data layer must reconstruct those `string[]` fields (e.g., `list_ids`, `category_ids`, `relationship_ids`) by doing PostgREST joins and flattening them back to arrays to satisfy the existing interface. This is the single trickiest part of the swap.

The `invalidateXxxCache()` functions exported from `airtable.ts` are called by 8+ consumers. These must continue to exist as no-ops or functional equivalents in the new file -- they are part of the public API contract even though they are cache management utilities.

**Primary recommendation:** Replace `airtable.ts` with a new `src/lib/supabase-data.ts` that exports identical function signatures. Keep `airtable.ts` in place and redirect its exports during transition. Delete it and the proxy Edge Function only after full validation.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.101.1 (latest; project has ^2.100.1) | All DB queries, auth, RLS | Already installed and configured |
| TypeScript | (project version) | Type safety for migration script | Already in use |

**No new packages needed.** The Supabase client is already installed and configured at `src/integrations/supabase/client.ts`.

**Migration script only (local, not bundled):**
```bash
# Migration script uses existing project deps -- no additions needed
# If running standalone: ts-node or tsx
npx tsx scripts/migrate-airtable-to-supabase.ts
```

---

## Architecture Patterns

### Adapter Pattern -- New File Structure

The swap is clean because `airtable.ts` is the single data layer import for all 39 consumers. The pattern:

```
src/lib/
  airtable.ts          # DELETED after migration
  supabase-data.ts     # Replacement -- identical export surface
  types.ts             # UNCHANGED
  sampleData.ts        # UNCHANGED
```

All consumer imports `from '../../lib/airtable'` get updated to `from '../../lib/supabase-data'` in one pass (find-replace or barrel re-export).

**Barrel re-export option (zero-consumer-change approach):**
Keep `airtable.ts` as a thin re-export barrel pointing to `supabase-data.ts`:
```typescript
// airtable.ts (temporary bridge)
export * from './supabase-data'
```
This means zero changes to the 39 consumer files. Delete `airtable.ts` in cleanup only after confidence is high.

### PostgREST Join Pattern (HIGH confidence)

Supabase uses PostgREST for queries. Fetching related records uses embedded selects:

```typescript
// Source: @supabase/supabase-js official docs
// Fetch contacts with their pod memberships (replaces list_ids array)
const { data, error } = await supabase
  .from('contacts')
  .select(`
    *,
    contact_pods(pod_id, is_primary),
    contact_categories(category_id)
  `)

// Flatten back to string[] for interface compatibility
const contact: Contact = {
  ...row,
  list_ids: row.contact_pods.map((cp: { pod_id: string }) => cp.pod_id),
  category_ids: row.contact_categories.map((cc: { category_id: string }) => cc.category_id),
  primary_list_id: row.contact_pods.find((cp: { is_primary: boolean }) => cp.is_primary)?.pod_id ?? null,
}
```

### Supabase CRUD Pattern (HIGH confidence)

```typescript
// SELECT
const { data, error } = await supabase.from('pods').select('*')

// INSERT
const { data, error } = await supabase.from('pods').insert({ name, user_id }).select().single()

// UPDATE
const { data, error } = await supabase.from('contacts').update({ name }).eq('id', id).select().single()

// DELETE
const { error } = await supabase.from('contacts').delete().eq('id', id)
```

### Cache Strategy Replacement

Current Airtable caches (`_contactsCache`, `_categoriesCache`, etc.) exist because Airtable REST is slow (100-200ms+ per request). Supabase PostgREST is faster but the cache pattern still reduces re-fetch on repeated calls within a session.

**Recommendation (Claude's Discretion):** Keep the same module-level cache pattern for now. Supabase queries are faster so TTL can be shortened or removed, but the stale-while-revalidate pattern is worth preserving for perceived performance. The `invalidateXxxCache()` exports must remain as they are called by consumers -- they just set the cache variable to null, same as today.

### `invalidateXxxCache()` Must Stay in Public API

These functions are exported from `airtable.ts` and called in 8+ consumer files:
- `invalidateContactsCache()` -- 6 call sites
- `invalidateCampaignsCache()` -- 1 call site
- `invalidateInteractionsCache()` -- (internal, but exported)
- `invalidateProjectsCache()` -- 5 call sites
- `invalidatePipelinesCache()`, `invalidatePipelineStagesCache()`, `invalidateOpportunitiesCache()` -- 2 call sites

All must exist in `supabase-data.ts` with identical signatures. They can remain as cache-null operations or become no-ops if caching is dropped.

### Schema Design for Lovable (Specification)

The following is the schema spec Claude Code produces for Lovable to execute:

**PostgreSQL Enums:**
```sql
CREATE TYPE cadence AS ENUM ('weekly', 'biweekly', 'monthly', 'quarterly');
CREATE TYPE interaction_type AS ENUM ('call', 'email', 'text', 'meeting', 'intro', 'note', 'pod_change', 'field_update', 'categorization', 'pipeline_event', 'project_event', 'merge_event');
CREATE TYPE relationship_type AS ENUM ('Contact', 'Company');
CREATE TYPE relationship_status AS ENUM ('Active', 'Pending', 'Archived');
CREATE TYPE pipeline_status AS ENUM ('active', 'hidden');
CREATE TYPE opportunity_status AS ENUM ('open', 'won', 'lost', 'archived');
CREATE TYPE opportunity_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE campaign_type AS ENUM ('event', 'investment', 'outreach', 'other');
CREATE TYPE campaign_contact_status AS ENUM ('pending', 'reached', 'responded', 'confirmed');
CREATE TYPE campaign_status AS ENUM ('active', 'completed');
CREATE TYPE global_region AS ENUM ('AMER', 'APAC', 'ME', 'LATAM', 'EU');
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Non-binary', 'Other');
CREATE TYPE contact_frequency AS ENUM ('Weekly', 'Monthly', 'Quarterly', 'Annual', 'As Needed');
CREATE TYPE owner_type AS ENUM ('moj_mahdara', 'kinship_ventures');
CREATE TYPE interaction_source AS ENUM ('Gmail', 'Granola', 'Manual');
```

**Tables (FK-ordered):**

```
pods                  -- was: Lists
categories            -- FK: pod_id -> pods
companies             -- split from contacts where Type='Company'
contacts              -- core contact record (no pod/category arrays)
contact_pods          -- junction: contact_id, pod_id, is_primary
contact_categories    -- junction: contact_id, category_id
interactions          -- FK: contact_id -> contacts
pipelines
pipeline_stages       -- FK: pipeline_id -> pipelines
opportunities         -- FK: stage_id -> pipeline_stages
opportunity_contacts  -- junction: opportunity_id, contact_id
campaigns
campaign_contacts     -- junction: campaign_id, contact_id, status, notes
projects
project_contacts      -- junction: project_id, contact_id
project_opportunities -- junction: project_id, opportunity_id
field_config          -- custom field definitions
_migration_id_map     -- temp: airtable_id TEXT, table_name TEXT, supabase_uuid UUID
```

**Standard columns on every table:**
```sql
id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid REFERENCES auth.users NOT NULL,
created_at timestamptz DEFAULT now() NOT NULL,
updated_at timestamptz DEFAULT now() NOT NULL
```

**RLS template (applied to every table via Lovable):**
```sql
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY "{table}_owner" ON {table}
  FOR ALL USING (user_id = auth.uid());
```

### Migration Script Architecture

```
scripts/
  migrate-airtable-to-supabase.ts   -- one-time migration script
```

**Script structure:**
```typescript
// Phase 1: Fetch all Airtable data (parallel where safe)
// Phase 2: Insert in FK order, building ID map as you go
// Phase 3: Insert junction tables using ID map
// Phase 4: Validation (count checks per table)
```

**ID mapping pattern:**
```typescript
// After each Airtable record insert:
await supabase.from('_migration_id_map').insert({
  airtable_id: rec.id,
  table_name: 'pods',
  supabase_uuid: insertedRow.id,
  user_id: MIGRATION_USER_ID,
})

// Resolve a linked record:
async function resolveId(airtableId: string): Promise<string> {
  const { data } = await supabase
    .from('_migration_id_map')
    .select('supabase_uuid')
    .eq('airtable_id', airtableId)
    .single()
  if (!data) throw new Error(`No mapping for ${airtableId}`)
  return data.supabase_uuid
}
```

### Airtable ID Validation Issue

The current `getInteractions()` in `airtable.ts` contains:
```typescript
if (!/^rec[A-Za-z0-9]{14}$/.test(contactId)) throw new Error('Invalid contact ID')
```
This validation MUST be removed in `supabase-data.ts` -- Supabase IDs are UUIDs, not `rec...` strings. Any similar Airtable-specific ID format assumptions must be found and removed.

### Anti-Patterns to Avoid

- **Calling `airtable.ts` functions from the migration script.** The script should use the raw Airtable REST API directly (or the existing proxy) -- not the cached layer.
- **Migrating data before schema exists.** Schema must be live and verified in Supabase before the script runs.
- **Skipping the `_migration_id_map` table.** Junction tables depend on it -- can't resolve linked record IDs without it.
- **Running migration with RLS enabled and no service role key.** Use the Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) for the migration script -- the anon key respects RLS and will block inserts.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pagination | Manual offset loop | Supabase `.range()` or default (no limit for small datasets) | PostgREST handles it; Airtable's 100-record pages don't apply |
| Auth user context in queries | Manually pass user_id to every call | `supabase.auth.getUser()` + RLS handles it | RLS applies automatically when using anon key |
| Type generation | Hand-write DB types | `supabase gen types typescript` after schema creation | Auto-generates from live schema |
| Relation resolution | Build custom join logic | PostgREST embedded selects (`select('*, contact_pods(*)')`) | Native to PostgREST |

---

## Common Pitfalls

### Pitfall 1: RLS Blocks Migration Script
**What goes wrong:** Migration script uses anon key, RLS denies all inserts (no authenticated user session).
**Why it happens:** RLS `user_id = auth.uid()` returns null for service-level calls with anon key.
**How to avoid:** Use the service role key (`SUPABASE_SERVICE_ROLE_KEY`) for the migration script. Set `user_id` explicitly on all inserted records to the production user's UUID.
**Warning signs:** All inserts return 0 rows or 403 errors.

### Pitfall 2: String[] Fields Broken After Swap
**What goes wrong:** `contact.list_ids` returns `[]` everywhere. Equity scoring, pod filtering, and category views break silently.
**Why it happens:** Supabase stores these as junction table rows, not arrays. The new `getContacts()` must JOIN and flatten them.
**How to avoid:** Every function that fetches contacts must include the embedded selects and flattening logic. Test `list_ids.length > 0` as first post-swap smoke test.
**Warning signs:** Dashboard shows 0 contacts in pods, OrbMap shows empty categories.

### Pitfall 3: Airtable rec-ID Validation in Data Layer
**What goes wrong:** `getInteractions(contactId)` throws "Invalid contact ID" because UUID doesn't match `/^rec[A-Za-z0-9]{14}$/`.
**Why it happens:** The current `airtable.ts` has an explicit rec-ID format guard.
**How to avoid:** Search for `rec[A-Za-z0-9]` patterns in `airtable.ts` before copying logic. Replace with UUID validation or remove entirely.
**Warning signs:** Interaction panel shows error instead of history.

### Pitfall 4: Missing `invalidateXxxCache()` Exports
**What goes wrong:** TypeScript compile error on 8+ consumer files that import `invalidateContactsCache` etc.
**Why it happens:** These are utility exports on the public API, not just internal helpers.
**How to avoid:** Export all `invalidateXxxCache()` functions from `supabase-data.ts` even if they are no-ops.
**Warning signs:** Build fails with "Module has no exported member 'invalidateContactsCache'".

### Pitfall 5: `TABLES` Constant Still Exported
**What goes wrong:** Some consumers may import `TABLES` directly (e.g., for table ID strings). If removed, they break.
**Why it happens:** `TABLES` is exported from `airtable.ts` but likely not imported by consumers (it was for internal use).
**How to avoid:** Verify with grep before removing. It is not needed in `supabase-data.ts`.
**Warning signs:** Check `grep -r "TABLES" src --include="*.tsx" --include="*.ts" | grep -v airtable.ts`.

### Pitfall 6: `updated_at` Trigger Not Set
**What goes wrong:** `updated_at` column never updates automatically despite existing in schema.
**Why it happens:** PostgreSQL requires a trigger to auto-update `updated_at` -- it is not automatic.
**How to avoid:** Lovable must add a `moddatetime` trigger or equivalent for each table with `updated_at`.
**Warning signs:** `updated_at` always equals `created_at`.

---

## Code Examples

### Fetch pods (replaces `getPods()`)
```typescript
// Source: Supabase JS client docs
export async function getPods(): Promise<Pod[]> {
  if (isDemoMode()) return DEMO_PODS
  const { data, error } = await supabase.from('pods').select('*').order('created_at')
  if (error) throw error
  return data.map(mapPod)  // mapPod now trivial -- snake_case matches
}
```

### Fetch contacts with junction data
```typescript
export async function getContacts(categoryId?: string): Promise<Contact[]> {
  if (isDemoMode()) return categoryId
    ? DEMO_CONTACTS.filter(c => c.category_ids.includes(categoryId))
    : DEMO_CONTACTS

  let query = supabase.from('contacts').select(`
    *,
    contact_pods(pod_id, is_primary),
    contact_categories(category_id)
  `)
  // category filter: join on contact_categories
  if (categoryId) {
    query = query.eq('contact_categories.category_id', categoryId)
  }
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(row => ({
    ...row,
    list_ids: row.contact_pods.map((cp: { pod_id: string }) => cp.pod_id),
    category_ids: row.contact_categories.map((cc: { category_id: string }) => cc.category_id),
    primary_list_id: row.contact_pods.find((cp: { is_primary: boolean }) => cp.is_primary)?.pod_id ?? null,
  }))
}
```

### Migration script insert with ID map
```typescript
// pods first (no FK deps)
for (const airtableRecord of airtablePods) {
  const { data, error } = await adminSupabase.from('pods').insert({
    name: airtableRecord.fields.Name,
    color: airtableRecord.fields.Color ?? null,
    user_id: MIGRATION_USER_ID,
    // ... other fields
  }).select().single()
  if (error) throw error
  await adminSupabase.from('_migration_id_map').insert({
    airtable_id: airtableRecord.id,
    table_name: 'pods',
    supabase_uuid: data.id,
    user_id: MIGRATION_USER_ID,
  })
}
```

### Validation count check
```typescript
const tables = ['pods', 'categories', 'contacts', 'interactions', 'campaigns', 'campaign_contacts', 'pipelines', 'pipeline_stages', 'opportunities', 'projects']
for (const table of tables) {
  const { count } = await adminSupabase.from(table).select('*', { count: 'exact', head: true })
  console.log(`${table}: ${count} rows`)
}
```

---

## Runtime State Inventory

> This phase involves migration of live Airtable data. Runtime state audit:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Airtable base (app...) -- all app data lives here: pods, contacts, interactions, campaigns, pipelines, opportunities, projects | One-time migration script reads all via REST, writes to Supabase |
| Live service config | `airtable-proxy` Edge Function deployed to Supabase -- still running after migration | Delete after migration validated |
| OS-registered state | None found | None |
| Secrets/env vars | `VITE_AIRTABLE_TOKEN`, `VITE_AIRTABLE_BASE_ID` in .env.local and Vercel env -- still needed during migration, removable after | Keep during migration, remove from Vercel after validation. Add `SUPABASE_SERVICE_ROLE_KEY` for migration script only (local .env only, never in Vercel). |
| Build artifacts | None -- TypeScript source only | None |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Airtable linked record arrays `['rec...']` | PostgREST junction table JOINs | Phase 22 | Must flatten back to `string[]` in mapper |
| `PROXY_URL` + Edge Function proxy | Direct `supabase.from()` calls | Phase 22 | Removes network hop, faster, removes CORS complexity |
| PascalCase field names requiring mappers | snake_case columns matching app types | Phase 22 | Mapper functions become near-trivial |
| Airtable `createdTime` string | Supabase `created_at timestamptz` | Phase 22 | Both ISO strings -- compatible |
| Module-level caches for slow REST | Optional -- Supabase is faster | Phase 22 | Cache can stay or be simplified |

---

## Open Questions

1. **What is the production user's UUID?**
   - What we know: The migration script needs to set `user_id` on all inserted records.
   - What's unclear: The actual UUID of the single production user in the Supabase auth.users table.
   - Recommendation: Extract from Supabase dashboard or `supabase.auth.getUser()` during script setup. Hard-code as `MIGRATION_USER_ID` constant in script.

2. **Does `getContacts(categoryId?)` PostgREST filter work as expected?**
   - What we know: PostgREST supports filtering on embedded relations but syntax is `contact_categories.category_id=eq.{id}` in URL form.
   - What's unclear: Whether `.eq('contact_categories.category_id', categoryId)` works correctly in the JS client for filtering via junction table.
   - Recommendation: Test with a known category after schema is live. Alternative: fetch all, filter client-side (current Airtable pattern) -- safe fallback.

3. **Supabase type generation after schema creation**
   - What we know: `supabase gen types typescript --project-id ... > src/integrations/supabase/types.ts` regenerates the types file.
   - What's unclear: Whether this should happen before or after migration script runs.
   - Recommendation: Regenerate types immediately after Lovable creates the schema, before writing `supabase-data.ts`.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/airtable.ts` -- Full source of current data layer (1,681 lines, read directly)
- `src/lib/types.ts` -- TypeScript interface contract (read directly)
- `src/integrations/supabase/client.ts` -- Supabase client configuration (read directly)
- `src/integrations/supabase/types.ts` -- Currently empty schema types (read directly)
- `.planning/phases/22-airtable-to-supabase-data-migration/22-CONTEXT.md` -- All locked decisions (read directly)
- `npm view @supabase/supabase-js version` -- Verified 2.101.1 (current)

### Secondary (MEDIUM confidence)
- Supabase JS client docs (embedded select syntax, CRUD patterns) -- consistent with project's existing supabase-js ^2.100.1 usage
- PostgREST join/filter patterns -- standard, stable feature of Supabase

### Tertiary (LOW confidence)
- `.eq('contact_categories.category_id', value)` for filtering via embedded relations -- needs runtime verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Supabase already installed, client configured, no new deps
- Architecture: HIGH -- adapter pattern, junction table flattening, ID map approach all well-defined
- Migration script: HIGH -- order and shape derived directly from existing Airtable field shapes
- PostgREST filter via junction: LOW -- needs runtime test after schema exists

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (supabase-js stable, patterns unlikely to change)
