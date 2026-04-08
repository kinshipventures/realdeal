---
created: 2026-04-08T20:30:00.000Z
title: Pod required questions should appear in pending categorization
area: ui
files:
  - src/components/pulse/PendingCategorizationCard.tsx
---

## Problem

Custom fields within the pod (reflected in pod settings as "Required Questions") should show up on the pending categorization module after the pod is selected. This is the "category-specific depth" feature. Brielle feedback on Notion item 5.

## Solution

After user selects a pod in pending categorization, dynamically load and display that pod's required questions/custom fields before confirming.
