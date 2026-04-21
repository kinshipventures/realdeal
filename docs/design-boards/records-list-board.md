# Real Deal - Records List Board

## Current Reference

- Route: `/contacts`
- Page source: [src/components/records/RecordsList.tsx](/Users/gabrielmurray/dev/realdeal/src/components/records/RecordsList.tsx)

## What This Page Needs To Do

Help the user scan, filter, sort, and act on people quickly.

## What The Current Page Already Gets Right

- powerful table
- useful search and filtering
- bulk actions are already built in
- the page has enough density for serious use

## What The Page Is Missing

- a calmer page opening
- clearer separation between page framing and heavy controls
- a more intentional table shell
- less feeling of "toolbars on top of table on top of modal"

## Current Anatomy

### Header

- page title
- count
- people / companies toggle
- pulse message

### Filter Bar

- search
- pod and category filter
- recency filter
- more menu

### Bulk Action Bar

- selection state
- pod actions
- field updates
- merge
- export
- archive
- add to campaign

### Main Table

- sticky header
- sortable columns
- selectable rows
- inline health cues
- opens contact detail overlay on row click

## What To Keep

- the data density
- the relationship health signal in rows
- the people / companies split
- the detail overlay pattern

## What To Change

### Top Of Page

- make the page feel more composed before the controls start
- reduce the feeling that the page starts with a toolbar stack

### Controls

- simplify the visual weight of filters and utility actions
- make the hierarchy between primary and secondary controls clearer
- reduce control clutter without losing capability

### Table Shell

- make the table feel more intentional and more productized
- keep it powerful, but less plain
- align the table visually with the calmer app shell

## Target Direction

This page should feel like a high-quality review table inside a designed product.

Not a generic admin screen.

## Redesign Rules

- keep the density
- lower the noise
- make the page opening calmer
- keep the table as the hero once the user starts working

## First Redesign Moves

1. Rebuild the page header into a cleaner top frame.
2. Separate filters from utility actions more clearly.
3. Give the table its own stronger container logic.
4. Make bulk action mode feel more deliberate and less like an interrupt.

## Done / Not Done

- Done: structure and redesign direction are mapped
- Not done: table-shell variants
