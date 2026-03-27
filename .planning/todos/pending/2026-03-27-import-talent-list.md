---
created: 2026-03-27T17:42:00.000Z
title: Import Talent list
area: database
files:
  - src/components/import/ImportPanel.tsx
  - src/lib/csvImport.ts
---

## Problem

Talent & Influencers pod needs its own dataset imported. Separate from LP list — different columns, different source sheet.

Source: 3/18 transcript

## Solution

Same import infrastructure as LP list. Likely a CSV export from Google Sheets with column mapping. Blocked on data from Moj/Briell.
