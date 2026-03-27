---
created: 2026-03-27T17:42:00.000Z
title: Contact reconciliation across channels
area: database
files:
  - src/lib/airtable.ts
---

## Problem

Same person may appear across email, iMessage, calendar with different identifiers (email vs phone vs name). No deduplication or matching logic exists.

Source: 3/18 transcript — "Contact reconciliation across email addresses"

## Solution

Match contacts by email, phone, or fuzzy name matching. Merge/link duplicate records. Depends on Gmail and iMessage integrations being live first. Could use a simple scoring model: exact email match = auto-merge, phone match = suggest, name-only = flag for review.
