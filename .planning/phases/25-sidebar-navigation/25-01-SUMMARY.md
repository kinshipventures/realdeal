---
phase: 25-sidebar-navigation
plan: 01
status: complete
started: 2026-04-03
completed: 2026-04-03
---

## Summary

Replaced the floating bottom pill navigator with a collapsible left sidebar on desktop (Linear-style). Swapped routes so `/` renders OrbMap and `/pulse` renders Dashboard.

## What was built

- `src/components/nav/Sidebar.tsx` - 428-line desktop sidebar with frosted glass treatment, five core nav items (Map, Pulse, Contacts, Pipelines, Projects), pods sub-nav fetched from `getPods()`, and utility section (Search, Demo toggle, Sign out)
- Updated `src/App.tsx` - route swap (index = OrbMap, /pulse = Dashboard), sidebar integration with lifted collapsed state, paddingLeft layout shift, mobile nav updated to navigate('/pulse')

## Key decisions

- Collapsed state lifted to AppShell so layout div knows sidebar width for paddingLeft transition
- Pods section hidden entirely when collapsed (no ambiguous color dots without labels)
- Search rendered as icon button (not input field) per D-06, triggers existing SearchPalette
- Demo toggle uses green dot indicator when active, inline row format
- Mobile bottom tab bar unchanged except Pulse button navigates to /pulse

## Key files

### Created
- `src/components/nav/Sidebar.tsx`

### Modified
- `src/App.tsx`

## Deviations

None - all plan requirements met as specified.

## Verification

- `pnpm build` passes with zero TypeScript errors
- All acceptance criteria verified programmatically
