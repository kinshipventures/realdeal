# Roadmap: RealDeal

## Milestones

- ✅ **v1.0 RealDeal MVP** -- Phases 1-3 + 02.1 (shipped 2026-03-23)
- ✅ **v1.1 Polish & Features** -- Phases 4-6 (shipped 2026-03-25)
- ✅ **v1.2 Demo Ready** -- Phases 7-9 (shipped 2026-03-29)
- ✅ **v2.0 RealDeal MVP** -- Phases 10-17 (shipped 2026-03-31)
- [ ] **v2.1 MVP Completion** -- Phases 18-21 (in progress)

## Phases

<details>
<summary>v1.0 RealDeal MVP (4 phases, 14 plans) -- SHIPPED 2026-03-23</summary>

- [x] Phase 1: Contact Profiles (3/3 plans) -- completed 2026-03-23
- [x] Phase 2: Visual Redesign (2/2 plans) -- completed 2026-03-23
- [x] Phase 02.1: Design Implementation (7/7 plans) -- completed 2026-03-23
- [x] Phase 3: Close-Out (2/2 plans) -- completed 2026-03-23

See: `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

<details>
<summary>v1.1 Polish & Features (3 phases, 5 plans) -- SHIPPED 2026-03-25</summary>

- [x] Phase 4: Search + Birthdays (2/2 plans) -- completed 2026-03-24
- [x] Phase 5: Wrapped (1/1 plan) -- completed 2026-03-24
- [x] Phase 6: Campaigns (2/2 plans) -- completed 2026-03-25

See: `.planning/milestones/v1.1-ROADMAP.md` for full details.

</details>

<details>
<summary>v1.2 Demo Ready (3 phases, 6 plans) -- SHIPPED 2026-03-29</summary>

- [x] Phase 7: Data & Schema (3/3 plans) -- completed 2026-03-26
- [x] Phase 8: UI Enrichment (2/2 plans) -- completed 2026-03-26
- [x] Phase 9: Add Contact (1/1 plan) -- completed 2026-03-26

See: `.planning/milestones/v1.2-ROADMAP.md` for full details.

</details>

<details>
<summary>v2.0 RealDeal MVP (8 phases, 23 plans) -- SHIPPED 2026-03-31</summary>

- [x] Phase 10: Data Architecture Rebuild (2/2 plans) -- completed 2026-03-29
- [x] Phase 11: Relationship Records (3/3 plans) -- completed 2026-03-29
- [x] Phase 12: Pods Overhaul + Categorization (4/4 plans) -- completed 2026-03-29
- [x] Phase 13: Timeline + Records List (3/3 plans) -- completed 2026-03-30
- [x] Phase 14: Pipelines (3/3 plans) -- completed 2026-03-30
- [x] Phase 15: Projects + Navigation (3/3 plans) -- completed 2026-03-30
- [x] Phase 16: Dashboard + Nurturing Hub (3/3 plans) -- completed 2026-03-30
- [x] Phase 17: Polish + Operations (2/2 plans) -- completed 2026-03-31

See: `.planning/milestones/v2.0-ROADMAP.md` for full details.

</details>

### v2.1 MVP Completion (In Progress)

**Milestone Goal:** Close the remaining MVP gaps -- reporting, share links, enrichment, follow-up flow, and authentication.

- [x] **Phase 18: Authentication** - Supabase auth wiring, login/signup routing, session persistence (completed 2026-03-31)
- [x] **Phase 19: Enrichment + Follow-ups** - Web enrichment with opt-in and timeline logging, follow-up creation flow from nurturing hub (completed 2026-04-02)
- [x] **Phase 20: Reporting** - Pod distribution, pipeline velocity, engagement reports with CSV export and saved configurations (completed 2026-04-06)
- [x] **Phase 21: Sharing** - Read-only share links for curated lists with revocation (completed 2026-04-02)

## Phase Details

### Phase 18: Authentication
**Goal**: Users must authenticate before accessing the app
**Depends on**: Nothing (gates share links and all protected routes)
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. User can sign up with email/password and log in via Google or Apple
  2. Unauthenticated visitors see only a login page -- no app content leaks
  3. User can close browser, reopen, and remain logged in without re-authenticating
**Plans**: 1 plan

Plans:
- [x] 18-01-PLAN.md -- Auth context, route guard, splash screen, login shell, route wiring

### Phase 19: Enrichment + Follow-ups
**Goal**: Contacts get richer automatically and follow-ups drive action from the nurturing hub
**Depends on**: Phase 18
**Requirements**: ENR-01, ENR-02, ENR-03, ENR-04, FLW-01, FLW-02, FLW-03, FLW-04
**Success Criteria** (what must be TRUE):
  1. User can trigger enrichment on a contact and see company/LinkedIn/role auto-filled with an "enriched" badge
  2. Enrichment only runs on contacts/pods where opt-in is enabled -- others are untouched
  3. Every enrichment change appears in the contact's timeline with before/after values
  4. User can set a follow-up date and next action on any record, and it surfaces on the dashboard when due
  5. Completing a follow-up from the nurturing hub logs it to the timeline and clears the signal
**Plans**: 3 plans

Plans:
- [x] 19-01-PLAN.md -- Follow-up CRUD: editable pinned bar in ContactDetail, inline creation from NurturingRow
- [x] 19-02-PLAN.md -- Follow-up dashboard surfacing: overdue in NeedsAttention, ComingUp, NurturingHub
- [x] 19-03-PLAN.md -- Enrichment engine: edge function stub, client module, Enrich button with field indicators

### Phase 20: Reporting
**Goal**: Users can pull reports on their relationship network health and activity
**Depends on**: Phase 18
**Requirements**: RPT-01, RPT-02, RPT-03, RPT-04, RPT-05
**Success Criteria** (what must be TRUE):
  1. User can view a pod distribution report showing contacts per pod and health breakdown
  2. User can view pipeline velocity showing stage progression and time-in-stage
  3. User can view engagement activity over time broken down by interaction type
  4. User can export any report view as a CSV file
  5. User can save a report configuration and reload it later from a favorites list
**Plans**: 1 plan

Plans:
- [x] 20-01: Reporting data layer, ReportsPage UI (3 pre-built reports), CSV export, saved configs, route + sidebar nav

### Phase 21: Sharing
**Goal**: Users can share curated relationship lists with external collaborators via read-only links
**Depends on**: Phase 18
**Requirements**: SHR-01, SHR-02, SHR-03
**Success Criteria** (what must be TRUE):
  1. User can generate a public share link for any filtered list of contacts
  2. Share link recipients see contact names, roles, companies, and pod membership -- no private fields exposed
  3. User can revoke a share link and it immediately stops working
**Plans**: 2 plans

Plans:
- [x] 21-01-PLAN.md -- Schema migration, data layer, public share page, route wiring
- [x] 21-02-PLAN.md -- Share creation popover on PodDetailPage, active links list, revocation

### Phase 22: Airtable to Supabase data migration
**Goal**: Replace Airtable as the data layer with Supabase PostgreSQL -- design schema, migrate data, swap client-side data layer
**Depends on**: Phase 18
**Requirements**: MIGR-01, MIGR-02, MIGR-03, MIGR-04, MIGR-05, MIGR-06
**Success Criteria** (what must be TRUE):
  1. All tables, enums, and RLS policies exist in Supabase
  2. All Airtable data is migrated with correct FK relationships
  3. The app reads/writes from Supabase instead of Airtable with no consumer component changes
  4. `pnpm build` passes with zero TypeScript errors
**Plans**: 3 plans

Plans:
- [x] 22-01-PLAN.md -- Schema DDL spec for Lovable + type generation checkpoint
- [x] 22-02-PLAN.md -- Migration script (Airtable -> Supabase) + validation
- [x] 22-03-PLAN.md -- supabase-data.ts implementation + barrel re-export swap

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
| 10. Data Architecture Rebuild | v2.0 | 2/2 | Complete | 2026-03-29 |
| 11. Relationship Records | v2.0 | 3/3 | Complete | 2026-03-29 |
| 12. Pods Overhaul + Categorization | v2.0 | 4/4 | Complete | 2026-03-29 |
| 13. Timeline + Records List | v2.0 | 3/3 | Complete | 2026-03-30 |
| 14. Pipelines | v2.0 | 3/3 | Complete | 2026-03-30 |
| 15. Projects + Navigation | v2.0 | 3/3 | Complete | 2026-03-30 |
| 16. Dashboard + Nurturing Hub | v2.0 | 3/3 | Complete | 2026-03-30 |
| 17. Polish + Operations | v2.0 | 2/2 | Complete | 2026-03-31 |
| 18. Authentication | v2.1 | 1/1 | Complete   | 2026-03-31 |
| 19. Enrichment + Follow-ups | v2.1 | 3/3 | Complete    | 2026-04-02 |
| 20. Reporting | v2.1 | 1/1 | Complete | 2026-04-06 |
| 21. Sharing | v2.1 | 2/2 | Complete   | 2026-04-02 |
| 22. Airtable to Supabase | - | 3/3 | Complete    | 2026-04-03 |

### Phase 23: Dashboard widget settings and reordering

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 22
**Plans:** 3/3 plans complete

Plans:
- [ ] TBD (run /gsd:plan-phase 23 to break down)

### Phase 24: Orb Map Experience Overhaul

**Goal:** Transform the orb map from a static pod picker into a full network exploration tool with in-canvas navigation, visual health indicators, map-native interactions, and animated state transitions.
**Requirements**: MAP-01 through MAP-09 (navigation depth, edges, contact presence, health glanceability, hub interactivity, search/filter, state transitions, map interactions, mobile)
**Depends on:** None (standalone UX overhaul)
**Plans:** 3/3 plans complete

Plans:
- [x] 24-01-PLAN.md -- Health-encoded edges, hub stats display, pod hover tooltips
- [x] 24-02-PLAN.md -- Two-level drill-down navigation with animated transitions and breadcrumb toolbar
- [x] 24-03-PLAN.md -- Cmd+K search highlight bridge + full experience verification

### Phase 25: Sidebar Navigation

**Goal:** Replace the floating bottom pill navigator with a collapsible left sidebar on desktop. Map becomes the default route.
**Requirements**: NAV-SIDEBAR
**Depends on:** None (standalone UX overhaul)
**Plans:** 1/1 plans complete

Plans:
- [x] 25-01-PLAN.md -- Sidebar component, AppShell layout update, route swap (/ = OrbMap, /pulse = Dashboard)
