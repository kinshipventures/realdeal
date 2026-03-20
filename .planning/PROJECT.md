# Kinship Brain

## What This Is

A relationship intelligence app for Moj Mahdara (CEO, Kinship Ventures) and her team. Visual pod-based network explorer with social equity scoring — an Oura ring for relationships. Not a CRM. The app helps Moj invest in her relationships by surfacing who needs attention, tracking interaction health, and making consistent micro-habits of care effortless.

## Core Value

Moj opens the app daily and it changes how she manages her relationships — giving more than taking, building social equity, preventing relationship debt.

## Requirements

### Validated

- ✓ Orb map with pod → category → contact navigation — existing
- ✓ Inline category creation (+ orb in circle) — existing
- ✓ Contact CRUD with auto-save, search, click-to-edit — existing
- ✓ Interaction timeline with type-based logging (call, email, text, meeting, intro, note) — existing
- ✓ Social equity scoring (weighted by type, cadence-aware, 0-100 normalized) — existing
- ✓ Dashboard with equity ring, pod health cards, Today's Focus, dormant cleanup — existing
- ✓ Floating pill navigation (Pulse / Map) — existing
- ✓ React Flow viewport persistence across tab switches — existing
- ✓ Per-pod cadence configuration (weekly/biweekly/monthly/quarterly) — existing
- ✓ 14-day grace period for new contacts — existing
- ✓ Dormant contact cleanup with keep/reach out/remove actions — existing
- ✓ Service Providers list imported — existing

### Active

**Priority 1 — Data (week 4-5):**
- [ ] Import pipeline handles any CSV Briell preps (LP, Talent, and future lists)
- [ ] All key lists imported and clean in Airtable

**Priority 2 — Visual (week 5-6):**
- [ ] App visuals aligned with Trolley CRM PDF design direction
- [ ] Dashboard looks polished enough to show Gwyneth

**Priority 3 — Contact Profiles (week 5-6):**
- [ ] Enriched contact profiles (milestones, interests, relationship context, birthday)
- [ ] Per-contact equity score visible on profile with breakdown

**Priority 4 — Integration Readiness (when access granted):**
- [ ] Gmail integration — email context in contact timelines (blocked on credentials)
- [ ] Toast ↔ App bidirectional data flow (bot already live, needs Airtable bridge)

### Out of Scope

- Telegram AI assistant ("Toast" / "Moj's Brain") — separate project, already built and running
- Lovable case study build — Gabby's project, separate repo
- Gwyneth / Goop workspace — deferred, Microsoft ecosystem, organizational-level scope
- ClickUp deal pipeline — stays in ClickUp, not migrating
- WhatsApp integration — future
- Campaign management / mass outreach — future
- Mobile app — future, desktop-first for now
- Push notifications — future
- Real authentication — acceptable risk for now, private URL
- API proxy server — Airtable token exposed in browser is accepted risk
- Calendar sync — future (when Gmail access is resolved)
- AI auto-categorization of new contacts — future
- Bumble-style swipe for contact triage — aspirational

## Context

- **Engagement:** 6-week consulting scope, 15hrs/week, started Feb 17 2026. Currently week 4.
- **Stakeholders:** Moj (CEO, product owner), Briell (ops, data entry, Airtable admin), Gwyneth (Goop, deferred), Gabby (design/case study)
- **Data flow:** Briell preps CSVs → Gabe runs import script → data lands in Airtable → app visualizes it
- **Toast bot:** OpenClaw gateway on Mac Mini, Telegram interface, already live but not adopted by Moj yet. Eventually reads/writes to same Airtable base.
- **Trolley CRM PDF:** Design reference in repo root (`2026 Trolley CRM.pdf`). Visual north star per Moj.
- **Full transcript context:** 8 Granola meeting transcripts synthesized in `docs/context-map.md`
- **Working style:** Moj wants pre-aligned recommendations, not live problem-solving. Iteration over perfection.

## Constraints

- **Timeline**: 2 weeks remaining (ends ~Mar 31). Data imports + visual polish are the deliverables.
- **Access**: Gmail integration blocked on Moj providing credentials. Build-ready on our end.
- **Backend**: No server — Airtable REST from browser. All computation client-side.
- **Auth**: None. Security through URL obscurity. Acceptable for now.
- **Imports**: Script-based (pnpm seed:csv). Gabe runs it, Briell preps data.
- **Team**: Briell uses same app, same view as Moj. No role differentiation needed yet.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Airtable over Supabase | Briell manages data directly, team access, flexibility | ✓ Good |
| Claude Code over Lovable | Complex integrations needed, Lovable too limited | ✓ Good |
| Pod terminology (UI) / List (Airtable) | Human language in UI, no Airtable migration needed | ✓ Good |
| Weighted equity scoring | Intros > Meetings > Calls > Texts. Matches Moj's philosophy | — Pending (needs Moj feedback on weights) |
| No auth for now | Private URL, small team, acceptable risk | — Pending |
| Trolley CRM PDF as visual guide | Moj approved this design direction explicitly | — Pending (not yet implemented) |
| Toast stays separate project | Different repo, different interface, converge later via Airtable | ✓ Good |
| Script-based imports | Briell preps CSVs, Gabe runs import. Good enough for 6-week scope. | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-20 after initialization*
