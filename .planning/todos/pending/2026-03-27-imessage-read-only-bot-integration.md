---
created: 2026-03-27T17:42:00.000Z
title: iMessage read-only bot integration
area: api
files: []
---

## Problem

Moj wants iMessage conversation context surfaced in contact cards. Mac Mini is the intended host for a bot that reads iMessage history. Separate Apple ID account discussed on 3/12.

Source: 2/26, 3/12, 3/18 transcripts

## Solution

Mac Mini bot reads iMessage SQLite database (~/Library/Messages/chat.db), matches contacts by phone/email, pushes interaction records to Airtable with source='iMessage'. Blocked on Apple ID setup and Mac Mini access.
