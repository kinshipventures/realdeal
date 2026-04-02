---
created: 2026-04-02T17:36:06.082Z
title: Fix project cards dark mode contrast
area: ui
files:
  - src/components/projects/ProjectsPage.tsx
---

## Problem

Project cards on /projects page have white/light backgrounds in dark mode, making them nearly invisible. Card text (project names, descriptions) is also light-colored against the light card background -- zero contrast. Visible in screenshot at localhost:8080/projects with demo mode on.

## Solution

Replace hardcoded card background colors with CSS custom properties that adapt to dark mode. Follow the same pattern used in the rgba color fix (commit b80be94).
