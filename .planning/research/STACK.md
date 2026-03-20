# Stack Research

**Domain:** Relationship intelligence app — React 19 + Vite + Airtable, no backend server
**Researched:** 2026-03-20
**Confidence:** HIGH (CSV/visualization), MEDIUM (Gmail OAuth — constrained by no-backend architecture)

## Recommended Stack

### Core Technologies (already in project)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2.0 | UI framework | Already locked in. |
| Vite | 7.3.1 | Build tool | Already locked in. |
| Tailwind | 4.2.1 | Styling | Already locked in. |
| @xyflow/react | 12.10.1 | Orb map canvas | Already locked in. |
| tsx | 4.21.0 | Node script runner | Already locked in, used for import scripts. |

### Supporting Libraries — New Additions

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| papaparse | ^5.5.3 | CSV parsing in import scripts | All CSV imports. Replaces the hand-rolled `parseCSV` in `importServiceProviders.ts`. |
| @types/papaparse | ^5.5.2 | TypeScript types for papaparse | Add alongside papaparse. |
| recharts | ^3.8.0 | SVG data visualization in dashboard | Equity trend charts, interaction frequency charts. React 19 compatible in v3. |

### Gmail OAuth — No-Backend Constraint

The existing constraint (no backend server, Airtable token in browser) creates a meaningful tradeoff for Gmail:

**Recommended approach:** Google Identity Services token model via CDN/dynamic import, **not** a bundled npm package.

Google provides `google.accounts.oauth2` via `https://accounts.google.com/gsi/client` — load it at runtime, call `requestAccessToken()` on user action, use the short-lived token for direct Gmail REST calls.

No npm package is needed. No library wraps this cleanly for React without introducing backend assumptions.

**Feasibility verdict:** WORKABLE WITH CAVEATS
- Access tokens expire in 1 hour. No silent refresh without a backend.
- Users must re-authenticate when the token expires (popup).
- Feature is already blocked on Moj providing credentials, so this constraint is moot for current scope.
- When credentials arrive, implement as a `useGmailToken` hook that calls `requestAccessToken()` and stores the token in React state. Treat it as a session-scoped resource.

**What NOT to do:** Do not use `google-auth-library` npm package — it's a Node.js library, not browser-compatible. Do not use `googleapis` npm package — same problem, Node.js only.

## Installation

```bash
# CSV parsing — used in import scripts (Node/tsx context)
pnpm add papaparse
pnpm add -D @types/papaparse

# Data visualization — used in dashboard (browser/React context)
pnpm add recharts
```

No npm install needed for Gmail — use the Google GIS script loaded at runtime.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| papaparse | Hand-rolled parseCSV (current) | Never — the current parser doesn't handle edge cases: escaped quotes inside quoted fields, Windows line endings, BOM bytes at file start. Briell's CSVs from Google Sheets will hit all of these. |
| recharts v3 | @mui/x-charts | If you wanted MUI's design system. Adds MUI as a dependency — wrong direction for this codebase. |
| recharts v3 | visx (@visx/*) | If you needed highly custom, bespoke chart rendering (e.g., the equity ring itself). visx React 19 support was still in-progress as of early 2026. |
| recharts v3 | nivo | Viable alternative, similar API, but requires --legacy-peer-deps with React 19 as of March 2026. |
| GIS token model (CDN) | Proxy server / Cloudflare Worker | If silent token refresh becomes a hard requirement. A lightweight Worker can hold the client secret and exchange the auth code. Worthwhile if Gmail becomes a tier-1 feature post-scope. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `csv-parse` | Node.js stream-based API — wrong mental model for this use case; papaparse handles both browser File objects and Node.js strings cleanly. | papaparse |
| `google-auth-library` (npm) | Node.js only. Will not run in browser. The googleapis client makes the same assumption. | GIS script via CDN |
| `react-papaparse` | Wrapper around papaparse that adds React hooks/components. Last published 2 years ago. Adds nothing — the import scripts are plain Node context anyway; the app itself never parses CSVs client-side. | papaparse directly |
| recharts v2 | No official React 19 peer dep. Requires package overrides to silence errors. v3 is stable (3.8.0). | recharts v3 |
| d3 directly | Correct but steep: you'd build everything from primitives. D3 is already vendored inside recharts; no need to take it on directly for charts that are essentially sparklines and ring-fills. | recharts |

## Stack Patterns by Feature

**CSV import pipeline (Priority 1):**
- Use papaparse in the `tsx` import scripts (`src/scripts/`)
- `Papa.parse(fileContent, { header: true, skipEmptyLines: true })` handles any Briell CSV variant
- Column mapping stays in the script — papaparse just provides `data[]` as typed objects

**Visual redesign (Priority 2):**
- No new libraries needed. The design system is CSS custom properties + Tailwind.
- Recharts only for any new metric charts on the dashboard. The equity ring is custom SVG (already exists).

**Enriched contact profiles (Priority 3):**
- No new libraries needed. New Airtable fields, new UI components.

**Gmail integration (Priority 4 — blocked):**
- Load GIS at runtime: `<script src="https://accounts.google.com/gsi/client" async></script>` or dynamic import
- Scope: `https://www.googleapis.com/auth/gmail.readonly`
- Call `google.accounts.oauth2.initTokenClient({...}).requestAccessToken()`
- Fetch Gmail REST API directly with the token

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| recharts@3.8.0 | react@19.2.0 | v3 officially targets React 19. v2 does not. |
| papaparse@5.5.3 | tsx@4.21.0, Node 18+ | Works in both browser (File/string) and Node.js (string from fs.readFileSync). |
| @types/papaparse@5.5.2 | typescript@5.9.3 | Matches papaparse@5.5.x. |

## Sources

- [papaparse npm](https://www.npmjs.com/package/papaparse) — confirmed v5.5.3 latest
- [@types/papaparse npm](https://www.npmjs.com/package/@types/papaparse) — confirmed v5.5.2 latest
- [recharts npm](https://www.npmjs.com/package/recharts) — confirmed v3.8.0 latest, 13 days old at time of research
- [recharts React 19 issue #4558](https://github.com/recharts/recharts/issues/4558) — CLOSED/COMPLETED, v3 resolves it
- [Google Identity Services — token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model) — confirmed browser-only feasibility and limitations (no silent refresh, popup-only UX)
- [Google OAuth2 web overview](https://developers.google.com/identity/oauth2/web/guides/overview) — confirmed `google-auth-library` is Node-only

---
*Stack research for: Kinship Brain — CSV import, visual redesign, Gmail OAuth, enriched profiles*
*Researched: 2026-03-20*
