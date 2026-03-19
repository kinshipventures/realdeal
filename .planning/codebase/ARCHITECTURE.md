# Architecture

**Analysis Date:** 2026-03-18

## Pattern Overview

**Overall:** Client-side SPA with direct Airtable API integration. No backend. Two complementary views: Dashboard (metric-driven) and Orb Map (spatial navigation). Core domain is relationship equity scoring.

**Key Characteristics:**
- Single page app (React 19 + React Router v7) with two routes: `/` (Dashboard) and `/map` (OrbMap)
- All data fetched directly from Airtable REST API; no backend server
- React Flow (v12) handles orb map visualization with draggable node positions persisted to localStorage
- Equity scoring module drives "Today's Focus" and pod health metrics
- Client-side caching with stale-while-revalidate pattern for contacts, categories, interactions

## Layers

**Data Layer (`src/lib/airtable.ts`):**
- Purpose: Single point of contact with Airtable REST API. Handles all CRUD operations and caching logic.
- Location: `src/lib/airtable.ts`
- Contains: `request()` helper (with auth), `fetchAll()` (pagination), table-specific mappers (`mapPod`, `mapContact`, etc.), cache invalidation functions
- Depends on: Airtable SDK (none; native fetch), environment variables (`VITE_AIRTABLE_TOKEN`, `VITE_AIRTABLE_BASE_ID`)
- Used by: All components and equity scoring. Caching happens at module level via `_contactsCache`, `_categoriesCache`, `_interactionsCache`

**Domain/Scoring Layer (`src/lib/equity.ts`):**
- Purpose: Relationship equity calculations. Normalizes 0-100 contact/pod/overall scores; identifies overdue/dormant contacts; generates "Today's Focus".
- Location: `src/lib/equity.ts`
- Contains: Weighted interaction scoring (`INTERACTION_WEIGHTS`), contact equity score, pod equity score, overall equity score, dormancy detection, focus ranking algorithm
- Depends on: Type definitions and time calculations (no external deps)
- Used by: Dashboard component for rendering scores, overdue detection, focus list generation

**Type System (`src/lib/types.ts`):**
- Purpose: Semantic types for domain concepts: `Pod`, `Category`, `Contact`, `Interaction`, `FocusItem`
- Semantic type aliases: `HexColor`, `ISODate`, `InteractionType`, `Owner`, `Cadence`
- Contains: Type and interface definitions matching Airtable schema
- Used by: All layers

**UI Component Layer (`src/components/`):**
- Dashboard (`src/components/dashboard/Dashboard.tsx`): Home view with equity ring, pod cards, Today's Focus, overdue queue, dormant cleanup
- OrbMap (`src/components/map/OrbMap.tsx`): Spatial relationship visualization with two states: home (list orbs) and category (contacts in a list)
- Contacts (`src/components/contacts/`): ContactDetail (edit/create), ContactPanel (list per category), ContactCard (row), InteractionSection (history)
- Map Nodes (`src/components/map/`): ListNode, CategoryNode, MojNode, CreateCategoryNode, GlassOrb (reusable visual component)
- Shared (`src/components/ui.tsx`): Spinner, Avatar, CloseButton primitives

**Router Layer (`src/App.tsx` and `src/main.tsx`):**
- AppShell component manages layout: full-viewport background, floating pill navigator, Outlet for route content
- BrowserRouter and ReactFlowProvider wrap the app at entry point
- Floating navigation (bottom-center pill) toggles between Pulse (Dashboard) and Map views

## Data Flow

**Interaction Logging Flow:**

1. User clicks "Log Interaction" in ContactDetail or ContactPanel
2. Component calls `logInteraction(contactId, data)` from `src/lib/airtable.ts`
3. `logInteraction` internally calls:
   - `createInteraction()` → POST to Interactions table, returns Interaction
   - `updateContact()` → PATCH last_contacted_at (if type ≠ 'note')
   - Optimistically appends to `_interactionsCache` to avoid full re-fetch
4. ContactDetail re-renders and calls `onSaved()` callback to parent
5. Dashboard re-computes equity scores via `getAllInteractions()` (stale-while-revalidate)

**Dashboard Load Flow:**

1. On mount, Dashboard initiates 3 independent fetches (graduated loading):
   - `getContacts()` → filters by `last_contacted_at`, cache hits within 5min
   - `getPods()` → all priority/non-priority pods
   - `getAllInteractions()` → 90-day scoped window via Airtable filterByFormula
2. Data arrives independently; each section shows Spinner until ready
3. `useMemo` dependencies pre-index interactions via `indexByContact()` for O(1) lookups
4. Scores computed once from full dataset: `overallEquityScore()`, per-pod stats, overdue/dormant detection

**Orb Map Navigation Flow:**

1. OrbMap renders home state: Moj (116px) at center, Pods (96px) in circle at radius 310
2. User clicks a Pod orb → `handleListClick()` triggered
3. Fetches categories for that Pod: `getCategories(podId)` (filtered client-side)
4. Builds category-view node graph: Pod stays in place, categories (64px) orbit at radius 230
5. Node positions persist to localStorage key `kinshipbrain:node-positions:v2` on every drag
6. Back button or "Moj" click returns to home view

**Cache Strategy (Stale-While-Revalidate):**

- TTL: 5 minutes (`CACHE_TTL = 5 * 60 * 1000`)
- `getContacts()`, `getCategories()`, `getAllInteractions()` implement pattern:
  - Fresh cache (< 5min): return immediately
  - Stale cache (> 5min): return stale data, refresh in background, update cache
  - Cold cache: deduplicate concurrent fetches via in-flight Promise `_contactsFetch`
- Manual invalidation: `_contactsCache = null` after mutations, `invalidateInteractionsCache()` for interactions

**State Management:**

- Component local state: Dashboard, OrbMap, ContactDetail use useState for UI-only state
- Global client state: Airtable caches (module-level)
- UI state persisted to localStorage: node positions (`useNodePositions`), dormant snooze times (Dashboard)

## Key Abstractions

**Equity Scoring System:**
- Purpose: Quantify relationship health across contacts/pods
- Examples: `contactEquityScore()`, `podEquityScore()`, `overallEquityScore()` in `src/lib/equity.ts`
- Pattern: Weighted interaction history with recency falloff. Recent interactions (≤30 days) weighted 1.0; decay to 0 by 90 days. Types weighted: intro(5) > meeting(4) > call/text/email(2-3) > note(0)

**Today's Focus Algorithm:**
- Purpose: Surface top 3 contacts needing attention today
- Located in `src/lib/equity.ts`, function `todaysFocus()`
- Pattern: Rank overdue contacts in priority pods by days overdue; fill remaining slots with serendipity picks (deterministic daily shuffle)

**Glass Orb Visual System:**
- Purpose: Unified reusable visual for Pods, Categories, and Moj
- Location: `src/components/map/GlassOrb.tsx`
- Pattern: Radial gradient layers (specular + color refraction + ambient + base) with CSS custom properties for responsiveness. Hover effects via CSS (not JS transforms) to prevent render conflicts

**Node Persistence:**
- Purpose: Remember user's spatial layout preferences across sessions
- Location: `src/hooks/useNodePositions.ts`
- Pattern: localStorage key `kinshipbrain:node-positions:v2` stores `Record<nodeId, {x, y}>`. Version bumped when default layout changes.

## Entry Points

**Application Entry (`src/main.tsx`):**
- Location: `src/main.tsx`
- Triggers: Browser page load
- Responsibilities: Mount React app, wrap with ReactFlowProvider and BrowserRouter

**App Shell (`src/App.tsx`):**
- Location: `src/App.tsx` export `default App()`
- Triggers: On mount after ReactFlowProvider
- Responsibilities: Define routes, render AppShell wrapper (background, floating nav), render route Outlet

**Dashboard (`src/components/dashboard/Dashboard.tsx`):**
- Location: `src/components/dashboard/Dashboard.tsx` export `Dashboard()`
- Triggers: Route path `/`
- Responsibilities: Fetch contacts/pods/interactions, compute scores, render equity ring, pod cards, Today's Focus, overdue queue, dormant cleanup

**Orb Map (`src/components/map/OrbMap.tsx`):**
- Location: `src/components/map/OrbMap.tsx` export `OrbMap()`
- Triggers: Route path `/map`
- Responsibilities: Manage two-view state (home/category), render React Flow graph, handle node drag/position persistence, open/close ContactPanel

## Error Handling

**Strategy:** Client-side try/catch with user-facing error states. Silent recovery where possible (e.g., concurrent fetch deduplication prevents cascading requests).

**Patterns:**

- **Airtable Request Errors:** `request()` throws with formatted error message `Airtable ${status}: ${text}`. Caught at component level, sets error state (e.g., `setError()` in Dashboard)
- **Cache Invalidation on Mutation:** After create/update/delete, cache set to `null`. On next read, cold-cache path fetches fresh data. No partial updates.
- **Stale Data Fallback:** If background refresh fails during stale-while-revalidate, stale data persists. User sees stale until next successful fetch or manual retry.
- **Optimistic Append:** On `createInteraction()`, immediately append to `_interactionsCache` before server response. If mutation fails, cache inconsistency undetected (acceptable for this use case).
- **Field-Level Save Errors:** ContactDetail tracks per-field save errors via `saveError` state. User can retry; generation counter prevents stale responses overwriting newer edits.

## Cross-Cutting Concerns

**Logging:** None. No logging infrastructure. Errors surface as exception throws or silent fails (SWR fallback).

**Validation:** Minimal. Contact form fields accept any input. Airtable validates schema on server. Interaction dates required; contact IDs validated via regex.

**Authentication:** Bearer token auth via Airtable API token. Token stored in `.env.local` as `VITE_AIRTABLE_TOKEN`. No user session or identity layer.

---

*Architecture analysis: 2026-03-18*
