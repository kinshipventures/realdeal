# Retrospective

## Milestone: v1.0 — Kinship Brain MVP

**Shipped:** 2026-03-23
**Phases:** 4 | **Plans:** 14 | **Tasks:** 23
**Timeline:** 4 days (2026-03-20 → 2026-03-23)
**Commits:** 67 | **LOC:** 5,925

### What Was Built

- Enriched contact profiles with birthday countdown, milestones, interests, relationship context, and segmented equity ring
- Import dedup logic (name + email, case-insensitive)
- Full visual redesign: Fraunces font, design token system, two-tone gradient orbs with glow halos, orbital fly-in animation
- Green header band dashboard with equity ring, pod health cards, sparklines, skeleton loading
- Dark mode (prefers-color-scheme with adaptive CSS tokens)
- Responsive layout (mobile tab bar, full-screen contact panel)
- Empty states across all zero-data surfaces
- Browser-based CSV import at /import (drag-and-drop, dedup, pod selection, progress, inline results)
- 312-line HANDOFF.md for operational independence

### What Worked

- Parallel subagent execution for independent plans — both Phase 3 plans ran simultaneously
- Wave-based execution kept dependency ordering clean
- Design token system made dark mode fix systematic (8 CSS vars, 13 component files)
- Existing DESIGN.md gave executors clear constraints — less ambiguity, faster plans

### What Was Inefficient

- Phase 01 verification flagged pre-existing TS errors as a gap — they weren't introduced by Phase 01 and were fixed organically in Phase 02.1
- ImportPanel was generated with wrong CSS token names (--text-primary vs --color-text-primary) — caught during integration check, not during execution
- Phase 02 VERIFICATION had "human_needed" status that was never formally resolved — visual confirmation happened implicitly through daily use

### Patterns Established

- Adaptive CSS tokens (--divider, --edge, --tint, etc.) for light/dark mode
- PANEL constant for glass panel styling across Dashboard components
- POD_SHIFT_COLORS map for consistent two-tone orb gradients
- Module-level caches with exported invalidation functions (contactsCache pattern)

### Key Lessons

- New files from subagents may use slightly different token names than the existing codebase — integration checker catches these, so always run it
- Dark mode is a cross-cutting concern — retrofitting it across 13 files is more work than getting the tokens right from day one
- Data import requirements (DATA-02/03/04) shouldn't be assigned to engineering phases when they're blocked on stakeholder data — they're operational tasks

---

## Milestone: v1.1 — Polish & Features

**Shipped:** 2026-03-25
**Phases:** 3 | **Plans:** 5 | **Tasks:** 10
**Timeline:** 2 days (2026-03-24 → 2026-03-25)

### What Was Built

- Global Cmd+K command palette for instant contact search
- Birthday reminders — "Coming Up" dashboard section with 14-day window
- Wrapped insight card — weekly stats as cycling gradient card
- Campaign tracking — create, track progress, manage per-contact status

### What Worked

- Small, focused phases (1-2 plans each) shipped fast
- Each feature was self-contained — no cross-phase dependencies within the milestone

### What Was Inefficient

- v1.1 MILESTONES.md entry has orphan "One-liner:" lines — summary extraction didn't clean up null entries

### Patterns Established

- Stale-while-revalidate cache pattern extended to campaigns
- Demo mode pattern: in-memory mutations of exported arrays, reset on refresh

### Key Lessons

- 2-plan phases are the sweet spot for velocity — enough scope to be meaningful, small enough to ship in one session

---

## Milestone: v1.2 — Demo Ready

**Shipped:** 2026-03-29
**Phases:** 3 | **Plans:** 6 | **Tasks:** 11
**Timeline:** 2 days (2026-03-26 → 2026-03-27)
**Files changed:** 27 | **Lines:** +3,645 / -199 | **LOC:** 9,481

### What Was Built

- 25 dummy contacts + 45 interactions imported into Airtable across 6 pods
- V1 expanded schema — 15 new Contact fields + 4 Interaction fields
- Recent Activity feed on dashboard
- Merged Upcoming section (birthdays + follow-ups in one list)
- Per-contact frequency in overdue queue and equity scoring
- Enriched ContactDetail with 4 organized sections and source-labeled timeline
- Add Contact modal with structured form and brain dump path

### What Worked

- Data-first approach (Phase 7 → schema, then Phase 8/9 → UI) — UI work had real data to validate against immediately
- Phase 7 split into 3 granular plans (schema, import, types) kept each plan focused
- Per-contact Contact Frequency design decision was clean — overrides pod cadence when set, falls back to pod cadence otherwise

### What Was Inefficient

- Phase 7 plan 1 (schema expansion in Airtable) generated a summary-extract null for one_liner — the plan was operational (Airtable field creation) rather than code, so summary format didn't fit perfectly
- UAT only ran for Phase 8, not Phase 9 — Add Contact shipped without formal verification

### Patterns Established

- `| null` pattern for optional Contact fields in TypeScript types
- Modal state management at Dashboard level (not App) for route-parallel UI
- Defensive multipleSelects mapping for Airtable API responses

### Key Lessons

- Operational tasks (Airtable field creation, data import scripts) fit awkwardly in the plan/summary framework designed for code changes — consider a lighter-weight format
- Brain dump path (free text → Unsorted pod) was a smart UX addition — low friction entry reduces the barrier to capturing contacts
- 3 phases per milestone with 1-3 plans each is the right cadence for this project

---

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 | v1.2 |
|--------|------|------|------|
| Phases | 4 | 3 | 3 |
| Plans | 14 | 5 | 6 |
| Tasks | 23 | 10 | 11 |
| Days | 4 | 2 | 2 |
| Commits | 67 | 46 | ~30 |
| LOC | 5,925 | 7,731 | 9,481 |
| Req satisfied | 10/13 | 4/4 | 13/13 |
| Verification pass rate | 4/4 phases | 3/3 phases | 2/3 phases |
