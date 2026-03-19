---
title: Inline Category Creation
type: feat
date: 2026-03-18
---

# Inline Category Creation

## Overview

Add a `+` orb to the category view circle that lets users create new categories inline — tap, type, Enter. No modals, no context switches. The category appears as a new orb and the circle redistributes with animation.

Currently categories are read-only in the app (managed in Airtable directly). This adds `createCategory()` to the data layer and a `CreateCategoryNode` custom React Flow node.

## Problem Statement / Motivation

Moj and Briell have to leave the app and go into Airtable to create a new category. This breaks flow — especially when organizing contacts and realizing a category is missing. Creation should happen where the categories live: on the map.

## Proposed Solution

A dashed-border `+` orb sits in the category circle as the last node. Tapping it transforms into an inline text input. Enter creates the category in Airtable, the orb materializes, and the circle re-layouts.

### Interaction flow

1. User enters category view (clicks a list orb)
2. `+` orb renders at the last position in the circle — 64px, dashed border, no glass gradient, `+` centered
3. User taps `+` orb → transforms into a text input at the same position
4. User types a name, presses Enter
5. Airtable `createCategory()` fires, cache invalidates
6. New category orb fades in with `orb-enter` animation
7. All orbs (including new `+`) redistribute evenly around the circle
8. `+` orb moves to its new last-slot position

**Cancel**: Escape or click-away reverts to idle `+` orb. No visible cancel button.

**Error**: Input stays open with a shake animation + inline error text. User can retry or Escape out.

## Technical Approach

### Phase 1: Data layer — `createCategory()` in `airtable.ts`

Follow the `createContact` pattern (line 248):

```typescript
// src/lib/airtable.ts — after getCategories()
export async function createCategory(name: string, listId: string): Promise<Category> {
  const r = await request<AirtableRecord<CategoryFields>>(TABLES.categories, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        Name: name,
        List: [listId],
      },
    }),
  })
  _categoriesCache = null
  return mapCategory(r)
}
```

- No color assignment — inherits list color via `CategoryNode` fallback (`listColor` prop)
- Cache invalidation: `_categoriesCache = null` (same pattern as `createContact`)

### Phase 2: `CreateCategoryNode` component

New file: `src/components/map/CreateCategoryNode.tsx`

A single React Flow custom node with two states:

**Idle state** (default):
- 64px circle with dashed border (`border: 2px dashed rgba(0,0,0,0.15)`)
- No glass gradient, no fill (transparent background)
- `+` icon centered, `rgba(0,0,0,0.28)` (tertiary text color)
- `orb-interactive` class for hover scale
- No edge connecting to the list hub (it's an action, not data)

**Active state** (after tap):
- Same 64px circle position
- Text input replaces the `+` icon
- Auto-focused on mount
- Placeholder: "Name..."
- `maxLength={30}` to prevent overflow in 64px orb
- `event.stopPropagation()` on the input wrapper to prevent React Flow keyboard/mouse interception

**Submit/cancel handlers**:
- Enter → call `onCreate(name)` callback from node data
- Escape → call `onCancel()`, revert to idle
- Blur (click-away) → same as Escape if input is empty, same as Enter if input has text
- Empty submit → shake animation, no Airtable call

**Node data type**:
```typescript
type CreateCategoryNodeData = {
  listColor?: string | null
  animationDelay?: string
  onCreate: (name: string) => void
}
```

Register in `nodeTypes` (OrbMap.tsx line 23):
```typescript
const nodeTypes = {
  list: ListNodeComponent,
  category: CategoryNodeComponent,
  moj: MojNodeComponent,
  'create-category': CreateCategoryNodeComponent,
}
```

### Phase 3: OrbMap integration

Wire the `+` node into the category view layout in `handleListClick` (line 155):

**Building the `+` node**:
After building `catNodes`, append a create-category node at the last circle position.

```typescript
// Include the '+' node in the circle layout calculation
const layoutItems = [...cats, { id: '__create-category__' }]
const posMap = circularLayout(layoutItems, savedPositions, position, radius)

// ... build catNodes from cats ...

const createNode: Node = {
  id: '__create-category__',
  type: 'create-category',
  position: posMap.get('__create-category__')!,
  draggable: false,
  style: { overflow: 'visible' },
  data: {
    listColor: list.color,
    animationDelay: `${cats.length * 0.03}s`,
    onCreate: handleCreateCategory,
  },
}

setNodes([listNode, ...catNodes, createNode])
// No edge for the '+' node
```

**`handleCreateCategory` function**:
```typescript
const handleCreateCategory = useCallback(async (name: string) => {
  if (!selectedListRef.current) return
  const list = selectedListRef.current
  const gen = listClickGenRef.current

  const created = await createCategory(name, list.id)

  if (gen !== listClickGenRef.current) return // stale guard

  // Re-fetch categories and rebuild the view
  const cats = await getCategories(list.id)
  // ... rebuild nodes with circularLayout, same logic as handleListClick
  // New orb gets orb-enter animation, others get instant repositioning
}, [])
```

**Position handling**:
- The `+` node ID `__create-category__` is never saved to localStorage (exclude from `savePosition`)
- After creation, clear saved positions for this list's categories to force a clean circular re-layout
- This trades off drag-customized positions for clean distribution — acceptable since creation changes the topology

### Phase 4: Animation

**New orb entrance**: Apply `orb-enter` class with `animationDelay: 0` — it fades/scales in like existing category orbs.

**Circle redistribution**: CSS transitions on the React Flow node wrappers. Add to `globals.css`:

```css
/* Animate category orb repositioning after creation */
.react-flow__node[data-id] {
  transition: transform 0.4s cubic-bezier(0.5, 1, 0.9, 1);
}
```

React Flow positions nodes via `transform: translate(x, y)` on `.react-flow__node` wrappers. Adding a CSS transition on `transform` makes position changes animate automatically when `setNodes` updates positions. The existing `orb-enter` animation (which also uses transform) will need `animation-fill-mode: forwards` to not conflict — test this.

**Error shake**: A simple CSS keyframe on the input wrapper:
```css
@keyframes input-shake {
  0%, 100% { translate: 0; }
  20%, 60% { translate: -4px; }
  40%, 80% { translate: 4px; }
}
```

## Edge Cases & Decisions

| Case | Decision |
|---|---|
| **Airtable failure** | Input stays open, shake animation, inline "Failed" text. User retries or Escapes. |
| **Empty submit** | Shake, no network call. |
| **Duplicate name** | Allowed. Airtable doesn't enforce uniqueness, and preventing it adds friction for edge-case value. |
| **Name length** | `maxLength={30}` on input. `fontSize()` in the new orb handles display scaling. |
| **Zero categories** | `+` orb is the only node in the circle (besides the list hub). Positioned at 12 o'clock. |
| **25+ categories** | Radius auto-scales via existing `minRadius` math. `+` is included in the count. |
| **Double-tap `+`** | No-op while input is active. |
| **Click-away with text** | Treat as cancel (discard text). Only Enter commits. |
| **New category color** | `null` — inherits list color via `listColor` prop, same as existing categories. |
| **Saved positions** | `+` node never persisted. After creation, clear saved positions for this list to force clean re-layout. |
| **`+` orb edge** | No edge to list hub — it's an action affordance, not data. |

## Acceptance Criteria

- [x] `+` orb appears in category view circle as the last node
- [x] Tapping `+` transforms into focused text input
- [x] Enter with text creates category in Airtable and renders new orb
- [x] Enter with empty text shows shake, no network call
- [x] Escape or click-away cancels and reverts to `+` orb
- [x] Airtable failure keeps input open with error indication
- [x] Circle redistributes with animation after creation
- [x] New orb fades in with `orb-enter` animation
- [x] `+` orb has dashed border, no glass gradient, no connecting edge
- [x] Works with 0 existing categories (empty list)
- [x] Works with 25+ existing categories (radius scales)
- [x] `createCategory()` invalidates `_categoriesCache`

## Files to Create/Modify

| File | Change |
|---|---|
| `src/lib/airtable.ts` | Add `createCategory(name, listId)` function |
| `src/components/map/CreateCategoryNode.tsx` | **New** — custom React Flow node with idle/active states |
| `src/components/map/OrbMap.tsx` | Register node type, add `+` node to category layout, `handleCreateCategory` |
| `src/styles/globals.css` | Add `.react-flow__node` transition, `input-shake` keyframe |
| `src/hooks/useNodePositions.ts` | Exclude `__create-category__` from persistence, add `clearPositionsForList()` |

## Dependencies & Risks

**React Flow keyboard conflicts**: Text input inside a custom node may have Enter/Escape/Delete intercepted by React Flow. Mitigation: `event.stopPropagation()` on the input wrapper. The codebase already sets `nodesFocusable={false}` (line 354) which helps.

**CSS transition on `.react-flow__node`**: This is a global selector that affects all node types. Need to verify it doesn't interfere with home view transitions, `orb-enter` animation, or drag behavior. Scope to category view if needed.

**Optimistic vs. confirmed**: This plan uses confirmed creation (wait for Airtable response before showing the orb). Optimistic would be snappier but adds rollback complexity. Start with confirmed — Airtable calls are fast enough.

## References

- Brainstorm: `docs/brainstorms/2026-03-18-inline-category-creation-brainstorm.md`
- `createContact` pattern: `src/lib/airtable.ts:248`
- Category caching: `src/lib/airtable.ts:135-179`
- Category node layout: `src/components/map/OrbMap.tsx:155-213`
- Node type registration: `src/components/map/OrbMap.tsx:23-27`
- CSS custom properties pattern: `docs/solutions/react-patterns/react-hover-css-vars-pattern.md`
- Async race guards: `docs/solutions/react-patterns/async-race-condition-patterns.md`
