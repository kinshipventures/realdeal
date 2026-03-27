---
created: 2026-03-27T17:42:00.000Z
title: History backfill from existing tools
area: database
files: []
---

## Problem

Moj has years of relationship history in various tools (email, CRMs, spreadsheets). Contact timelines start empty without historical data. Equity scores are meaningless without history.

Source: 3/12 transcript — "History backfill possible if can access existing software data"

## Solution

Import historical interactions from Gmail (bulk), calendar events, and any exportable CRM data. Create Interaction records backdated to original dates. Depends on Gmail integration and data access.
