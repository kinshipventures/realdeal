---
created: 2026-03-30T00:53:17.914Z
title: Fix categorization overlay in Lovable preview
area: ui
files:
  - src/components/categorization/CategorizationQueue.tsx
  - src/components/categorization/CategorizationModal.tsx
  - src/index.css
---

## Problem

The categorization swipe queue and categorization modal render inline on the page instead of as full-screen overlays when viewed on Lovable's preview environment (preview--mojrm.lovable.app). The overlays work correctly on Vercel (mojrm.vercel.app).

Attempts that failed:
1. `position: fixed` with `inset: 0` — renders inline, no dark backdrop
2. `createPortal` to `document.body` — same result
3. Moving overlays outside `<main>` with `overflow: auto` — same
4. Native `<dialog>` with `showModal()` and `::backdrop` — same

Lovable's wrapper environment likely has a CSS transform or containment on an ancestor that creates a new stacking context, breaking all overlay approaches. The exact cause in Lovable's runtime is unknown.

## Solution

Options to investigate:
- Inspect Lovable's preview DOM wrapper for the specific CSS property breaking fixed positioning (transform, filter, contain, will-change)
- Try `position: absolute` on a manually-created container appended to Lovable's outermost wrapper
- Contact Lovable support about position:fixed behavior in their preview runtime
- Accept Lovable preview as broken and verify only on Vercel (pragmatic option)
