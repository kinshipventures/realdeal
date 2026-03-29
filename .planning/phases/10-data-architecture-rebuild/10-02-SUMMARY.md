---
phase: 10-data-architecture-rebuild
plan: 02
subsystem: data-layer
tags: [typescript, airtable, types, crud, demo-data]

requires:
  - 10-01 (table IDs from migration)
provides:
  - Updated types.ts with v2 interfaces and extended Contact
  - Updated airtable.ts with TABLES, field interfaces, mappers, CRUD, caches for new entities
  - Updated sampleData.ts with demo data for all new entity types
affects:
  - Phase 11+ UI builds (all new entity types now available)
  - src/lib/types.ts
  - src/lib/airtable.ts
  - src/lib/sampleData.ts

tech-stack:
  added: []
  patterns:
    - "Stale-while-revalidate cache triples for Pipeline, PipelineStage, Opportunity, Project"
    - "Optional filter arg on getPipelineStages(pipelineId?) mirrors getCategories(listId?) pattern"
    - "getContactsByType / getActiveContacts as client-side cache filters (same pattern as getCategories)"
    - "Contact type field defaults to 'Contact' in mapContact and demo helper (backward safe)"

key-files:
  created: []
  modified:
    - src/lib/types.ts
    - src/lib/airtable.ts
    - src/lib/sampleData.ts

key-decisions:
  - "Contact interface keeps company text field for backward compat; company_record_id is the v2 linked field"
  - "stage field on Contact maps to Airtable Stage (company lifecycle stage), not pipeline stage — documented in mapContact"
  - "Demo company records use contact() helper with type:'Company' — no separate factory needed"

metrics:
  duration: 3min
  completed: 2026-03-29
  tasks: 3/3
  files: 3
---

# Phase 10 Plan 02: TypeScript Data Layer Update Summary

**Updated types.ts, airtable.ts, and sampleData.ts with full v2 schema support — 5 new type aliases, 4 new interfaces, extended Contact, 4 new TABLES entries, field interfaces, mappers, stale-while-revalidate caches, CRUD functions, and demo data for all new entity types**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-29T18:03:14Z
- **Completed:** 2026-03-29T18:06:29Z
- **Tasks:** 3/3
- **Files modified:** 3

## Accomplishments

- All 5 new type aliases added (RelationshipType, RelationshipStatus, PipelineStatus, OpportunityStatus, OpportunityPriority)
- Contact interface extended with 7 v2 fields (type, status, company_record_id, industry, stage, ticker, domain); company text field preserved for backward compat
- 4 new entity interfaces (Pipeline, PipelineStage, Opportunity, Project)
- TABLES constant updated with 4 real table IDs from Plan 01 migration
- ContactFields extended with Type, Status, Company Record, Industry, Stage, Ticker, Domain
- 4 new raw field interfaces (PipelineFields, PipelineStageFields, OpportunityFields, ProjectFields)
- mapContact updated to map all 7 new v2 fields
- 4 new mapper functions following established pattern
- Stale-while-revalidate caches for Pipelines, PipelineStages, Opportunities, Projects
- invalidatePipelinesCache, invalidateOpportunitiesCache, invalidateProjectsCache exports
- getPipelines, getPipelineStages (with optional pipelineId filter), getOpportunities, getProjects with demo mode
- createPipeline, createPipelineStage, createOpportunity, createProject CRUD functions
- getContactsByType, getActiveContacts filter helpers
- sampleData contact helper updated to include all v2 fields (defaults to 'Contact'/'Active')
- 2 Company-type demo contacts added (Andreessen Horowitz, Sequoia Capital)
- DEMO_PIPELINES (3), DEMO_PIPELINE_STAGES (6), DEMO_OPPORTUNITIES (4), DEMO_PROJECTS (2) exported
- `pnpm build` passes with zero type errors

## Task Commits

1. **Task 1: Update types.ts** — `839353b`
2. **Task 2: Update airtable.ts** — `15828e4`
3. **Task 3: Update sampleData.ts** — `a4c17be`

## Files Modified

- `src/lib/types.ts` — 5 new type aliases, 7 new Contact fields, 4 new interfaces (+52 lines)
- `src/lib/airtable.ts` — TABLES, imports, field interfaces, mappers, caches, CRUD (+315 lines)
- `src/lib/sampleData.ts` — extended contact helper, 2 company records, 4 new demo arrays (+50 lines)

## Decisions Made

- Contact keeps `company: string | null` text field alongside new `company_record_id` — Phase 11 can start reading from `company_record_id` without breaking existing UI that reads `company`
- `stage` on Contact maps to Airtable `Stage` (company lifecycle: e.g., "Growth") — not pipeline stage. Named clearly in code comments.
- Demo company records use the existing `contact()` helper with `type:'Company'` — keeps sampleData consistent without a new factory

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all CRUD functions are live implementations. Demo data arrays are complete with correct IDs.

## Self-Check: PASSED

- FOUND: src/lib/types.ts (contains RelationshipType, Pipeline, PipelineStage, Opportunity, Project)
- FOUND: src/lib/airtable.ts (contains pipelines:, getPipelines, getOpportunities, getProjects, DEMO_PIPELINES import)
- FOUND: src/lib/sampleData.ts (contains DEMO_PIPELINES export)
- FOUND commit: 839353b (Task 1)
- FOUND commit: 15828e4 (Task 2)
- FOUND commit: a4c17be (Task 3)
- pnpm build: PASSED (zero type errors)

---
*Phase: 10-data-architecture-rebuild*
*Completed: 2026-03-29*
