---
created: 2026-03-27T17:42:00.000Z
title: Gmail integration into contact timelines
area: api
files:
  - src/lib/airtable.ts
  - src/components/contacts/InteractionSection.tsx
---

## Problem

V1 priority across every meeting. Without Gmail data, contact timelines only show manually logged interactions. Moj wants cross-channel visibility: "This person hasn't responded to our last three emails, but are you texting with them?"

Source: 2/17, 2/26, 3/12, 3/18 transcripts

## Solution

OAuth flow for Gmail API → fetch email threads per contact → create Interaction records with source='Gmail', email_link populated. Needs a backend or serverless function since Gmail API requires server-side auth. Blocked on Moj providing OAuth credentials.
