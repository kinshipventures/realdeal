---
created: 2026-04-08T20:24:09.132Z
title: Pulse settings says Dashboard instead of Pulse
area: ui
files:
  - src/components/pulse/PulseSettings.tsx
---

## Problem

The Pulse settings panel header or label says "Dashboard" instead of "Pulse". Naming should be consistent across the app - the route is /pulse, the nav says Pulse, so settings should too.

## Solution

Update the settings panel to use "Pulse" consistently. Check for any other places where "Dashboard" is used when "Pulse" is intended.
