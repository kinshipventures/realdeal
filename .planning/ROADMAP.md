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

- [ ] **Phase 18: Authentication** - Supabase auth wiring, login/signup routing, session persistence
- [ ] **Phase 19: Enrichment + Follow-ups** - Web enrichment with opt-in and timeline logging, follow-up creation flow from nurturing hub
- [ ] **Phase 20: Reporting** - Pod distribution, pipeline velocity, engagement reports with CSV export and saved configurations
- [ ] **Phase 21: Sharing** - Read-only share links for curated lists with revocation

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
- [ ] 18-01-PLAN.md -- Auth context, route guard, splash screen, login shell, route wiring

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
**Plans**: TBD

Plans:
- [ ] 19-01: TBD
- [ ] 19-02: TBD

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
**Plans**: TBD

Plans:
- [ ] 20-01: TBD
- [ ] 20-02: TBD

### Phase 21: Sharing
**Goal**: Users can share curated relationship lists with external collaborators via read-only links
**Depends on**: Phase 18
**Requirements**: SHR-01, SHR-02, SHR-03
**Success Criteria** (what must be TRUE):
  1. User can generate a public share link for any filtered list of contacts
  2. Share link recipients see contact names, roles, companies, and pod membership -- no private fields exposed
  3. User can revoke a share link and it immediately stops working
**Plans**: TBD

Plans:
- [ ] 21-01: TBD

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
| 18. Authentication | v2.1 | 0/1 | Planning | - |
| 19. Enrichment + Follow-ups | v2.1 | 0/? | Not started | - |
| 20. Reporting | v2.1 | 0/? | Not started | - |
| 21. Sharing | v2.1 | 0/? | Not started | - |
