# Roadmap: Kinship Brain

## Milestones

- ✅ **v1.0 Kinship Brain MVP** — Phases 1-3 + 02.1 (shipped 2026-03-23)
- 🚧 **v1.1 Polish & Features** — Phases 4-6 (in progress)

## Phases

<details>
<summary>✅ v1.0 Kinship Brain MVP (4 phases, 14 plans) — SHIPPED 2026-03-23</summary>

- [x] Phase 1: Contact Profiles (3/3 plans) — completed 2026-03-23
- [x] Phase 2: Visual Redesign (2/2 plans) — completed 2026-03-23
- [x] Phase 02.1: Design Implementation (7/7 plans) — completed 2026-03-23
- [x] Phase 3: Close-Out (2/2 plans) — completed 2026-03-23

See: `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

---

### 🚧 v1.1 Polish & Features (In Progress)

**Milestone Goal:** Ship the features Moj was most excited about — search, Wrapped slides, birthday reminders, and campaign tracking — without requiring external access.

- [x] **Phase 4: Search + Birthdays** - Global contact search and dashboard birthday reminders (completed 2026-03-24)
- [ ] **Phase 5: Wrapped** - Monthly celebration view with stats and full-bleed gradient slides
- [ ] **Phase 6: Campaigns** - Lightweight pipeline tracking for investments, events, and SPVs

## Phase Details

### Phase 4: Search + Birthdays
**Goal**: Moj can find any contact instantly and never miss a birthday
**Depends on**: Phase 3 (v1.0 shipped)
**Requirements**: SRCH-01, SRCH-02, BDAY-01, BDAY-02
**Success Criteria** (what must be TRUE):
  1. User can type a name in a global search input accessible from any view and see matching contacts
  2. Search results show contact name, pod, and last contacted date — clicking opens the contact profile
  3. Dashboard shows a dedicated birthday section with contacts whose birthdays fall in the next 14 days
  4. Birthday row shows contact name, exact date, days until, and pod — clicking opens the profile
**Plans:** 2/2 plans complete
Plans:
- [x] 04-01-PLAN.md — Command palette search (SearchPalette + nav integration)
- [x] 04-02-PLAN.md — Dashboard birthday section (Coming Up)

### Phase 5: Wrapped
**Goal**: Moj sees a rotating insight card on the dashboard celebrating her weekly relationship activity
**Depends on**: Phase 4
**Requirements**: WRAP-01, WRAP-02
**Success Criteria** (what must be TRUE):
  1. A Wrapped view exists showing key monthly stats: contacts reached, intros made, top pods
  2. Stats are presented as full-bleed gradient slides in the Spotify Wrapped visual style
  3. Slides use Fraunces display type and pod-colored gradients consistent with the design system
**Plans:** 1 plan
Plans:
- [x] 05-01-PLAN.md — WrappedCard component + Dashboard integration (insight card with 3 rotating stats)

### Phase 6: Campaigns
**Goal**: Moj can track a lightweight outreach pipeline without leaving the app
**Depends on**: Phase 5
**Requirements**: CAMP-01, CAMP-02, CAMP-03
**Success Criteria** (what must be TRUE):
  1. User can create a campaign with a name, type, and target contacts — stored in Airtable
  2. Dashboard shows all active campaigns with a contacted/total progress indicator
  3. Campaign detail view lists every target contact with their individual reach-out status
**Plans:** 2 plans
Plans:
- [ ] 06-01-PLAN.md — Campaign types, Airtable data layer, and dashboard campaigns section
- [ ] 06-02-PLAN.md — Campaign detail panel, creation form, and contact integration

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Contact Profiles | v1.0 | 3/3 | Complete | 2026-03-23 |
| 2. Visual Redesign | v1.0 | 2/2 | Complete | 2026-03-23 |
| 02.1. Design Implementation | v1.0 | 7/7 | Complete | 2026-03-23 |
| 3. Close-Out | v1.0 | 2/2 | Complete | 2026-03-23 |
| 4. Search + Birthdays | v1.1 | 2/2 | Complete   | 2026-03-24 |
| 5. Wrapped | v1.1 | 0/1 | Planned | - |
| 6. Campaigns | v1.1 | 0/2 | Planned | - |
