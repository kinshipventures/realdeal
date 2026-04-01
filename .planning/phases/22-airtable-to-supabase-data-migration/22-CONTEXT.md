# Phase 22: Airtable to Supabase Data Migration - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace Airtable as the data layer with Supabase PostgreSQL. Design the relational schema, migrate existing data, and swap the client-side data layer from Airtable REST (via proxy) to direct Supabase client queries. The app's TypeScript interfaces and all 38 consumer components remain unchanged -- only the data layer implementation swaps.

</domain>

<decisions>
## Implementation Decisions

### Migration approach
- **D-01:** Adapter pattern -- keep all TypeScript interfaces (`Contact`, `Pod`, `Pipeline`, etc.) identical. Replace `airtable.ts` internals with Supabase `supabase.from('table').select()` calls. Zero changes to consumer components.
- **D-02:** The existing Supabase Edge Function proxy (`airtable-proxy`) gets removed after migration -- direct Supabase client calls replace it.
- **D-03:** Demo mode (`sampleData.ts`) stays unchanged -- it's in-memory and doesn't touch the data layer.

### Lovable vs Claude Code split
- **D-04:** Lovable builds the Supabase schema -- tables, columns, types, RLS policies, and any Edge Functions needed.
- **D-05:** Claude Code writes the data migration script (Airtable -> Supabase) and swaps `airtable.ts` to `supabase-data.ts` (or equivalent).
- **D-06:** Schema design happens first in this planning phase. Lovable executes the schema. Claude Code executes the migration and code swap.

### Schema design philosophy
- **D-07:** Properly normalized relational tables with foreign keys -- not a 1:1 copy of Airtable's flat linked-record model.
- **D-08:** Junction tables for many-to-many relationships (contact_pods, contact_categories, opportunity_relationships, project_relationships, project_opportunities) replace Airtable's linked record arrays.
- **D-09:** Enums as PostgreSQL types where Airtable uses single-select fields (interaction_type, relationship_type, relationship_status, cadence, etc.).
- **D-10:** `uuid` primary keys (Supabase default) replace Airtable record IDs (`rec...`). The migration script maintains an ID mapping table.
- **D-11:** `created_at` and `updated_at` timestamps on all tables (Supabase defaults), replacing Airtable's `createdTime`.
- **D-12:** `user_id` column on all tables for RLS -- ties records to the authenticated Supabase user from Phase 18.

### Table mapping (Airtable -> Supabase)

| Airtable Table | Supabase Table | Notes |
|---|---|---|
| Lists | pods | Renamed to match UI terminology |
| Categories | categories | FK to pods |
| Contacts | contacts | Split: contact-specific fields only |
| (Contacts where Type=Company) | companies | Separate table, not a type flag |
| Interactions | interactions | FK to contacts |
| Campaigns | campaigns | |
| CampaignContacts | campaign_contacts | Junction table |
| Pipelines | pipelines | |
| Pipeline Stages | pipeline_stages | FK to pipelines |
| Opportunities | opportunities | FK to pipeline_stages |
| Projects | projects | |
| Field Config | field_config | Custom fields schema |
| (new) | contact_pods | Junction: contacts <-> pods |
| (new) | contact_categories | Junction: contacts <-> categories |
| (new) | opportunity_contacts | Junction: opportunities <-> contacts |
| (new) | project_contacts | Junction: projects <-> contacts |
| (new) | project_opportunities | Junction: projects <-> opportunities |

- **D-13:** Companies get their own table (split from Contacts). The `company_record_id` linked field becomes a proper FK `company_id` on contacts.
- **D-14:** Contact-to-pod membership moves from Airtable linked record arrays (`Lists` field) to a `contact_pods` junction table with `is_primary` flag.

### Data migration strategy
- **D-15:** One-time migration script (TypeScript, runs locally) that reads all Airtable tables via REST API and writes to Supabase via the JS client.
- **D-16:** ID mapping: script creates a `_migration_id_map` table mapping `airtable_id` -> `supabase_uuid` for every record. Used during migration to resolve linked records. Can be dropped after verification.
- **D-17:** Migration order follows FK dependencies: pods -> categories -> companies -> contacts -> junction tables -> interactions -> pipelines -> stages -> opportunities -> campaigns -> campaign_contacts -> projects -> field_config.
- **D-18:** Validation step after migration: count checks per table + spot-check linked record resolution.

### RLS policy approach
- **D-19:** All tables scoped to authenticated user via `user_id = auth.uid()`. No public access except future share links (Phase 21).
- **D-20:** RLS designed in Lovable as part of schema setup.

### Claude's Discretion
- Exact Supabase column types and constraints (beyond what's specified above)
- Cache strategy replacement (current module-level caches may not be needed with Supabase's realtime or simpler re-fetch)
- Whether to use Supabase realtime subscriptions or stick with fetch-on-demand
- Error handling patterns in the new data layer
- Whether `airtable.ts` is renamed or replaced with a new file

</decisions>

<specifics>
## Specific Ideas

- The user explicitly said "for Lovable" -- Lovable is the tool that will create the Supabase schema, tables, and RLS policies. Claude Code provides the schema design spec that Lovable executes.
- The existing proxy pattern (`airtable-proxy` Edge Function) proves the Supabase infra is already running -- this is a swap, not a greenfield setup.
- The `request()` / `fetchAll()` helper pattern in airtable.ts can be replaced with Supabase's built-in `.from().select()` chaining which handles pagination natively.
- All mapper functions (`mapPod`, `mapContact`, etc.) that translate Airtable PascalCase to app snake_case become unnecessary if Supabase columns use snake_case natively.

</specifics>

<canonical_refs>
## Canonical References

### Current data layer (migration source)
- `src/lib/airtable.ts` -- 1681-line data layer with all CRUD, caching, mapper functions (the file being replaced)
- `src/lib/types.ts` -- TypeScript interfaces for all entities (must remain unchanged post-migration)
- `src/lib/sampleData.ts` -- Demo mode data (unchanged, but validates interface compatibility)

### Supabase setup (migration target)
- `src/integrations/supabase/client.ts` -- Pre-configured Supabase client with auth
- `src/integrations/supabase/types.ts` -- Auto-generated types (currently empty, will be populated after schema creation)

### Consumer components (must not change)
- 38 files import from `airtable.ts` -- see grep results. These are the API surface that must remain stable.

### Prior architecture decisions
- `.planning/phases/10-data-architecture-rebuild/10-CONTEXT.md` -- Original Airtable schema design decisions (D-01 through D-13)
- `.planning/phases/18-authentication/18-CONTEXT.md` -- Auth context and Supabase client setup

### Product spec
- `docs/RealDeal -- MVP.pdf` -- MVP scope boundary (source of truth for what data must migrate)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase` client instance: already configured with auth, ready for data queries
- TypeScript interfaces in `types.ts`: the stable contract -- new data layer must produce identical shapes
- `sampleData.ts`: demo mode is independent of data layer, no changes needed

### Established Patterns
- **Module-level caching** (`_contactsCache`, `_categoriesCache`): current pattern for Airtable's slow REST. May be simplified or removed with Supabase's faster responses.
- **Mapper functions** (`mapPod`, `mapContact`, etc.): translate Airtable PascalCase fields to app snake_case. With Supabase snake_case columns, these become pass-through or unnecessary.
- **`fetchAll` with pagination**: Airtable returns max 100 records per page. Supabase handles this differently (`.range()` or no limit needed for small datasets).
- **Linked record arrays**: Airtable returns `['recXXX', 'recYYY']` for linked fields. Supabase uses proper JOINs or sub-selects via PostgREST.

### Integration Points
- `airtable.ts` is the ONLY file that touches Airtable. All 38 consumer files import functions from it. This is the single swap point.
- `PROXY_URL` constant and `request()` function are the Airtable-specific transport -- both get removed.
- `TABLES` constant with Airtable table IDs gets removed entirely.
- `invalidateContactsCache()` and similar exports used by consumers for cache busting -- need equivalent or removal.

</code_context>

<deferred>
## Deferred Ideas

- Supabase Realtime subscriptions for live updates -- nice-to-have, not part of migration scope
- Supabase Storage for file attachments -- future feature
- Row-level team permissions (multi-workspace) -- v2.2 scope
- Supabase Edge Functions for server-side enrichment -- Phase 19 concern

</deferred>

---

*Phase: 22-airtable-to-supabase-data-migration*
*Context gathered: 2026-04-01*
