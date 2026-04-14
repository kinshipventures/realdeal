

# Campaigns Redesign - Complete Plan

## Summary

Rebuild the campaigns interface from a tab-based board view into a full management system: campaign overview landing page (card grid + table list toggle), route-based drill-down with Board + Table dual views, 16-color stage picker, inline-editable table with field visibility, and full migration from opportunities to contact-centric model.

## Major Architectural Change: Kill Opportunities

65 opportunities in "KV Pipeline" need to become campaign_contacts. Each opportunity maps to one or more contacts via opportunity_contacts junction. The migration:

1. DB migration script: for each opportunity, create a campaign_contact row per linked contact (or one row using the opportunity name if no contact linked), mapping stage_id, notes, and status
2. Map pipeline_stages to campaign_stages for the KV Pipeline campaign
3. Remove all `CampaignOpportunity` references from types, data layer, and UI
4. Remove the `backing` concept - all campaigns are now contact-based with stages

This is a breaking change for existing pipeline campaigns but simplifies everything downstream.

## Routing

```text
/campaigns          -> CampaignOverview (card grid or table list)
/campaigns/:id      -> CampaignDetail (board or table view)
/campaigns/:id?view=table  -> table view
```

Browser back from detail returns to overview. View preference (board/table) stored in localStorage per campaign.

## Plan Steps

### Step 1: DB Migration - Opportunities to Campaign Contacts

- SQL migration to:
  - Create campaign_stages rows from pipeline_stages (mapping pipeline_id to campaign_id via the campaigns table)
  - Create campaign_contact rows from opportunities + opportunity_contacts
  - Preserve stage_id, notes, moved_at from opportunities
- No schema changes needed - campaign_contacts and campaign_stages tables already exist with the right columns

### Step 2: Remove Opportunity Model from Code

- Remove `CampaignOpportunity` interface and `CampaignBacking` type from types.ts
- Remove `OUTREACH_TYPES`, `PIPELINE_TYPES`, `campaignBacking()` from types.ts
- Remove `getCampaignOpportunities`, opportunity-related functions from supabase-data.ts
- Remove all `backing` branches in CampaignsPage, CampaignBoard
- All campaigns now use campaign_contacts + campaign_stages uniformly

### Step 3: Campaign Overview Page

New component `CampaignOverview.tsx` as the default `/campaigns` landing:

- **Card Grid view**: campaign cards showing name, type icon+color, progress bar, contact count, deadline, last activity, first 3-5 contact avatars, owner
- **Table List view**: fixed columns - Name, Type, Status, Contacts, Progress, Deadline, Last Activity
- Toggle between grid/list stored in localStorage
- Active/Completed filter
- Full empty state with Create Campaign CTA when zero campaigns
- Grouped or flat toggle (user choice)
- Click card/row navigates to `/campaigns/:id`

### Step 4: Route Restructure

- `/campaigns` renders `CampaignOverview`
- `/campaigns/:id` renders `CampaignDetail` (new wrapper component)
- Back button in detail header navigates to `/campaigns`
- `CampaignDetail` loads campaign data, stages, contacts on mount
- Board | Table toggle in the action bar

### Step 5: 16-Color Stage Palette

Expand `COLOR_SWATCHES` in `CampaignStageColumn.tsx` from 8 to 16 colors:
gray, blue, green, yellow, orange, red, pink, purple, teal, indigo, lime, amber, cyan, brown, slate, rose

### Step 6: Campaign Table View

New component `CampaignTableView.tsx`:

- Rows = campaign_contacts joined with contact data
- Default columns: Name, Company, Email, Role, Stage (colored dropdown), Owner, Next Step, Next Step Due, Notes, Last Moved
- **Single-click** cell editing - click cell becomes input, blur/Enter saves
- Stage column: colored dropdown, pick any stage freely
- Single-column sort via header click (asc/desc toggle)
- Checkbox column for multi-select + bulk action bar (move stage, remove, export)
- Search bar + column-level filter dropdowns (stackable)
- Right-click context menu on rows (Remove from campaign, Move to stage, Open contact)
- Column visibility per campaign via localStorage key `realdeal:campaign-fields:{campaignId}`
- `FieldVisibilityMenu` component - eye icon button opens checklist popover

### Step 7: Contact Detail Overlay from Table

Clicking a contact name in the table opens the existing ContactDetail slide-out panel overlaid on the campaign table.

### Step 8: New Contacts Default to First Stage

When adding a contact to a campaign (search-add), they are assigned to the first stage (lowest `order`) automatically.

### Step 9: Update Settings Panel

Move stage color editing into the existing `CampaignSettingsPanel` or keep it inline on stage headers. Settings panel already handles name, type, deadline, description, notes.

## Files to Create

| File | Purpose |
|---|---|
| `src/components/campaigns/CampaignOverview.tsx` | Overview grid/list landing page |
| `src/components/campaigns/CampaignOverviewCard.tsx` | Card for overview grid |
| `src/components/campaigns/CampaignTableView.tsx` | Airtable-style editable table |
| `src/components/campaigns/FieldVisibilityMenu.tsx` | Column toggle popover |
| `src/components/campaigns/CampaignDetailRoute.tsx` | Route wrapper for /campaigns/:id |

## Files to Modify

| File | Changes |
|---|---|
| `src/lib/types.ts` | Remove CampaignOpportunity, CampaignBacking, backing field, OUTREACH/PIPELINE_TYPES |
| `src/lib/supabase-data.ts` | Remove opportunity functions, simplify campaign data loading |
| `src/lib/sampleData.ts` | Remove opportunity sample data, update demo mode |
| `src/components/campaigns/CampaignsPage.tsx` | Restructure as router (overview vs detail) |
| `src/components/campaigns/CampaignBoard.tsx` | Remove opportunity branches, simplify props |
| `src/components/campaigns/CampaignStageColumn.tsx` | 16-color palette |
| `src/components/campaigns/CampaignContactCard.tsx` | Minor - ensure works without opportunity model |
| `src/App.tsx` | Add /campaigns/:id route |

## DB Migration

One migration to convert opportunities to campaign_contacts. No new tables or columns needed.

## Data Integrity

- All 65 KV Pipeline opportunities migrated to campaign_contacts
- Stage mappings preserved (pipeline_stages -> campaign_stages already exist or get created)
- Contact linkage preserved via opportunity_contacts junction
- Opportunities with no linked contacts get a campaign_contact row with contact_id from best-match contact lookup (or skipped with a note)

