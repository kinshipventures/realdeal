---
created: 2026-04-08T20:24:09.132Z
title: Pending categorization needs field entry on confirm
area: ui
files:
  - src/components/pulse/PendingCategorizationCard.tsx
---

## Problem

When confirming a pending categorization contact, there's no way to fill in fields (phone, email, notes, etc.) during the categorization step. Contacts get categorized with incomplete data. Need to confirm with Moj which fields should be fillable at this step.

## Solution

Add field entry to the categorization confirmation flow. Confirm with Moj which fields are required vs optional at this stage.
