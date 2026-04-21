# Real Deal - Record Detail Board

## Current Reference

- Route: `/contact/:id`
- Page source: [src/components/records/RecordPage.tsx](/Users/gabrielmurray/dev/realdeal/src/components/records/RecordPage.tsx)
- Main pieces:
  - [src/components/records/RecordHeader.tsx](/Users/gabrielmurray/dev/realdeal/src/components/records/RecordHeader.tsx)
  - [src/components/records/RecordWidgets.tsx](/Users/gabrielmurray/dev/realdeal/src/components/records/RecordWidgets.tsx)
  - [src/components/records/RecordTimeline.tsx](/Users/gabrielmurray/dev/realdeal/src/components/records/RecordTimeline.tsx)

## What This Page Needs To Do

Help the user understand one relationship fast, then take the next action.

## What The Current Page Already Gets Right

- it has a clear detail-page shape
- the left and right split makes sense
- the page mixes profile context with working history well
- the urgency banner helps the page feel alive

## What The Page Is Missing

- a more premium top frame
- a calmer, more report-like left column
- a more integrated warning / signal pattern
- less feeling of separate parts stacked together

## Current Anatomy

### Header

- breadcrumb
- avatar
- name and type
- company / role context
- contact methods
- overflow actions

### Signal Layer

- optional overdue or stale banner
- direct action buttons
- dismiss action

### Main Layout

- two columns on desktop
- left column for widgets and profile blocks
- right column for timeline and interaction log

## What To Keep

- the two-column structure
- the contact timeline on the right
- the page feeling action-oriented
- the signal layer for stale or overdue relationships

## What To Change

### Header

- make it feel more composed and less utilitarian
- give the top section a stronger page frame
- make the contact identity feel more important than the utility controls

### Left Column

- make the widgets feel more like one report
- reduce the sense of many separate boxes
- tighten the spacing and grouping logic

### Signal Layer

- fold the warning state into the page more naturally
- keep it visible, but make it feel designed, not bolted on

### Right Column

- keep the timeline dominant
- make the filter controls quieter and more polished
- make the log feel like the working surface of the page

## Target Direction

This page should feel like a relationship workspace.

Not a profile page.

Not a CRM detail page.

## Redesign Rules

- identity first
- signal second
- details third
- timeline stays the main working column
- the left column should read as a report, not a widget dump

## First Redesign Moves

1. Redesign the record header into a stronger identity band.
2. Rework the warning banner into a calmer inline signal.
3. Group the left-column widgets into clearer sections.
4. Make the timeline area feel more premium and less mechanical.

## Done / Not Done

- Done: structure and redesign direction are mapped
- Not done: layout variants
