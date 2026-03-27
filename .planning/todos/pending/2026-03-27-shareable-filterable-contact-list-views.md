---
created: 2026-03-27T17:42:00.000Z
title: Shareable filterable contact list views
area: ui
files:
  - src/components/contacts/CategoryTable.tsx
---

## Problem

Moj wants to share filtered contact lists externally — e.g. "send a list of service providers in LA to a founder." The table view exists but has no shareable export or advanced filtering beyond overdue/cooling.

Source: 3/26 transcript — "send a list to a founder, filter by location"

## Solution

Add column-level filters (location, company, role, equity status) to CategoryTable. Add export/share action — could be copy-to-clipboard as formatted text, CSV download, or a shareable URL with filters encoded. Start with the simplest: copy filtered list as formatted text.
