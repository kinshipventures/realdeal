---
created: 2026-04-12T08:46:08.271Z
title: Fix Trolley rebrand color mismatch
area: ui
priority: delegate
files:
  - src/index.css
  - src/components/map/SolidOrb.tsx
  - docs/design-system.md
---

## Problem

CSS variables use #34B15D (transitional green from partial revert) but design-system.md specifies #25B439 (Trolley brand green). 4 lines in index.css (light + dark mode --color-brand and --header-band-bg) plus one dead entry in SolidOrb.tsx POD_SHIFT_COLORS. Briell posted on ClickUp asking Gaby/Moj to confirm current state matches brand standards.

## Solution

1. Wait for Gaby/Moj confirmation on which green is correct
2. Update 4 CSS variable lines in index.css
3. Remove dead #34B15D entry from SolidOrb.tsx POD_SHIFT_COLORS
4. Update design-system.md if the doc was wrong
