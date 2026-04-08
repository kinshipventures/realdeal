---
created: 2026-04-08T20:30:00.000Z
title: Pod without subpods should skip to members list
area: ui
files: []
---

## Problem

If a pod doesn't have subpods, clicking it should go straight into the settings/members list instead of showing an empty subpod view. Brielle feedback on Notion item 3.

## Solution

Check if pod has subpods on navigation. If none, skip to members/settings view directly.
