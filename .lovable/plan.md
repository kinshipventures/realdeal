

# Alpha Readiness Audit

After reviewing the full codebase, here is what is missing or broken for real users to interact with this app.

## Critical (blocks alpha)

### 1. No invite/team member flow
Workspaces exist, but there is no way to invite another user. The `workspace_members` table has no UPDATE policy either. Without this, "multi-user" is impossible.

**Work:**
- Add an "Invite member" UI in WorkspaceSwitcher or a new settings panel
- Create an edge function to send invite emails (or generate invite links)
- Add an `invites` table (workspace_id, email, role, token, accepted_at)
- Add UPDATE policy on `workspace_members` for role changes

### 2. No catch-all / 404 route
Visiting any unknown URL shows a blank page. Need a `<Route path="*">` with a "Page not found" screen and a link back to `/`.

### 3. No `/map` redirect
Phase 2 planned a `/map` -> `/pods` redirect but it was not added. Old bookmarks/links will break.

### 4. Demo mode toggle visible to real users
The "demo on/off" button is in the sidebar and mobile nav for all users, including real authenticated users. This is confusing for alpha testers. It should be hidden (or behind a developer flag).

## Important (should fix before inviting users)

### 5. No user settings / account page
No way to view your profile, change display name, or sign out on mobile (sign out is only in the desktop sidebar). Need at minimum a simple account/settings page or modal.

### 6. Workspace switching reloads nothing
When switching workspaces via WorkspaceSwitcher, it updates context but does not invalidate any data caches. The user sees stale data from the previous workspace until they manually refresh. Need to clear all module-level caches on workspace switch.

### 7. `companies` table has no workspace_id column
The `companies` table RLS is `true` for all authenticated users - every user can see every company. This is a data leak. Need to add `workspace_id` + proper RLS like other tables.

### 8. `_migration_id_map` table has permissive RLS
RLS is `true` for all authenticated users. Should be restricted or removed if no longer needed.

## Nice-to-have (polish for alpha)

### 9. Global error boundary
No React error boundary - a crash in any component white-screens the app. Add a top-level `<ErrorBoundary>` with a "Something went wrong" fallback and a reload button.

### 10. Loading state for workspace context
If workspace loading is slow, the app renders with `activeWorkspace = null`, which causes `getActiveWorkspaceId()` to throw. Add a loading gate after auth.

## Recommended implementation order

1. Fix companies table RLS + workspace_id (security, database migration)
2. Add catch-all 404 route + `/map` redirect (quick, 1 file)
3. Hide demo toggle from non-dev users (quick)
4. Cache invalidation on workspace switch (important for correctness)
5. Add error boundary (safety net)
6. Invite member flow (largest piece, enables multi-user)
7. Account/settings page (profile, sign out on mobile)

## Files modified

- **Database migration**: companies table workspace_id + RLS, _migration_id_map RLS fix, workspace_members UPDATE policy, invites table
- `src/App.tsx` - 404 route, /map redirect, hide demo toggle
- `src/lib/supabase-data.ts` - cache invalidation export
- `src/contexts/WorkspaceContext.tsx` - trigger cache clear on switch
- `src/components/nav/WorkspaceSwitcher.tsx` - invite UI
- `src/components/errors/ErrorBoundary.tsx` - new
- `src/components/settings/AccountPage.tsx` - new (or modal)
- Edge function for invite emails (if doing email invites)

