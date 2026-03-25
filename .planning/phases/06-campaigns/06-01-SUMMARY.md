---
phase: 06-campaigns
plan: 01
subsystem: data-layer + dashboard
tags: [campaigns, airtable, dashboard, types]
dependency_graph:
  requires: []
  provides: [campaign-types, airtable-campaign-crud, dashboard-campaigns-section]
  affects: [src/lib/types.ts, src/lib/airtable.ts, src/components/dashboard/Dashboard.tsx]
tech_stack:
  added: []
  patterns: [stale-while-revalidate cache, junction table via two fetchAll calls, PANEL style constant for campaign cards]
key_files:
  created: []
  modified:
    - src/lib/types.ts
    - src/lib/airtable.ts
    - src/components/dashboard/Dashboard.tsx
decisions:
  - "Placeholder Airtable table IDs used in TABLES const — must be replaced with real IDs after tables are created in Airtable"
  - "getCampaigns() fetches both campaigns and campaign contacts in one call to populate contact_ids — avoids N+1 and keeps cache coherent"
  - "CampaignCard onClick handlers are no-ops pointing to Plan 02 — avoids introducing unused selectedCampaignId state"
metrics:
  duration_seconds: 197
  completed_date: "2026-03-25"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 06 Plan 01: Campaign Types, Data Layer, and Dashboard Section Summary

**One-liner:** Campaign and CampaignContact types with full Airtable CRUD (stale-while-revalidate cache) and a dashboard section with progress bar cards between Today's Focus and Needs Attention.

## What Was Built

### Task 1: Campaign types and Airtable data layer

Added to `src/lib/types.ts`:
- `CampaignType` — `'event' | 'investment' | 'outreach' | 'other'`
- `CampaignContactStatus` — `'pending' | 'reached' | 'responded' | 'confirmed'`
- `CampaignStatus` — `'active' | 'completed'`
- `Campaign` interface with `id`, `name`, `type`, `deadline`, `status`, `contact_ids`, `created_at`
- `CampaignContact` interface — junction record with `campaign_id`, `contact_id`, `status`, `notes`

Added to `src/lib/airtable.ts`:
- `campaigns` and `campaignContacts` entries in `TABLES` const (placeholder IDs with setup comments)
- `CampaignFields` and `CampaignContactFields` raw field interfaces
- `mapCampaign()` and `mapCampaignContact()` map functions
- `getCampaigns()` — stale-while-revalidate cache, fetches both tables in one call to populate `contact_ids`
- `getCampaignContacts(campaignId)` — filters from module-level `_campaignContactsCache`
- `createCampaign(data)` — POST to campaigns with `Status: 'active'`, invalidates cache
- `addContactToCampaign(campaignId, contactId)` — POST to junction table, invalidates both caches
- `updateCampaignContactStatus(id, status)` — PATCH with optimistic cache update
- `completeCampaign(id)` — PATCH status to 'completed' with optimistic cache update
- `invalidateCampaignsCache()` — nulls both caches

### Task 2: Dashboard campaigns section

Added to `src/components/dashboard/Dashboard.tsx`:
- `campaigns`, `campaignContacts`, `campaignsLoading`, `showPastCampaigns` state
- `getCampaigns()` + `getCampaignContacts()` fetch chain in `useEffect`
- `activeCampaigns` and `pastCampaigns` derived with `useMemo`
- Campaigns JSX section between Today's Focus and Needs Attention:
  - Section header "campaigns" in `var(--font-serif)` with "+" button (no-op, Plan 02)
  - Empty state when no active campaigns
  - Up to 3 `CampaignCard` cards with "+N more" overflow
  - Collapsible past campaigns section matching dormant cleanup pattern
- `CampaignCard` local component:
  - Name + type badge (color-coded: purple/event, green/investment, blue/outreach, gray/other)
  - Progress bar: `contacted/total` where contacted = non-pending statuses
  - Optional deadline formatted as "due Mar 31"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript narrowing lost after await in getCampaignContacts**
- **Found during:** Task 1 build verification
- **Issue:** After `await getCampaigns()`, TypeScript couldn't narrow `_campaignContactsCache` from `null` because control flow analysis doesn't track side effects of called functions
- **Fix:** Added explicit `const cache: CampaignContact[] = _campaignContactsCache ?? []` type annotation
- **Files modified:** `src/lib/airtable.ts`
- **Commit:** 8486b52

**2. [Rule 1 - Bug] Unused state variable caused TypeScript error**
- **Found during:** Task 2 build verification
- **Issue:** `selectedCampaignId` state was declared but the value never read (only `setSelectedCampaignId` was called), causing TS6133 error
- **Fix:** Removed `selectedCampaignId` state since the detail panel is Plan 02. onClick handlers use no-op comments pointing to Plan 02.
- **Files modified:** `src/components/dashboard/Dashboard.tsx`
- **Commit:** 0d1e192

## Known Stubs

- `TABLES.campaigns = 'PLACEHOLDER_CAMPAIGNS_TABLE_ID'` — must be replaced with real Airtable table ID after creating the Campaigns table
- `TABLES.campaignContacts = 'PLACEHOLDER_CAMPAIGN_CONTACTS_TABLE_ID'` — must be replaced with real Airtable table ID after creating the CampaignContacts junction table
- Campaign card `onClick` handlers are no-ops — detail panel wired in Plan 02
- "+" button in header is a no-op — creation form wired in Plan 02

These stubs are intentional — the Airtable tables don't exist yet and the detail/creation UI is Plan 02. The dashboard section will render correctly once table IDs are replaced and data exists.

## Self-Check

### Files exist
- [x] `src/lib/types.ts` — modified
- [x] `src/lib/airtable.ts` — modified
- [x] `src/components/dashboard/Dashboard.tsx` — modified

### Commits exist
- [x] `8486b52` — feat(06-01): add campaign types and Airtable data layer
- [x] `0d1e192` — feat(06-01): add campaigns section to dashboard

## Self-Check: PASSED
