# Roadmap: Kinship Brain

## Milestones

- ✅ **v1.0 Kinship Brain MVP** — Phases 1-3 + 02.1 (shipped 2026-03-23)
- ✅ **v1.1 Polish & Features** — Phases 4-6 (shipped 2026-03-25)
- ✅ **v1.2 Demo Ready** — Phases 7-9 (shipped 2026-03-29)
- 🔄 **v2.0 Kinship Brain MVP** — Phases 10-16 (active)

## Phases

<details>
<summary>✅ v1.0 Kinship Brain MVP (4 phases, 14 plans) — SHIPPED 2026-03-23</summary>

- [x] Phase 1: Contact Profiles (3/3 plans) — completed 2026-03-23
- [x] Phase 2: Visual Redesign (2/2 plans) — completed 2026-03-23
- [x] Phase 02.1: Design Implementation (7/7 plans) — completed 2026-03-23
- [x] Phase 3: Close-Out (2/2 plans) — completed 2026-03-23

See: `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.1 Polish & Features (3 phases, 5 plans) — SHIPPED 2026-03-25</summary>

- [x] Phase 4: Search + Birthdays (2/2 plans) — completed 2026-03-24
- [x] Phase 5: Wrapped (1/1 plan) — completed 2026-03-24
- [x] Phase 6: Campaigns (2/2 plans) — completed 2026-03-25

See: `.planning/milestones/v1.1-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.2 Demo Ready (3 phases, 6 plans) — SHIPPED 2026-03-29</summary>

- [x] Phase 7: Data & Schema (3/3 plans) — completed 2026-03-26
- [x] Phase 8: UI Enrichment (2/2 plans) — completed 2026-03-26
- [x] Phase 9: Add Contact (1/1 plan) — completed 2026-03-26

See: `.planning/milestones/v1.2-ROADMAP.md` for full details.

</details>

### v2.0 Kinship Brain MVP

- [x] **Phase 10: Data Architecture Rebuild** — Establish relationship-first Airtable schema as the foundation for the entire v2.0 system (completed 2026-03-29)
- [x] **Phase 11: Relationship Records** — Full record system with Contact + Company types, custom fields, and conditional field behavior (completed 2026-03-29)
- [x] **Phase 12: Pods Overhaul + Categorization** — Behavioral pods with required questions and intake workflow from pending tray to CRM (completed 2026-03-29)
- [ ] **Phase 13: Timeline + Records List** — Unified activity timeline and filterable records list with bulk actions
- [ ] **Phase 14: Pipelines** — Kanban pipeline boards with relationship-linked opportunity cards
- [ ] **Phase 15: Projects + Navigation** — Project containers and zero-context-loss cross-module navigation
- [ ] **Phase 16: Dashboard + Nurturing Hub** — Modular operating dashboard and dedicated relationship maintenance surface

## Phase Details

### Phase 10: Data Architecture Rebuild
**Goal**: The Airtable schema reflects a relationship-first model where all modules reference relationship records, never duplicate them
**Depends on**: Nothing (foundation phase)
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04
**Success Criteria** (what must be TRUE):
  1. A single Relationship Record represents either a person or a company — no separate Contacts table and Companies table as isolated entities
  2. Pipelines, projects, and campaigns link to relationship records via Airtable linked fields — no record data is copied or shadowed
  3. Every association (pod membership, pipeline card, project attachment) points back to one canonical record with no duplicates
  4. All existing contact data from v1.x is migrated or mapped to the new schema without data loss
**Plans:** 2/2 plans complete
Plans:
- [x] 10-01-PLAN.md — Airtable schema migration script (add fields, create Company records, create new tables)
- [x] 10-02-PLAN.md — TypeScript data layer update (types, airtable.ts CRUD, demo data)

### Phase 11: Relationship Records
**Goal**: Users can create, view, and manage Contact and Company records with a full layout including timeline, widgets, and conditional custom fields
**Depends on**: Phase 10
**Requirements**: REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, REC-07, REC-08, REC-09, CRE-01, CRE-02, CRE-03, CRE-04, FLD-01, FLD-02, FLD-03, FLD-04, FLD-05, FLD-06
**Success Criteria** (what must be TRUE):
  1. User can create a Contact record with name, email, phone, role, and company affiliation; create a Company record with name, industry, stage, and domain
  2. Contact and Company records show in a unified layout: central timeline on the left, side widgets (highlights, health, pod context) on the right
  3. Fields only appear when relevant — Contact-only fields hide on Company records, pod-specific fields hide until that pod is assigned
  4. User can associate a contact with a company and see the relationship reflected on both records
  5. User can define custom fields scoped to a record type or pod, mark them required or optional, and filter/report using those fields
**Plans:** 3/3 plans complete
Plans:
- [x] 11-01-PLAN.md — RecordPage UI + data layer fixes + Field Config migration + navigation wiring
- [x] 11-02-PLAN.md — CreateRecordModal + company-contact linking (typeahead + Associated People widget)
- [x] 11-03-PLAN.md — Custom fields system (PodFieldsWidget + Add field) + bulk creation + CSV import

### Phase 12: Pods Overhaul + Categorization
**Goal**: Pods are behavioral containers with required questions, and all new records pass through a categorization workflow before entering the CRM
**Depends on**: Phase 11
**Requirements**: POD-01, POD-02, POD-03, POD-04, POD-05, POD-06, POD-07, POD-08, POD-09, POD-10, CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06
**Success Criteria** (what must be TRUE):
  1. New contacts from any source (manual entry, CSV import) land in a Pending Categorization tray, not directly in the CRM
  2. Categorization modal lets user assign one or more pods, answer pod-required questions, and set a primary pod before saving
  3. A record cannot be saved to a pod with required questions unanswered — the UI enforces this
  4. Pods support sub-pods, multi-pod membership, capacity limits, and individual cadence overrides
  5. Every categorization action is written to the record's timeline (who, what pods, what fields answered)
**Plans:** 4/4 plans complete
Plans:
- [x] 12-01-PLAN.md — Data model: Airtable schema + TypeScript interfaces + pod CRUD + CSV pending routing
- [x] 12-02-PLAN.md — Pending tray widget + swipe queue + categorization modal with required field enforcement
- [x] 12-03-PLAN.md — Pod detail page at /pod/:id + pod creation modal
- [x] 12-04-PLAN.md — Orb map navigation rewire + capacity indicators + human verification

### Phase 13: Timeline + Records List
**Goal**: Every relationship has a complete activity timeline, and users can browse, filter, and bulk-act on all records from a list view
**Depends on**: Phase 12
**Requirements**: TL-01, TL-02, TL-03, TL-04, TL-05, TL-06, LIST-01, LIST-02, LIST-03
**Success Criteria** (what must be TRUE):
  1. Opening any record shows a single chronological timeline of all activity — interactions, pod changes, pipeline events, field updates, categorization actions
  2. Every timeline entry shows source (user, system, AI), timestamp, and actor — nothing changes on a record without appearing in the timeline
  3. User can filter the timeline to focus on specific event types (e.g., hide system events, show only meetings)
  4. Records List shows all relationships filterable by pod, record type, activity recency, and any custom field
  5. User can select multiple records and perform bulk actions (add to project, add to pipeline, bulk field update, export), then save the filter config for reuse
**Plans:** 3 plans
Plans:
- [ ] 13-01-PLAN.md — Timeline data layer + system events + filter UI
- [ ] 13-02-PLAN.md — Records List view with table, filters, saved views, nav wiring
- [ ] 13-03-PLAN.md — Bulk actions + human verification

### Phase 14: Pipelines
**Goal**: Users can manage relationship-linked opportunities through customizable Kanban pipelines
**Depends on**: Phase 13
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, PIPE-07, PIPE-08, PIPE-09
**Success Criteria** (what must be TRUE):
  1. User can create a pipeline (e.g., LP Fundraising), define named and colored stages, and view it as a Kanban board
  2. Each pipeline card is a Relationship Opportunity linked to one or more relationship records — the card has its own notes, stage, priority, and status fields
  3. Moving a card between stages, adding a note, or archiving a card writes an event to the linked relationship's timeline
  4. User can open the full relationship record directly from any pipeline card
  5. User can hide a pipeline without deleting it — hidden pipelines maintain all record connections
**Plans:** 3 plans
Plans:
- [ ] 13-01-PLAN.md — Timeline data layer + system events + filter UI
- [ ] 13-02-PLAN.md — Records List view with table, filters, saved views, nav wiring
- [ ] 13-03-PLAN.md — Bulk actions + human verification

### Phase 15: Projects + Navigation
**Goal**: Users can organize multi-record initiatives in projects, and navigate between all modules without losing context
**Depends on**: Phase 14
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, PROJ-06, NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. User can create a project with name, description, and associated records and opportunities — distinct from a pipeline
  2. Project overview page shows all attached records, opportunities, and notes/updates in one place
  3. A relationship record shows all projects it belongs to; clicking any project opens it without navigating away (slide-out or modal)
  4. User can open a full relationship record from any pipeline card, project, or campaign — and navigate back without losing their place
  5. All navigation uses slide-out panels or contextual overlays — no full page reloads that reset context
**Plans:** 3 plans
Plans:
- [ ] 13-01-PLAN.md — Timeline data layer + system events + filter UI
- [ ] 13-02-PLAN.md — Records List view with table, filters, saved views, nav wiring
- [ ] 13-03-PLAN.md — Bulk actions + human verification

### Phase 16: Dashboard + Nurturing Hub
**Goal**: The dashboard is the primary daily operating surface and the nurturing hub surfaces everything requiring relationship attention
**Depends on**: Phase 15
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, NURT-01, NURT-02, NURT-03, NURT-04, NURT-05, NURT-06
**Success Criteria** (what must be TRUE):
  1. Dashboard shows configurable widgets — user can show/hide and reorder them, and create multiple named dashboard views
  2. Dashboard surfaces pending follow-ups, stale relationships, important dates, and pending categorizations without leaving the main view
  3. Nurturing Hub has a dedicated view listing: upcoming important dates, stale relationships (no interaction in N days), maintenance queue for capacity-limited pods, and records with missing required fields
  4. Basic suggestions appear in the hub — contacts with milestones this week, records with no recent interaction
  5. Nurturing signals from the hub also surface as alerts on individual record views, pipeline cards, and dashboard widgets
**Plans:** 3 plans
Plans:
- [ ] 13-01-PLAN.md — Timeline data layer + system events + filter UI
- [ ] 13-02-PLAN.md — Records List view with table, filters, saved views, nav wiring
- [ ] 13-03-PLAN.md — Bulk actions + human verification

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Contact Profiles | v1.0 | 3/3 | Complete | 2026-03-23 |
| 2. Visual Redesign | v1.0 | 2/2 | Complete | 2026-03-23 |
| 02.1. Design Implementation | v1.0 | 7/7 | Complete | 2026-03-23 |
| 3. Close-Out | v1.0 | 2/2 | Complete | 2026-03-23 |
| 4. Search + Birthdays | v1.1 | 2/2 | Complete | 2026-03-24 |
| 5. Wrapped | v1.1 | 1/1 | Complete | 2026-03-24 |
| 6. Campaigns | v1.1 | 2/2 | Complete | 2026-03-25 |
| 7. Data & Schema | v1.2 | 3/3 | Complete | 2026-03-26 |
| 8. UI Enrichment | v1.2 | 2/2 | Complete | 2026-03-26 |
| 9. Add Contact | v1.2 | 1/1 | Complete | 2026-03-26 |
| 10. Data Architecture Rebuild | v2.0 | 2/2 | Complete    | 2026-03-29 |
| 11. Relationship Records | v2.0 | 3/3 | Complete    | 2026-03-29 |
| 12. Pods Overhaul + Categorization | v2.0 | 4/4 | Complete   | 2026-03-29 |
| 13. Timeline + Records List | v2.0 | 0/3 | Planning complete | — |
| 14. Pipelines | v2.0 | 0/? | Not started | — |
| 15. Projects + Navigation | v2.0 | 0/? | Not started | — |
| 16. Dashboard + Nurturing Hub | v2.0 | 0/? | Not started | — |
