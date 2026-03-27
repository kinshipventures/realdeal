---
created: 2026-03-27T17:42:00.000Z
title: Email drafting from contact card
area: ui
files:
  - src/components/contacts/ContactDetail.tsx
---

## Problem

Moj wants to draft and send emails directly from contact cards. Currently interactions are logged after the fact — no way to initiate outreach from the app.

Source: 2/17 transcript (Front email tool discussion)

## Solution

"Send Email" action in ContactDetail that opens a compose form or mailto: link. Could integrate with Gmail API for full send, or start simple with mailto: that pre-fills recipient. Depends on Gmail integration for full functionality.
