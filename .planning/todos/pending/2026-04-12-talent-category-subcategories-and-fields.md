---
created: 2026-04-12T08:46:08.271Z
title: Talent category subcategories and fields
area: ui
priority: schedule
files:
  - src/lib/types.ts
  - src/lib/sampleData.ts
  - src/lib/supabase-data.ts
---

## Problem

Notion #10 (Talent Category Structure) is "Not started". Pod "Talent & Influencers" exists with sample contacts but no subcategories defined (unlike LP which has Series A, Angels, Family Office) and no talent-specific fields (creator_type, platform, follower_count, etc.). ~40% complete.

## Solution

1. Decide on subcategories (needs scoping input - e.g. Creators, Managers, Influencers)
2. Decide on talent-specific fields
3. Add subcategories to sampleData and Supabase
4. Add fields to Contact type and render in ContactDetail
5. Depends on LP category being stabilized first
