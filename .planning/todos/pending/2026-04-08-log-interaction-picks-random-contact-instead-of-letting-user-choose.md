---
created: 2026-04-08T20:24:09.132Z
title: Log interaction picks random contact instead of letting user choose
area: ui
files:
  - src/pages/Dashboard.tsx
---

## Problem

The "Log interaction" button on the dashboard pre-selects a random contact instead of letting the user pick who the interaction was with, or create a new contact. This is confusing and unusable.

## Solution

Log interaction should either open a contact picker/search first, or open a blank interaction form where the user selects the contact. No pre-selection.
