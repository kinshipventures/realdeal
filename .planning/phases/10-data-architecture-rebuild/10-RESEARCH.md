# Phase 10: Data Architecture Rebuild - Research

**Researched:** 2026-03-29
**Domain:** Airtable schema management, data migration, TypeScript type system
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single "Contacts" table (renamed conceptually to "Relationships") with a `Type` field: `Contact` | `Company`. Not two separate tables.
- **D-02:** Existing contacts get `Type = 'Contact'` as default during migration.
- **D-03:** Company-only fields (industry, stage, ticker, domain) added to the same table — null on Contact records, populated on Company records.
- **D-04:** The existing text `Company` field is replaced by a linked record field pointing to a Company-type record in the same table. Bidirectional association.
- **D-05:** Auto-create Company records from unique company name strings in existing contacts. Deduplicate by name. Link all contacts referencing that company.
- **D-06:** Pipelines → 3 new tables: `Pipelines` (name, status: active/hidden, created_at), `Pipeline Stages` (name, color, order, linked to Pipeline), `Opportunities` (linked to Stage, linked to Relationship record(s), notes, priority, status)
- **D-07:** Projects → 1 new table: `Projects` (name, description, owner, linked to Relationships via direct many-to-many, linked to Opportunities, notes). No junction table.
- **D-08:** Add `Status` field to Contacts: `Pending` | `Active` | `Archived` (default: `Active`). No separate Pending table.
- **D-09:** Categories table stays as-is — no table rename needed.
- **D-10:** Migrate in-place — no new Airtable base. Add fields and tables to existing base.
- **D-11:** Existing record IDs preserved — no re-import. App keeps working during migration.
- **D-12:** Migration order: (1) Add Type field, (2) Add Status field, (3) Add company-specific fields, (4) Create Company records, (5) Add Company Record linked field + populate, (6) Create Pipelines/Stages/Opportunities tables, (7) Create Projects table, (8) Update airtable.ts TABLES + type interfaces.
- **D-13:** Existing Campaign and CampaignContacts tables carry forward unchanged.

### Claude's Discretion

- Exact Airtable field types for new fields (single select, text, linked record, etc.)
- Whether to use Airtable MCP or REST API for schema changes
- Cache invalidation strategy for new tables
- Ordering of fields in Airtable views
- Whether to create Airtable views for convenience (e.g., "Active Contacts", "Companies Only")

### Deferred Ideas (OUT OF SCOPE)

- Custom fields table/system — Phase 11 (FLD-01 through FLD-06)
- Pod required questions as structured fields — Phase 12
- Timeline event types expansion — Phase 13
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ARCH-01 | Relationship record is the only core object — a single unified "Relationship Record" (person or company) | Single-table approach with `Type` field; `singleSelect` field type in Airtable API |
| ARCH-02 | Pipelines, projects, and campaigns reference relationships via linked records (no copying) | `multipleRecordLinks` field type with `linkedTableId`; new tables for Pipelines/Stages/Opportunities/Projects |
| ARCH-03 | No duplicate or shadow records created anywhere in the system | Company dedup by case-insensitive name match; single canonical record per entity |
| ARCH-04 | Every record acts as the canonical hub for all its associations | All new tables link back to Contacts via `multipleRecordLinks`; bidirectional Airtable linked fields |
</phase_requirements>

## Summary

This phase restructures the Airtable base schema to support a relationship-first data model without UI changes. The core work is three things: (1) extending the existing Contacts table with Type, Status, and company-specific fields, (2) running a migration script to create Company records from existing text values and link them, (3) creating four new tables (Pipelines, Pipeline Stages, Opportunities, Projects) with correct linked record fields. Finally, `airtable.ts` and `types.ts` get updated to reflect the new schema.

The entire schema migration happens via the Airtable REST API — `POST /v0/meta/bases/{baseId}/tables` to create tables, `POST /v0/meta/bases/{baseId}/tables/{tableId}/fields` to add fields. No Airtable MCP is available in this project setup; all schema work is done programmatically from a migration script that runs once. The migration is designed to be safe: it only adds fields/tables, never deletes anything, so the app continues working against v1 data throughout.

The TypeScript layer update is the final wave: new interfaces for Pipeline, PipelineStage, Opportunity, Project; updated Contact interface with `type`, `status`, `company_record_id`; new entries in TABLES constant; new cache/invalidation pairs following the established stale-while-revalidate pattern already in place for contacts and campaigns.

**Primary recommendation:** Write a one-time migration script (`scripts/migrate-schema.ts`) that executes all Airtable schema changes in the correct order with idempotency checks. Update TS types after the script confirms success.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Airtable REST API | v0 | Schema mutations, record CRUD | Already the entire data layer |
| TypeScript | Project default | Type interfaces for new entities | Already in use |
| tsx / ts-node | Project default | Run migration script | Already used for `seed:lists`, `seed:csv` scripts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | Already in project | Load `.env.local` in script context | Migration script needs API token |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| REST API schema endpoints | Airtable Scripting (in-base scripts) | Scripting runs inside Airtable UI — harder to version-control and integrate with code review |
| REST API schema endpoints | Airtable MCP | No Airtable MCP configured in this project |

**Installation:** No new dependencies needed. Migration script uses existing fetch pattern.

## Architecture Patterns

### Migration Script Structure
```
scripts/
└── migrate-schema.ts     # one-time migration, safe to re-run (idempotent checks)
src/lib/
├── airtable.ts           # extended: TABLES, new CRUD functions, new cache vars
└── types.ts              # extended: new interfaces, updated Contact type
```

### Pattern 1: Airtable Schema Mutation via REST (Metadata API)

**What:** Use the Airtable Metadata API to create tables and add fields programmatically.
**When to use:** Any time schema changes are needed without touching the Airtable UI.

```typescript
// Create a new table
const BASE_ID = process.env.VITE_AIRTABLE_BASE_ID
const TOKEN = process.env.VITE_AIRTABLE_TOKEN

async function createTable(name: string, fields: AirtableFieldSpec[]) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, fields }),
  })
  if (!res.ok) throw new Error(`Create table failed: ${await res.text()}`)
  return res.json()
}

// Add a field to an existing table
async function createField(tableId: string, field: AirtableFieldSpec) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${tableId}/fields`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(field),
  })
  if (!res.ok) throw new Error(`Create field failed: ${await res.text()}`)
  return res.json()
}
```

### Pattern 2: Field Type Specs (Claude's Discretion — Recommended Types)

```typescript
// Type field on Contacts — singleSelect
{ name: 'Type', type: 'singleSelect', options: { choices: [
  { name: 'Contact' }, { name: 'Company' }
]}}

// Status field on Contacts — singleSelect
{ name: 'Status', type: 'singleSelect', options: { choices: [
  { name: 'Active' }, { name: 'Pending' }, { name: 'Archived' }
]}}

// Company-specific text fields — singleLineText
{ name: 'Industry', type: 'singleLineText' }
{ name: 'Domain', type: 'singleLineText' }
{ name: 'Ticker', type: 'singleLineText' }
{ name: 'Stage', type: 'singleLineText' }  // or singleSelect if values are enumerable

// Company Record linked field — multipleRecordLinks (self-referencing, same table)
{ name: 'Company Record', type: 'multipleRecordLinks', options: { linkedTableId: TABLES.contacts }}

// Pipeline Stage linked field in Opportunities
{ name: 'Stage', type: 'multipleRecordLinks', options: { linkedTableId: '<pipeline_stages_table_id>' }}

// Order field in Pipeline Stages — number
{ name: 'Order', type: 'number', options: { precision: 0 }}
```

### Pattern 3: Company Deduplication Migration

**What:** Fetch all contacts, extract unique Company text values, create Company records, then PATCH each contact with the linked record ID.
**Constraint:** Airtable limits bulk record creation to 10 records per request. Link patching also limited to 10 per PATCH batch.

```typescript
// 1. Collect unique company names (case-insensitive dedup)
const contacts = await fetchAll(TABLES.contacts)
const companyMap = new Map<string, string>()  // normalized name → record ID

const uniqueNames = [...new Set(
  contacts
    .map(c => c.fields.Company?.trim())
    .filter(Boolean)
    .map(n => n!.toLowerCase())
)]

// 2. Create Company records in batches of 10
for (const batch of chunk(uniqueNames, 10)) {
  const res = await createRecords(TABLES.contacts, batch.map(name => ({
    Name: toTitleCase(name),
    Type: 'Company',
    Status: 'Active',
  })))
  res.records.forEach((r, i) => companyMap.set(batch[i], r.id))
}

// 3. PATCH contacts with company_record_id in batches of 10
const patches = contacts
  .filter(c => c.fields.Company)
  .map(c => ({ id: c.id, fields: { 'Company Record': [companyMap.get(c.fields.Company!.toLowerCase())] }}))

for (const batch of chunk(patches, 10)) {
  await batchUpdateRecords(TABLES.contacts, batch)
}
```

### Pattern 4: Idempotent Schema Migration

**What:** Check if a field or table already exists before creating it. Re-running the script should be safe.

```typescript
async function getBaseSchema() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  })
  return res.json()  // returns { tables: [{ id, name, fields: [...] }] }
}

async function addFieldIfMissing(tableId: string, fieldSpec: AirtableFieldSpec, existingFields: string[]) {
  if (existingFields.includes(fieldSpec.name)) {
    console.log(`  Skipping "${fieldSpec.name}" — already exists`)
    return
  }
  return createField(tableId, fieldSpec)
}
```

### Pattern 5: New Cache Pair (established pattern extension)

```typescript
// Follow existing pattern from contacts/campaigns
let _pipelinesCache: Pipeline[] | null = null
let _pipelinesCacheTime = 0
let _pipelinesFetch: Promise<Pipeline[]> | null = null

export function invalidatePipelinesCache(): void {
  _pipelinesCache = null
}
```

### Anti-Patterns to Avoid
- **Deleting the old text `Company` field before migration is complete:** The field should be left intact during migration. Only deprecate it after all links are populated and verified.
- **Creating Company records one at a time in a loop:** Hits rate limits fast. Always batch in groups of 10.
- **Storing Company names as strings in the new linked field:** Airtable linked record fields expect an array of record IDs, not name strings.
- **Assuming self-referencing links are symmetric by default:** In Airtable, a `multipleRecordLinks` field pointing to the same table is one-directional unless you enable the symmetric option. The Company → Contact backlink is automatic in Airtable's UI but the API field spec may need `prefersSingleRecordLink: false` and the inverse field name set.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Batch record creation | Custom retry loop | Airtable batch endpoint (10 records per POST) | Built-in API limit; Airtable already handles atomicity per batch |
| Field existence check | Custom field registry | `GET /v0/meta/bases/{id}/tables` schema endpoint | Returns all tables + fields; single source of truth |
| Linked record deref | Manual join logic | Store IDs, dereference in mappers | Existing app pattern; any join logic belongs client-side |
| Cache invalidation | Timer-based expiry only | Explicit `invalidate*Cache()` after mutations | Already the pattern — consistent with contacts/campaigns |

**Key insight:** Airtable's Metadata API handles schema creation reliably. The hard work here is the data migration (company dedup + link), not the schema definition.

## Common Pitfalls

### Pitfall 1: Self-Referencing Linked Record Fields

**What goes wrong:** Creating a `multipleRecordLinks` field on Contacts that points to the same Contacts table causes Airtable to auto-create a symmetric linked field on the same table. This shows up as a second unexpected field called something like "Company Record 2" or causes confusion in field ordering.
**Why it happens:** Airtable auto-creates the inverse linked field by default.
**How to avoid:** When creating the `Company Record` linked field via API, the response will include the auto-created symmetric field ID. Log it and account for it. Name the primary field `Company Record` on Contact records; the auto-created inverse field (on Company records) will show associated contacts — that's expected behavior.
**Warning signs:** Field count in Contacts table increases by 2 when you expected 1.

### Pitfall 2: Airtable Rate Limits During Migration

**What goes wrong:** The migration script hammers the API creating records + patching links and hits 429 rate limit errors.
**Why it happens:** Airtable's REST API is rate-limited to 5 requests/second per base (as of training data — verify before running).
**How to avoid:** Add a small delay between batch operations. Use `Promise` chaining with a 250ms delay between batches during the migration script only (not in app code).
**Warning signs:** HTTP 429 responses from Airtable mid-migration.

### Pitfall 3: Text Company Field Casing Inconsistency

**What goes wrong:** "Andreessen Horowitz", "andreessen horowitz", "ANDREESSEN HOROWITZ" create three Company records instead of one.
**Why it happens:** Dedup logic must normalize before comparing. The display name stored on the Company record should be title-cased.
**How to avoid:** Normalize to lowercase for dedup key; use original casing (or auto title-case) for the stored Company record name.
**Warning signs:** Multiple Company records with similar names after migration.

### Pitfall 4: airtable.ts Breaks During Migration

**What goes wrong:** Adding new fields to Airtable while the app is live causes `mapContact()` to fail if the raw field names don't match.
**Why it happens:** `mapContact` maps `r.fields.Company` (text) — if you rename/delete this field during migration, any in-flight app request blows up.
**How to avoid:** Add new fields first, update TypeScript mappers second. Never rename or delete the old `Company` text field until Phase 11+ confirms it's unused. The `Company Record` linked field is additive.
**Warning signs:** Console errors in the running app while migration script is executing.

### Pitfall 5: Pipeline Stage `Order` Field Gaps After Reordering

**What goes wrong:** Stage order uses integer indices (1, 2, 3...) and reordering creates gaps or requires renumbering all records.
**Why it happens:** Naive integer ordering requires O(n) updates on insert.
**How to avoid:** Use a `number` field with fractional values (lexicographic/fractional indexing pattern) or accept sequential integers with a reorder operation. Since Kanban drag-and-drop is deferred (Phase 14), sequential integers are fine for now — just document that reordering will require a bulk PATCH in Phase 14.
**Warning signs:** No warning during Phase 10; this becomes a Phase 14 concern.

## Code Examples

### New TypeScript Interfaces

```typescript
// Source: Derived from CONTEXT.md decisions + existing types.ts pattern

export type RelationshipType = 'Contact' | 'Company'
export type RelationshipStatus = 'Active' | 'Pending' | 'Archived'
export type PipelineStatus = 'active' | 'hidden'
export type OpportunityStatus = 'open' | 'won' | 'lost' | 'archived'
export type OpportunityPriority = 'high' | 'medium' | 'low'

// Updated Contact interface additions:
// Add to existing Contact interface:
//   type: RelationshipType
//   status: RelationshipStatus
//   company_record_id: string | null   // linked Company record ID
//   industry: string | null
//   stage: string | null
//   ticker: string | null
//   domain: string | null

export interface Pipeline {
  id: string
  name: string
  status: PipelineStatus
  created_at: string
}

export interface PipelineStage {
  id: string
  pipeline_id: string
  name: string
  color: HexColor | null
  order: number
  created_at: string
}

export interface Opportunity {
  id: string
  stage_id: string
  relationship_ids: string[]   // linked Contact/Company record IDs
  notes: string | null
  priority: OpportunityPriority | null
  status: OpportunityStatus
  created_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  owner: string | null
  relationship_ids: string[]   // linked Contact/Company record IDs
  opportunity_ids: string[]    // linked Opportunity record IDs
  notes: string | null
  created_at: string
}
```

### Updated TABLES Constant

```typescript
// After migration script runs and table IDs are confirmed:
export const TABLES = {
  lists: 'tblnsxNUscKApvMsV',
  categories: 'tblVAgv23LUXs7Q0p',
  contacts: 'tbll75mRMMVBGiNpj',          // now also holds Company records
  interactions: 'tblbxLX5EM09Y6xim',
  campaigns: 'tblnrhkuIQgRdnt9w',
  campaignContacts: 'tbliW2w3R21yTqTQk',
  pipelines: 'tbl_PLACEHOLDER_pipelines',
  pipelineStages: 'tbl_PLACEHOLDER_stages',
  opportunities: 'tbl_PLACEHOLDER_opportunities',
  projects: 'tbl_PLACEHOLDER_projects',
} as const
```

### Raw Field Shape Extensions for Contacts

```typescript
// Additions to existing ContactFields interface:
interface ContactFields {
  // ... existing fields ...
  Type?: 'Contact' | 'Company'
  Status?: 'Active' | 'Pending' | 'Archived'
  'Company Record'?: string[]    // linked record ID array (self-referencing)
  Industry?: string
  Stage?: string
  Ticker?: string
  Domain?: string
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Airtable text field for Company | Linked record field to Company-type record in same table | Phase 10 | Company becomes a navigable record, not a dead string |
| All relationships in one Contact "type" | `Type` discriminator field (Contact vs Company) | Phase 10 | Single table, type-aware rendering later |
| No pipeline schema | Pipelines + Stages + Opportunities tables | Phase 10 | Foundation for Phase 14 Kanban UI |
| No project schema | Projects table linked to relationships | Phase 10 | Foundation for Phase 15 Projects UI |

**Deprecated/outdated:**
- `Contact.company` (text string field): Still readable after Phase 10, but conceptually superseded by `company_record_id`. Do not write to it in new code. Remove in Phase 11 UI cleanup.

## Open Questions

1. **Self-referencing linked field — does Airtable support it in the API?**
   - What we know: `multipleRecordLinks` takes a `linkedTableId` — if set to the same table ID as the source table, it creates a self-reference. This is supported in the Airtable UI.
   - What's unclear: Whether the Metadata API endpoint allows `linkedTableId` to equal the current table ID without error.
   - Recommendation: Test creating a self-referencing field first as a standalone API call before building the full migration script. If it fails, the fallback is keeping Company as a text field for Phase 10 and deferring the linked record approach to Phase 11.

2. **Airtable PAT scope for Metadata API**
   - What we know: The `VITE_AIRTABLE_TOKEN` in `.env.local` is used for record CRUD. The Metadata API (`/v0/meta/bases/`) requires `schema.bases:write` scope.
   - What's unclear: Whether the existing PAT already has this scope, or if a new token needs to be created.
   - Recommendation: Before writing the migration script, verify token scope by calling `GET https://api.airtable.com/v0/meta/bases/{baseId}/tables` and checking for a 403.

3. **Rate limit for Metadata API vs record API**
   - What we know: Record CRUD is rate-limited at 5 req/s per base.
   - What's unclear: Whether the Metadata API has the same limit or a separate, potentially stricter limit.
   - Recommendation: Add a 300ms delay between all migration batches regardless. The migration runs once and speed is not a concern.

## Sources

### Primary (HIGH confidence)
- [Airtable Field Type Model](https://airtable.com/developers/web/api/model/field-type) — field type strings and options structure
- [Airtable Create Table](https://airtable.com/developers/web/api/create-table) — Metadata API endpoint confirmed active
- [Airtable Create Field](https://airtable.com/developers/web/api/create-field) — field creation endpoint confirmed
- `src/lib/airtable.ts` — existing TABLES, field interfaces, cache patterns (source of truth)
- `src/lib/types.ts` — existing TypeScript interfaces (source of truth)

### Secondary (MEDIUM confidence)
- [Airtable Get Base Schema](https://airtable.com/developers/web/api/get-base-schema) — idempotency check approach

### Tertiary (LOW confidence)
- Rate limit of 5 req/s — from training data, not re-verified. Treat as approximate guidance only.
- Self-referencing `multipleRecordLinks` support in Metadata API — inferred from UI behavior, not confirmed via API docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing REST pattern is well-understood
- Architecture: HIGH — all decisions locked in CONTEXT.md; field types confirmed via Airtable API docs
- Migration script pattern: MEDIUM — batch sizes and rate limit approach are standard practice; exact Metadata API behavior for self-referencing fields is unverified
- Pitfalls: HIGH — derived from direct code analysis of existing airtable.ts + Airtable API constraints

**Research date:** 2026-03-29
**Valid until:** 2026-07-01 (Airtable API is stable; schema is unlikely to change in 3 months)
