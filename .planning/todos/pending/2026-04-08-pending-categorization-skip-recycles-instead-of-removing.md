---
created: 2026-04-08T20:24:09.132Z
title: Pending categorization skip recycles instead of removing
area: ui
files:
  - src/components/pulse/PendingCategorizationCard.tsx
---

## Problem

"Skip" in pending categorization just moves the contact to the back of the queue. There's no way to permanently dismiss/remove a contact from the pending list. Users who don't want to categorize someone are stuck seeing them repeatedly.

## Solution

Add a "Remove" or "Dismiss" option alongside Skip. Confirm with Moj whether removed contacts should be deleted entirely or moved to an archive/uncategorized state.
