---
title: "Circular callback reference in React Compiler — state-driven refresh pattern"
description: "Solving self-referencing useCallback closures under React Compiler lint rules using a state counter and useEffect"
type: pattern
module: OrbMap
tags:
  - react-compiler
  - useCallback
  - circular-reference
  - react-flow
  - state-refresh-pattern
  - react-19
symptoms:
  - "Cannot access variable before it is declared"
  - "Cannot access refs during render"
  - "Compilation Skipped: Existing memoization could not be preserved"
  - "useCallback references itself"
  - "circular dependency in useCallback"
  - "onCreate callback needs to re-trigger parent function"
date: 2026-03-18
---

# Circular Callback Reference — State-Driven Refresh

## Problem

A `useCallback` (`handleListClick`) builds React Flow nodes. One node's `onCreate` callback needs to re-trigger `handleListClick` after a mutation (creating a new category), so the view refreshes with new data. This is circular: the callback constructs closures that need to call the callback itself.

## When You'll Hit This

Function A builds a data structure (nodes, tree items, form fields) that includes callbacks. One of those callbacks needs to re-invoke Function A.

- React Flow node builders where node actions trigger graph rebuilds
- Recursive menu/tree renderers with "refresh" callbacks
- Dynamic form builders where field changes regenerate the field list
- Any pattern where you programmatically create interactive objects whose interactions require regenerating the object set

**Detection**: If a `useCallback`'s internal closures need to call "this same function again," you've hit it.

## Failed Approaches

### 1. Direct self-reference

```tsx
onCreate: async (name: string) => {
  await createCategory(name, list.id)
  handleListClick(list, position) // self-reference
}
```

**Error**: `Cannot access variable before it is declared` — React Compiler prevents a `useCallback` from referencing itself within closures created during its execution.

### 2. Ref with render-time assignment

```tsx
const handleListClickRef = useRef<...>(() => {})
// ...
const handleListClick = useCallback((...) => { ... }, [])
handleListClickRef.current = handleListClick // write in render body
```

**Error**: `Cannot access refs during render` (`react-hooks/refs`). Writing to a ref during render is a side effect.

### 3. Ref with useEffect sync

```tsx
useEffect(() => { handleListClickRef.current = handleListClick }, [handleListClick])
```

**Error**: `Compilation Skipped: Existing memoization could not be preserved` on multiple useCallbacks. React Compiler can't preserve memoization when a ref is synced to a callback via effect.

## Working Solution

Break the circular reference by converting a direct function call into an indirect signal (state increment) that an effect translates back into the function call from a safe execution context.

```tsx
const [catRefresh, setCatRefresh] = useState(0)
```

In the node's `onCreate` handler (inside `handleListClick`):

```tsx
onCreate: async (name: string) => {
  await createCategory(name, list.id)
  clearPositionsForIds(cats.map(c => c.id))
  setCatRefresh(r => r + 1)  // signal, not direct call
}
```

A separate `useEffect` watches the counter:

```tsx
useEffect(() => {
  if (catRefresh === 0) return
  const list = selectedListRef.current
  if (!list) return
  const listNode = nodes.find(n => n.id === list.id)
  if (!listNode) return
  // Reset view state so handleListClick's early-return guard doesn't block
  viewRef.current = 'lists'
  handleListClick(list, listNode.position)
}, [catRefresh]) // eslint-disable-line react-hooks/exhaustive-deps
```

### Why it works

1. **No circular dependency**: `onCreate` doesn't reference `handleListClick` — it just increments a counter.
2. **Effect runs post-render**: The `useEffect` fires with access to the fully-bound `handleListClick`.
3. **No ref writes during render**: All ref manipulation happens inside the effect (post-render) or inside event handlers.
4. **React Compiler stays happy**: Counter is plain state, effect is standard — no memoization confusion.

### Guard bypass sub-pattern

`handleListClick` has an early-return guard:

```tsx
if (viewRef.current === 'categories' && selectedListRef.current?.id === list.id) return
```

After creating a category, we're already viewing this list's categories, so the guard would block the refresh. The effect resets `viewRef.current = 'lists'` before calling, allowing re-entry.

**Rule**: The trigger function owns both the counter increment AND any guard resets. Never split these across components.

## Decision Framework

| Pattern | Use when | Avoid when |
|---|---|---|
| **State counter + useEffect** | Rebuild is async-safe, trigger is "something changed, rebuild everything." Simple, debuggable. | You need synchronous rebuilds or the effect causes visible flicker. |
| **Extract shared logic into ref** | Circular part is a small utility, not the whole builder. | React Compiler is active — ref reads in render are flagged. |
| **Reducer dispatch** | The "rebuild" is a state transition with well-defined actions. | Rebuild depends on lots of external state not in the reducer. |
| **Split parent/child** | Callback creator and consumer can live at different component levels. | Builder logic is tightly coupled to local state. |

**Default**: State counter. Simplest pattern that works with React Compiler.

## React Compiler Gotchas

**Ref reads during render**: Compiler can't track ref mutations, so it can't safely memoize components that read refs during render. Move ref writes into effects or event handlers.

**useEffect ref-sync**: Compiler may reorder or skip the sync effect if it determines the ref write has no observable side effects. The consuming effect can then call a stale ref.

**useCallback with unstable deps**: Compiler may auto-memoize differently than your manual `useCallback`. For circular patterns, the state counter sidesteps this entirely because `setState` is always stable.

## Related

- `docs/solutions/react-patterns/async-race-condition-patterns.md` — generation counter pattern used alongside this
- `src/components/map/OrbMap.tsx:217-221` — the `onCreate` callback using this pattern
- `src/components/map/OrbMap.tsx:267-276` — the refresh effect
