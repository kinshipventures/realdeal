---
created: 2026-03-29T23:04:11.985Z
title: Fix orb map overlap on large pods
area: ui
files:
  - src/components/map/OrbMap.tsx
  - src/components/map/ListNode.tsx
  - src/components/map/SolidOrb.tsx
---

## Problem

On pods with many categories (e.g. "Services Providers" with 833 contacts and 828 overdue), the category orbs overlap each other in a cramped arc below the pod. The "+" symbol also overlaps the member count text inside the pod orb itself. This happens when the pod has too many sub-items for the available arc radius.

## Solution

Two fixes needed:
1. Inside the pod orb: ensure the capacity indicator / "+" button doesn't overlap the member count — add vertical spacing or move the "+" to a separate position
2. For category orb layout: increase the arc radius or spread angle when category count exceeds a threshold, or switch to a multi-ring layout for pods with many categories. Consider capping visible categories with a "+N more" overflow indicator.
