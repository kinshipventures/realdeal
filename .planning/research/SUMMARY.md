# Project Research Summary

**Project:** Kinship Brain
**Domain:** Relationship intelligence SPA — no-backend, Airtable data layer
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Summary

Kinship Brain is a single-user relationship intelligence app with a locked-in stack (React 19, Vite, Tailwind, React Flow, Airtable) and a fixed 2-week runway. The app's core mechanics — orb map, equity scoring, dashboard, interaction timeline — are already built and working. What remains is a bounded scope: flexible CSV import, enriched contact profiles, and a visual polish pass aligned to the Trolley CRM PDF. These are independent workstreams and can be sequenced without blocking each other.

The recommended approach is strict sequencing by dependency. Design tokens go first because the visual redesign touches everything. CSV import goes next because Briell is waiting on it and it unblocks data quality for the demo. Contact profile enrichment requires Airtable schema additions before any UI work. Gmail integration is explicitly deferred — it needs a backend (Vercel serverless function) and is blocked on Moj providing credentials anyway. Any attempt to shortcut Gmail into a browser-only flow will fail at the OAuth layer.

The critical risk is scope creep on the visual redesign. "Align to Trolley CRM" is open-ended and can consume the full runway if not bounded to 3-5 specific deltas from the PDF. Data cleanliness and import reliability matter more to demo success than pixel perfection. A second risk — duplicate contacts from CSV imports — is a silent failure mode that must be solved before running any new imports. The current script has no dedup logic.

## Key Findings

### Recommended Stack

The stack needs no changes to ship the current scope. Three additions are warranted: `papaparse` for robust CSV parsing in import scripts (the current hand-rolled parser mishandles escaped quotes, Windows line endings, and BOM bytes from Google Sheets exports), `recharts v3` for any metric charts on the dashboard (v3 is the only version with official React 19 support), and a CSS custom properties layer in `index.css` to make the visual redesign workable. Gmail integration uses no npm package — the Google Identity Services script is loaded at runtime via CDN.

**Core technologies:**
- React 19 + Vite — already in use, no changes
- Tailwind v4 — already in use; visual work is CSS custom properties, not new Tailwind config
- @xyflow/react v12 — already in use; orb map architecture is stable
- papaparse v5.5.3 — CSV import scripts; handles all real-world CSV edge cases
- recharts v3.8.0 — dashboard charts; only React 19-compatible option in this category
- Google Identity Services (CDN) — Gmail OAuth when credentials arrive; no npm package needed

**Do not add:**
- `google-auth-library` or `googleapis` — Node.js only, will not run in browser
- `react-papaparse` — wrapper adds nothing, unmaintained
- `d3` directly — recharts already vendors it

### Expected Features

The app is mid-engagement, not greenfield. The feature question is specifically: what to build in the remaining 2 weeks.

**Must have (current scope):**
- Flexible CSV import with column alias mapping and deduplication — Briell is waiting, this is the primary deliverable
- Visual redesign aligned to Trolley CRM PDF — demo-readiness requirement for Gwyneth meeting
- Enriched contact profiles (birthday, milestones, interests, how-we-met, relationship context fields) — low implementation cost, high value
- Per-contact equity score display on profile — scoring logic already exists, needs UI surface only

**Should have (v1.x, post-engagement):**
- Gmail integration (email context in timeline) — blocked on credentials, architecture is ready
- Milestone-triggered Today's Focus nudges — depends on milestone fields being populated
- Toast bot ↔ Airtable bridge (manual sync button) — small addition to existing architecture

**Defer (v2+):**
- Calendar sync, WhatsApp integration, mobile app, AI auto-categorization, news monitoring, mass outreach — all anti-features or out of scope for this engagement

**Anti-features to avoid:**
- Automatic contact enrichment from external APIs — wrong signal quality for Moj's high-signal network
- Mass email / bulk outreach — antithetical to Moj's giving-first philosophy
- In-app CSV prep UI — adds complexity for a workflow Gabe controls end-to-end

### Architecture Approach

The architecture is a single I/O boundary pattern: all Airtable reads/writes go through `lib/airtable.ts`, all scoring logic lives in `lib/equity.ts` (pure functions, no I/O), and UI-only state lives in `localStorage`. This pattern is already established and working. New features must follow it — no direct Airtable fetches in components, no UI state in Airtable, no polling loops. The CSV import scripts are Node-only and run outside the app bundle entirely.

Gmail OAuth requires a thin serverless backend (Vercel function) to hold the `client_secret` — it cannot be safely browser-only. This is a constraint, not a choice. When credentials arrive, a single `api/gmail/auth.ts` Vercel function handles the OAuth callback and stores the refresh token in Airtable.

**Major components:**
1. `lib/airtable.ts` — single data boundary, module-level stale-while-revalidate cache, all Airtable I/O
2. `lib/equity.ts` — pure scoring functions, no I/O, called by Dashboard
3. `Dashboard` — equity ring, pod health, Today's Focus, dormant cleanup
4. `OrbMap` + node components — React Flow canvas, pod/category/contact navigation
5. `ContactDetail` — full contact profile, interaction timeline, edit fields (needs enriched fields added)
6. Import scripts (`src/scripts/`) — Node-only, generic column-map pattern, not bundled into app

### Critical Pitfalls

1. **Duplicate contacts on CSV import** — current script has no dedup logic; running LP or Talent list import will create duplicates for anyone who overlaps with Service Providers. Fix: fetch all contacts first, build email-keyed lookup, PATCH on match / POST on new. Must be implemented before the next import run.

2. **Gmail OAuth cannot be browser-only** — Google still requires `client_secret` even with PKCE for web app client types. Storing the secret in a Vite env var ships it to the browser bundle. Do not attempt browser-only Gmail OAuth. Requires a Vercel serverless function as the OAuth callback handler.

3. **Visual redesign scope creep** — "align to Trolley CRM" has no natural stopping point. Without bounding the change list to 3-5 specific deltas from the PDF, the visual phase will consume the data import runway. Timebox to 3-4 days maximum.

4. **CSV column name assumptions** — the existing script is hardcoded to Service Providers headers. Briell's next CSV will have different column names, possibly with BOM characters, Windows line endings, or merged cells from Excel. Fix: papaparse + column alias mapping object per import + dry-run validation before writing.

5. **No handoff documentation** — Briell becomes the ongoing Airtable admin. Without a clear doc covering how to run the import script, field conventions, and what not to touch, the app becomes an orphan after the engagement ends.

## Implications for Roadmap

Based on the dependency analysis across all four research files, the suggested phase structure is:

### Phase 1: Design Token Foundation
**Rationale:** Visual redesign touches every component. Without CSS custom properties as a token layer, every visual change requires hunting through inline styles scattered across a dozen files. This unblocks Phase 3 completely and reduces visual redesign friction to near-zero. Zero dependencies — this can start immediately.
**Delivers:** `index.css` with CSS custom properties for all colors, spacing, radii, and blur values. `src/lib/tokens.ts` for JS-only values (glass orb opacity constants, animation durations).
**Addresses:** Visual redesign feature (foundation layer), design token anti-pattern (inline magic values)
**Avoids:** Scope creep from hunting inline values during visual pass

### Phase 2: CSV Import Pipeline
**Rationale:** This is the primary deliverable. Briell is waiting. It is completely independent of all UI work. It needs to ship before the visual work begins so there's time to catch and fix data quality issues before the demo. Deduplication must be built into this phase — not retrofitted later.
**Delivers:** Generic `scripts/importContacts.ts` with column map pattern, papaparse integration, dedup logic (email-keyed upsert), dry-run flag, unmapped-column logging. LP list and Talent list imported and verified in Airtable.
**Addresses:** Flexible CSV import (P1 feature), deduplication (table stakes)
**Avoids:** Duplicate contact pitfall, column name assumption pitfall, rate limiting pitfall (batch 10 + 250ms delay)
**Stack:** papaparse v5.5.3

### Phase 3: Enriched Contact Profiles
**Rationale:** Low implementation cost, high demo value. Requires Airtable schema additions (birthday, milestones, interests, how-we-met, relationship context fields) before UI work — schema must come before UI. Per-contact equity score display uses existing scoring logic and needs only a UI surface. This can overlap with the visual redesign if schema additions are done first.
**Delivers:** New Airtable fields, `ContactDetail` UI showing enriched fields, per-contact equity score with breakdown visible on profile.
**Addresses:** Enriched contact profiles (P1), per-contact equity score display (P1), relationship context fields (differentiator)
**Avoids:** Building UI before schema exists

### Phase 4: Visual Redesign
**Rationale:** Comes after token foundation (Phase 1 unblocks it) and after data is clean (so the demo has real data, not placeholder content). Must be time-boxed. Read the Trolley CRM PDF, identify the 3-5 highest-impact deltas, implement those only. Dashboard is the primary surface — that's what Moj will show Gwyneth.
**Delivers:** Dashboard, OrbMap, and ContactDetail aligned to Trolley CRM design direction. Glass orb visual system preserved. Polished enough for a high-stakes demo.
**Addresses:** Visual redesign (P1), Gwyneth demo readiness
**Avoids:** Scope creep pitfall (timebox to 3-4 days, bounded change list)

### Phase 5: Integration Readiness
**Rationale:** Depends on Moj providing Gmail credentials (external dependency). Build last. Toast bot bridge (manual sync button + cache invalidation) is small and can be added during this phase as well. Vercel serverless function for Gmail OAuth is the infrastructure work.
**Delivers:** Manual sync button (Toast bot data coordination), Vercel function scaffolded for Gmail OAuth callback (ready to activate when credentials arrive).
**Addresses:** Gmail integration architecture (P4), Toast bot bridge (P4)
**Avoids:** Browser-only OAuth pitfall, polling loop anti-pattern

### Phase 6: Close-Out
**Rationale:** Engagement ends March 31. Briell needs to operate the import pipeline independently after that. Handoff documentation is a concrete deliverable, not optional.
**Delivers:** `HANDOFF.md` covering import script usage, Airtable field conventions, linked field behavior, and escalation contact. Verified by Briell running the import script independently.
**Addresses:** Handoff documentation pitfall

### Phase Ordering Rationale

- Phase 1 before Phase 4: design tokens are a prerequisite for an efficient visual pass. Without them, every color change is a find-and-replace across inline styles.
- Phase 2 before Phase 3: data quality matters for the enriched profile demo. Clean imported contacts must exist before building the profile UI that displays them.
- Phase 2 before Phase 4: demo needs real data, not placeholder content. Import must complete before visual polish so the polished surfaces show real contacts.
- Phase 5 last: Gmail is externally blocked. No sense sequencing it earlier than it can be executed.
- Phase 6 is non-negotiable: the engagement has a hard end date. The handoff must happen before the final meeting.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (CSV Import):** Need to inspect the actual LP list and Talent list CSV formats before writing the column maps. Column aliases are unknown until Briell shares the files.
- **Phase 4 (Visual Redesign):** Need to read the Trolley CRM PDF and extract the 3-5 specific design deltas. The delta list must be defined and agreed before implementation starts to prevent scope creep.
- **Phase 5 (Gmail Integration):** Vercel function architecture is well-understood, but the specific Airtable field for storing the refresh token needs to be defined. Also depends on credential format Moj provides.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Design Tokens):** CSS custom properties is a well-established pattern. The token values are already documented in `docs/design-system.md`. Straightforward execution.
- **Phase 3 (Enriched Profiles):** Airtable field additions + React UI for displaying them. Standard CRUD pattern within the existing architecture.
- **Phase 6 (Close-Out):** Documentation task. No research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing codebase is the primary source. New additions (papaparse, recharts) confirmed against npm and official React 19 compatibility. |
| Features | MEDIUM-HIGH | Competitor analysis against Dex, Monica, Covve, Clay. Anti-feature reasoning is solid. Milestone-specific feature prioritization is extrapolated from domain patterns. |
| Architecture | HIGH | Based on direct codebase read. Patterns are already established and working. Gmail OAuth architecture is based on official Google docs. |
| Pitfalls | HIGH | Duplicate contact pitfall is a concrete code gap (confirmed by reading existing script). Gmail OAuth pitfall is documented by Google. Rate limiting is documented by Airtable. Scope creep pitfall is engagement-context judgment. |

**Overall confidence:** HIGH

### Gaps to Address

- **LP and Talent list CSV formats:** Unknown until Briell shares the files. Column alias maps cannot be written until the actual headers are visible. Mitigation: inspect headers with `head -5` before writing any mapping code.
- **Trolley CRM PDF delta list:** The specific design changes to implement are undefined. Must be extracted from the PDF before Phase 4 begins. Mitigation: read PDF, create a bounded change list, get confirmation before implementing.
- **Equity weight validation:** The current weighted scoring (intros > meetings > calls > texts) is flagged as "pending Moj feedback" in PROJECT.md. If weights are wrong, the equity scores on profiles will feel off to Moj. Mitigation: surface this question explicitly before the contact profile phase ships.
- **Airtable field naming conventions:** New fields (milestones, interests, birthday, etc.) need names consistent with Briell's Airtable admin workflow. Confirm with Briell before schema additions.

## Sources

### Primary (HIGH confidence)
- Existing codebase — direct read of `src/lib/airtable.ts`, `src/lib/equity.ts`, `OrbMap.tsx`, component structure
- Airtable API rate limits — https://airtable.com/developers/web/api/rate-limits
- Google Identity Services token model — https://developers.google.com/identity/oauth2/web/guides/use-token-model
- recharts npm — https://www.npmjs.com/package/recharts (v3.8.0, 13 days old at research time)
- papaparse npm — https://www.npmjs.com/package/papaparse (v5.5.3)

### Secondary (MEDIUM confidence)
- Dex, Monica, Covve, Clay feature comparison — product pages and review articles (2026)
- recharts React 19 issue #4558 — GitHub, closed/completed
- Google OAuth2 PKCE + client_secret requirement — multiple sources confirming Google's deviation from RFC 7636
- Vercel serverless functions — https://vercel.com/docs/functions
- CRM deduplication patterns — rtdynamic.com/blog/crm-deduplication-guide-2025

### Tertiary (LOW confidence)
- Milestone-triggered nudge feature prioritization — extrapolated from Monica/Dex milestone patterns; needs validation against Moj's actual workflow

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
