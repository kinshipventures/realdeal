

# Alpha Launch - Remaining Polish

## Status: Nearly ready

All critical items from the previous audit are implemented:
- 404 route, `/map` redirect, error boundary, account page, cache invalidation, demo toggle restriction, companies RLS, invite flow, workspace scoping

## Remaining items (small, non-blocking)

### 1. Mobile account access
The sidebar has sign-out on desktop, and `/account` exists, but the mobile bottom tab bar has no way to reach `/account`. Users on mobile cannot change their display name or sign out.

**Fix:** Add a small account/avatar icon to the mobile nav bar (replace one slot or add to the end), linking to `/account`.

### 2. Leaked password protection
The linter flags this, but login is Google OAuth only - no passwords are used. Non-issue.

### 3. No email/password signup fallback
Login is Google-only. If a tester cannot use Google (e.g., corporate SSO restrictions), they are locked out.

**Fix (optional):** Add email/password as a fallback auth method on the login page.

### 4. Onboarding for invited users
When a user accepts an invite and joins a workspace, they still see the generic onboarding flow ("Welcome to RealDeal, create your first pod"). This is confusing for someone joining an existing workspace with data already in it.

**Fix:** Skip onboarding if the user is joining via invite (check if workspace already has contacts/pods).

### 5. No loading/empty state for invited users
A new user who accepts an invite sees the pods map, but `getPods()` uses the default "Personal" workspace (auto-created on signup) rather than the invited workspace. They need to manually switch workspaces.

**Fix:** After accepting an invite, auto-switch to the invited workspace.

## Recommendation

Items 1 and 5 are the most impactful for alpha. Item 1 is ~10 lines. Item 5 is ~15 lines in `AcceptInvitePage.tsx` + `WorkspaceContext.tsx`.

## Files modified

- `src/App.tsx` - add account link to mobile nav
- `src/components/settings/AcceptInvitePage.tsx` - auto-switch workspace after accepting invite
- `src/contexts/WorkspaceContext.tsx` - expose method or trigger to switch after invite acceptance

