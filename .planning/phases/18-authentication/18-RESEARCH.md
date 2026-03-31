# Phase 18: Authentication - Research

**Researched:** 2026-03-31
**Domain:** Supabase Auth v2 + React Router v7 route guards
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Return-to pattern -- store the original URL the user tried to access, redirect to `/login`, bounce back after successful auth
- D-02: Unauthenticated users see only the login page -- no app content, nav, or interactive elements leak
- D-03: Login page renders as a completely separate layout outside AppShell (no nav, no FAB, no demo toggle)
- D-04: Login page uses the same design system -- background color, DM Sans / Fraunces fonts, CSS custom properties, spacing tokens
- D-05: Auth UI components (form, OAuth buttons) are built in Lovable, not in this phase
- D-06: Demo mode bypasses auth entirely -- unauthenticated users can toggle demo on and explore the full app with fake data
- D-07: When demo mode is active, auth guards are skipped -- no login required
- D-08: Branded splash screen (centered RealDeal logo or orb) shown during the initial `getSession()` check
- D-09: Splash resolves to either the app (session valid) or login page (no session) -- no login page flash for authenticated users
- D-10: Supabase client already configured with `persistSession: true` and `autoRefreshToken: true` in `src/integrations/supabase/client.ts`
- D-11: Wire `onAuthStateChange` into React state to handle login, logout, and token refresh reactively

### Claude's Discretion
- Auth context provider implementation pattern
- Route guard component structure
- Splash screen visual design (within design system)
- How to detect "demo mode active" in the auth guard logic

### Deferred Ideas (OUT OF SCOPE)
- Onboarding flow (new user walkthrough, pod philosophy, brand storytelling) -- separate Lovable project
- Role-based permissions -- v2.2 scope (PERM-01)
- Team workspace with personal views -- v2.2 scope (WORKSPACE-01)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up and log in (email/password, Google, or Apple via Supabase) | Auth UI is Lovable-built; this phase wires session state only |
| AUTH-02 | Unauthenticated users are redirected to login | RequireAuth guard component + React Router Navigate redirect |
| AUTH-03 | User session persists across browser refresh | Supabase client already has `persistSession: true`; `onAuthStateChange` with `INITIAL_SESSION` event handles rehydration |
</phase_requirements>

## Summary

The Supabase client is already configured with `persistSession: true` and `autoRefreshToken: true`. The entire implementation is wiring: a React context to hold session state, subscription to `onAuthStateChange`, a route guard component, and a `/login` route outside `AppShell`.

Session persistence (AUTH-03) is already handled at the Supabase client level -- the only work is calling `supabase.auth.getSession()` on mount and subscribing to `onAuthStateChange` so React state stays in sync after page reload. The `INITIAL_SESSION` event fires immediately on mount with the persisted session, eliminating a separate `getSession()` call.

Demo mode complicates the guard: `isDemoMode()` reads from `localStorage` synchronously, so the auth guard can check it before any async session resolution. When demo mode is on, skip the guard entirely and render the app. The demo toggle in `AppShell` must remain accessible to unauthenticated users -- either by surfacing it on the login page or by allowing demo mode to short-circuit before routing decisions.

**Primary recommendation:** `AuthProvider` wraps inside `BrowserRouter` in `main.tsx`, exposes `{ session, loading }` via context, `RequireAuth` component reads both -- if loading, render splash; if no session and not demo mode, redirect to `/login?return_to=<encoded path>`; otherwise render children.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.100.1 (already installed) | Auth state, session management | Already in project, client pre-configured |
| react-router | ^7.13.1 (already installed) | Route guards, redirect, `useNavigate` | Already in project, all routes use it |

No new dependencies needed for this phase.

**Version verification:** Both packages already in `package.json`. No install step required.

## Architecture Patterns

### Recommended Project Structure
```
src/
  contexts/
    AuthContext.tsx     # createContext, AuthProvider, useAuth hook
  components/
    auth/
      RequireAuth.tsx   # route guard wrapper
      SplashScreen.tsx  # branded loading state
      LoginPage.tsx     # shell only -- Auth UI dropped in from Lovable
```

### Pattern 1: AuthProvider with onAuthStateChange

**What:** Single context provider subscribes to `onAuthStateChange`. The `INITIAL_SESSION` event fires synchronously-ish on mount with the cached session from localStorage. No need for a separate `getSession()` call.

**When to use:** Any SPA that needs session-aware components without prop drilling.

**Example:**
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
import { createContext, useContext, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

type AuthContextValue = { session: Session | null; loading: boolean }
const AuthContext = createContext<AuthContextValue>({ session: null, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
```

### Pattern 2: RequireAuth Guard with Demo Bypass

**What:** Wraps all `AppShell` children. Reads `loading`, `session`, and `isDemoMode()`. Shows splash during init, redirects to login if unauthenticated, otherwise renders children.

**When to use:** Wrap the parent `<Route element={<AppShell />}>` so all app routes are protected in one declaration.

**Example:**
```typescript
// Source: https://dev.to/ra1nbow1/building-reliable-protected-routes-with-react-router-v7-1ka0
import { Navigate, useLocation, Outlet } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { isDemoMode } from '@/lib/sampleData'
import { SplashScreen } from '@/components/auth/SplashScreen'

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <SplashScreen />
  if (!session && !isDemoMode()) {
    return <Navigate to={`/login?return_to=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  return <Outlet />
}
```

### Pattern 3: App Route Structure

**What:** `/login` sits outside `RequireAuth`. All other routes nest under it.

**Example:**
```typescript
export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          {/* ... all existing routes ... */}
        </Route>
      </Route>
    </Routes>
  )
}
```

### Pattern 4: Return-to Redirect on Login Success

**What:** After successful auth, read `return_to` from search params and navigate there. Fall back to `/`.

**Example:**
```typescript
// Inside LoginPage, after Lovable auth UI fires onSuccess callback:
const [searchParams] = useSearchParams()
const navigate = useNavigate()

function handleAuthSuccess() {
  const returnTo = searchParams.get('return_to') ?? '/'
  navigate(returnTo, { replace: true })
}
```

### Pattern 5: main.tsx Provider Order

**What:** `AuthProvider` must wrap `App` but sit inside `BrowserRouter` so `useNavigate` is available in descendants. `ReactFlowProvider` can stay at root.

**Example:**
```typescript
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReactFlowProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ReactFlowProvider>
  </StrictMode>
)
```

### Anti-Patterns to Avoid
- **Calling `getSession()` in a separate `useEffect` alongside `onAuthStateChange`:** `INITIAL_SESSION` event already delivers the persisted session on mount -- double-fetching causes a race condition and double render.
- **Checking session state inside `AppShell`:** Guard logic belongs in `RequireAuth`, not spread across layout components.
- **Using `user` from `onAuthStateChange` directly for security checks:** For display purposes `session.user` is fine; for server-side checks always verify with `supabase.auth.getUser()` which re-validates against the Supabase server.
- **Rendering the login page inside `AppShell`:** Login gets its own layout route, not a conditional inside the shell (D-03).
- **Forgetting `replace` on redirect:** Without `replace`, hitting back after login returns to login -- always use `<Navigate replace />` and `navigate(path, { replace: true })`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session storage | Custom localStorage token management | Supabase client (`persistSession: true`) | Already configured; Supabase handles JWT refresh, expiry, and secure storage |
| Token refresh | Custom refresh timer | `autoRefreshToken: true` on client | Already configured; Supabase background-refreshes before expiry |
| OAuth flows | Custom Google/Apple OAuth redirect handling | Supabase `signInWithOAuth()` | Handles PKCE, redirect URLs, token exchange |
| Auth UI | Custom form components | Lovable-built components (D-05) | Out of scope for this phase |

**Key insight:** The Supabase client already does the hard work. This phase is purely React wiring around an already-functional auth layer.

## Common Pitfalls

### Pitfall 1: Login Page Flash for Authenticated Users
**What goes wrong:** Session check is async -- authenticated users briefly see the login page before being redirected to the app.
**Why it happens:** `loading` starts `true` but a `<Navigate to="/login">` renders before the `INITIAL_SESSION` event fires.
**How to avoid:** `RequireAuth` renders `<SplashScreen />` while `loading === true`, never redirecting until loading resolves (D-08, D-09).
**Warning signs:** Momentary flash of login UI in a logged-in session.

### Pitfall 2: Demo Toggle Inaccessible to Unauthenticated Users
**What goes wrong:** Demo toggle lives inside `AppShell` behind `RequireAuth` -- unauthenticated users can never reach it.
**Why it happens:** Demo mode bypass is only checked after auth guard fires.
**How to avoid:** Two options: (a) surface the demo toggle on the login page itself, (b) check `isDemoMode()` as the very first condition in `RequireAuth` before auth check. Option (b) is simpler since `isDemoMode()` is synchronous and doesn't need the session.
**Warning signs:** Demo button unreachable from login page; investors can't access demo without credentials.

### Pitfall 3: `return_to` with Absolute Paths or External URLs
**What goes wrong:** Attacker crafts `/login?return_to=https://evil.com` and gets redirected after auth.
**Why it happens:** Blindly reading `return_to` and passing to `navigate()`.
**How to avoid:** Only accept paths starting with `/` -- strip or ignore anything that looks like an absolute URL before calling `navigate()`.

### Pitfall 4: StrictMode Double-Mount Unsubscribes
**What goes wrong:** In React 18 StrictMode, effects mount-unmount-mount. The first subscription gets unsubscribed, leaving the component without auth state.
**Why it happens:** Supabase subscription is cleaned up on first unmount, not re-registered on second mount if `useEffect` deps are wrong.
**How to avoid:** The `useEffect(() => { ... }, [])` pattern with `subscription.unsubscribe()` in cleanup handles this correctly -- React re-runs the effect on second mount, creating a new subscription.

### Pitfall 5: `isDemoMode()` Is a Function, Not a Value
**What goes wrong:** `isDemoMode` is called as `isDemoMode` (without parens) -- TypeScript won't catch this since it's a valid truthy non-null value.
**Why it happens:** Easy to miss since the import looks like a boolean export.
**How to avoid:** Always call `isDemoMode()` with parentheses. The existing `AppShell` already does this correctly (`const [demo, setDemo] = useState(isDemoMode)`... actually uses it as initializer -- watch this pattern).

## Code Examples

### SplashScreen (minimal, on-brand)
```typescript
// Centered orb/logo on design system background -- no layout chrome
export function SplashScreen() {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      {/* RealDeal wordmark or orb -- exact asset TBD by discretion */}
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: 'rgba(0,0,0,0.82)' }}>
        RealDeal
      </span>
    </div>
  )
}
```

### LoginPage shell (without Auth UI)
```typescript
// Auth UI components dropped in from Lovable as children
export function LoginPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { session } = useAuth()

  // Already authenticated -- send to app
  useEffect(() => {
    if (session) {
      navigate(searchParams.get('return_to') ?? '/', { replace: true })
    }
  }, [session])

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Lovable Auth UI goes here */}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getSession()` on mount + `onAuthStateChange` | `onAuthStateChange` only (`INITIAL_SESSION` event) | supabase-js v2.x | Eliminates race condition between initial fetch and listener |
| `supabase.auth.user()` (sync) | `session.user` from `onAuthStateChange` callback | supabase-js v2.0 | `user()` removed; user is always derived from session |

## Open Questions

1. **Where does the demo toggle live for unauthenticated users?**
   - What we know: Toggle is in `AppShell`, which is behind `RequireAuth`
   - What's unclear: Should it appear on the login page, or should `RequireAuth` check demo mode before auth?
   - Recommendation: Check `isDemoMode()` first in `RequireAuth` (simpler, no UI change to login page). The planner should make this a discrete decision.

2. **Lovable Auth UI integration point**
   - What we know: Auth UI components are built in Lovable (D-05), not this phase
   - What's unclear: What props/callbacks does the Lovable component expose? Does it call `supabase.auth.*` directly or does it expect callbacks?
   - Recommendation: `LoginPage` shell should be a plain container ready to receive the Lovable component. Keep it flexible -- no assumptions about Lovable's interface.

## Sources

### Primary (HIGH confidence)
- https://supabase.com/docs/reference/javascript/auth-onauthstatechange - onAuthStateChange API, event types, cleanup
- https://supabase.com/docs/guides/auth/quickstarts/react - Official Supabase React quickstart
- `src/integrations/supabase/client.ts` - Verified `persistSession: true`, `autoRefreshToken: true` already set
- `src/App.tsx` - Verified current route structure (flat Routes, AppShell as layout)
- `src/main.tsx` - Verified provider order (ReactFlowProvider > BrowserRouter > App)
- `src/lib/sampleData.ts` - Verified `isDemoMode()` is a function reading from localStorage

### Secondary (MEDIUM confidence)
- https://dev.to/ra1nbow1/building-reliable-protected-routes-with-react-router-v7-1ka0 - React Router v7 protected routes pattern
- https://blog.logrocket.com/authentication-react-router-v7/ - Auth with React Router v7

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - both libraries already installed and verified in package.json
- Architecture: HIGH - onAuthStateChange pattern verified against official Supabase docs; route guard pattern verified against React Router v7 docs
- Pitfalls: HIGH - login flash, double-mount, and return_to patterns are well-documented and verified

**Research date:** 2026-03-31
**Valid until:** 2026-06-30 (supabase-js v2 auth API is stable)
