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

Single-page React app with one route (`/` → `OrbMap`). No backend — Airtable is the data layer, accessed directly from the browser via REST.

### Data flow

`src/lib/airtable.ts` is the entire data layer:
- All reads/writes go through `request()` / `fetchAll()` helpers
- `_contactsCache` and `_categoriesCache` are module-level in-memory caches — invalidate with `_contactsCache = null` / `invalidateContactsCache()` after any mutation
- Airtable linked fields return arrays of record IDs — filtering happens client-side (e.g. `getCategories(listId)` fetches all then filters)
- Overdue = no `last_contacted_at` OR last contact > 30 days ago
- `logInteraction()` wraps `createInteraction()` and auto-updates `last_contacted_at` for non-note types

### Orb map (React Flow)

`OrbMap.tsx` manages two views — `'lists'` and `'categories'` — as React Flow node/edge graphs:

- **Home view**: Moj hub orb (116px, `moj-center`) at canvas origin, list orbs (96px) in a circle at radius 310, connected via straight edges
- **Category view**: Selected list stays in place, category orbs (64px) arranged around it at radius 230
- Node positions persist to `localStorage` key `kinshipbrain:node-positions:v2` — bump version when default layout changes to invalidate saved positions
- `buildHomeNodes()` / `buildHomeEdges()` build the home graph; `handleListClick()` fetches categories and transitions to category view
- Moj node is `draggable: false` and never has its position persisted

### Glass orb visual system

Three-layer radial gradient on every orb:
1. Specular highlight (top-left, white) — simulates light entering
2. Color refraction (bottom-right, color @ 0.12–0.14 opacity)
3. Color ambient (center, color @ 0.07–0.08 opacity)
4. Base: `rgba(255,255,255,0.54–0.56)`

**Rule**: color layers must never exceed `0.16` opacity — above this the orb reads as colored, not glass-tinted.

Hover/press interactions use CSS classes (`.orb-interactive`) with CSS custom properties (`--orb-scale`, `--orb-lift`) set inline. JS handlers only update `boxShadow` — never `transform` — because React re-renders will overwrite JS transform mutations.

### Component structure

| File | Role |
|---|---|
| `OrbMap.tsx` | Canvas, view state, node/edge assembly |
| `ListNode.tsx` | 96px orb — navigates into a list |
| `CategoryNode.tsx` | 64px orb — opens ContactPanel |
| `MojNode.tsx` | 116px hub orb — settings entry point |
| `ContactPanel.tsx` | Right-side drawer, loads contacts for a category |
| `ContactCard.tsx` | Row inside ContactPanel |
| `useNodePositions.ts` | localStorage position persistence |
| `src/lib/utils.ts` | `hexToRgba`, `formatRelativeTime` |

### Design system

See `docs/design-system.md` for the full token set, typography scale, spacing grid, motion curves, and accessibility checklist.

Key tokens:
- Background: `#F5F4F0`
- Panel: `rgba(245,244,240,0.88)` + `backdrop-filter: blur(32px)`
- Text primary: `rgba(0,0,0,0.82)`, secondary: `rgba(0,0,0,0.45)`, tertiary: `rgba(0,0,0,0.28)`
- Font: DM Sans, weights 300/400/500/600

### Stale files

`supabase/` directory and any Supabase references are stale — the project switched to Airtable. Do not use or restore them.
