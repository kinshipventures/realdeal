---
title: "refactor: Polish and Optimization Pass"
type: refactor
date: 2026-03-13
brainstorm: docs/brainstorms/2026-03-13-polish-and-optimization-brainstorm.md
specflow: 2026-03-13
deepened: 2026-03-13
---

# refactor: Polish and Optimization Pass

## Enhancement Summary

**Deepened on:** 2026-03-13
**Agents used:** TypeScript reviewer, Performance oracle, Frontend races reviewer, Code simplicity reviewer, Architecture strategist, Silent failure hunter, Pattern recognition specialist, Best practices researcher, Type design analyzer, Frontend design skill

### Key Improvements from Deepening

1. **Escape key redesign** — `stopPropagation` doesn't stop sibling `window` listeners. Replace with a module-level escape stack (`lib/escapeStack.ts`) — the same pattern used by Radix UI and Mantine
2. **Stale-while-revalidate** replaces blocking TTL — return stale cache immediately, refresh in background; blocking refetch on paginated Airtable data causes a visible UI freeze
3. **In-flight promise dedup** — concurrent callers during TTL expiry double-fetch Airtable; deduplicate by storing the in-flight Promise
4. **`handleListClick` stale race** — pre-existing bug: click List A slowly, click List B fast → A's response overwrites B's view; add generation counter ref
5. **Priority glow CSS custom properties** — `--orb-glow-opacity`/`--orb-glow-opacity-hover` must be set per-orb alongside `--orb-color-rgb` or priority boost is silently dropped
6. **CSS class naming** — `.btn-ghost`/`.btn-pill`/`.row-hover` break the existing behavioral taxonomy; renamed to `.action-ghost`/`.action-pill`/`.interactive-row`/`.close-trigger`
7. **Spinner: conic gradient** — CSS `conic-gradient + mask` produces a premium sweep-fade spinner matching the glass orb aesthetic; much better than a gap-border circle with `linear` easing
8. **Orb error state: border/shadow shift** — red tint would violate the `0.16` opacity rule; use `@keyframes orb-error` that shifts the border and shadow color instead
9. **7 phases → 3 passes** — reorganized for executability; each pass is a coherent, reviewable diff
10. **File structure** — GlassOrb stays in `map/` (it's a map domain concern); Avatar/Spinner/CloseButton consolidate into `src/components/ui.tsx` (one file, not three)
11. **5 additional silent failures** — `getInteractions`, `handleCreate`, `handleLog`, `handleDelete`, `handleUpdateInteraction`/`handleDeleteInteraction`, and OrbMap init failure all have no user-facing error state; all added to scope
12. **Type aliases** — `type HexColor = \`#${string}\`` and `type ISODate = string` added to `types.ts`; apply across all date/color strings

### Key Decisions (Pre-Deepening)
1. Phase reordering — CSS custom properties before GlassOrb extraction (avoids touching GlassOrb twice)
2. Escape key stacking — explicit priority chain
3. Enter on textareas — Cmd+Enter commits
4. Save-failed persistence — indicator persists until resolved
5. Avatar opacity — Dashboard's muted variant is intentional
6. Double-save prevention — Enter calls `blur()` to trigger existing onBlur handler
7. Category error correction — visual feedback on orb, not silent swallow

---

## Overview

Full sweep of the Kinship Brain app: extract shared primitives, migrate inline hover logic to CSS, consolidate ContactDetail state, add keyboard support, and improve data reliability. No new features — making what exists feel finished before Moj's feedback drives the next wave.

## Problem Statement

The codebase has grown through rapid feature development. ListNode and CategoryNode share ~90% of their rendering logic. ContactDetail has 17 `useState` calls across 769 lines. 26 `onMouseEnter`/`onMouseLeave` handlers duplicate what CSS `:hover` does natively. Airtable caches have no TTL. Five interaction mutation handlers (`handleLog`, `handleDelete`, `handleCreate`, `handleUpdateInteraction`, `handleDeleteInteraction`) and the initial data load all fail silently with only `console.error`.

## Proposed Solution

Three passes instead of seven phases — each pass produces a coherent, reviewable diff:

- **Pass 1: CSS/visual plumbing** — orb CSS custom properties, CSS hover classes, background dedup, z-index docs
- **Pass 2: Component extraction** — GlassOrb, shared ui primitives, InteractionSection
- **Pass 3: UX + data** — keyboard support, animation fix, stale-while-revalidate, error feedback, hex shorthand

## Acceptance Criteria

- [x] `GlassOrb` component renders ListNode and CategoryNode identically to current
- [x] MojNode remains separate (no forced GlassOrb usage)
- [x] All non-orb `onMouseEnter`/`onMouseLeave` handlers replaced with CSS classes
- [x] Orb box-shadow hover uses CSS custom properties (no JS handlers), including priority glow
- [x] ContactDetail ≤ 450 lines, InteractionSection ≤ 350 lines
- [x] Escape key uses module-level stack (topmost panel only fires)
- [x] Enter commits single-line fields, Cmd+Enter commits textareas, Escape cancels both (uses closure value, not undefined `originalValue`)
- [x] `handleListClick` has generation counter — stale responses are discarded
- [x] ContactPanel does not re-animate slide-in when switching categories
- [x] Airtable caches use stale-while-revalidate with 5-minute TTL; in-flight requests are deduplicated
- [x] Failed auto-saves show persistent inline error with retry (stores `{ field, value }`)
- [x] `getInteractions` failure shows inline error in InteractionSection
- [x] Interaction mutations (`handleLog`, `handleDelete`, etc.) show inline error on failure
- [x] `handleCreate` shows error on failure
- [x] Category load failures show `@keyframes orb-error` border/shadow animation on the orb
- [x] OrbMap init failure shows centered error message in the canvas
- [x] Spinner uses conic gradient with eased keyframe
- [x] `HexColor` and `ISODate` type aliases added to `src/lib/types.ts`
- [ ] No visual regressions in orb rendering, shadows, or hover states

---

## Type Aliases (prerequisite for all passes)

**File:** `src/lib/types.ts`

Add two type aliases before any other types. These flow through every date and color string in the codebase.

```tsx
// Semantic type aliases — not opaque, but documented and searchable
export type HexColor = `#${string}`   // hex color string, e.g. "#718096"
export type ISODate = string           // YYYY-MM-DD date string
```

Apply `HexColor` to: `List.color`, `Category.color`, all color props in node components.
Apply `ISODate` to: `Contact.last_contacted_at`, `Interaction.date`, `editState.date`, all date callbacks.

---

## Pass 1: CSS / Visual Plumbing

### 1a. Orb Box-Shadow CSS Custom Properties

**Files:** `src/styles/globals.css`, `src/components/map/ListNode.tsx`, `src/components/map/CategoryNode.tsx`

**Why first:** GlassOrb extraction needs this solved. Solve the pattern, then extract clean.

**Critical gotcha:** The custom property value must be raw RGB channels (`"113, 128, 150"`), never an RGB function (`"rgb(113, 128, 150)"`). Using the function form inside `rgba(var(...), alpha)` produces invalid CSS that silently falls back with no error.

**TypeScript note:** CSS custom properties are not in `React.CSSProperties`. Cast required: `style={{ '--orb-color-rgb': '...' } as React.CSSProperties}`.

```css
/* globals.css — extend existing .orb-interactive */
/* CSS vars bridge dynamic JS values to CSS — use when a value changes on interaction
   and a React re-render would otherwise overwrite it (same reason --orb-scale/--orb-lift exist) */
.orb-interactive {
  box-shadow:
    0 0 var(--orb-glow-size, 32px) rgba(var(--orb-color-rgb), var(--orb-glow-opacity, 0.10)),
    0 4px 18px rgba(0,0,0,0.07),
    inset 0 1.5px 0 rgba(255,255,255,0.92);
  transition: transform 0.18s cubic-bezier(0.34, 1.2, 0.64, 1),
              filter 0.18s ease,
              box-shadow 0.18s cubic-bezier(0.215, 0.61, 0.355, 1);
              /* ease-decel curve — matches the orb's physical weight on shadow expansion */
}
.orb-interactive:hover {
  box-shadow:
    0 0 var(--orb-glow-size-hover, 48px) rgba(var(--orb-color-rgb), var(--orb-glow-opacity-hover, 0.16)),
    0 8px 28px rgba(0,0,0,0.09),
    inset 0 1.5px 0 rgba(255,255,255,0.95);
}
```

Each node sets all four custom properties inline to handle priority glow. Missing any of them silently drops the priority boost:

```tsx
// ListNode — priority boosts glow
style={{
  '--orb-color-rgb': hexToRgbValues(color),
  '--orb-glow-size': '32px',
  '--orb-glow-size-hover': '48px',
  '--orb-glow-opacity': list.is_priority ? '0.18' : '0.10',
  '--orb-glow-opacity-hover': list.is_priority ? '0.26' : '0.16',
} as React.CSSProperties}

// CategoryNode — no priority
style={{
  '--orb-color-rgb': hexToRgbValues(accentColor),
  '--orb-glow-size': '20px',
  '--orb-glow-size-hover': '32px',
  '--orb-glow-opacity': '0.10',
  '--orb-glow-opacity-hover': '0.18',
} as React.CSSProperties}
```

**`hexToRgbValues` helper** — added to `src/lib/utils.ts`:

```tsx
export function hexToRgbValues(hex: string): string {
  if (hex.length === 4) hex = '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3]
  const n = parseInt(hex.replace('#', ''), 16)
  if (isNaN(n)) return '113, 128, 150' // fallback: default gray
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}
```

**Note on shadow easing:** Use `cubic-bezier(0.215, 0.61, 0.355, 1)` (ease-decel), not `ease`. The existing curve is correct — shadow expansion should feel weighted. `ease` (CSS keyword) is a muted ease-in-out that makes shadow feel soft and directionless.

### 1b. CSS Hover Classes

**File:** `src/styles/globals.css`

Naming follows the existing behavioral taxonomy (`orb-interactive`, `panel-enter`, `interaction-row`) — descriptors of what the element *does*, not what it looks like. `.btn-ghost` breaks this; `.action-ghost` matches it.

```css
/* Ghost text button — delete, cancel, edit, + log interaction */
.action-ghost {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(0,0,0,0.45);
  transition: color 0.15s ease;
}
.action-ghost:hover { color: rgba(0,0,0,0.82); }

/* Pill-shaped button — type selectors, log button */
.action-pill {
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.action-pill:hover { background: rgba(0,0,0,0.06); }

/* Circular close button */
.close-trigger {
  cursor: pointer;
  transition: background 0.15s ease;
}
.close-trigger:hover { background: rgba(0,0,0,0.06); }

/* Row highlight on hover — ContactCard, OverdueRow, feed rows */
.interactive-row {
  transition: background 0.15s ease;
}
.interactive-row:hover { background: rgba(0,0,0,0.03); }
```

### Files to update (CSS migration)

| File | Handlers to remove | Class to apply |
|---|---|---|
| `ContactDetail.tsx` | 8 handlers | `.action-ghost`, `.action-pill` |
| `Dashboard.tsx` | 6 handlers | `.action-ghost`, `.interactive-row` |
| `ContactPanel.tsx` | 4 handlers | `.close-trigger`, `.interactive-row` |
| `ContactCard.tsx` | 2 handlers | `.interactive-row` |
| `OrbMap.tsx` | 2 handlers | `.action-ghost` (settings icon) |

Orb nodes no longer have JS hover handlers (solved in 1a).

### 1c. Minor Cleanups

**Z-index documentation** (`src/styles/globals.css` — top of file):

```css
/* Z-index scale
   20   — breadcrumb navigation
   50   — contact panel
   60   — contact detail (overlays panel)
   9999 — grain overlay (body::after)
   auto — orb nodes (React Flow manages internally)
*/
```

**Background gradient dedup** — extract to `.app-bg` CSS class in `globals.css`, replace inline gradient in `OrbMap.tsx` and `Dashboard.tsx`:

```css
.app-bg {
  background: radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.8) 0%, #F5F4F0 70%);
  min-height: 100vh;
}
```

**`orb-error` keyframe** for category load feedback (used in Pass 3):

```css
@keyframes orb-error {
  0%   { border-color: rgba(255,255,255,0.65); }
  30%  { border-color: rgba(220,60,60,0.40);
         box-shadow: 0 0 24px rgba(220,60,60,0.18), 0 3px 12px rgba(0,0,0,0.06),
                     inset 0 1px 0 rgba(255,255,255,0.90); }
  100% { border-color: rgba(255,255,255,0.65); }
}
/* Red tint in the fill gradient violates the 0.16 opacity rule — this shifts the border/shadow instead */
```

---

## Pass 2: Component Extraction

### 2a. GlassOrb

**File:** `src/components/map/GlassOrb.tsx` (new — stays in `map/`, it's a map domain concern)

ListNode and CategoryNode share gradient construction, `.orb-interactive` class, and CSS custom property shadow pattern. Each wrapper becomes ~30-40 lines.

```tsx
// src/components/map/GlassOrb.tsx

type HexColor = `#${string}`

interface GlassOrbProps {
  size: number
  color: HexColor          // hex required; catches "blue", "rgb(...)" at compile time
  glowIntensity?: 'low' | 'high'  // replaces `priority` — visual prop, not domain prop
  animationDelay?: string
  onClick?: () => void
  className?: string       // escape hatch for additional CSS classes
  children: React.ReactNode
}
```

GlassOrb handles:
- Three-layer radial gradient (proportions scale with `size` — all 3 layers always included, ambient at `0.07` is invisible at 64px)
- CSS custom properties: `--orb-color-rgb`, `--orb-glow-size`, `--orb-glow-size-hover`, `--orb-glow-opacity`, `--orb-glow-opacity-hover` (derived from `size` and `glowIntensity`)
- `.orb-interactive` class application
- `borderRadius: '50%'`, `cursor: 'pointer'`

**Domain note:** `priority` (a list-level concept) becomes `glowIntensity?: 'low' | 'high'` — a visual primitive has no business knowing about Airtable list priorities. ListNode passes `glowIntensity={list.is_priority ? 'high' : 'low'}`.

**Children:** Pulse ring, loading spinner, label content remain in wrapper components — GlassOrb is the glass shell only.

### 2b. Shared UI Primitives

**File:** `src/components/ui.tsx` (new — one file for all three atoms, not three separate files)

Per CLAUDE.md: "fewer files with more in them." Avatar, CloseButton, and Spinner are each 10-30 lines. One file.

**CloseButton:**

```tsx
interface CloseButtonProps {
  onClick: () => void
  'aria-label'?: string  // defaults to "Close" — make required if buttons have distinct semantics
  size?: number          // default 26
}
// Must render with type="button" — prevents accidental form submission
```

**Avatar:**

```tsx
interface AvatarProps {
  name: string       // expected non-empty; renders "?" if empty (acceptable fallback for draft contacts)
  size?: number      // default 32
  variant?: 'default' | 'subtle'  // 'subtle' for dense list contexts (Dashboard OverdueRow)
                     // 'default': hsl(hue, 40%, 88%) — ContactCard, ContactDetail
                     // 'subtle':  hsl(hue, 40%, 88%) at lower opacity — intentionally muted
}
// Note: "muted" was rejected — too vague and visual, not semantic.
// "subtle" has a defined visual meaning in the design system.
```

**Spinner (conic gradient approach):**

```css
/* In globals.css — replaces linear border-gap spinner */
@keyframes orb-spin {
  0%   { transform: rotate(0deg); }
  60%  { transform: rotate(280deg); }
  100% { transform: rotate(360deg); }
}
.spinner {
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    rgba(0,0,0,0.0) 0%,
    rgba(0,0,0,0.32) 75%,
    rgba(0,0,0,0.0) 100%
  );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
  animation: orb-spin 1.1s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
/* Conic gradient + mask = sweep that fades at the tail, no hard gap.
   Eased keyframe (60% rotation in 60% time then decelerate) matches Apple's spinner motion.
   1.1s duration reads as confident, not anxious. */
```

The Spinner TSX component accepts `size` and applies the `.spinner` class with a `style={{ width, height }}` override.

### 2c. InteractionSection Extraction

**Files:** `src/components/contacts/InteractionSection.tsx` (new), `src/components/contacts/ContactDetail.tsx`

**Interface:**

```tsx
interface InteractionSectionProps {
  contact: Contact
  onContactUpdated: (contact: Contact) => void  // fires after any mutation that changes the contact
}
// Renamed from onLastContactedChanged — callback communicates the event, not the implementation detail.
// Passes full Contact (not just date) to avoid ContactDetail reconstructing the updated shape.
```

**State consolidation:**

```tsx
type EditingInteraction = {
  id: string
  type: InteractionType
  date: ISODate         // YYYY-MM-DD
  notes: string | null  // null = no notes; normalized to empty string in <textarea value>, not in state
} | null

const [editingInteraction, setEditingInteraction] = useState<EditingInteraction>(null)
// Renamed from editState — matches existing codebase naming convention (editingInteraction)
```

**InteractionSection owns:**
- `getInteractions(contact.id)` — fetch with `.catch` error state (not silent)
- Log new interaction (concurrency guard already implemented)
- Edit/delete interaction
- Summary bar (`typeRecency` useMemo)
- Timeline rendering
- `latestContactDate()` computation (moves here from ContactDetail module scope)

**Fetch error handling** (previously missing — silent empty state on failure):

```tsx
const [interactionsError, setInteractionsError] = useState(false)

useEffect(() => {
  if (!contact?.id) return
  let canceled = false
  getInteractions(contact.id)
    .then(data => { if (!canceled) setInteractions(data) })
    .catch(() => { if (!canceled) setInteractionsError(true) })
  return () => { canceled = true }
}, [contact.id])  // depend on primitive, not object reference — prevents spurious refetch
```

**Interaction mutation error feedback** (previously console.error only):

All four mutation handlers (`handleLog`, `handleUpdateInteraction`, `handleDeleteInteraction`, and new `handleDeleteContact`) get a shared `actionError: string | null` state — these actions are mutually exclusive, so one error slot is sufficient. Display beneath the action that failed; clear on next action attempt.

**Target sizes:**
- ContactDetail: ~769 → ~450 lines
- InteractionSection: ~350 lines

---

## Pass 3: UX + Data

### 3a. Escape Key — Module-Level Stack

**New file:** `src/lib/escapeStack.ts`

**Why not `stopPropagation`:** Both ContactPanel and ContactDetail register `keydown` on `window`. `stopPropagation` stops DOM bubbling — it has no effect on sibling `window` listeners. `stopImmediatePropagation` works but is fragile (depends on registration order). The industry-standard pattern (Radix UI, Mantine) is a module-level stack:

```tsx
// src/lib/escapeStack.ts
const stack: Array<() => void> = []

export function pushEscape(fn: () => void) { stack.push(fn) }
export function popEscape(fn: () => void) {
  const i = stack.lastIndexOf(fn)
  if (i !== -1) stack.splice(i, 1)
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length > 0) {
    e.preventDefault()
    stack[stack.length - 1]()  // only the topmost handler fires
  }
})
```

```tsx
// useEscape hook
function useEscape(onEscape: () => void) {
  useEffect(() => {
    pushEscape(onEscape)
    return () => popEscape(onEscape)
  }, [onEscape])
}
```

**Priority chain without nested listeners:**
1. Field-level Escape (`onKeyDown` on `<input>`/`<textarea>`) — reverts value, blurs — calls `e.stopPropagation()` to prevent bubbling to `window` (this works because it's DOM bubbling, not sibling listener)
2. `editingInteraction` non-null — clears edit state; ContactDetail's escape handler checks first
3. ContactDetail close — via escape stack
4. ContactPanel close — via escape stack (registered before ContactDetail mounts, so it's lower in the stack)

### 3b. Enter/Escape on Inline Fields

**Files:** `ContactDetail.tsx`, `InteractionSection.tsx`

**`originalValue` was undefined in original plan** — use `val ?? ''` from the field closure:

```tsx
// The field render function closes over `val` at render time — this IS the original value
onKeyDown={(e) => {
  if (e.key === 'Enter' && tagName === 'INPUT') {
    e.currentTarget.blur()  // triggers existing onBlur save — one code path, no double-save
  }
  if (e.key === 'Enter' && tagName === 'TEXTAREA' && (e.metaKey || e.ctrlKey)) {
    e.currentTarget.blur()
  }
  if (e.key === 'Escape') {
    e.currentTarget.value = val ?? ''  // use closure value, not undefined `originalValue`
    e.currentTarget.blur()
    e.stopPropagation()  // prevent bubble to window — field Escape ≠ panel close
  }
}}
```

### 3c. `handleListClick` Stale Response Race (pre-existing bug)

**File:** `src/components/map/OrbMap.tsx`

Click List A slowly, click List B fast → A's `setNodes` response fires and overwrites B's category view. Existing bug — add generation counter:

```tsx
const listClickGenRef = useRef(0)

function handleListClick(list: List) {
  const gen = ++listClickGenRef.current
  // ... existing loading setup ...
  getCategories(list.id)
    .then(cats => {
      if (gen !== listClickGenRef.current) return  // discard stale response
      // ... existing setNodes ...
    })
    .catch(...)
}
```

### 3d. Panel Animation Fix

**File:** `ContactPanel.tsx`

Verify the bug exists first — the component stays mounted when switching categories, so `panel-slide-in` should only fire on initial mount. If confirmed:

```tsx
const wasOpen = useRef(false)
useEffect(() => { wasOpen.current = true }, [])
const animateClass = wasOpen.current ? '' : 'panel-enter'
```

### 3e. Stale-While-Revalidate Cache

**File:** `src/lib/airtable.ts`

**Why not blocking TTL:** `await getContacts()` when cache is expired blocks the UI for the duration of a full paginated Airtable fetch — visible freeze on large contact lists.

**Stale-while-revalidate:** return cached data immediately, refresh in background:

```tsx
const CACHE_TTL = 5 * 60 * 1000

let _contactsCache: Contact[] | null = null
let _contactsCacheTime = 0
let _contactsFetch: Promise<Contact[]> | null = null  // in-flight dedup

export function getContacts(categoryId?: string): Promise<Contact[]> {
  const isExpired = !_contactsCache || Date.now() - _contactsCacheTime > CACHE_TTL
  const isFresh = _contactsCache && !isExpired

  // Return fresh cache synchronously
  if (isFresh) {
    return Promise.resolve(
      categoryId ? _contactsCache!.filter(c => c.category_ids.includes(categoryId)) : _contactsCache!
    )
  }

  // Return stale data immediately while refreshing in background
  if (_contactsCache && isExpired && !_contactsFetch) {
    const stale = _contactsCache
    _contactsFetch = fetchAll<ContactFields>(TABLES.contacts)
      .then(records => {
        _contactsCache = records.map(mapContact)
        _contactsCacheTime = Date.now()
        _contactsFetch = null
        return _contactsCache
      })
      .catch(err => { _contactsFetch = null; throw err })
    // Return stale immediately — don't await the refresh
    return Promise.resolve(
      categoryId ? stale.filter(c => c.category_ids.includes(categoryId)) : stale
    )
  }

  // Cold cache — deduplicate concurrent fetches
  if (!_contactsFetch) {
    _contactsFetch = fetchAll<ContactFields>(TABLES.contacts)
      .then(records => {
        _contactsCache = records.map(mapContact)
        _contactsCacheTime = Date.now()
        _contactsFetch = null
        return _contactsCache
      })
      .catch(err => { _contactsFetch = null; throw err })
  }
  return _contactsFetch.then(all => categoryId ? all.filter(c => c.category_ids.includes(categoryId)) : all)
}
```

Same pattern for `_categoriesCache`.

**Explicit invalidation stays unchanged** — `_contactsCache = null` after mutations is more important than TTL.

### 3f. Auto-Save Error Feedback

**Files:** `ContactDetail.tsx`, `InteractionSection.tsx`

Auto-save error needs to store `{ field, value }` — retry needs the value that failed, and it may have drifted in the draft by retry time.

```tsx
type SaveError = { field: keyof Contact; value: string | null } | null
const [saveError, setSaveError] = useState<SaveError>(null)

// In handleBlur catch:
setSaveError({ field: key, value: v })

// In handleBlur .then (success):
if (saveError?.field === key) setSaveError(null)

// Retry handler:
function handleRetrySave() {
  if (!saveError || !contact) return
  updateContact(contact.id, { [saveError.field]: saveError.value } as Partial<Contact>)
    .then(onSaved)
    .then(() => setSaveError(null))
    .catch(() => {})  // error state persists, user can retry again
}
```

**Visual treatment** — inline near the field label, persistent until resolved:

```tsx
// Render near failed field label
{saveError?.field === fieldKey && (
  <button onClick={handleRetrySave} style={{
    fontSize: 10,
    fontWeight: 400,
    color: '#D93025',   // text-overdue — existing semantic error color, 4.6:1 contrast
    letterSpacing: '0.01em',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  }}>
    failed to save — retry
  </button>
)}
// Lowercase, no period — matches the panel's editorial tone
// Opacity transition (0.2s ease in/out) instead of display:none — consistent with system's fade patterns
```

### 3g. Category Load Error — Visual Feedback on Orb

**File:** `src/components/map/OrbMap.tsx`

Existing `.catch` already resets loading state. What's missing is visual feedback. Red tint would violate the `0.16` opacity rule — use the `orb-error` keyframe defined in Pass 1 instead:

```tsx
.catch(() => {
  const listId = list.id  // capture ID — don't close over stale variable
  setNodes(prev => prev.map(n =>
    n.id === listId ? { ...n, data: { ...n.data, loading: false, loadError: true } } : n
  ))
  const timeoutId = setTimeout(() => {
    setNodes(prev => prev.map(n =>
      n.id === listId ? { ...n, data: { ...n.data, loadError: false } } : n
    ))
  }, 2000)
  // Store timeoutId in a ref and clear in cleanup if component unmounts
})
```

**Store timeout ID:** The OrbMap `useCallback` for `handleListClick` cannot return a cleanup function directly. Track all active timeout IDs in a `useRef<Set<ReturnType<typeof setTimeout>>>` and clear them in a `useEffect(() => () => ids.forEach(clearTimeout), [])`.

ListNode renders a subtle border animation when `data.loadError` is true:
```tsx
style={{ animation: data.loadError ? 'orb-error 1.8s ease-out' : undefined }}
```

### 3h. OrbMap Init Failure

**File:** `src/components/map/OrbMap.tsx`

The init `catch` currently only `console.error`. The user sees an empty canvas — indistinguishable from loading. Add a load error state:

```tsx
const [initError, setInitError] = useState(false)

// In init catch:
} catch (err) {
  console.error('Failed to load network:', err)
  setInitError(true)
}

// In render:
{initError && (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>
      Could not load your network. Check your connection and refresh.
    </p>
  </div>
)}
```

### 3i. `handleCreate` Error Feedback

**File:** `ContactDetail.tsx`

When contact creation fails, the button silently reverts. Add a `createError` boolean:

```tsx
const [createError, setCreateError] = useState(false)

// In handleCreate catch:
} catch (err) {
  console.error('Failed to create contact:', err)
  setCreateError(true)
} finally {
  setCreating(false)
}

// In render, below create button:
{createError && <p style={{ fontSize: 11, color: '#D93025' }}>failed to create — try again</p>}
```

### 3j. Hex Shorthand Support

**File:** `src/lib/utils.ts`

Both `hexToRgba` and `hexToRgbValues` handle shorthand hex:

```tsx
function expandHex(hex: string): string {
  if (hex.length === 4) return '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3]
  return hex
}
// Call at top of both hex functions; fallback to '#718096' (existing default gray) on NaN
```

---

## Risk Analysis

| Risk | Impact | Mitigation |
|---|---|---|
| CSS custom property raw-channels gotcha | High — silent visual corruption | Lint for `rgb(...)` inside `--orb-color-rgb` values; document in comment |
| GlassOrb extraction changes visual rendering | High — orbs are the brand | Side-by-side comparison before/after for each orb size |
| Escape stack registration order | Medium | ContactPanel registers first (mounts first); ContactDetail pushes on top — stack order is correct |
| `handleListClick` stale race fix changes navigation feel | Low | Generation counter is invisible to users |
| Stale-while-revalidate shows outdated data | Low — Briell's edits are not time-critical | Acceptable staleness for a 5-minute window; explicit invalidation on mutations stays |
| InteractionSection extraction breaks data flow | High — interaction logging is core | Test log/edit/delete flows manually after extraction; verify `onContactUpdated` fires correctly |

## File Impact Summary

### New files (4 — down from 5 in original plan)
- `src/components/map/GlassOrb.tsx` (stays in `map/`, domain concern)
- `src/components/ui.tsx` (Avatar + CloseButton + Spinner — consolidated)
- `src/components/contacts/InteractionSection.tsx`
- `src/lib/escapeStack.ts`

### Modified files
- `src/lib/types.ts` — `HexColor`, `ISODate` type aliases
- `src/lib/utils.ts` — `expandHex`, `hexToRgbValues`, shorthand hex support
- `src/lib/airtable.ts` — stale-while-revalidate, in-flight dedup
- `src/styles/globals.css` — orb shadow CSS vars, `.action-*` CSS classes, `.orb-error` keyframe, spinner keyframe, z-index docs, `.app-bg`
- `src/components/map/ListNode.tsx` — slim to GlassOrb wrapper, CSS shadow vars
- `src/components/map/CategoryNode.tsx` — slim to GlassOrb wrapper, CSS shadow vars
- `src/components/map/OrbMap.tsx` — generation counter, `initError` state, category error feedback, timeout cleanup ref, `.app-bg`
- `src/components/contacts/ContactDetail.tsx` — extract InteractionSection, `useEscape`, Enter/Escape handlers, save/create error state
- `src/components/contacts/ContactPanel.tsx` — use CloseButton, animation fix, `useEscape`
- `src/components/contacts/ContactCard.tsx` — use Avatar, `.interactive-row`
- `src/components/dashboard/Dashboard.tsx` — use Avatar/Spinner from `ui.tsx`, `.action-ghost`/`.interactive-row`, `.app-bg`

## References

- Glass orb visual spec: `CLAUDE.md` → "Glass orb visual system"
- Existing CSS pattern: `src/styles/globals.css:50` → `.orb-interactive`
- Cache implementation: `src/lib/airtable.ts:169-176`
- Category error: `src/components/map/OrbMap.tsx:207`
- Init error: `src/components/map/OrbMap.tsx:248`
- Brainstorm: `docs/brainstorms/2026-03-13-polish-and-optimization-brainstorm.md`
- Escape stack pattern: Radix UI, Mantine Modal.Stack
- CSS custom property channels: MDN, chriscoyier.net
