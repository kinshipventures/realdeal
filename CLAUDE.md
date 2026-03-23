# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- `/` → `Dashboard` — social equity scores, overdue contacts, today's focus
- `/map` → `OrbMap` — React Flow node graph for visual network exploration

No backend — Airtable is the data layer, accessed directly from the browser via REST.

### Data flow

`src/lib/airtable.ts` is the entire data layer:
- All reads/writes go through `request()` / `fetchAll()` helpers
- `_contactsCache` and `_categoriesCache` are module-level in-memory caches — invalidate with `_contactsCache = null` / `invalidateContactsCache()` after any mutation
- Airtable linked fields return arrays of record IDs — filtering happens client-side (e.g. `getCategories(listId)` fetches all then filters)
- Overdue = no `last_contacted_at` OR last contact > cadence days (defaults to 30)
- `logInteraction()` wraps `createInteraction()` and auto-updates `last_contacted_at` for non-note types

### Social equity scoring (`src/lib/equity.ts`)

Relationship health scoring system. Each interaction type has a weight (intro=5, meeting=4, call=3, text/email=2, note=0). Scores are 0-100 based on recency-weighted interaction history within a rolling window tied to pod cadence.

- `contactEquityScore()` → individual contact score
- `podEquityScore()` / `overallEquityScore()` → aggregates
- `scoreLabel()` → Thriving (85+), Healthy (70+), Cooling (50+), Dormant (<50)
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

### Glass orb visual system

`GlassOrb.tsx` is a shared component used by all orb node types. Three-layer radial gradient:
1. Specular highlight (top-left, white) — simulates light entering
2. Color refraction (bottom-right, color @ 0.14 opacity)
3. Color ambient (center, color @ 0.07 opacity)
4. Base: `rgba(255,255,255,0.54)`

**Rule**: color layers must never exceed `0.16` opacity — above this the orb reads as colored, not glass-tinted.

Hover/press interactions use CSS classes (`.orb-interactive`) with CSS custom properties (`--orb-scale`, `--orb-lift`) set inline. JS handlers only update `boxShadow` — never `transform` — because React re-renders will overwrite JS transform mutations.

### Escape stack (`src/lib/escapeStack.ts`)

Module-level stack for layered Escape key handling (same pattern as Radix UI). Panels and modals push/pop handlers — only the topmost fires. Use `useEscape(stableCallback)` hook; the callback reference must be stable (`useCallback`) or the cleanup removes the wrong entry.

### Component structure

| File | Role |
|---|---|
| `App.tsx` | Routes, floating pill nav, background gradient |
| `dashboard/Dashboard.tsx` | Equity scores, overdue list, today's focus |
| `map/OrbMap.tsx` | Canvas, view state, node/edge assembly |
| `map/GlassOrb.tsx` | Shared glass orb component (size, color, glow) |
| `map/ListNode.tsx` | 96px orb — navigates into a list |
| `map/CategoryNode.tsx` | 64px orb — opens ContactPanel |
| `map/CreateCategoryNode.tsx` | "+" orb for adding new categories |
| `map/MojNode.tsx` | 116px hub orb — settings entry point |
| `contacts/ContactPanel.tsx` | Right-side drawer, loads contacts for a category |
| `contacts/ContactDetail.tsx` | Full contact view with interactions |
| `contacts/ContactCard.tsx` | Row inside ContactPanel |
| `contacts/InteractionSection.tsx` | Interaction history and logging |
| `ui.tsx` | Shared primitives: `Spinner`, `Avatar` |

### Design system

See `docs/design-system.md` for the full token set, typography scale, spacing grid, motion curves, and accessibility checklist.

Key tokens:
- Background: `#F5F4F0`
- Panel: `rgba(245,244,240,0.88)` + `backdrop-filter: blur(32px)`
- Text primary: `rgba(0,0,0,0.82)`, secondary: `rgba(0,0,0,0.45)`, tertiary: `rgba(0,0,0,0.28)`
- Font: DM Sans, weights 300/400/500/600

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
