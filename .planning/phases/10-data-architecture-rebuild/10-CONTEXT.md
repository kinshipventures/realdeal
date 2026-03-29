# Phase 10: Data Architecture Rebuild - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the Airtable schema to support a relationship-first data model. Add new tables for Pipelines, Pipeline Stages, Opportunities, and Projects. Add Type and Status fields to the existing Contacts table. Auto-create Company records from existing data. No UI changes in this phase — schema only.

</domain>

<decisions>
## Implementation Decisions

### Record type strategy
- **D-01:** Single "Contacts" table (renamed conceptually to "Relationships") with a `Type` field: `Contact` | `Company`. Not two separate tables.
- **D-02:** Existing contacts get `Type = 'Contact'` as default during migration.
- **D-03:** Company-only fields (industry, stage, ticker, domain) added to the same table — null on Contact records, populated on Company records.
- **D-04:** The existing text `Company` field is replaced by a linked record field pointing to a Company-type record in the same table. Bidirectional association.
- **D-05:** Auto-create Company records from unique company name strings in existing contacts. Deduplicate by name. Link all contacts referencing that company.

### New table design
- **D-06:** Pipelines → 3 new tables:
  - `Pipelines` (name, status: active/hidden, created_at)
  - `Pipeline Stages` (name, color, order, linked to Pipeline)
  - `Opportunities` (linked to Stage, linked to Relationship record(s), notes, priority, status)
- **D-07:** Projects → 1 new table:
  - `Projects` (name, description, owner, linked to Relationships via direct many-to-many, linked to Opportunities, notes)
  - No junction table — use Airtable's native linked record fields for project-record and project-opportunity associations.
- **D-08:** Pending state → Status field on existing Contacts table:
  - Add `Status` field: `Pending` | `Active` | `Archived` (default: `Active`)
  - Pending records are filtered out of normal views; shown in categorization tray
  - No separate Pending table — keeps links intact when status changes
- **D-09:** Categories table stays as-is but conceptually becomes "Sub-pods":
  - No table rename needed (Airtable table name ≠ UI label)
  - The existing Categories → Pod (List) relationship is already the sub-pod → pod hierarchy

### Migration approach
- **D-10:** Migrate in-place — no new Airtable base. Add fields and tables to existing base.
- **D-11:** Existing record IDs preserved — no re-import. App keeps working during migration.
- **D-12:** Migration steps (ordered):
  1. Add `Type` field to Contacts (default: `Contact`)
  2. Add `Status` field to Contacts (default: `Active`)
  3. Add company-specific fields (Industry, Stage, Ticker, Domain)
  4. Create Company records from unique Contact.Company text values
  5. Add `Company Record` linked field, populate from step 4
  6. Create Pipelines, Pipeline Stages, Opportunities tables
  7. Create Projects table with linked fields
  8. Update `airtable.ts` TABLES constant and type interfaces
- **D-13:** Existing Campaign and CampaignContacts tables carry forward unchanged — they already reference Contacts by linked record ID.

### Claude's Discretion
- Exact Airtable field types for new fields (single select, text, linked record, etc.)
- Whether to use Airtable MCP or REST API for schema changes
- Cache invalidation strategy for new tables
- Ordering of fields in Airtable views
- Whether to create Airtable views for convenience (e.g., "Active Contacts", "Companies Only")

</decisions>

<specifics>
## Specific Ideas

- "Relationship Record" is the conceptual name — the Airtable table stays named "Contacts" to avoid migration. The app can use whatever terminology.
- The auto-creation of Company records should deduplicate by exact name match (case-insensitive).
- Pipelines should feel like they could eventually support Kanban with drag-and-drop — the schema needs to support stage ordering.

</specifics>

<canonical_refs>
## Canonical References

### Product spec
- `docs/Kinship Brain — Initial Outline (Lovable).pdf` — Full system structure (Appendix A), especially sections 2 (Relationship Records), 3 (Customizable Pods), 6 (Pipelines), 7 (Projects)
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` — Core philosophy (section 1), data model details (sections 2-6), MVP checklist

### Current data layer
- `src/lib/airtable.ts` — All Airtable table IDs, field interfaces, CRUD functions, caching pattern
- `src/lib/types.ts` — TypeScript types for all entities (Pod, Category, Contact, Interaction, Campaign)

### Requirements
- `.planning/REQUIREMENTS.md` — ARCH-01 through ARCH-04 define the architecture requirements for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `airtable.ts` TABLES constant: Central table ID registry — extend with new table IDs
- `request()` / `fetchAll()` helpers: Generic Airtable CRUD — works for any table
- Module-level cache pattern (`_contactsCache`, `invalidateContactsCache()`): Apply same pattern to new tables
- Demo mode (`sampleData.ts`): Will need corresponding sample data for new tables

### Established Patterns
- **Linked record fields return arrays of record IDs** — all filtering happens client-side
- **Junction table pattern** (CampaignContacts): Used for campaign ↔ contact many-to-many with per-association metadata
- **Field mapping**: Raw Airtable `PascalCase` → app-level `snake_case` in mapper functions
- **Stale-while-revalidate caching**: Module-level cache with explicit invalidation after mutations

### Integration Points
- `TABLES` constant needs new entries for Pipelines, PipelineStages, Opportunities, Projects
- New TypeScript interfaces needed for Pipeline, PipelineStage, Opportunity, Project
- New field interfaces needed (PipelineFields, etc.) for Airtable raw shapes
- Contact interface needs: `type`, `status`, `company_record_id` fields added
- Demo mode needs sample pipelines, stages, opportunities, projects data

</code_context>

<deferred>
## Deferred Ideas

- Custom fields table/system — discussed in requirements but implementation is Phase 11 (FLD-01 through FLD-06)
- Pod required questions as structured fields — Phase 12 concern, not schema
- Timeline event types expansion — Phase 13

</deferred>

---

*Phase: 10-data-architecture-rebuild*
*Context gathered: 2026-03-29*
