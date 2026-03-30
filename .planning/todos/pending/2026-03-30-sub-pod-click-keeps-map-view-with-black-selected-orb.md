---
created: 2026-03-30T21:27:41.707Z
title: Sub-pod click keeps map view with black selected orb
area: ui
files:
  - src/components/map/OrbMap.tsx
  - src/components/map/CategoryNode.tsx
  - src/components/map/SolidOrb.tsx
---

## Problem

Currently clicking a sub-pod (category) in the orb map navigates away from the map view (opens ContactPanel or navigates to records). The desired behavior is to stay in the map view — the clicked sub-pod becomes the new center orb, turns black to indicate selection, and its contents (contacts or deeper groupings) fan out around it.

Clicking the black selected sub-pod orb would then navigate to the record/detail view of that sub-pod. This keeps the experience visual and exploratory — the map is the primary navigation metaphor, not a launcher for list views.

## Solution

- Intercept CategoryNode click to trigger a "drill into sub-pod" state instead of navigating away
- Reposition the selected sub-pod to center, apply black fill/gradient
- Build child nodes around it (contacts in that sub-pod)
- Second click on the black center orb opens the pod detail/record view
- Back button or escape returns to parent pod view
