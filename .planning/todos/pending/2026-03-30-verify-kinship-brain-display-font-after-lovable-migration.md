---
created: 2026-03-30T21:27:41.707Z
title: Verify Kinship Brain display font after Lovable migration
area: ui
files:
  - src/index.css
  - docs/design-system.md
---

## Problem

The main Kinship Brain display font (Fraunces serif, used for section headings, pod card names, Wrapped card stats) may have been changed or lost during the migration to/from Lovable. Need to verify the font is loading correctly and matches the original design intent.

## Solution

- Check `src/index.css` for Fraunces font import and `--font-serif` CSS custom property
- Compare current rendering against design-system.md specs
- Verify Google Fonts import is present and loading
- Fix if the font was swapped or the import was dropped
