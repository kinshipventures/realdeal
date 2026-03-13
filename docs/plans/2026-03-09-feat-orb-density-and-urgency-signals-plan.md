---
title: "feat: Orb density signals — contact counts + overdue urgency"
type: feat
date: 2026-03-09
brainstorm: docs/brainstorms/2026-03-09-orb-density-and-urgency-brainstorm.md
---

# feat: Orb density signals — contact counts + overdue urgency

## Overview

Two additive changes to make orbs feel alive:

1. **Contact counts** on list orbs (home) and category orbs (list view) — a small muted number below the name.
2. **Overdue urgency signal** on list orbs — a warm dot + count when contacts in that list are overdue.

No new navigation, no new views. Pure data layered onto the existing orb visual system.

---

## Technical Approach

### Performance — zero extra API calls

`_contactsCache` is already populated during `init()` (OrbMap calls `getOverdueContacts` which calls `getContacts()` internally). Once the cache is warm, deriving all counts is a single in-memory pass over the contact array — free.

Current `init()` only checks overdue for **priority lists** and stores a `Set<string>` of list IDs (boolean). This needs to expand to:
- All lists (not just priority)
- Return `{ total, overdue }` counts per list, not just a boolean flag

Category counts are derived the same way: single pass, filter by `categoryId`.

### Data flow

```
init()
  → getContacts()          // warms _contactsCache once
  → single pass over contacts
      → contactCountsByList: Record<string, { total: number; overdue: number }>
      → contactCountsByCategory: Record<string, number>  (built in handleListClick)
  → buildHomeNodes(lists, contactCountsByList, ...)
  → ListNode receives { contactCount, overdueCount }

handleListClick()
  → getContacts() (cache hit — free)
  → derive contactCountsByCategory for this list's categories
  → category nodes receive { contactCount }
```

---

## Implementation Steps

### 1. `src/components/map/OrbMap.tsx`

**In `init()`** — replace the existing per-list `getOverdueContacts` loop with a single pass:

```ts
const allContacts = await getContacts()  // warms cache

// Single pass: build { total, overdue } per list
const countsByList: Record<string, { total: number; overdue: number }> = {}
for (const contact of allContacts) {
  for (const listId of contact.list_ids) {
    if (!countsByList[listId]) countsByList[listId] = { total: 0, overdue: 0 }
    countsByList[listId].total++
    if (isOverdue(contact)) countsByList[listId].overdue++
  }
}
```

Pass `countsByList` into `buildHomeNodes`.

**In `handleListClick()`** — after fetching categories, derive category counts:

```ts
const allContacts = await getContacts()  // cache hit
const countsByCategory: Record<string, number> = {}
for (const contact of allContacts) {
  if (!contact.list_ids.includes(list.id)) continue
  for (const catId of contact.category_ids) {
    countsByCategory[catId] = (countsByCategory[catId] ?? 0) + 1
  }
}
```

Pass `countsByCategory` into category node data.

**Update `buildHomeNodes` signature:**

```ts
function buildHomeNodes(
  lists: List[],
  countsByList: Record<string, { total: number; overdue: number }>,
  savedPositions: Positions,
  onListClick: (list: List, pos: XYPosition) => void
): Node[]
```

Write `contactCount` and `overdueCount` into each list node's `data`.

---

### 2. `src/lib/types.ts` (or node type definitions in OrbMap)

**`ListNodeData`** — replace `isOverdue: boolean` with:

```ts
contactCount: number
overdueCount: number
```

**`CategoryNodeData`** — add:

```ts
contactCount?: number
```

---

### 3. `src/components/map/ListNode.tsx`

Replace the single name `<span>` with a stacked layout:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1, padding: '0 10px' }}>
  <span style={{ fontSize: fontSize(list.name), fontWeight: 500, ... }}>
    {list.name}
  </span>
  <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.30)', letterSpacing: '0.01em' }}>
    {contactCount}
  </span>
  {overdueCount > 0 && (
    <span style={{ fontSize: 9, color: 'hsla(20, 80%, 50%, 0.75)', display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'hsla(20, 80%, 50%, 0.75)', display: 'inline-block' }} />
      {overdueCount}
    </span>
  )}
</div>
```

Update `isOverdue` → `overdueCount` in the pulsing ring condition: `overdueCount > 0`.

---

### 4. `src/components/map/CategoryNode.tsx`

Same stacked layout treatment, lighter:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, position: 'relative', zIndex: 1, padding: '0 8px' }}>
  <span style={{ fontSize: fontSize(category.name), fontWeight: 500, ... }}>
    {category.name}
  </span>
  {contactCount !== undefined && (
    <span style={{ fontSize: 8, color: 'rgba(0,0,0,0.28)', letterSpacing: '0.01em' }}>
      {contactCount}
    </span>
  )}
</div>
```

---

## Acceptance Criteria

- [ ] List orbs on home view show total contact count below the name
- [ ] List orbs show a warm dot + overdue count only when `overdueCount > 0`
- [ ] Category orbs show contact count below the name when available
- [ ] No additional Airtable API calls on home load (counts derived from warm cache)
- [ ] Count labels fit within the orb without overflowing (96px list, 64px category)
- [ ] Pulsing red ring on list orb still works, now driven by `overdueCount > 0`
- [ ] Count labels are visually secondary — muted, smaller than the name

---

## Visual Spec

```
List orb (96px):
  ┌─────────────────┐
  │                 │
  │  Svcs for       │  ← name, 10–13px, weight 500
  │  Founders       │
  │    514          │  ← total count, 9px, rgba(0,0,0,0.30)
  │   ● 3           │  ← warm dot + overdue, 9px, only when > 0
  │                 │
  └─────────────────┘

Category orb (64px):
  ┌──────────┐
  │          │
  │ Branding │  ← name, 9–11px
  │    23    │  ← count, 8px, rgba(0,0,0,0.28)
  │          │
  └──────────┘
```

---

## Out of Scope

- Overdue signals on category orbs
- Last contacted timestamps
- Color-coding orbs by recency
