# Kinship Brain

## What This Is

A relationship intelligence app for Moj Mahdara (CEO, Kinship Ventures) and her team. Visual pod-based network explorer with social equity scoring, enriched contact profiles, and self-service CSV import. Not a CRM — an Oura ring for relationships that helps Moj invest in her network through consistent micro-habits of care.

## Core Value

Moj opens the app daily and it changes how she manages her relationships — giving more than taking, building social equity, preventing relationship debt.

## Requirements

### Validated

- ✓ Orb map with pod → category → contact navigation — v1.0
- ✓ Inline category creation (+ orb in circle) — v1.0
- ✓ Contact CRUD with auto-save, search, click-to-edit — v1.0
- ✓ Interaction timeline with type-based logging (call, email, text, meeting, intro, note) — v1.0
- ✓ Social equity scoring (weighted by type, cadence-aware, 0-100 normalized) — v1.0
- ✓ Dashboard with equity ring, pod health cards, Today's Focus, dormant cleanup — v1.0
- ✓ Floating pill navigation (Pulse / Map) + responsive mobile tab bar — v1.0
- ✓ React Flow viewport persistence across tab switches — v1.0
- ✓ Per-pod cadence configuration (weekly/biweekly/monthly/quarterly) — v1.0
- ✓ 14-day grace period for new contacts — v1.0
- ✓ Dormant contact cleanup with keep/reach out/remove actions — v1.0
- ✓ Service Providers list imported — v1.0
- ✓ Import dedup (name + email, case-insensitive) — v1.0
- ✓ Enriched contact profiles (birthday countdown, milestones, interests, relationship context) — v1.0
- ✓ Per-contact equity score with segmented ring breakdown — v1.0
- ✓ Trolley CRM-aligned visual design (green brand, Fraunces serif, solid orbs, dark mode) — v1.0
- ✓ Design token system via CSS custom properties — v1.0
- ✓ Browser-based CSV import UI at /import — v1.0
- ✓ HANDOFF.md operational documentation — v1.0
- ✓ Global contact search via Cmd+K command palette — v1.1
- ✓ Birthday reminders — "Coming Up" dashboard section with 14-day window — v1.1
- ✓ Wrapped insight card — weekly stats (people reached, top pod, most connected) as cycling gradient dashboard card — v1.1
- ✓ Campaign tracking — create, track progress, manage per-contact status with Airtable persistence — v1.1

### Active

(None — next milestone requirements TBD)

### Deferred (blocked on external access)

- [ ] LP investor list imported (blocked on data from Moj/Briell)
- [ ] Talent list imported (blocked on data from stakeholder)
- [ ] Gmail integration (blocked on OAuth credentials from Moj)
- [ ] iMessage integration (blocked on Mac Mini + Apple ID setup)
- [ ] Calendar sync (blocked on Gmail OAuth)

### Out of Scope

- Telegram AI assistant ("Toast") — separate project, already running
- ClickUp deal pipeline — stays in ClickUp
- Gwyneth/Goop workspace — deferred, Microsoft ecosystem
- WhatsApp/calendar/push notifications — future
- Mobile app — works in mobile browser, not optimized
- Real authentication — acceptable risk, private URL
- API proxy server — Airtable token in browser is accepted risk
- AI auto-categorization — future
- External enrichment APIs — anti-feature per Moj

## Context

Shipped v1.1 on 2026-03-25. 6-week engagement (Feb 17 – Mar 31), 15hrs/week.

**v1.0 (Mar 23):** Dashboard with equity scoring, visual orb map, enriched contact profiles, responsive layout, dark mode, CSV import UI, operational handoff. 5,925 LOC across 67 commits.

**v1.1 (Mar 25):** Global Cmd+K search, birthday reminders, Wrapped insight card, campaign management. 7,731 LOC across 46 commits (3 days).

**Stack:** React 19, TypeScript, Tailwind v4, @xyflow/react v12, Vite, Airtable REST API + MCP. No backend server.

**Stakeholders:** Moj (CEO, product owner), Briell (ops, Airtable admin), Gwyneth (deferred)

**After March 31:** No active dev planned. Briell operates independently using HANDOFF.md. CSV import UI replaces terminal scripts. Airtable MCP server connected for future AI-assisted data management.

## Constraints

- **Backend**: No server — Airtable REST from browser. All computation client-side.
- **Auth**: None. Security through URL obscurity.
- **Gmail**: Blocked on Moj providing OAuth credentials.
- **Team**: Same app, same view for all users. No role differentiation.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Airtable over Supabase | Briell manages data directly, team access, flexibility | ✓ Good |
| Claude Code over Lovable | Complex integrations needed, Lovable too limited | ✓ Good |
| Pod terminology (UI) / List (Airtable) | Human language in UI, no Airtable migration needed | ✓ Good |
| Weighted equity scoring | Intros > Meetings > Calls > Texts. Matches Moj's philosophy | ✓ Good (shipping as-is, weights adjustable in code) |
| No auth for now | Private URL, small team, acceptable risk | ✓ Good (documented in HANDOFF.md as known limitation) |
| Trolley CRM PDF as visual guide | Moj approved direction: green brand, editorial serif, solid orbs | ✓ Good (Fraunces + two-tone orbs + dark mode shipped) |
| Toast stays separate project | Different repo, different interface, converge later via Airtable | ✓ Good |
| Browser CSV import over script | Briell needs self-service after engagement ends | ✓ Good (replaces pnpm seed:csv) |
| Dark mode via prefers-color-scheme | System-level only, no manual toggle. Minimal complexity. | ✓ Good (adaptive CSS tokens shipped) |
| Campaign junction table pattern | CampaignContacts Airtable table for many-to-many with per-contact status tracking | ✓ Good (enables status toggle without touching Contact records) |
| Airtable MCP server | Official Airtable MCP for direct AI-to-Airtable data management | ✓ Good (enables conversational data operations) |
| Demo mode for campaigns | In-memory mutations, no localStorage persistence — reset on refresh | ✓ Good (sufficient for demos, keeps demo mode simple) |

## Current Milestone: v1.2 Demo Ready

**Goal:** Import Briell's dummy data, expand schema to match V1 spec, enrich dashboard and contact cards, add contact creation form — everything needed for Moj to demo the app with realistic data.

**Target features:**
- Dummy data import (25 contacts, 45 interactions across 6 pods)
- Expanded contact schema (LinkedIn, Country, Gender, Intel/Notes, Fund Tags, Follow-Up fields)
- Recent Activity dashboard section
- Enhanced Upcoming section (birthdays + follow-ups combined)
- Enriched contact card with spec-aligned scrollable sections
- Add Contact form (structured entry + brain dump path)

**Milestones shipped:** v1.0 (MVP), v1.1 (Polish & Features)

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
*Last updated: 2026-03-26 after v1.2 milestone started*
