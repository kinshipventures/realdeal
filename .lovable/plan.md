

## Plan: Public Marketing Landing Page

### Summary
Create a public landing page at `/` for unauthenticated visitors. Move the authenticated app shell to render under existing routes. The landing page will have a hero section, feature highlights, and CTA buttons leading to `/login`.

### Routing changes

- New public route: `/` renders `<LandingPage />` (only for unauthenticated users)
- In `App.tsx`, add logic: if user is not logged in, `/` shows the landing page. If logged in, `/` redirects to `/pods` (or shows the app as it does now).
- Simplest approach: add a `<Route index element={<LandingRedirect />} />` outside RequireAuth that checks session - if authenticated, renders `<Navigate to="/pods" />`, otherwise renders `<LandingPage />`.

### New file: `src/components/landing/LandingPage.tsx`

Sections (single scrolling page):

1. **Hero** - "RealDeal" heading in serif, tagline "Feed what feeds you", brief subtitle about relationship management, two CTAs ("Get Started" -> /login?signup=1, "Try the Demo" -> demo mode). Background uses the app's warm `#F5F4F0` with a subtle orb visual element.

2. **Features** - Three cards in a row (responsive to stacked on mobile):
   - "Visual Network Map" - orb-based visualization
   - "Social Equity Scoring" - relationship health tracking
   - "Smart Pods" - organized contact groups with cadence

3. **How it works** - Three numbered steps: Import contacts, Organize into pods, Stay connected with smart nudges.

4. **CTA footer** - Final call to action with sign-up button.

### Design approach
- Uses existing CSS custom properties (`--color-brand`, `--font-serif`, `--font-sans`, `--color-bg`, etc.)
- Inline styles consistent with the rest of the app (no Tailwind classes in this codebase pattern)
- Responsive: flexbox layout, wraps on mobile
- Sticky top nav with logo + "Sign in" / "Get Started" buttons

### Files to modify
- `src/App.tsx` - restructure index route for public/authenticated split
- `src/components/landing/LandingPage.tsx` - new file

