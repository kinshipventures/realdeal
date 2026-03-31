# Phase 18: Authentication - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire Supabase authentication into the React app -- login/signup routing, session guards, and session persistence. Auth UI is built in Lovable; this phase handles routing, guards, and state management only. Requirements: AUTH-01, AUTH-02, AUTH-03.

</domain>

<decisions>
## Implementation Decisions

### Auth gate behavior
- **D-01:** Return-to pattern -- store the original URL the user tried to access, redirect to `/login`, bounce back to that URL after successful auth
- **D-02:** Unauthenticated users see only the login page -- no app content, nav, or interactive elements leak

### Login page layout
- **D-03:** Login page renders as a completely separate layout outside AppShell (no nav, no FAB, no demo toggle)
- **D-04:** Login page uses the same design system -- background color, DM Sans / Fraunces fonts, CSS custom properties, spacing tokens
- **D-05:** Auth UI components (form, OAuth buttons) are built in Lovable, not in this phase

### Demo mode
- **D-06:** Demo mode bypasses auth entirely -- unauthenticated users can toggle demo on and explore the full app with fake data
- **D-07:** When demo mode is active, auth guards are skipped -- no login required

### Loading state
- **D-08:** Branded splash screen (centered RealDeal logo or orb) shown during the initial `getSession()` check
- **D-09:** Splash resolves to either the app (session valid) or login page (no session) -- no login page flash for authenticated users

### Session management
- **D-10:** Supabase client already configured with `persistSession: true` and `autoRefreshToken: true` in `src/integrations/supabase/client.ts`
- **D-11:** Wire `onAuthStateChange` into React state to handle login, logout, and token refresh reactively

### Claude's Discretion
- Auth context provider implementation pattern
- Route guard component structure
- Splash screen visual design (within design system)
- How to detect "demo mode active" in the auth guard logic

</decisions>

<specifics>
## Specific Ideas

- Demo mode as a product demo tool -- Moj wants to show the app to potential users/investors without credentials
- Login should feel native to RealDeal, not like a generic Supabase auth page
- Onboarding flow (new user walkthrough, pod philosophy intro) is a separate Lovable project -- not part of any milestone phase

</specifics>

<canonical_refs>
## Canonical References

### Authentication requirements
- `.planning/REQUIREMENTS.md` -- AUTH-01, AUTH-02, AUTH-03 definitions
- `.planning/ROADMAP.md` Phase 18 section -- success criteria and dependency map

### Existing Supabase setup
- `src/integrations/supabase/client.ts` -- Pre-configured Supabase client with auth settings
- `src/integrations/supabase/types.ts` -- Auto-generated Supabase types

### App routing
- `src/App.tsx` -- All route definitions, AppShell layout, demo toggle placement
- `src/main.tsx` -- BrowserRouter provider wrapping the app

### Design system
- `docs/design-system.md` -- Full token set, typography, spacing, colors

### Demo mode
- `src/lib/sampleData.ts` -- `isDemoMode` / `setDemoMode` exports, demo data arrays

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase` client instance: already configured, just needs `onAuthStateChange` wiring
- Design tokens: CSS custom properties (`--color-bg`, `--color-brand`, `--font-serif`, etc.) available for login page
- `EmptyState` component: could inform splash screen layout pattern

### Established Patterns
- Route structure: flat `<Routes>` block with `<AppShell>` layout wrapper via `<Outlet>`
- State management: module-level state (no context providers yet) -- auth will likely be the first React context
- Demo mode: `isDemoMode` boolean checked in `sampleData.ts`, toggled via UI button in AppShell

### Integration Points
- `App.tsx` route definitions: add auth guard wrapper and login route
- `main.tsx`: auth provider wraps inside `BrowserRouter`
- `AppShell`: conditionally render based on auth state
- Demo toggle in AppShell: needs to work both with and without auth

</code_context>

<deferred>
## Deferred Ideas

- Onboarding flow (new user walkthrough, pod philosophy, brand storytelling) -- separate Lovable project, not part of any milestone phase
- Role-based permissions -- v2.2 scope (PERM-01)
- Team workspace with personal views -- v2.2 scope (WORKSPACE-01)

</deferred>

---

*Phase: 18-authentication*
*Context gathered: 2026-03-31*
