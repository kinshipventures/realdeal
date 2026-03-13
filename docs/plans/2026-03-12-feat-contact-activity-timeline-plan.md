---
title: "feat: Contact Activity Timeline"
type: feat
date: 2026-03-12
brainstorm: docs/brainstorms/2026-03-12-contact-activity-timeline-brainstorm.md
deepened: 2026-03-12
---

# feat: Contact Activity Timeline

## Enhancement Summary

**Deepened on:** 2026-03-12
**Agents used:** TypeScript reviewer, Performance oracle, Simplicity reviewer, Frontend races reviewer, Architecture strategist, Pattern recognition specialist, SVG best practices researcher

### Key Improvements from Research
1. **Race condition fixes** — concurrency guards on log/delete prevent duplicate Airtable records
2. **Stale state prevention** — `latestContactDate` must compute from the transformed array, not closure state; `onSaved` must fire after recalculation or Dashboard goes stale
3. **Performance** — `useMemo` for derived values, single-pass recency computation with early exit
4. **Consistency fix** — `logInteraction()` must exclude `intro` from `last_contacted_at`, matching the new recalculation logic
5. **Fallback bug** — `mapInteraction` must map `event` → `meeting`, not `event` → `note`

### Scope Trimmed
- Dropped `PRIMARY_CHANNELS`/`SECONDARY_TYPES` exports from `types.ts` (keep local)
- Dropped 12px pill gap (just reorder the array)
- Dropped Section 7 (`mapInteraction` fallback as its own section — folded into Section 1)
- Icons scoped to summary bar only; timeline keeps text pills

---

## Overview

Upgrade the interaction section in ContactDetail from a flat, unstyled list into a type-aware activity timeline with a summary bar showing per-type recency. Add `text` as a new interaction type, merge `event` into `meeting`, fix `last_contacted_at` recalculation on edit/delete, and add concurrency guards to prevent duplicate records.

## Problem Statement

Moj needs to see the full picture of her relationship with any contact — when she last talked to them, what they discussed, and through which channels. Currently:

- Interactions are a flat list of type pills with no visual hierarchy
- No per-type differentiation — can't tell at a glance which communication methods are active vs. cold
- No `text` type despite texting being a primary communication channel
- `last_contacted_at` is write-only (set on create, never corrected on edit/delete)
- No concurrency guards — double-clicking "Log" creates duplicate interactions in Airtable

## Proposed Solution

### 1. Type System Updates

**File: `src/lib/types.ts:1`**

Update `InteractionType` union only (no runtime constants in this file — keep it types-only):
```typescript
// Before
export type InteractionType = 'call' | 'email' | 'meeting' | 'intro' | 'event' | 'note'

// After
export type InteractionType = 'call' | 'email' | 'text' | 'meeting' | 'intro' | 'note'
```

**File: `src/components/contacts/ContactDetail.tsx:14-17`**

Update local constants (all presentation concerns stay here):
```typescript
const TYPES: InteractionType[] = ['call', 'email', 'text', 'meeting', 'intro', 'note']
const TYPE_LABELS: Record<InteractionType, string> = {
  call: 'Call', email: 'Email', text: 'Text', meeting: 'Meeting', intro: 'Intro', note: 'Note',
}
```

**File: `src/lib/airtable.ts:242-253`**

Fix `mapInteraction` fallback — un-migrated `event` records should become `meeting`, not `note`:
```typescript
type: r.fields.Type === 'event' ? 'meeting' : (r.fields.Type?.toLowerCase() as InteractionType ?? 'note')
```

**File: `src/lib/airtable.ts:335`**

Fix `logInteraction` to exclude `intro` from `last_contacted_at` updates, matching the new recalculation logic:
```typescript
// Before
if (data.type !== 'note') {

// After
if (data.type !== 'note' && data.type !== 'intro') {
```

### 2. Summary Bar

Add a fixed summary bar below the name/role header in ContactDetail, above the scrollable body.

**Layout:** 4 primary types in a horizontal grid, equal width. Each cell shows:
- Type icon (inline SVG, 14px, `currentColor` stroke) — summary bar only, not the timeline
- Type label (10px, tertiary color)
- Recency value using `formatRelativeTime()` (11px, secondary color — or `rgba(0,0,0,0.22)` for "Never")

**Data derivation:** Single-pass computation, memoized:
```typescript
const typeRecency = useMemo(() => {
  const recency: Record<string, string | null> = { call: null, email: null, text: null, meeting: null }
  const found = new Set<string>()
  for (const i of interactions) {
    if (i.type in recency && !found.has(i.type)) {
      recency[i.type] = i.date
      found.add(i.type)
      if (found.size === 4) break
    }
  }
  return recency
}, [interactions])
```

**Styling:**
- Container: `padding: '12px 0'`, `borderBottom: '1px solid rgba(0,0,0,0.06)'`
- Grid: `display: 'grid'`, `gridTemplateColumns: 'repeat(4, 1fr)'`, `gap: 8`
- Each cell: centered, stacked (icon + label on top, recency below)
- "Never" state: recency text uses `rgba(0,0,0,0.22)` instead of `rgba(0,0,0,0.45)`

### 3. Inline SVG Icons (Summary Bar Only)

Define `TYPE_ICONS` as module-level constants (outside the component function) — this avoids re-creating React elements on every render. Icons use `currentColor` stroke to inherit text color automatically.

SVG settings for 14px display:
- `viewBox="0 0 16 16"`, `width={14}`, `height={14}`
- `fill="none"`, `stroke="currentColor"`, `strokeWidth={1.5}`
- `strokeLinecap="round"`, `strokeLinejoin="round"`
- `aria-hidden="true"` (decorative — text label provides meaning)

6 icons, each a single `<svg>` element with 1-3 `<path>` children. ~40 lines total at module scope.

**Why summary bar only:** Icons add visual differentiation for at-a-glance scanning in the summary bar. The timeline keeps text pills — they're more scannable at 11px in a vertical list.

### 4. Styled Interaction Timeline

Restyle the existing interaction list (lines 556-657 in ContactDetail):

**Each interaction row:**
- **Left:** Type pill (existing pattern, restyled with better spacing)
- **Center:** Notes below if present (12px, `rgba(0,0,0,0.55)`)
- **Right:** Relative time (10px, tertiary), edit/delete actions on hover (existing pattern)

**Log form type selector:**
- Reorder pills to: call, email, text, meeting, intro, note (primary types first)
- No gap — just the natural reorder

**Shared inline styles** — move repeated style objects to module-level constants to avoid re-creating identical objects across 100+ rows:

```typescript
// Module-level (outside component)
const rowStyle = { padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }
const pillStyle = { fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 100, background: 'rgba(0,0,0,0.05)', color: 'rgba(0,0,0,0.50)' }
const timestampStyle = { fontSize: 10, color: 'rgba(0,0,0,0.28)', letterSpacing: '0.02em' }
```

### 5. `last_contacted_at` Recalculation

**File: `src/components/contacts/ContactDetail.tsx`**

Rename to `latestContactDate` (matches existing naming: `daysOverdue`, `formatRelativeTime`, `avatarHue`). Sort-independent — uses `reduce` instead of relying on array order:

```typescript
function latestContactDate(interactions: Interaction[]): string | null {
  const dates = interactions
    .filter(i => i.type !== 'note' && i.type !== 'intro')
    .map(i => i.date)
  if (!dates.length) return null
  return dates.reduce((a, b) => a > b ? a : b)
}
```

**CRITICAL — stale state:** `setInteractions` is async — the new state isn't available in the same function scope. Compute from the transformed array, not from the `interactions` closure. Always call `onSaved` after recalculation or Dashboard goes stale:

```typescript
async function handleDeleteInteraction(id: string) {
  if (deletingId) return
  setDeletingId(id)
  try {
    await deleteInteraction(id)
    const remaining = interactions.filter(i => i.id !== id)
    setInteractions(remaining)
    const newDate = latestContactDate(remaining)
    await updateContact(contact.id, { last_contacted_at: newDate })
    onSaved({ ...contact, last_contacted_at: newDate })
  } catch (err) {
    console.error('Failed to delete interaction:', err)
  } finally {
    setDeletingId(null)
  }
}
```

**On type edit (`handleUpdateInteraction`):** Same pattern — compute from the updated list, call `onSaved` with recalculated date.

**Edge case:** When all interactions are deleted or only notes/intros remain, `latestContactDate` returns `null`. This correctly sets `last_contacted_at` to `null` — the contact appears in the overdue queue as "Never" contacted.

### 6. Concurrency Guards

Add operation guards to prevent duplicate records from double-clicks:

```typescript
const [isLogging, setIsLogging] = useState(false)
const [deletingId, setDeletingId] = useState<string | null>(null)
```

- **handleLog:** Check `isLogging` before firing. Disable the button. Reset in `finally`.
- **handleDeleteInteraction:** Check `deletingId` before firing (already shown above). Dim the row being deleted.
- **useEffect cleanup:** Cancellation flag on interaction loading to prevent stale responses:

```typescript
useEffect(() => {
  if (!contact?.id) return
  let canceled = false
  getInteractions(contact.id).then(data => {
    if (!canceled) setInteractions(data)
  })
  return () => { canceled = true }
}, [contact?.id])
```

### 7. Airtable Changes (Manual — No Script Needed)

Prerequisite steps before deploying code changes:

1. **Rename** the `Event` option to `Meeting` in the Interactions table `Type` field — Airtable automatically updates all existing records
2. **Add** `Text` as a new option in the `Type` field
3. Done. No migration script needed — the field rename handles all records.

The `mapInteraction` fallback (`event` → `meeting`) acts as a safety net during the transition window.

## Acceptance Criteria

- [x] `InteractionType` updated: `event` removed, `text` added
- [x] `mapInteraction` fallback maps `event` → `meeting` (not `note`)
- [x] `logInteraction` excludes `intro` from `last_contacted_at` updates
- [x] Summary bar shows recency for call, email, text, meeting — always all 4, memoized
- [x] Summary bar icons use inline SVGs with `currentColor` and `aria-hidden`
- [x] "Never" types visually dimmed (`rgba(0,0,0,0.22)`)
- [x] Summary bar is fixed in the header, does not scroll
- [x] Timeline rows keep text pills (no icons in timeline)
- [x] Log form type selector reordered: primary types first
- [x] `text` type can be logged and appears correctly in summary bar and timeline
- [x] Deleting an interaction recalculates `last_contacted_at` and calls `onSaved`
- [x] Changing an interaction's type recalculates `last_contacted_at` and calls `onSaved`
- [x] `intro` excluded from `last_contacted_at` (alongside `note`)
- [x] Concurrency guard on `handleLog` — prevents duplicate interactions
- [x] Concurrency guard on `handleDeleteInteraction` — prevents double-delete
- [x] `useEffect` cleanup flag on interaction loading
- [x] Shared inline styles moved to module-level constants
- [ ] Airtable `Type` field updated: `Event` renamed to `Meeting`, `Text` added
- [x] Dashboard recent feed still works with new types

## Files to Modify

| File | Changes |
|---|---|
| `src/lib/types.ts` | Update `InteractionType` union only (remove `event`, add `text`) |
| `src/components/contacts/ContactDetail.tsx` | Summary bar, icons (module-level), timeline restyle, log form reorder, recalculation logic, concurrency guards, useEffect cleanup, shared style constants |
| `src/lib/airtable.ts` | Fix `mapInteraction` fallback (`event` → `meeting`), fix `logInteraction` to exclude `intro` |
| `src/components/dashboard/Dashboard.tsx` | Verify recent feed renders `text` type correctly |
| Airtable (manual) | Rename `Event` → `Meeting` in Type field, add `Text` option |

## Implementation Order

1. **Airtable** (prerequisite) — rename `Event` → `Meeting`, add `Text` option
2. **Type system** — update `InteractionType` in `types.ts`, update `TYPES`/`TYPE_LABELS` in ContactDetail
3. **Airtable fixes** — `mapInteraction` fallback, `logInteraction` intro exclusion
4. **Concurrency guards** — `isLogging`, `deletingId`, useEffect cleanup
5. **Icons** — module-level SVG constants for summary bar
6. **Summary bar** — build with memoized `typeRecency`, fixed in header
7. **Timeline restyle** — reorder pills, shared style constants
8. **Recalculation** — `latestContactDate`, wire into delete/edit handlers, call `onSaved`
9. **Verify** — dashboard, existing interactions, edge cases (zero interactions, all-notes contact, rapid open/close)

## Architectural Notes

- **File size:** This plan adds ~150-200 lines to a 691-line file. If ContactDetail passes 900 lines, extract an `InteractionSection` component that owns all interaction state and exposes `onLastContactedChanged` to the parent.
- **Naming:** Use "type" vocabulary consistently (not "channel"). `typeRecency`, `latestContactDate`.
- **types.ts stays pure:** No runtime constants in `types.ts` — only type definitions and interfaces.
