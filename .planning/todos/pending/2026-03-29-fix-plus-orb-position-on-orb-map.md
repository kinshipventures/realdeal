---
created: 2026-03-29T23:04:11.985Z
title: Fix plus orb position on orb map
area: ui
files:
  - src/components/map/OrbMap.tsx
  - src/components/map/CreateCategoryNode.tsx
---

## Problem

The "+" create orb is positioned at the bottom-right corner of the viewport (like a FAB) instead of being part of the orbital ring with the other pod orbs. It should sit in the orbit at a consistent radius from the center hub, not float independently.

## Solution

Move the "+" orb into the `buildHomeNodes()` orbit calculation so it gets placed as the last node in the ring at the same radius (310px) as other pod orbs. Remove any fixed/absolute positioning that's putting it in the corner.
