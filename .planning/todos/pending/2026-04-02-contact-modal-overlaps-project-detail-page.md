---
created: 2026-04-02T17:48:00.000Z
title: Contact modal overlaps project detail page
area: ui
files:
  - src/components/projects/ProjectDetailPage.tsx
  - src/components/contacts/ContactDetail.tsx
---

## Problem

Clicking a contact (e.g. Nina Chowdhury) from the Contacts tab on a project detail page (/projects/rec_demo_proj_2) opens the ContactDetail modal overlapping the project page content. The modal renders on top of the project header, creating a layered mess -- project title, contact name, interaction timeline, and contact info sidebar all visible simultaneously with no clear separation. The modal doesn't properly take over the viewport or dismiss the underlying project content.

## Solution

Investigate z-index and positioning of ContactDetail when opened from ProjectDetailPage context. The modal likely needs to either: (a) render as a full overlay with proper backdrop, or (b) navigate to the contact's dedicated route (/contact/:id) instead of opening inline.
