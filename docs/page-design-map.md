# Real Deal - Page Design Map

## Goal

Map the real app screens before redesigning them.

This lets us:
- review each page in isolation
- compare pages against the shared shell
- iterate on page design without touching product code
- decide the redesign order before implementation

## How We Will Use This

For each screen:
- capture the current state
- note what the page is trying to do
- list the main layout pieces
- call out what feels strong
- call out what feels weak
- define what should change in the redesign

This is the design planning layer, not the implementation layer.

## Shared Shell First

Before redesigning any one page, treat these as shared across the app:

- left rail / sidebar
- page padding and max width
- page header pattern
- section spacing
- surface treatment
- typography scale
- status/tag behavior

Current shell source:
- [src/App.tsx](/Users/gabrielmurray/dev/realdeal/src/App.tsx)
- [src/components/nav/Sidebar.tsx](/Users/gabrielmurray/dev/realdeal/src/components/nav/Sidebar.tsx)

Current shell read:
- fixed left rail
- warm background
- soft glass-like nav
- page bodies mostly use simple padded containers
- each feature area has started inventing its own header style

Main shell issue:
- the app has one nav, but not one strong page frame yet

## Core Screens

These are the first screens to map and redesign.

### 1. Dashboard

- Route: `/dashboard`
- Source: [src/components/dashboard/Dashboard.tsx](/Users/gabrielmurray/dev/realdeal/src/components/dashboard/Dashboard.tsx)
- Job: help the user decide what matters today
- Current structure:
  - configurable widget-based page
  - equity / health summary
  - focus, attention, upcoming, recent activity, campaign progress
  - overlays for contact and campaign detail
- Current feel:
  - useful
  - modular
  - still reads more like stacked widgets than one strong thesis-led page
- Redesign focus:
  - stronger top section
  - clearer module order
  - less equal weight above the fold

### 2. Records List

- Route: `/contacts`
- Source: [src/components/records/RecordsList.tsx](/Users/gabrielmurray/dev/realdeal/src/components/records/RecordsList.tsx)
- Job: scan and filter people fast
- Current structure:
  - people / companies toggle
  - table with saved views, filters, bulk actions, and detail overlay
  - dense control surface
- Current feel:
  - powerful
  - table-first
  - likely more utilitarian than the rest of the app
- Redesign focus:
  - make the page header calmer
  - separate filters from the actual table more clearly
  - make density feel intentional instead of crowded

### 3. Record Detail

- Route: `/contact/:id`
- Source: [src/components/records/RecordPage.tsx](/Users/gabrielmurray/dev/realdeal/src/components/records/RecordPage.tsx)
- Job: understand one relationship and act on it
- Current structure:
  - header
  - urgency banner
  - two-column page
  - left side widgets
  - right side timeline
- Current feel:
  - closest thing to a proper detail workspace
  - strong information split
  - still likely missing a stronger page frame and calmer hierarchy
- Redesign focus:
  - tighten the header
  - make the signal banner feel more integrated
  - make the left column feel like a report, not a pile of cards

### 4. Campaign Overview

- Route: `/campaigns`
- Source: [src/components/campaigns/CampaignOverview.tsx](/Users/gabrielmurray/dev/realdeal/src/components/campaigns/CampaignOverview.tsx)
- Job: browse active and completed campaigns
- Current structure:
  - title and create button
  - filter, sort, group, view toggle
  - grid or list of campaigns
- Current feel:
  - clean
  - card-based
  - straightforward, but less distinct than it should be
- Redesign focus:
  - make campaign browsing feel more like entering a workspace
  - improve the top section
  - make grouping and status easier to scan

### 5. Campaign Detail

- Route: `/campaigns/:id`
- Source: [src/components/campaigns/CampaignDetailRoute.tsx](/Users/gabrielmurray/dev/realdeal/src/components/campaigns/CampaignDetailRoute.tsx)
- Job: run one campaign day to day
- Current structure:
  - campaign header area
  - stats bar
  - board or table view
  - settings panel
  - notes sidebar
  - contact detail overlay
- Current feel:
  - most operational page in the app
  - likely where shell consistency matters most
  - easy for this kind of page to drift into generic CRM
- Redesign focus:
  - make the board/table shell feel more premium
  - keep controls tight
  - make the campaign identity stronger without adding noise

### 6. Pods / Map

- Routes: `/pods`, `/pods/:podName`
- Source: [src/components/map/OrbMap.tsx](/Users/gabrielmurray/dev/realdeal/src/components/map/OrbMap.tsx)
- Job: navigate the relationship model spatially
- Current structure:
  - orbital map
  - hub node
  - pod nodes
  - category drill-in
- Current feel:
  - most visually distinctive part of the product
  - more brand-heavy than the other pages
  - may now be visually disconnected from the calmer product direction
- Redesign focus:
  - keep it special
  - make it feel like it belongs to the same product as the dashboard and records pages
  - align map chrome with the new shell

### 7. Category Table

- Route: `/category/:id`
- Source: [src/components/contacts/CategoryTable.tsx](/Users/gabrielmurray/dev/realdeal/src/components/contacts/CategoryTable.tsx)
- Job: work through one category with more depth than the map
- Current structure:
  - breadcrumb
  - page title
  - search and filters
  - sortable table
- Current feel:
  - classic data page
  - useful, but likely plain compared to the rest of the app
- Redesign focus:
  - make it feel like a deliberate sub-page, not a fallback table

## Secondary Screens

These matter, but they should follow the patterns established by the core screens.

### Nurturing Hub

- Route: `/dashboard/nurturing`
- Source: [src/components/nurturing/NurturingHub.tsx](/Users/gabrielmurray/dev/realdeal/src/components/nurturing/NurturingHub.tsx)
- Pattern: multi-section action page

### Import

- Route: `/import`
- Source: [src/components/import/ImportPanel.tsx](/Users/gabrielmurray/dev/realdeal/src/components/import/ImportPanel.tsx)
- Pattern: guided flow / setup page

### Settings

- Route: `/account`
- Source: [src/components/settings/AccountPage.tsx](/Users/gabrielmurray/dev/realdeal/src/components/settings/AccountPage.tsx)
- Pattern: narrow settings page with tabs

### Learn / Changelog / Onboarding

- Routes:
  - `/learn`
  - `/changelog`
  - `/onboarding`
- Pattern: support pages

## Starting Order

This is the order that makes the most sense:

1. Shared shell
2. Dashboard
3. Record detail
4. Records list
5. Campaign detail
6. Campaign overview
7. Pods / map
8. Secondary screens

Why this order:
- the shell affects every page
- the dashboard sets the app tone
- record detail and campaign detail are the deepest work surfaces
- list and overview pages can then inherit the same rules

## What We Should Make Next

Not code changes. Design artifacts.

We should make:
- one page inventory board
- one shell board
- one dashboard board
- one record detail board
- one campaign detail board

Each board should show:
- current page
- page anatomy
- what stays
- what changes
- one target direction

## Current Capture Status

I used the real route structure and live page files for this map.

Headless browser capture is currently blocked on authenticated pages because the local app throws an `<App>` render error without the signed-in browser state, so full live screenshot capture still needs either:
- cookie/session reuse from the signed-in browser, or
- manual visible-browser capture for the authenticated screens

That does not block the page map itself, but it does block a full screenshot set.

## Source Of Truth

- Product direction: [DESIGN.md](/Users/gabrielmurray/dev/realdeal/DESIGN.md)
- Quick implementation guide: [docs/design-system.md](/Users/gabrielmurray/dev/realdeal/docs/design-system.md)
- Screen map: [docs/page-design-map.md](/Users/gabrielmurray/dev/realdeal/docs/page-design-map.md)
- Design boards: [docs/design-boards/README.md](/Users/gabrielmurray/dev/realdeal/docs/design-boards/README.md)
