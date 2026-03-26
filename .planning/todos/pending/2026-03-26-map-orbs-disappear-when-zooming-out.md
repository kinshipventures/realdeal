---
created: 2026-03-26T21:34:22.988Z
title: Map orbs disappear when zooming out
area: ui
files:
  - src/map/OrbMap.tsx
  - src/map/SolidOrb.tsx
---

## Problem

When zooming out on the Map view, the orbs bug out and disappear. Likely a React Flow viewport bounds issue — nodes may be getting culled or their positions going out of the visible area when the zoom level gets too low.

## Solution

Investigate React Flow's `minZoom` / `maxZoom` props on the `<ReactFlow>` component. May need to set a `minZoom` floor (e.g., 0.3) to prevent zooming out far enough for nodes to disappear. Could also be related to node extent bounds or the `nodesDraggable` / `fitView` behavior at extreme zoom levels.
