---
title: "feat: Dashboard home view"
type: feat
date: 2026-03-09
brainstorm: docs/brainstorms/2026-03-09-dashboard-view-brainstorm.md
---

# feat: Dashboard home view

## Enhancement Summary

**Deepened on:** 2026-03-09
**Research agents used:** kieran-typescript-reviewer, performance-oracle, julik-frontend-races-reviewer, code-simplicity-reviewer, architecture-strategist, silent-failure-hunter, ui-design

### Key Improvements Over v1 Plan
1. **API bug fixed**: `getRecentInteractions` must use `fetchAll(TABLES.interactions, params)` (second arg), not bake the query string into the table URL — the inline approach silently breaks pagination offset logic
2. **`Promise.allSettled` instead of `Promise.all`**: Three independent fetches shouldn't fail atomically — contacts + lists load even if interactions fail
3. **`daysOverdue` returns `number | null`** (not `Infinity`) — forces callers to handle the "never contacted" case explicitly via TypeScript, prevents `"Infinity days overdue"` rendering
4. **`daysOverdue` moves to `utils.ts`** — pure computation on a domain type, not a data layer concern
5. **`contactsById` Map** for O(1) feed row lookup instead of O(n) `.find()`
6. **Schwartzian transform** on overdue sort — compute `daysOverdue` once per contact, not twice per comparison
7. **Stale closure fix** in `handleContactDeleted` — capture `id` before closing
8. **Error state** added to data load (was missing entirely)
9. **Precise visual spec** — row hover, overdue color tokens, panel headers, pill button exact styles

### Existing Bugs Found (Fix Alongside Dashboard)
- `OrbMap.tsx` `init()` has no `.catch()` — blank canvas forever on Airtable failure
- `OrbMap.tsx` `handleListClick` has no `.catch()` — orb permanently frozen in loading state
- `ContactPanel.tsx` `getContacts()` has no `.catch()` — spinner never clears on failure

These are pre-existing, not dashboard-specific. Fix them as part of this PR.

---

## Overview

Replace the orb map as the default entry point with a task-oriented dashboard. The dashboard answers "what do I do today" — overdue contacts to re-engage, network at a glance, and a pulse of recent activity. The orb map moves to `/map` and remains accessible via a header button.

---

## Routing Change

`src/App.tsx` currently has a single route: `<Route path="/" element={<OrbMap />} />`.

After:
```
/          → <Dashboard />   (new)
/map       → <OrbMap />      (moved)
```

No new router library — react-router v7 is already installed. No catch-all route needed for v1.

---

## Layout

```
┌─────────────────────────────────────────────────┐
│  Kinship Brain                  [ Map view → ]  │  ← "Map view →" pill (top: 28, right: 28)
├────────────────────────┬────────────────────────┤
│  needs attention  (29) │  network               │  ← queue: 18px/600. stats: 11px label
│                        │  514 contacts           │
│  ● Alice K.            │  Investors · 88         │
│    Legal · 62d ago     │  Founders · 64          │
│  ● Bob T.              │  Operators · 59         │
│    Design · 45d ago    │  26 categories          │
│  ● Maya S.             │──────────────────────────│
│    PR · Never          │  recent                 │  ← 11px label
│  …                     │  · Call w/ Alice  3d    │
│                        │  · Intro → Bob    1w    │
│                        │  · Note on Maya   2w    │
└────────────────────────┴────────────────────────┘
```

Split: left 60% (overdue queue), right 40% (stats + feed). All glass panel aesthetic — same visual system as the orb map.

---

## Data Requirements

| Panel | Source | Notes |
|---|---|---|
| Overdue queue | `getContacts()` + `isOverdue()` client-side | Free from warm cache |
| Network stats | `getLists()` + contacts local state | getLists() network fetch; counts derived from contacts |
| Recent activity | `getRecentInteractions(20)` — new function | One network call, Airtable sort + maxRecords |

All three fire in parallel on mount via `Promise.allSettled` — each panel degrades independently on failure.

---

## Implementation Steps

### 1. `src/lib/utils.ts` — Add `daysOverdue`

Returns `null` for never-contacted (forces display callers to handle it explicitly via type system — prevents `"Infinity days overdue"` reaching the screen).

```ts
// src/lib/utils.ts
export function daysOverdue(contact: Contact): number | null {
  if (!contact.last_contacted_at) return null  // never contacted
  return Math.floor((Date.now() - new Date(contact.last_contacted_at).getTime()) / 86_400_000)
}
```

Note: `isOverdue()` stays in `airtable.ts` (already used by OrbMap — don't move it). `daysOverdue` is a new pure utility, belongs in utils.

---

### 2. `src/lib/airtable.ts` — Add `getRecentInteractions`

Follows the same `fetchAll(table, params)` + `mapInteraction` pattern as `getInteractions()`. Uses `fetchAll`'s second-argument params object — do NOT bake params into the table URL string (that silently breaks the pagination offset logic in `fetchAll`).

```ts
export async function getRecentInteractions(limit: number): Promise<Interaction[]> {
  const records = await fetchAll<InteractionFields>(TABLES.interactions, {
    'sort[0][field]': 'Date',
    'sort[0][direction]': 'desc',
    maxRecords: String(limit),
  })
  return records.map(mapInteraction)
}
```

---

### 3. `src/App.tsx` — Add routes

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { OrbMap } from './components/map/OrbMap'
import { Dashboard } from './components/dashboard/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/map" element={<OrbMap />} />
      </Routes>
    </BrowserRouter>
  )
}
```

---

### 4. `src/components/dashboard/Dashboard.tsx` — New component

**State model:**

```ts
const [contacts, setContacts] = useState<Contact[]>([])
const [lists, setLists] = useState<List[]>([])
const [recentInteractions, setRecentInteractions] = useState<Interaction[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

// Schwartzian transform: compute daysOverdue once per contact, not twice per comparison
const overdueContacts = useMemo(() =>
  contacts
    .filter(isOverdue)
    .map(c => ({ c, days: daysOverdue(c) }))           // daysOverdue: number | null
    .sort((a, b) => {
      // null = never contacted → sorts first (highest urgency)
      if (a.days === null && b.days === null) return a.c.name.localeCompare(b.c.name)
      if (a.days === null) return -1
      if (b.days === null) return 1
      if (a.days === b.days) return a.c.name.localeCompare(b.c.name)
      return b.days - a.days  // most overdue first
    })
    .map(({ c }) => c),
  [contacts]
)

const totalContacts = contacts.length  // O(1) — no memo needed

const countsByList = useMemo(() => {
  const map: Record<string, number> = {}
  for (const c of contacts) {
    for (const lid of c.list_ids) {
      map[lid] = (map[lid] ?? 0) + 1
    }
  }
  return map
}, [contacts])

// O(1) lookup for feed row contact resolution
const contactsById = useMemo(() => {
  const map = new Map<string, Contact>()
  for (const c of contacts) map.set(c.id, c)
  return map
}, [contacts])
```

**Data load (Promise.allSettled — panels degrade independently):**

```ts
useEffect(() => {
  Promise.allSettled([getContacts(), getLists(), getRecentInteractions(20)])
    .then(([contactsResult, listsResult, interactionsResult]) => {
      if (contactsResult.status === 'fulfilled') setContacts(contactsResult.value)
      else setError('Could not load contacts.')

      if (listsResult.status === 'fulfilled') setLists(listsResult.value)

      if (interactionsResult.status === 'fulfilled') setRecentInteractions(interactionsResult.value)
      // interactions failure is silent — feed shows empty state
    })
    .finally(() => setLoading(false))
}, [])
```

**ContactDetail callbacks:**

```ts
// Patch the contact in local state → overdueContacts re-derives automatically
const handleContactSaved = (updated: Contact) => {
  setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
}

// Stale closure fix: capture id before the callback is called
const handleContactDeleted = () => {
  if (!selectedContact) return
  const id = selectedContact.id          // capture now — avoids stale closure
  setContacts(prev => prev.filter(c => c.id !== id))
  setSelectedContact(null)
}
```

**CategoryId for ContactDetail:** Pass `contact.category_ids[0] ?? ''` when opening from dashboard. CategoryId is only used when creating new contacts — opening an existing contact from dashboard is view/edit mode only, so the value doesn't matter functionally.

---

### 5. Overdue queue row layout

```
┌──────────────────────────────────────────────────┐
│  [avatar]  Alice K.                   62d ago    │
│            Legal at Firma                        │
└──────────────────────────────────────────────────┘
```

- Avatar: 32px circle, `avatarHue(name)` from utils.ts, initials from `initials(name)`
- Name: 13px/500, `rgba(0,0,0,0.82)`
- Role/Company: 11px, `rgba(0,0,0,0.38)` (only if present — "Role at Company" or just "Company")
- Days label: right-aligned, 11px/500
  - `null` (never contacted): `"Never contacted"`, color `rgba(0,0,0,0.28)`
  - days > 0: `"${days}d ago"`, color `hsla(20, 80%, 45%, 0.80)`
- Row hover: `background: rgba(0,0,0,0.035)`, `transition: background 0.15s ease`
- Row border: `borderBottom: '1px solid rgba(0,0,0,0.04)'`

**Overdue count pill in header** (next to "needs attention" heading):

```ts
{
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 7px',
  borderRadius: 100,
  background: 'hsla(20, 80%, 45%, 0.10)',
  border: '1px solid hsla(20, 80%, 45%, 0.18)',
  fontSize: 11,
  fontWeight: 500,
  color: 'hsla(20, 80%, 45%, 0.80)',
  letterSpacing: '0.01em',
  marginLeft: 8,
}
```

---

### 6. Stats panel

Priority lists first, then alphabetical. Category count: `new Set(contacts.flatMap(c => c.category_ids)).size`.

```
network                          ← 11px section label, rgba(0,0,0,0.25)
514 contacts                     ← 24px/600 or similar — the number is the focus
──────────────────────────────
Investors              88        ← 13px, rgba(0,0,0,0.65)
Founders               64
Operators              59
──────────────────────────────
26 categories
```

---

### 7. Recent activity feed row

Contact name resolved via `contactsById.get(interaction.contact_id)`. If not found (deleted contact), omit the row silently. If feed row is clicked → opens `ContactDetail` for that contact.

```
recent                           ← 11px section label
· Call · Alice K.       3d ago   ← interaction type + name + relative time
· Intro · Bob T.        1w ago
```

Row: `fontSize: 12`, `color: rgba(0,0,0,0.65)`, type label in muted `rgba(0,0,0,0.38)`.
Relative time via `formatRelativeTime(interaction.date)` from utils.ts.

---

### 8. Visual style

**Background:** Same atmosphere gradient as `OrbMap`:
```ts
background: [
  'radial-gradient(ellipse 70% 55% at 12% 8%,  rgba(180,160,255,0.13) 0%, transparent 60%)',
  'radial-gradient(ellipse 55% 45% at 88% 88%, rgba(255,160,100,0.10) 0%, transparent 55%)',
  'radial-gradient(ellipse 45% 40% at 75% 10%, rgba(140,200,255,0.08) 0%, transparent 50%)',
  '#F5F4F0',
].join(', ')
```

**Panels:**
- `background: rgba(245,244,240,0.88)`
- `backdropFilter: blur(32px)`
- `border: 1px solid rgba(0,0,0,0.07)`
- `borderRadius: 16`

**"Map view →" button** — exact same styles as OrbMap's breadcrumb pill (lines 266-301 of OrbMap.tsx):
```ts
{
  padding: '8px 18px',
  borderRadius: 100,
  background: 'rgba(255,255,255,0.70)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(0,0,0,0.07)',
  fontSize: 12,
  letterSpacing: '0.01em',
  color: 'rgba(0,0,0,0.35)',
  cursor: 'pointer',
  position: 'absolute', top: 28, right: 28,
}
```
Color shifts to `rgba(0,0,0,0.7)` on hover. No underline, no arrow animation.

**Panel headers:**
- Queue: 18px/600 heading (same as ContactPanel.tsx line 74)
- Stats/feed: 11px section labels only (`rgba(0,0,0,0.25)`, lowercase)

**Loading state:** Spinner in each panel's content area (20px, matches ContactPanel.tsx lines 158-166). Panel shells + headers render immediately; spinner fills content area until data resolves.

**Empty states:**
- "All caught up." — `padding: 64px 24px, textAlign: center, fontSize: 13, color: rgba(0,0,0,0.38)`
- "No recent activity." — `padding: 48px 24px, textAlign: center, fontSize: 13, color: rgba(0,0,0,0.25)`

---

### 9. Pre-existing error handling fixes (do in this PR)

**`OrbMap.tsx` `init()`** — add stale guard + error handling:
```ts
useEffect(() => {
  let stale = false
  async function init() {
    try {
      const [allLists, allContacts] = await Promise.all([getLists(), getContacts()])
      if (stale) return
      // ... rest of init
    } catch (err) {
      console.error('Failed to load network:', err)
    }
  }
  init()
  return () => { stale = true }
}, [])
```

**`OrbMap.tsx` `handleListClick`** — add `.catch()` that resets loading state on the orb:
```ts
getCategories(list.id)
  .then(async (cats) => { /* existing */ })
  .catch(() => {
    setNodes(prev => prev.map(n =>
      n.id === list.id ? { ...n, data: { ...n.data, loading: false } } : n
    ))
  })
```

**`ContactPanel.tsx` `getContacts()`** — add `.finally(() => setLoading(false))` + `.catch`.

---

## Acceptance Criteria

- [ ] `/` renders the Dashboard, not the OrbMap
- [ ] `/map` renders the OrbMap
- [ ] "Map view →" button navigates to `/map` (glass pill, top-right, same style as OrbMap breadcrumb)
- [ ] Overdue contacts sorted: never-contacted first, then by days overdue desc, then alphabetical
- [ ] Clicking an overdue contact row opens `ContactDetail` panel
- [ ] Logging a non-note interaction removes the contact from the queue (last_contacted_at updates)
- [ ] Deleting a contact removes them from the queue
- [ ] Clicking a feed row opens `ContactDetail` for that contact
- [ ] Network stats: total count + per-list counts (priority lists first) + category count
- [ ] Recent activity feed: last 20 interactions, contact name resolved, relative time
- [ ] No overdue contacts → "All caught up." empty state
- [ ] No recent interactions → "No recent activity." empty state
- [ ] Loading: panel shells + headers render immediately; spinners fill content areas
- [ ] Interactions fetch failure is silent (empty feed, no error shown)
- [ ] Contacts fetch failure surfaces an inline error message
- [ ] OrbMap `init()` has a stale guard + error catch (no more permanent blank canvas)
- [ ] OrbMap `handleListClick` resets orb loading state on fetch failure
- [ ] Visual aesthetic matches OrbMap — same gradient, glass panels, design tokens

---

## Out of Scope (v1)

- Updating the activity feed when a new interaction is logged (feed is mount-only)
- Filtering the overdue queue by list
- Bulk actions on overdue contacts
- Charts or graphs
- Notifications or reminders
- 404 catch-all route
- Global error boundary (noted as good to add, not blocking)

---

## Key Files

| File | Change |
|---|---|
| `src/App.tsx` | Add `/` → Dashboard, `/map` → OrbMap routes |
| `src/lib/airtable.ts` | Add `getRecentInteractions()` |
| `src/lib/utils.ts` | Add `daysOverdue(contact): number \| null` |
| `src/components/dashboard/Dashboard.tsx` | New — main dashboard component |
| `src/components/map/OrbMap.tsx` | Fix error handling in `init()` + `handleListClick` |
| `src/components/contacts/ContactPanel.tsx` | Fix missing `.catch()` in `getContacts()` |
