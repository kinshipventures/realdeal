# Architecture Research

**Domain:** No-backend relationship intelligence SPA (React 19 + Airtable)
**Researched:** 2026-03-20
**Confidence:** HIGH (based on existing codebase + constraint analysis)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (SPA)                               │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │Dashboard │  │ OrbMap   │  │ContactDe │  │  CSV Import UI   │   │
│  │(Pulse)   │  │(Map)     │  │  tail    │  │  (future)        │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │             │             │                  │             │
│  ─────┴─────────────┴─────────────┴──────────────────┴──────────── │
│                     lib/airtable.ts (data layer)                    │
│    request() / fetchAll() / module-level caches                     │
│    getPods / getContacts / getCategories / getInteractions          │
│  ─────────────────────────────────────────────────────────────────  │
│                     lib/equity.ts (compute layer)                   │
│    contactEquityScore / podEquityScore / todaysFocus                │
│  ─────────────────────────────────────────────────────────────────  │
│                     localStorage (UI state only)                    │
│    node positions / dormant snooze / viewport                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST (CORS, PAT in env)
                    ┌──────────▼──────────┐
                    │   Airtable REST API  │
                    │   4 tables:          │
                    │   Lists / Categories │
                    │   Contacts / Inter.  │
                    └──────────────────────┘

                    ┌──────────────────────┐
                    │   Toast Bot (separate)│
                    │   OpenClaw / Mac Mini │
                    │   Reads same Airtable │
                    └──────────────────────┘

                    ┌──────────────────────┐
                    │   Import Scripts      │
                    │   (Node, pnpm run)    │
                    │   Writes Airtable     │
                    └──────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `App.tsx` + `AppShell` | Routing (Pulse / Map), floating nav, background | Router only |
| `Dashboard` | Equity ring, pod health cards, Today's Focus, dormant cleanup | `lib/airtable`, `lib/equity` |
| `OrbMap` | React Flow canvas, pod → category → contact navigation, view state | `lib/airtable`, `useNodePositions`, child nodes |
| `ListNode` / `CategoryNode` / `MojNode` | Individual orb rendering, orb CSS visual system | `OrbMap` via React Flow |
| `ContactPanel` | Right-side drawer, contact list for a category | `lib/airtable` |
| `ContactDetail` | Full contact profile, edit fields, interaction timeline | `lib/airtable` |
| `InteractionSection` | Timeline UI inside ContactDetail, log interactions | `lib/airtable` |
| `lib/airtable.ts` | All Airtable reads/writes, in-memory cache, stale-while-revalidate | Airtable REST |
| `lib/equity.ts` | Pure scoring functions — no I/O | Called by Dashboard |
| `useNodePositions` | localStorage persistence for orb positions | localStorage |
| Import scripts | One-off CSV ingestion, run by Gabe | Airtable REST directly |

## Recommended Project Structure

```
src/
├── lib/
│   ├── airtable.ts        # data layer — all Airtable I/O
│   ├── equity.ts          # pure scoring functions
│   ├── types.ts           # shared interfaces
│   ├── utils.ts           # hexToRgba, formatRelativeTime
│   └── tokens.ts          # design tokens (to be created)
├── components/
│   ├── map/               # React Flow canvas + orb nodes
│   │   ├── OrbMap.tsx
│   │   ├── GlassOrb.tsx
│   │   ├── ListNode.tsx
│   │   ├── CategoryNode.tsx
│   │   ├── MojNode.tsx
│   │   └── CreateCategoryNode.tsx
│   ├── contacts/          # contact detail, panel, cards
│   │   ├── ContactPanel.tsx
│   │   ├── ContactDetail.tsx
│   │   ├── ContactCard.tsx
│   │   └── InteractionSection.tsx
│   ├── dashboard/         # pulse/dashboard view
│   │   └── Dashboard.tsx
│   └── ui.tsx             # shared primitives (Spinner, Avatar)
├── hooks/
│   └── useNodePositions.ts
├── scripts/               # Node import scripts (not bundled into app)
│   ├── importServiceProviders.ts
│   └── seedLists.ts
└── App.tsx
```

### Structure Rationale

- **lib/**: All non-UI logic lives here. `airtable.ts` is the single I/O boundary — everything else is pure.
- **components/map/ vs contacts/ vs dashboard/**: Domain grouping, not type grouping. Each domain owns its view + subcomponents.
- **scripts/**: Node-only. Not imported by the app. Run via `pnpm seed:*`.

## Architectural Patterns

### Pattern 1: Single I/O Boundary

**What:** All Airtable reads/writes go through `lib/airtable.ts`. No component fetches directly.
**When to use:** Always — this is a core constraint.
**Trade-offs:** Slightly more indirection but makes caching, cache invalidation, and future backend swap trivial.

**Example:**
```typescript
// Good — component calls lib function
const contacts = await getContacts(categoryId)

// Bad — component calls Airtable directly
const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/...`)
```

### Pattern 2: Module-level Stale-While-Revalidate Cache

**What:** Module-level variables (`_contactsCache`, `_categoriesCache`, etc.) serve as an in-memory cache with TTL. Expired cache returns stale data immediately while refreshing in background.
**When to use:** All frequently-read tables (Contacts, Categories, Interactions).
**Trade-offs:** No cache coordination between tabs (acceptable — single-user app). Cache lives for browser session.

**Example:**
```typescript
// Invalidate after any write
_contactsCache = null
// Or optimistic update in-place to skip full re-fetch
if (_contactsCache) _contactsCache[idx] = updated
```

### Pattern 3: Pure Compute Layer

**What:** `lib/equity.ts` contains zero I/O. It receives data, returns numbers.
**When to use:** All scoring, ranking, and derived data.
**Trade-offs:** Components must fetch data first, then pass to equity functions. Keeps logic testable.

**Example:**
```typescript
const byContact = indexByContact(allInteractions)
const score = contactEquityScore(byContact.get(contact.id) ?? [])
```

### Pattern 4: localStorage for UI-Only State

**What:** Node positions, snooze state, viewport — stored in localStorage, keyed with version suffix.
**When to use:** Any state that is purely presentational and per-device.
**Trade-offs:** Not shared across devices (acceptable — Moj uses one machine). Bump key version to invalidate.

## Data Flow

### Standard Read Flow

```
User opens view
    ↓
Component mounts → calls lib/airtable fn (e.g. getContacts())
    ↓
airtable.ts checks module-level cache
    ├── Cache fresh? → return immediately (Promise.resolve)
    ├── Cache stale? → return stale + trigger background refresh
    └── Cache cold? → fetch Airtable REST → populate cache → return
        ↓
Component sets local state → renders
```

### Standard Write Flow

```
User action (log interaction, edit contact)
    ↓
Component calls lib/airtable mutation fn (e.g. logInteraction())
    ↓
airtable.ts → POST/PATCH Airtable REST
    ↓
Optimistic cache update (in-place) OR cache invalidation (null)
    ↓
Component re-fetches or uses returned value to update local state
```

### Toast Bot ↔ App Data Coordination

```
Toast Bot (Telegram / OpenClaw / Mac Mini)
    │ reads/writes
    ▼
Airtable REST (same base, same tables)
    │ app fetches on mount + 5min TTL
    ▼
Kinship Brain App (browser)
```

**Pattern:** Airtable is the shared database. No direct communication between bot and app needed. The app will see bot-written data on next fetch after TTL expires (5 minutes). For user-initiated refresh, expose a manual "sync" button that calls `invalidateContactsCache()` + re-fetch. No webhook, no polling loop, no shared state server required.

### Gmail OAuth Flow (no-backend constraint)

**Problem:** OAuth2 requires a server-side token exchange to keep `client_secret` out of the browser. This app has no server.

**Recommended approach: Vercel serverless function (minimal backend, scoped only to OAuth).**

```
Browser → /api/gmail/auth → Vercel function (holds client_secret)
                             ↓ exchanges code for tokens
                             ↓ stores refresh_token in Airtable (Contacts table, new field)
                             ↓ returns access_token to browser
Browser → Gmail API (using short-lived access_token from Airtable)
```

**Why Vercel over alternatives:**
- Zero infrastructure management — deploys from same repo
- `vercel.json` + `api/` directory is the entire setup
- Free tier covers this low-volume use (one user)
- Keeps `client_secret` server-side where it belongs
- Deferred: blocked on Moj providing Gmail credentials anyway

**Why not PKCE-only (pure client-side OAuth):**
- Gmail API does not support implicit flow for installed apps writing to a user's mailbox
- Refresh token cannot be stored safely in a no-auth SPA

**Why not a third-party bridge (Zapier, n8n):**
- Adds vendor dependency, cost, and latency for no meaningful benefit

### CSV Import Architecture

**Current state:** `importServiceProviders.ts` is hardcoded to the Service Providers CSV column names (`Agency`, `Category`, `Email`, etc.).

**Problem:** LP list, Talent list, and future imports will have different column names.

**Recommended pattern: column mapping object per import.**

```typescript
// scripts/importContacts.ts (generic replacement)
interface ColumnMap {
  name: string          // required
  email?: string
  phone?: string
  company?: string
  role?: string
  category?: string
  location?: string
  notes?: string
  website?: string
}

// Each import defines its own map
const SERVICE_PROVIDERS_MAP: ColumnMap = {
  name: 'Agency',
  email: 'Email',
  category: 'Category',
  phone: 'Contact Info',
  // ...
}

const LP_MAP: ColumnMap = {
  name: 'Full Name',
  email: 'Email Address',
  company: 'Fund',
  // ...
}
```

Script reads the map at runtime, normalizes rows to a common shape, then creates Airtable records. Briell gets a `column-maps.ts` file she can inspect; Gabe edits it per import.

### Design Token Architecture

**Current state:** Inline styles throughout (`rgba(245,244,240,0.88)`, `rgba(0,0,0,0.82)`, hardcoded radii, font weights). Design system documented in `docs/design-system.md` but not enforced in code.

**Problem:** Visual redesign (Trolley CRM direction) will require changing values across dozens of components.

**Recommended: CSS custom properties in `index.css`, consumed by both Tailwind and inline styles.**

```css
/* src/index.css */
:root {
  --bg: #F5F4F0;
  --panel-bg: rgba(245, 244, 240, 0.88);
  --panel-blur: blur(32px);
  --panel-border: rgba(0, 0, 0, 0.07);
  --text-primary: rgba(0, 0, 0, 0.82);
  --text-secondary: rgba(0, 0, 0, 0.45);
  --text-tertiary: rgba(0, 0, 0, 0.28);
  --radius-panel: 16px;
  --radius-orb-lg: 9999px;
  --spacing-base: 8px;
}
```

**Why CSS custom properties over a `tokens.ts` file:**
- Work in inline styles (`style={{ color: 'var(--text-secondary)' }}`) AND CSS classes
- No import needed — available everywhere
- Can be overridden per-component with scoped `:root` equivalents
- Instant visual iteration — change one value, whole app updates

**Complementary:** Keep `src/lib/tokens.ts` for JS-only values (the glass orb opacity constants, animation durations) that can't live in CSS.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Airtable REST | Direct browser fetch, module-level cache | PAT in `.env.local`, exposed to browser — accepted risk |
| Gmail API | Vercel serverless for OAuth exchange; browser calls API with short-lived token | Blocked on credentials. Deferred. |
| Toast Bot | Shared Airtable base — no direct integration | Bot writes, app reads after TTL. Manual refresh sufficient. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Components ↔ Data | `lib/airtable.ts` functions only | No direct fetch calls in components |
| Components ↔ Scoring | `lib/equity.ts` pure functions | Pass data in, get numbers back |
| Map ↔ UI State | `useNodePositions` hook + localStorage | Never in Airtable |
| Snooze state ↔ Dashboard | localStorage directly in Dashboard | Simple enough to not extract |
| Import scripts ↔ App | None — scripts run independently | Both talk to same Airtable base |

## Suggested Build Order

Dependencies flow bottom-up:

1. **Design tokens** (`index.css` custom properties) — unblocks visual work everywhere. No dependencies.
2. **Generic CSV import script** (`scripts/importContacts.ts` with column maps) — enables LP/Talent imports. Depends only on Airtable access.
3. **Contact profile enrichment** (birthday, milestones, interests fields in Airtable + ContactDetail) — extends existing contact data model.
4. **Visual redesign** (Trolley CRM direction applied to Dashboard + OrbMap) — depends on tokens from step 1.
5. **Toast bot bridge** (manual refresh button, cache invalidation on mount) — small addition to existing architecture. No new infrastructure.
6. **Gmail OAuth** (Vercel function + email fetch) — most infrastructure work, blocked on credentials. Build last.

## Anti-Patterns

### Anti-Pattern 1: Fetching Airtable in Components

**What people do:** `useEffect(() => fetch('https://api.airtable.com/...'), [])` directly in a component.
**Why it's wrong:** Bypasses cache, duplicates auth headers, makes cache invalidation impossible.
**Do this instead:** Always call `lib/airtable.ts` functions. Add new functions there if needed.

### Anti-Pattern 2: Storing UI State in Airtable

**What people do:** Saving which panel is open, which contact is selected, sort order — in Airtable.
**Why it's wrong:** Unnecessary API calls, slow, wastes Airtable request quota.
**Do this instead:** `useState` for ephemeral UI state, `localStorage` for persistent UI state.

### Anti-Pattern 3: Polling for Bot-Written Data

**What people do:** `setInterval(() => refetch(), 30000)` to pick up Toast bot changes.
**Why it's wrong:** Wastes Airtable API quota (5 req/sec limit), noisy in network tab, runs even when app is idle.
**Do this instead:** Cache TTL (5 min) handles it passively. Add explicit "Sync" button for on-demand refresh.

### Anti-Pattern 4: One Mega Import Script Per CSV

**What people do:** Copy `importServiceProviders.ts`, rename, change column mappings inline.
**Why it's wrong:** Code duplication, diverging logic, bugs fixed in one but not others.
**Do this instead:** One generic import script, column maps as config objects.

## Scaling Considerations

This is a single-user (Moj + Briell) private app. Scaling is not a concern. The relevant constraints are:

| Constraint | Current State | Risk |
|------------|--------------|------|
| Airtable rate limit | 5 req/sec | LOW — stale-while-revalidate handles it |
| Airtable record limit | 50k/base on free | LOW — hundreds of contacts |
| Browser memory | All contacts in-memory cache | LOW — small dataset |
| Airtable PAT in browser | Exposed in network tab | ACCEPTED — private URL, no auth |

## Sources

- Existing codebase (HIGH confidence — direct read)
- Gmail API OAuth2 docs: https://developers.google.com/identity/protocols/oauth2/web-server (MEDIUM confidence — architecture well-known)
- Vercel serverless functions: https://vercel.com/docs/functions (MEDIUM confidence — standard pattern)
- Airtable API rate limits: https://support.airtable.com/docs/airtable-api-rate-limits (HIGH confidence — documented)

---
*Architecture research for: Kinship Brain — no-backend React SPA, Airtable data layer*
*Researched: 2026-03-20*
