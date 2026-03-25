---
created: 2026-03-25T23:33:34.930Z
title: Defer health ring animation until orbs settle
area: ui
files:
  - src/map/SolidOrb.tsx
  - src/map/OrbMap.tsx
---

## Problem

Health rings on orb map nodes render/animate immediately on page load, before the orbs have finished positioning into their orbital layout. The ring animation should only trigger once the orbs are in their final spots — otherwise it looks like the rings pop in prematurely while the layout is still settling.

## Solution

Add a short delay or listen for the React Flow `onNodesChange` / layout-complete signal before triggering the health ring SVG animation. Could use a `setTimeout` after initial render, or track a `layoutReady` state that flips once node positions stabilize. The ring's SVG stroke-dashoffset animation should start from 0 and only begin its transition after the delay.
