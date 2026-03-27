---
created: 2026-03-27T17:42:00.000Z
title: Import LP lists from Google Sheets
area: database
files:
  - src/components/import/ImportPanel.tsx
  - src/lib/csvImport.ts
---

## Problem

LP data lives in a Google Sheet with multiple tabs, each with different column structures. Moj said "nail talent and investors" — LP tracker is the next priority pod after service providers is proven.

Source: 3/18 transcript — "Each list has slightly different columns — automated cleanup during migration"
Source: 3/26 transcript — LP tracker is next after service providers

## Solution

Export Google Sheet tabs as CSVs, use ImportPanel with per-tab column mapping. May need a mapping UI that lets user match source columns to Airtable fields. Blocked on Moj/Briell providing the actual spreadsheet.
