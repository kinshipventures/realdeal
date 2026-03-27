---
created: 2026-03-27T17:42:00.000Z
title: Multi-user team access with filtered views
area: general
files: []
---

## Problem

App is single-user. Briell, Gwyneth, and team members need to see and use the tool with filtered views per user. Currently everyone sees everything or nothing.

Source: 3/18 transcript — "Users table in Airtable, filtered views per user. Team needs to understand the network."

## Solution

Users table in Airtable with name, email, role. Simple auth (magic link or password). Filter contacts/pods by relationship_owner or team assignment. No heavy permissions system — just "who are you" and scoped views.
