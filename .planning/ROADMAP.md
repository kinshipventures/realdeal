# Roadmap: Kinship Brain

## Milestones

- ✅ **v1.0 Kinship Brain MVP** — Phases 1-3 + 02.1 (shipped 2026-03-23)
- ✅ **v1.1 Polish & Features** — Phases 4-6 (shipped 2026-03-25)
- 🔄 **v1.2 Demo Ready** — Phases 7-9 (in progress)

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

### v1.2 Demo Ready

- [ ] **Phase 7: Data & Schema** - Import dummy data, expand Airtable schema with new fields
- [ ] **Phase 8: UI Enrichment** - Recent Activity, Enhanced Upcoming, enriched contact card, per-contact frequency
- [ ] **Phase 9: Add Contact** - Structured entry form and brain dump path

## Phase Details

### Phase 7: Data & Schema
**Goal**: Airtable contains realistic demo data and the full V1 contact schema
**Depends on**: Nothing (data foundation)
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. Dashboard shows 25 real-looking contacts distributed across 6 pods (LPs, Maps, Maps Lite, Talent, Service Providers, Unsorted)
  2. Each contact has an interaction history — pod health cards reflect actual equity scores based on 45 logged interactions
  3. Contact detail panel displays new fields: LinkedIn, City, Country, Global Region, Gender, Introduced By, Intel/Notes, Relationship Owner, Contact Frequency, Next Follow-Up Date, Next Action, KV Fund Investor, SPV Investor, Needs Review
**Plans**: TBD

### Phase 8: UI Enrichment
**Goal**: Dashboard and contact card surface richer relationship signals using the expanded schema
**Depends on**: Phase 7
**Requirements**: DASH-01, DASH-02, DASH-03, CARD-01, CARD-02, CARD-03, CARD-04, CARD-05
**Success Criteria** (what must be TRUE):
  1. Dashboard shows a Recent Activity section listing the 5 most recent interactions across all contacts with type icon, contact name, date, and summary
  2. Upcoming section combines birthdays (30-day window) and this-week follow-ups in one sorted list — no separate sections
  3. Who Needs Attention reflects per-contact Contact Frequency (not just pod cadence) — a weekly contact overdue by 3 days surfaces before a monthly contact overdue by 10 days
  4. Contact detail shows all new fields in organized sections: Contact Info, Relationship, Activity Timeline, Fund Tags (conditional), Next Follow-Up pinned at bottom
**Plans**: TBD

### Phase 9: Add Contact
**Goal**: Moj or Briell can add a new contact without leaving the app
**Depends on**: Phase 7
**Requirements**: ADD-01, ADD-02
**Success Criteria** (what must be TRUE):
  1. Structured form accepts First Name, Last Name, Email, Pod (required) plus optional fields — submits and contact appears in the correct pod immediately
  2. Brain dump path accepts a block of free text and creates a contact in the Unsorted pod with Needs Review flagged — no required fields to fill in
**Plans**: TBD

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
| 7. Data & Schema | v1.2 | 0/? | Not started | - |
| 8. UI Enrichment | v1.2 | 0/? | Not started | - |
| 9. Add Contact | v1.2 | 0/? | Not started | - |
