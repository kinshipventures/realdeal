# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Output Rules

- Answer is always line 1. Reasoning comes after, never before.
- No preamble, no "Great question!", "Sure!", "Of course!", "Certainly!", "Absolutely!".
- No hollow closings. No "I hope this helps!", "Let me know if you need anything!".
- No restating the prompt. If the task is clear, execute immediately.
- No explaining what you are about to do. Just do it.
- No unsolicited suggestions. Do exactly what was asked, nothing more.
- Structured output only: bullets, tables, code blocks. Prose only when explicitly requested.
- Compress responses. Every sentence must earn its place.
- No redundant context. Do not repeat information already established in the session.

## Typography - ASCII Only

- No em dashes - use hyphens instead.
- No smart/curly quotes - use straight quotes instead.
- No ellipsis character - use three plain dots instead.
- No Unicode bullets - use hyphens or asterisks instead.
- Do not modify content inside backticks.

## Accuracy

- Never speculate about code, files, or APIs you have not read.
- If referencing a file or function: read it first, then answer.
- If unsure: say "I don't know." Never guess confidently.
- Never invent file paths, function names, or API signatures.
- If a user corrects a factual claim: accept it as ground truth for the entire session.

## Code

- Return the simplest working solution. No over-engineering.
- No abstractions or helpers for single-use operations.
- No speculative features or future-proofing.
- No docstrings or comments on code that was not changed.
- Inline comments only where logic is non-obvious.
- Read the file before modifying it. Never edit blind.
- Path alias: `@/` maps to `./src/` (configured in vite.config.ts and tsconfig.json).
- TS config has `strictNullChecks: false` and `noImplicitAny: false` - don't add null guards or explicit `any` annotations that the codebase doesn't use.

## Scope

- Do not add features beyond what was asked.
- Do not refactor surrounding code when fixing a bug.
- Do not create new files unless strictly necessary.
- No safety disclaimers unless there is a genuine life-safety or legal risk.
- No "Note that...", "Keep in mind that..." soft warnings.
- User instructions always override this file.

## Commands

```bash
pnpm dev          # start dev server on http://localhost:8080
pnpm build        # vite build (no separate tsc step)
pnpm lint         # eslint

# Data scripts (require .env.local with VITE_AIRTABLE_TOKEN + VITE_AIRTABLE_BASE_ID)
pnpm seed:lists         # seed Lists table in Airtable
pnpm seed:csv           # import service providers CSV into Airtable
pnpm migrate:schema     # run Airtable schema migration
pnpm migrate:fieldconfig # run field config migration
```

## Environment

`.env.local` requires:
```
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...

# Legacy - only needed for seed/migration scripts
VITE_AIRTABLE_TOKEN=pat...
VITE_AIRTABLE_BASE_ID=app...
```

## Architecture

React SPA with Supabase backend, sidebar navigation, and auth.

### Routes

| Path | Component | Description |
|---|---|---|
| `/login` | `LoginPage` | Supabase auth (unauthenticated) |
| `/s/:token` | `SharedListPage` | Public shared list view (unauthenticated) |
| `/` or `/pods` | `OrbMap` | React Flow node graph for visual network exploration |
| `/pulse` | `Dashboard` | Equity ring, pod health cards, wrapped insights, birthdays, focus, overdue |
| `/pulse/nurturing` | `NurturingHub` | Nurturing workflows |
| `/contacts` | `RecordsList` | All people list view |
| `/contact/:id` | `RecordPage` | Individual contact detail |
| `/companies` | `CompaniesPage` | Companies view |
| `/campaigns` | `CampaignsPage` | Campaigns (outreach + pipeline-backed, unified) |
| `/pipelines` | redirect | Redirects to `/campaigns` |
| `/projects` | `ProjectsPage` | Projects list |
| `/reports` | `ReportsPage` | Pod distribution, pipeline velocity, engagement reports |
| `/projects/:id` | `ProjectDetailPage` | Project detail |
| `/pod/:id` | `PodDetailPage` | Pod detail view |
| `/category/:id` | `CategoryTable` | Category people table |
| `/import` | `ImportPanel` | CSV import UI |
| `/onboarding` | `OnboardingFlow` | First-run onboarding |

All routes except `/login` and `/s/:token` are wrapped in `RequireAuth`. Layout uses `Sidebar` on desktop, fixed bottom tab bar on mobile.

### Data layer

`src/lib/airtable.ts` is a barrel re-export of `src/lib/supabase-data.ts` (51k, the real data layer). All consumers import from `airtable.ts` by convention.

`supabase-data.ts`:
- Uses `@supabase/supabase-js` client from `src/integrations/supabase/client.ts`
- All queries scoped by workspace via `getActiveWorkspaceId()` (module-level state in `src/lib/workspace.ts`, persisted to localStorage)
- `fetchAllRows()` helper pages through Supabase's 1000-row limit
- Demo mode: when active, all functions return static data from `src/lib/sampleData.ts` instead of hitting Supabase

Key domain functions: pods (CRUD), categories, contacts, interactions, campaigns (unified - outreach + pipeline-backed), projects, share links.

Campaigns merge: "Pipelines" and "Campaigns" are now one feature under the "Campaigns" name. Outreach campaigns (events, outreach) use campaign_contacts table. Pipeline campaigns (deal_flow, fundraise, talent, partnerships) use pipeline/opportunities tables. `getAllCampaigns()` returns both. DB tables unchanged - the merge is app-layer only.

### Key lib files

| File | Role |
|---|---|
| `lib/supabase-data.ts` | All Supabase reads/writes (the real data layer) |
| `lib/airtable.ts` | Barrel re-export of supabase-data.ts |
| `lib/types.ts` | All TypeScript interfaces and type unions |
| `lib/equity.ts` | Social equity scoring (0-100, recency-weighted by interaction type and cadence) |
| `lib/birthdays.ts` | Upcoming birthday detection (14-day window) |
| `lib/sampleData.ts` | Demo mode static data |
| `lib/escapeStack.ts` | Layered Escape key handling (push/pop pattern) |
| `lib/workspace.ts` | Active workspace ID state (module-level + localStorage) |
| `lib/csvImport.ts` | CSV import/parsing logic |
| `lib/fieldConfig.ts` | Dynamic field configuration |
| `lib/enrichment.ts` | Contact enrichment |
| `lib/sharing.ts` | Share link generation and validation |
| `lib/snooze.ts` | Contact snooze logic |
| `lib/timeline.ts` | Timeline utilities |

### Pods and categories

"Pods" group contacts; categories subdivide pods. The `Pod` type has `owner`, `is_priority`, and `cadence` fields that drive equity scoring and focus prioritization.

### Social equity scoring (`src/lib/equity.ts`)

Interaction weights: intro=5, meeting=4, call=3, text/email=2, note=0. Scores 0-100 based on recency-weighted history within rolling cadence window.

- `contactEquityScore()` / `podEquityScore()` / `overallEquityScore()`
- Labels: Thriving (85+), Steady (70+), Cooling (40+), Fading (<40)
- `todaysFocus()` - prioritized contacts needing attention
- `CADENCE_DAYS` - weekly=7, biweekly=14, monthly=30, quarterly=90

### Orb map (React Flow)

`OrbMap.tsx` manages `'lists'` and `'categories'` views as node/edge graphs. Hub orb (116px) at center, list orbs (96px) in circle, category orbs (64px) around selected list. Node positions persist to `localStorage` key `realdeal:node-positions:v2`.

`SolidOrb.tsx` is the shared orb component (two-tone gradient + health ring). `POD_SHIFT_COLORS` maps primary hex to shift color for gradient consistency across components. Hover uses CSS classes - JS handlers only update `boxShadow`, never `transform`.

### Escape stack (`src/lib/escapeStack.ts`)

Module-level stack for layered Escape key handling. Use `useEscape(stableCallback)` hook - callback must be stable (`useCallback`).

### Design system

See `docs/design-system.md` for full tokens. Key values:
- Background: `#F5F4F0`
- Panel: `rgba(245,244,240,0.88)` + `backdrop-filter: blur(32px)`
- Text: primary `rgba(0,0,0,0.82)`, secondary `rgba(0,0,0,0.45)`, tertiary `rgba(0,0,0,0.28)`
- Body: DM Sans (300/400/500/600)
- Display: Fraunces (`var(--font-serif)`, 400/700/800/900) - section headings, pod names, stats

### Demo mode (`src/lib/sampleData.ts`)

Toggle via sidebar. When active, all data functions return static sample data. Write ops mutate exported arrays in-place - reset on refresh.

### Stale references

- `airtable.ts` comments referencing "Airtable record ID" in types.ts are stale naming - data is in Supabase
- Legacy Airtable seed/migration scripts in `src/scripts/` still work against Airtable for historical data operations

## Deploy Configuration

- Platform: Vercel (auto-deploys from github main)
- Production URL: https://real-deal-2.vercel.app
- Supabase project: pnhyhcwecpgbcsoabbrm (personal, not Lovable Cloud)
- Lovable editor still used for code edits (syncs via git); real-deal.lovable.app is a stale zombie
- Pre-merge: `pnpm build`
- Required env vars (set in Vercel): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_USE_LOVABLE_AUTH_BRIDGE=false`

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming -> invoke office-hours
- Bugs, errors, "why is this broken", 500 errors -> invoke investigate
- Ship, deploy, push, create PR -> invoke ship
- QA, test the site, find bugs -> invoke qa
- Code review, check my diff -> invoke review
- Update docs after shipping -> invoke document-release
- Weekly retro -> invoke retro
- Design system, brand -> invoke design-consultation
- Visual audit, design polish -> invoke design-review
- Architecture review -> invoke plan-eng-review

## Design System

Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, shell behavior, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that does not match `DESIGN.md`.
