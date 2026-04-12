---
created: 2026-04-12T08:46:08.271Z
title: Mark campaigns feature ready for testing
area: ui
priority: do-first
files:
  - src/components/campaigns/CampaignsPage.tsx
  - src/components/campaigns/CampaignContactCard.tsx
  - src/components/campaigns/CampaignBoard.tsx
  - src/components/campaigns/CampaignStageColumn.tsx
---

## Problem

Notion #11 (Campaigns) is marked "In progress". Equity scores, time-in-stage, and priority flags have been shipped to campaign contact cards. Nurturing connection, movement tracking, and priority management are now covered. Status needs updating to "Testing" and Gabe sign-off checked.

## Solution

1. Update Notion #11 status from "In progress" to "Testing"
2. Check Gabe sign-off on Notion
3. Add is_priority column to Supabase campaign_contacts table
4. Verify in browser that equity dots, time-in-stage, and star toggle render correctly
