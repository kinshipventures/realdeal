

# Phase 2: Full Rename Maps to Pods

## What changes

Rename "Map" to "Pods" across routes, UI labels, mobile nav, breadcrumbs, and component names. The index route (`/`) renders `OrbMap` (now labeled "Pods"), `/map` becomes a redirect to `/pods` for compatibility.

## Changes

### 1. Routes (`src/App.tsx`)

- Change `<Route index>` to render at `/pods` instead of index
- Add `<Route path="pods" element={<OrbMap />} />`
- Keep `/map` as redirect to `/pods` (or remove)
- Update `index` route to redirect to `/pods`
- Rename `isMap` variable to `isPods` throughout
- Mobile bottom nav: label "Map" -> "Pods", navigate to `/pods`
- Update hub-and-spoke icon for mobile nav (replace crosshair circle with hub icon)

### 2. Sidebar (`src/components/nav/Sidebar.tsx`)

- Rename `isMap` to `isPods`, match on `/pods` and `/`
- Change label "Map" -> "Pods"
- Replace `MapIcon` with a hub-and-spoke SVG icon
- Update `navigate('/')` to `navigate('/pods')`

### 3. Breadcrumb navigation updates

- `PodDetailPage.tsx`: "Back" link navigates to `/pods` instead of `/map`
- `CategoryTable.tsx`: fallback navigates to `/pods` instead of `/map`

### 4. Component file rename (optional, cosmetic)

- Keep `OrbMap.tsx` filename as-is (internal name, not user-facing) to minimize churn

## Files modified

- `src/App.tsx` - routes, mobile nav label/icon, variable names
- `src/components/nav/Sidebar.tsx` - label, icon, route, variable name
- `src/components/pods/PodDetailPage.tsx` - back link `/map` -> `/pods`
- `src/components/contacts/CategoryTable.tsx` - fallback redirect `/map` -> `/pods`

