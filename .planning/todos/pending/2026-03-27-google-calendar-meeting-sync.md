---
created: 2026-03-27T17:42:00.000Z
title: Google Calendar meeting sync
area: api
files:
  - src/components/dashboard/Dashboard.tsx
---

## Problem

No meeting/call tracking from calendar. Dashboard shows birthdays and follow-ups but not upcoming meetings. Moj wants to see "who am I meeting this week" in the app.

Source: 3/18 transcript brainstorm

## Solution

Google Calendar API → fetch events with attendees → match attendees to contacts → show in Upcoming section and contact timeline. Same OAuth infrastructure as Gmail integration.
