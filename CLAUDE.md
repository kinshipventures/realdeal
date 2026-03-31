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

## Scope

- Do not add features beyond what was asked.
- Do not refactor surrounding code when fixing a bug.
- Do not create new files unless strictly necessary.
- No safety disclaimers unless there is a genuine life-safety or legal risk.
- No "Note that...", "Keep in mind that..." soft warnings.
- User instructions always override this file.

## Commands

```bash
pnpm dev          # start dev server
pnpm build        # type-check + vite build
pnpm lint         # eslint

# Data scripts (require .env.local)
pnpm seed:lists   # seed Lists table in Airtable
pnpm seed:csv     # import service providers CSV into Airtable
```

## Environment

`.env.local` requires:
```
VITE_AIRTABLE_TOKEN=pat...
VITE_AIRTABLE_BASE_ID=app...
```

## Architecture

React app with two views behind a floating pill navigator:
- `/` → `Dashboard` — equity ring, pod health cards, wrapped insight card, birthdays, today's focus, campaigns, overdue queue, dormant cleanup
- `/map` → `OrbMap` — React Flow node graph for visual network exploration

Global overlays: `SearchPalette` (Cmd+K from any view), `ContactDetail` (slide-out panel), `CampaignDetail` (slide-out panel), `ImportPanel` (/import route).

No backend — Airtable is the data layer, accessed directly from the browser via REST.

### Data flow

`src/lib/airtable.ts` is the entire data layer:
- All reads/writes go through `request()` / `fetchAll()` helpers
- `_contactsCache` and `_categoriesCache` are module-level in-memory caches — invalidate with `_contactsCache = null` / `invalidateContactsCache()` after any mutation
- Airtable linked fields return arrays of record IDs — filtering happens client-side (e.g. `getCategories(listId)` fetches all then filters)
- Overdue = no `last_contacted_at` OR last contact > cadence days (defaults to 30)
- `logInteraction()` wraps `createInteraction()` and auto-updates `last_contacted_at` for non-note types
- Campaign functions: `getCampaigns()`, `getCampaignContacts()`, `createCampaign()`, `addContactToCampaign()`, `updateCampaignContactStatus()`, `completeCampaign()` — all with demo mode support
- `_campaignsCache` / `_campaignContactsCache` follow the same stale-while-revalidate pattern as contacts

### Birthdays (`src/lib/birthdays.ts`)

`getUpcomingBirthdays(contacts, pods)` returns contacts with birthdays in the next N days (default 14). Parses month/day from birthday field, rolls year forward if already passed. `formatDaysUntil()` returns "Today" or "Nd".

### Social equity scoring (`src/lib/equity.ts`)

Relationship health scoring system. Each interaction type has a weight (intro=5, meeting=4, call=3, text/email=2, note=0). Scores are 0-100 based on recency-weighted interaction history within a rolling window tied to pod cadence.

- `contactEquityScore()` → individual contact score
- `podEquityScore()` / `overallEquityScore()` → aggregates
- `scoreLabel()` → Thriving (85+), Steady (70+), Cooling (40+), Fading (<40)
- `todaysFocus()` → generates prioritized list of contacts needing attention
- `CADENCE_DAYS` → weekly=7, biweekly=14, monthly=30, quarterly=90

### Pods and categories

"Pods" are the renamed concept for lists (Airtable table is still called "Lists"). A pod groups contacts; categories subdivide pods. The `Pod` type in `types.ts` has `owner`, `is_priority`, and `cadence` fields that drive equity scoring and focus prioritization.

### Orb map (React Flow)

`OrbMap.tsx` manages two views — `'lists'` and `'categories'` — as React Flow node/edge graphs:

- **Home view**: Moj hub orb (116px, `moj-center`) at canvas origin, list orbs (96px) in a circle at radius 310, connected via straight edges
- **Category view**: Selected list stays in place, category orbs (64px) arranged around it at radius 230
- Node positions persist to `localStorage` key `kinshipbrain:node-positions:v2` — bump version when default layout changes to invalidate saved positions
- `buildHomeNodes()` / `buildHomeEdges()` build the home graph; `handleListClick()` fetches categories and transitions to category view
- Moj node is `draggable: false` and never has its position persisted

### Solid orb visual system

`SolidOrb.tsx` is the shared orb component used by all map node types. Two-tone gradient with health ring:
- Background: `linear-gradient(135deg, color, shiftColor)` using `POD_SHIFT_COLORS` map
- `POD_SHIFT_COLORS` (exported from `SolidOrb.tsx`) maps each pod's primary hex to a complementary shift color — also used by `PodCard` and `WrappedCard` for gradient consistency
- Optional `healthPercent` prop renders an SVG ring around the orb
- Hover/press interactions use CSS classes (`.orb-interactive`) with CSS custom properties (`--orb-scale`, `--orb-lift`) set inline. JS handlers only update `boxShadow` — never `transform` — because React re-renders will overwrite JS transform mutations

`GlassOrb.tsx` still exists but is legacy — `SolidOrb` is the active component.

### Escape stack (`src/lib/escapeStack.ts`)

Module-level stack for layered Escape key handling (same pattern as Radix UI). Panels and modals push/pop handlers — only the topmost fires. Use `useEscape(stableCallback)` hook; the callback reference must be stable (`useCallback`) or the cleanup removes the wrong entry.

### Component structure

| File | Role |
|---|---|
| `App.tsx` | Routes, floating pill nav, background gradient |
| `dashboard/Dashboard.tsx` | Full dashboard: equity ring, pod cards, wrapped, birthdays, focus, overdue, dormant |
| `dashboard/WrappedCard.tsx` | Cycling gradient insight card (people reached, top pod, most connected) |
| `map/OrbMap.tsx` | Canvas, view state, node/edge assembly |
| `map/SolidOrb.tsx` | Shared solid orb component (gradient, health ring, hover) + `POD_SHIFT_COLORS` |
| `map/GlassOrb.tsx` | Legacy glass orb (still exists, not actively used) |
| `map/ListNode.tsx` | 96px orb — navigates into a list |
| `map/CategoryNode.tsx` | 64px orb — opens ContactPanel |
| `map/CreateCategoryNode.tsx` | "+" orb for adding new categories |
| `map/MojNode.tsx` | 116px hub orb — settings entry point |
| `contacts/ContactPanel.tsx` | Right-side drawer, loads contacts for a category |
| `contacts/ContactDetail.tsx` | Full contact view with interactions |
| `contacts/ContactCard.tsx` | Row inside ContactPanel |
| `contacts/InteractionSection.tsx` | Interaction history and logging |
| `search/SearchPalette.tsx` | Cmd+K command palette — global contact search |
| `campaigns/CampaignDetail.tsx` | Slide-out panel with contact status tracking, search-add, mark complete |
| `campaigns/CampaignCreate.tsx` | Inline campaign creation form (name, type, deadline) |
| `empty/EmptyState.tsx` | Shared empty state with orb icon, heading, optional CTA |
| `import/ImportPanel.tsx` | Browser-based CSV import UI |
| `ui.tsx` | Shared primitives: `Spinner`, `Avatar` |

### Design system

See `docs/design-system.md` for the full token set, typography scale, spacing grid, motion curves, and accessibility checklist.

Key tokens:
- Background: `#F5F4F0`
- Panel: `rgba(245,244,240,0.88)` + `backdrop-filter: blur(32px)`
- Text primary: `rgba(0,0,0,0.82)`, secondary: `rgba(0,0,0,0.45)`, tertiary: `rgba(0,0,0,0.28)`
- Body font: DM Sans, weights 300/400/500/600
- Display serif: Fraunces (`var(--font-serif)`), weights 400/700/800/900 — used for section headings, pod card names, Wrapped card stats

### Demo mode (`src/lib/sampleData.ts`)

Toggle via "demo on/off" button in nav. When active, all airtable.ts functions return static sample data instead of hitting the API. Includes 6 pods, 14 categories, 21 contacts, 41 interactions, 3 campaigns, and 12 campaign-contact records. Write operations (create campaign, add contact, toggle status) mutate the exported arrays in-place — reset on page refresh.

### Stale files

`supabase/` directory and any Supabase references are stale — the project switched to Airtable. Do not use or restore them.

## Deploy Configuration (configured by /setup-deploy)
- Platform: Vercel
- Production URL: https://mojrm.vercel.app
- Deploy workflow: auto-deploy on push to main
- Deploy status command: HTTP health check
- Merge method: squash
- Project type: web app (Vite + React SPA)
- Post-deploy health check: https://mojrm.vercel.app

### Custom deploy hooks
- Pre-merge: `pnpm build` (type-check + vite build)
- Deploy trigger: automatic on push to main
- Deploy status: poll production URL
- Health check: https://mojrm.vercel.app

### Required env vars (set in Vercel dashboard)
- `VITE_AIRTABLE_TOKEN` — Airtable personal access token
- `VITE_AIRTABLE_BASE_ID` — Airtable base ID (appXXX)
