

# Standardize Breadcrumbs and Navigation Across All Pages

## Current State

Navigation is inconsistent across pages:

| Page | Back button | Goes to | Style |
|------|-----------|---------|-------|
| CategoryTable (`/category/:id`) | Breadcrumb trail: Map > Pod > Category | `/map` (Map link only clickable, Pod is plain text) | Text links with `>` separator |
| PodDetailPage (`/pod/:id`) | Chevron + "Back" | `navigate(-1)` (browser history) | Chevron icon |
| RecordPage/RecordHeader (`/contact/:id`) | Chevron + "Back" | `navigate(-1)` (browser history) | Chevron icon |
| ProjectDetailPage (`/projects/:id`) | Chevron + "Projects" | `/projects` (explicit) | Chevron icon |
| NurturingHub (`/pulse/nurturing`) | Chevron + "Dashboard" | `/` (should be `/pulse`) | Chevron icon |
| ImportPanel (`/import`) | Text button "Done" | `/` | Different pattern entirely |
| List pages (Contacts, Pipelines, Projects) | No back button | N/A | Top-level, correct |

### Problems

1. **CategoryTable breadcrumb**: Pod name is not clickable (should link to `/pod/:podId`)
2. **NurturingHub**: Back goes to `/` (map) instead of `/pulse` (dashboard)
3. **PodDetailPage**: Uses `navigate(-1)` - unpredictable if user arrived via direct link or deep navigation
4. **RecordHeader**: Uses `navigate(-1)` - same unpredictability issue
5. **Sidebar**: No active highlight for `/category/:id`, `/pulse/nurturing`, or `/contact/:id` routes
6. **CategoryTable**: Header padding `28px 40px 0` not standardized to `32px 32px`

## Plan

### 1. Standardize back navigation targets (explicit routes, not browser history)

- **PodDetailPage**: Change `navigate(-1)` to `navigate('/')` with label "Map" (pods are on the map)
- **RecordHeader**: Change `navigate(-1)` to breadcrumb: Contacts > Contact Name. "Contacts" links to `/contacts`
- **NurturingHub**: Change back target from `/` to `/pulse`
- **CategoryTable**: Make pod name clickable, linking to `/pod/:podId`. Store `podId` in state during data load

### 2. Add breadcrumbs to detail pages that have parent context

- **CategoryTable**: Already has breadcrumb - fix pod name to be clickable link to `/pod/:podId`
- **ProjectDetailPage**: Already correct (chevron + "Projects" -> `/projects`)
- **PodDetailPage**: Change to breadcrumb: Map > Pod Name (Map links to `/`)
- **RecordHeader**: Add breadcrumb: Contacts > Contact Name
- **NurturingHub**: Change label from "Dashboard" to "Pulse" and fix target

### 3. Fix sidebar active states for sub-routes

In `Sidebar.tsx`, update route detection:
- `isContacts` should also match `/contact/:id` and `/category/:id`
- `isPulse` already matches `/pulse/` prefix - confirmed correct
- Add pod route highlighting (already handled via `isPod`)

### 4. Standardize CategoryTable padding

- Change header padding from `28px 40px 0` to `32px 32px 0`
- Change body padding to match other pages

## Files Modified

- `src/components/contacts/CategoryTable.tsx` - Fix breadcrumb (clickable pod), fix padding
- `src/components/pods/PodDetailPage.tsx` - Breadcrumb instead of generic back
- `src/components/records/RecordHeader.tsx` - Breadcrumb instead of `navigate(-1)`
- `src/components/nurturing/NurturingHub.tsx` - Fix back target to `/pulse`
- `src/components/nav/Sidebar.tsx` - Highlight sidebar for `/contact/` and `/category/` routes

