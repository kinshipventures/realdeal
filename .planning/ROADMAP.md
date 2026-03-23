# Roadmap: Kinship Brain

## Overview

2 weeks remaining on a 6-week engagement. Core app is built and working. This roadmap covers three remaining deliverables: enriched contact profiles, a polished UI for demo readiness, and a handoff doc so Briell can operate independently. Data imports (LP, Talent, etc.) are handled ad-hoc by Claude Code — not a formal phase.

## Phases

- [x] **Phase 1: Contact Profiles** - Enriched profile fields (birthday, milestones, interests, context) + per-contact equity score display + import dedup logic (completed 2026-03-23)
- [x] **Phase 2: Visual Redesign** - Design tokens + Trolley CRM-aligned UI polish, demo-ready dashboard (completed 2026-03-23)
- [ ] **Phase 3: Close-Out** - HANDOFF.md so Briell can operate the app after engagement ends

## Phase Details

### Phase 1: Contact Profiles
**Goal**: Opening a contact shows enriched context — milestones, interests, relationship history, birthday countdown, and their equity score. Import script has dedup logic for clean data.
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, PROF-01, PROF-02, PROF-03, PROF-04, PROF-05
**Success Criteria** (what must be TRUE):
  1. Import script checks name + email before creating — no duplicates on re-import
  2. Contact profile shows birthday field; if birthday is within 30 days, a countdown is visible
  3. Contact profile has editable milestones, interests, and relationship context fields that save to Airtable
  4. Per-contact equity score (0-100) and score breakdown (by interaction type) are visible on the profile
  5. New Airtable fields follow Briell's naming conventions and are visible/editable in Airtable directly
**Plans:** 3/3 plans complete
Plans:
- [x] 01-01-PLAN.md — Data layer + personal section (birthday, milestones, interests, relationship context)
- [x] 01-02-PLAN.md — Import script dedup (name + email dual-index)
- [x] 01-03-PLAN.md — Equity score breakdown + segmented ring on profile

### Phase 2: Visual Redesign
**Goal**: The app looks polished enough to demo to Gwyneth — design aligned to Trolley CRM PDF direction
**Depends on**: Phase 1 (profiles exist to polish)
**Requirements**: VIS-01, VIS-02, VIS-03
**Success Criteria** (what must be TRUE):
  1. CSS custom properties define all colors, typography, spacing, and glass orb constants — no inline magic values
  2. A bounded list of 3-5 specific deltas from the Trolley CRM PDF are implemented on Dashboard and key surfaces
  3. Moj can open the dashboard and confidently show it to Gwyneth without hesitation
  4. Orb map visual refresh — richer colors, bolder pod orbs
**Plans:** 2/2 plans complete
Plans:
- [x] 02-01-PLAN.md — Design tokens (CSS custom properties) + solid orb system replacing glass orbs
- [x] 02-02-PLAN.md — Dashboard green header band, nav redesign, contact panels, design system docs

### Phase 3: Close-Out
**Goal**: Briell can operate the app independently after Gabe's engagement ends March 31
**Depends on**: Phase 2
**Requirements**: CLOSE-01
**Success Criteria** (what must be TRUE):
  1. HANDOFF.md exists and covers: how to use the app, how to run the import script, Airtable field conventions, common issues, escalation contact
  2. Briell can run an import script end-to-end without Gabe present
  3. Known issues and future roadmap items documented
**Plans**: TBD

## Progress

**Execution Order:** 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Contact Profiles | 3/3 | Complete   | 2026-03-23 |
| 2. Visual Redesign | 2/2 | Complete   | 2026-03-23 |
| 3. Close-Out | 0/TBD | Not started | - |
