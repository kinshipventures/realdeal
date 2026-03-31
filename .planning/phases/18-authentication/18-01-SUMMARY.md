---
phase: 18-authentication
plan: 01
subsystem: auth
tags: [supabase, react-router, session, auth-context, route-guard]

requires: []
provides:
  - AuthProvider context with onAuthStateChange session management
  - RequireAuth route guard with demo mode bypass
  - SplashScreen branded loading component
  - LoginPage shell with lovable-auth mount point
  - Protected route structure in App.tsx
affects: [21-sharing, 19-enrichment-followups]

tech-stack:
  added: []
  patterns:
    - "onAuthStateChange only (no getSession) - INITIAL_SESSION event delivers persisted session on mount"
    - "RequireAuth as layout route wrapping AppShell - login stays outside the guard"
    - "Demo mode bypass checked before auth state - isDemoMode() fires first in RequireAuth"

key-files:
  created:
    - src/contexts/AuthContext.tsx
    - src/components/auth/RequireAuth.tsx
    - src/components/auth/SplashScreen.tsx
    - src/components/auth/LoginPage.tsx
  modified:
    - src/main.tsx
    - src/App.tsx

key-decisions:
  - "Single onAuthStateChange subscription - no getSession() call to avoid double-fetch anti-pattern"
  - "LoginPage is a shell only - id=lovable-auth div is the mount point for Lovable auth UI"
  - "open redirect guard on return_to: startsWith('/') check prevents arbitrary URL redirect"

patterns-established:
  - "AuthProvider: wrap App inside BrowserRouter, outside App component"
  - "Route guard: <Route element={<RequireAuth />}> wraps <Route element={<AppShell />}>"
  - "Return-to pattern: /login?return_to=%2Fpath preserved through redirect cycle"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

duration: 8min
completed: 2026-03-31
---

# Phase 18 Plan 01: Authentication Shell Summary

**Supabase auth wired into React via AuthProvider context, RequireAuth route guard with demo bypass, SplashScreen, and LoginPage shell with lovable-auth mount point**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-31T22:22:21Z
- **Completed:** 2026-03-31T22:30:00Z
- **Tasks:** 3 (+ 1 checkpoint)
- **Files modified:** 6

## Accomplishments
- AuthProvider managing session state via single onAuthStateChange subscription
- RequireAuth guard: demo bypass first, then splash on loading, then session check with return_to redirect
- LoginPage shell ready for Lovable auth UI drop-in (id=lovable-auth div placeholder)
- All app routes protected, /login sits outside the guard, build passes with zero type errors

## Task Commits

1. **Task 1: Create AuthContext provider and useAuth hook** - `f992360` (feat)
2. **Task 2: Create RequireAuth guard, SplashScreen, and LoginPage shell** - `36483ea` (feat)
3. **Task 3: Wire AuthProvider into main.tsx and restructure App.tsx routes** - `96ce0f4` (feat)

## Files Created/Modified
- `src/contexts/AuthContext.tsx` - Session state via onAuthStateChange, useAuth hook
- `src/components/auth/RequireAuth.tsx` - Route guard with demo bypass, splash, redirect
- `src/components/auth/SplashScreen.tsx` - Branded loading screen (Fraunces wordmark)
- `src/components/auth/LoginPage.tsx` - Login shell with return_to handling and lovable-auth mount
- `src/main.tsx` - AuthProvider added inside BrowserRouter, outside App
- `src/App.tsx` - Route restructure: /login outside guard, all others inside RequireAuth > AppShell

## Decisions Made
- No getSession() call - INITIAL_SESSION event from onAuthStateChange delivers persisted session on mount, avoiding the double-fetch anti-pattern from research
- LoginPage renders no auth form - Lovable drops in UI into the id=lovable-auth div in a later step
- Open redirect guard: return_to values not starting with / are ignored, fallback to /

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

- `src/components/auth/LoginPage.tsx` line ~38: `id="lovable-auth"` div is intentionally empty - this is the mount point for Lovable auth UI, which is wired in a separate step. The login page shell cannot function as a real login without it, but this is the planned scope for this plan.

## Next Phase Readiness
- AuthProvider, RequireAuth, SplashScreen, and LoginPage shell are complete
- Supabase env vars (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY) need to be set for auth to function - currently undefined in dev environment
- Lovable auth UI drop-in is the next step to make login functional
- Demo mode bypass fully operational - existing app functionality unchanged

---
*Phase: 18-authentication*
*Completed: 2026-03-31*
