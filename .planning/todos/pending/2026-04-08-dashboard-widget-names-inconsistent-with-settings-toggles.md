---
created: 2026-04-08T20:24:09.132Z
title: Dashboard widget names inconsistent with settings toggles
area: ui
files:
  - src/pages/Dashboard.tsx
  - src/components/pulse/PulseSettings.tsx
---

## Problem

Widget names on the dashboard don't match the toggle names in settings. Example: "Network Pulse" on the dashboard vs "Wrapped Insights" in settings. Users can't tell which toggle controls which widget.

## Solution

Audit all widget display names vs their settings toggle labels and unify them. Pick one canonical name per widget and use it everywhere.
