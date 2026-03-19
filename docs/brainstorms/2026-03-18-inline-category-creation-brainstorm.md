# Inline Category Creation

**Date**: 2026-03-18
**Status**: Brainstormed

## What We're Building

In-app category creation from the orb map. A `+` orb sits in the category circle alongside real categories. Tap it, type a name inline, hit Enter — a new category orb appears and the circle re-layouts smoothly.

Currently categories are read-only in the app (managed in Airtable). This adds a `createCategory()` data function and an inline creation flow that keeps the user in spatial context.

## Why This Approach

- **Spatial creation**: The `+` orb lives where the result appears — no modals, no panel switches, no context loss
- **Inline input**: Tap `+`, type name, Enter. Minimal friction, stays in flow
- **Visual distinction**: Dashed border, no glass gradient, just `+` centered — reads as "empty slot" not "category"
- **Smooth re-layout**: After creation, all orbs redistribute evenly around the circle with animation

## Key Decisions

### Trigger: `+` orb in the category circle
- 64px dashed-border circle with `+` icon, positioned as the last node in the circular layout
- No glass gradient — `rgba(0,0,0,0.15)` border, transparent fill
- Part of the circle's node array, connected to the list orb via edge (dashed or no edge — TBD)

### Input: Inline on the orb
- Tapping `+` transforms it into a text input at the same position
- Placeholder: "Category name..."
- Submit: Enter key
- Cancel: Escape or click-away (no visible cancel button)
- On submit: create in Airtable, optimistically render the new orb

### Post-creation: Animated re-layout
- New orb fades in at the `+` position
- All orbs (including the new `+`) smoothly redistribute around the circle
- Uses existing `circularLayout()` with recalculated positions
- `+` orb moves to the next slot in the ring

### Data layer
- New `createCategory(name, listId)` function in `airtable.ts`
- Invalidate `_categoriesCache` after creation
- New category gets: `Name`, `List` (linked to current list), no `Color` (inherits list color)

## Open Questions

- Should the `+` orb have an edge connecting it to the center list orb, or float unconnected?
- Should there be a max category limit or warning? (Lists with 30+ categories already exist)
- Should we support renaming/deleting categories in-app too, or just creation for now?
