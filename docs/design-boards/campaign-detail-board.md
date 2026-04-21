# Real Deal - Campaign Detail Board

## Current Reference

- Route: `/campaigns/:id`
- Page source: [src/components/campaigns/CampaignDetailRoute.tsx](/Users/gabrielmurray/dev/realdeal/src/components/campaigns/CampaignDetailRoute.tsx)

## What This Page Needs To Do

Help the user run a campaign day to day.

## What The Current Page Already Gets Right

- the page has real operational depth
- board and table views are both supported
- stats, notes, settings, and contact detail all exist
- the page has enough structure to become very strong

## What The Page Is Missing

- a cleaner hierarchy at the top
- a more premium board / table frame
- better separation between control chrome and working content
- less chance of drifting into generic CRM territory

## Current Anatomy

### Header

- campaign name
- type pill
- deadline
- editable description

### Stats Layer

- stats bar after the description

### Action Bar

- board / table toggle
- sort
- fields
- stalled filter
- export
- settings
- mark complete

### Main Workspace

- board or table
- notes sidebar
- contact detail overlay

## What To Keep

- board and table dual-mode setup
- notes sidebar
- contact detail integration
- stats layer

## What To Change

### Top Of Page

- the opening has too many separate bars
- combine the title, description, stats, and actions into a cleaner page frame
- reduce the feeling of stacked controls

### Action Bar

- keep all the functionality
- improve grouping
- make primary controls more obvious than utilities

### Main Workspace

- the board and table area should feel like the center of gravity
- notes sidebar should support, not compete
- settings should feel more tucked away

## Target Direction

This page should feel like a campaign operating room with calm controls.

## Redesign Rules

- the board or table is the hero
- top controls should be cleaner and tighter
- secondary utilities should stay in the background
- campaign identity should remain visible without taking over the page

## First Redesign Moves

1. Combine the top bars into one stronger campaign frame.
2. Rebuild the action area into clearer groups.
3. Make the board / table shell feel more premium.
4. Keep the notes rail quieter and more supportive.

## Done / Not Done

- Done: structure and redesign direction are mapped
- Not done: workspace variants
