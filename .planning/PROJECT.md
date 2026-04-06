# RealDeal

## What This Is

A relationship-first operating system for founders and operators. Not a CRM — a single, high-context source of truth for people and companies that replaces fragmented tools (CRMs, inboxes, memory, spreadsheets). The relationship record is the only core object. Pipelines, campaigns, follow-ups, and projects attach to relationships, never replace them. The system behaves like a trusted relationship manager, not a sales tool.

## Core Value

One place where every relationship lives with full context — so founders never lose track of who matters, what happened, or what's next.

## Current Milestone: v2.1 MVP Completion

**Goal:** Close the remaining gaps from the Kinship Brain MVP PDF -- reporting, share links, enrichment, follow-up flow, and authentication.

**Target features:**
- Reporting module (pod distribution, pipeline velocity, engagement, export, saved reports)
- Read-only share links for curated lists
- Web-sourced enrichment with timeline logging and per-contact/pod opt-in
- Dedicated follow-up creation flow from nurturing hub
- User authentication (via Lovable/Supabase)

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
- ✓ Dummy data import (25 contacts, 45 interactions across 6 pods with full field data) — v1.2
- ✓ Expanded contact schema (LinkedIn, City, Country, Gender, Intel/Notes, Fund Tags, Follow-Up, Contact Frequency, etc.) — v1.2
- ✓ Recent Activity dashboard feed — v1.2
- ✓ Enhanced Upcoming section (birthdays + follow-ups merged) — v1.2
- ✓ Per-contact frequency in overdue queue and equity scoring — v1.2
- ✓ Enriched ContactDetail with organized sections (Contact Info, Relationship, Fund Tags, Follow-Up) — v1.2
- ✓ Interaction timeline with source labels and summaries — v1.2
- ✓ Add Contact modal with structured form and brain dump path — v1.2
- ✓ Relationship record as only core object (person + company types) — Phase 11
- ✓ Custom fields system (per record type, per pod, required/optional) — Phase 11
- ✓ Cross-module navigation (zero context loss) — Phase 11

### Active (V1 — must ship)

- ✓ Pipelines — Kanban boards with custom stages, opportunity cards referencing relationships — Phase 14
- ✓ Projects — initiative containers with attached contacts/opportunities/notes — Phase 15
- ✓ Dashboard widget architecture — modular operating dashboard with presets, per-widget toggles, settings panel — Phase 16
- ✓ Nurturing Hub — dedicated maintenance surface at /pulse/nurturing with health signals across records/pipelines — Phase 16
- ✓ Web enrichment with opt-in, per-field indicators, suggested-update UI, timeline logging — Phase 19
- ✓ Follow-up CRUD from ContactDetail + NurturingHub, dashboard surfacing in widgets — Phase 19
- [x] Reporting — pod distribution, pipeline velocity, engagement activity, CSV export, saved reports — Phase 20
- [x] Sharing + Exports — read-only share links for curated lists — Phase 21
- [x] Remove sub-pod cap (verified: no cap exists in code -- categories render without limit)
- [ ] Multiple emails per contact + basic merge support

### Deferred to V2 (per MVP PDF scope boundary)

- Copilot AI — read-only synthesis layer (V2, additive and safe)
- Gmail Chrome extension (full) — V2 Optional Extension
- Granular permissions — pod/project/pipeline/record-level (V2)
- Full Projects — dashboards, milestones, linked pods + analytics (V2)
- Advanced Reporting — custom builder, scheduled exports, dedupe + cleanup (V2)
- Social graph visualization (V2)
- Workspace architecture — team/personal workspaces (V2, but don't block)
- Auto-categorization (V2)

### Deferred (blocked on external access)

- LP investor list imported (blocked on data from Moj/Briell)
- Talent list imported (blocked on data from stakeholder)
- Gmail integration (blocked on OAuth credentials from Moj)
- iMessage integration (blocked on Mac Mini + Apple ID setup)
- Calendar sync (blocked on Gmail OAuth)

### Out of Scope

- Telegram AI assistant ("Toast") — separate project, already running
- ClickUp deal pipeline — stays in ClickUp
- Gwyneth/Goop workspace — deferred, Microsoft ecosystem
- WhatsApp/calendar/push notifications — future
- Mobile app — works in mobile browser, not optimized
- Real authentication — acceptable risk, private URL
- API proxy server — Airtable token in browser is accepted risk
- External enrichment APIs — anti-feature per Moj
- Voice-to-text context capture — ideal but not required for MVP
- Intake queue + auto-ingest — not required for MVP per PDF

## Context

Shipped v1.0–v1.2 prototype (Feb 17 – Mar 27). Rebuilding as the real product based on RealDeal MVP spec. Phases 10-13 complete — data architecture, relationship records, pods overhaul, timeline + records list all shipped.

**Prototype shipped (v1.0–v1.2):** Dashboard, orb map, contact CRUD, equity scoring, campaigns, search, CSV import, demo mode. ~9,500 LOC.

**v2.0 rebuild:** Phases 10-16 established the relationship-first foundation + pipelines + projects + dashboard/nurturing. Phase 19 shipped enrichment + follow-ups. Phases 20-21 build the remaining V1 modules: reporting and sharing.

**Stack:** React 19, TypeScript, Tailwind v4, @xyflow/react v12, Vite, Airtable REST API + MCP. No backend server. Gmail Chrome extension (new for v2.0).

**Stakeholders:** Moj (CEO, product owner), Briell (ops, Airtable admin)

**Source of truth:** docs/RealDeal — MVP.pdf (Mar 28) — updated product outline, MVP development checklist, and V1 vs V2 scope boundary. This supersedes the Initial Outline (Lovable) PDF. The V1 vs V2 scope section is the definitive shipping boundary.

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
| Per-contact Contact Frequency | Overrides pod-level cadence for individual contacts | ✓ Good (more granular relationship management) |
| Modal state in Dashboard | AddContactModal managed by Dashboard, not App, due to React Router Outlet pattern | ✓ Good (avoids routing complexity) |

**Milestones shipped:** v1.0 (MVP), v1.1 (Polish & Features), v1.2 (Demo Ready)
**Active milestone:** v2.0 (RealDeal MVP — 10 phases, 39 requirements, 7/10 phases complete)

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
*Last updated: 2026-03-31 — Phase 17 (Polish + Operations) complete, all v2.0 phases done. Milestone ready for completion.*
