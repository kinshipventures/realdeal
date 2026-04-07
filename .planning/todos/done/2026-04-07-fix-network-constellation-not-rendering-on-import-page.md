---
created: 2026-04-07T23:05:25.323Z
title: Fix network constellation not rendering on import page
area: ui
files:
  - src/components/onboarding/OnboardingFlow.tsx
---

## Problem

The network constellation SVG node element is not appearing on the import page. This was flagged by the user as a persistent issue. The constellation is the animated network graph (9 nodes with cross-connections and glow effects) that appears at the top of the Import step (step 3) in the onboarding flow. Needs investigation - could be a rendering, z-index, or animation timing issue after the recent onboarding refactor (4-step flow, exit animations, responsive adaptations).

## Solution

TBD - needs visual debugging. Check:
- Whether the `onboard-constellation` class responsive overrides are causing display issues
- Whether the `stagger(80)` animation combined with `gentle-float` infinite animation conflicts
- Whether the SVG viewBox (`-90 -80 180 160`) is clipping on certain viewport sizes
- z-index stacking context with the SeedTree overlay
