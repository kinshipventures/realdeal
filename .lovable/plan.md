

# Onboarding & New User Experience - Audit & Fixes

## Issues Found

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | **`?signup=1` param ignored** - Landing page links to `/login?signup=1` but LoginPage never reads this param to auto-toggle sign-up mode. New users clicking "Get Started" see the sign-in form, not sign-up. | High | `LoginPage.tsx` |
| 2 | **Google OAuth loses `return_to`** - `redirect_uri` is set to `window.location.origin` (root), so after Google auth the user lands at `/` which redirects to `/pods`. The `return_to` param from the login URL is lost. Not critical since onboarding triggers from AppShell anyway, but inconsistent. | Low | `LoginPage.tsx` |
| 3 | **Onboarding reset doesn't re-trigger** - PreferencesTab removes `realdeal:onboarding-complete:*` keys but doesn't set `showOnboarding` state back to true. User must reload the app for onboarding to re-appear. | Medium | `PreferencesTab.tsx` |
| 4 | **Onboarding step progress not cleared on reset** - PreferencesTab removes completion keys but doesn't remove `realdeal:onboarding-step`, so re-triggered onboarding resumes at the last visited step instead of step 0. | Medium | `PreferencesTab.tsx` |
| 5 | **Step labels say 4 steps but memory says 6** - The `STEP_LABELS` array has 4 items (Welcome, Philosophy, Pods, Import). The memory docs mention 6 stages including "Meeting Notes" and "Tour". Meeting notes is embedded inside the Import step rather than being its own step - this is fine but the memory doc is stale. Not a code bug, just doc drift. | Info | Memory |
| 6 | **No email confirmation feedback** - After email sign-up, if auto-confirm is off, the user gets no visible feedback that they should check their email. The form just stays in loading state until session appears (or never if email confirmation is required). | Medium | `LoginPage.tsx` |
| 7 | **Onboarding covers entire screen including sidebar** - The `zIndex: 9999` fixed overlay blocks all navigation. The only exit is "Skip" at the bottom (easy to miss) or completing the flow. No close/X button. | Low | `OnboardingFlow.tsx` |

## Plan

### `src/components/auth/LoginPage.tsx`
- Read `signup` search param on mount: `const [isSignUp, setIsSignUp] = useState(() => searchParams.get('signup') === '1')`
- After successful `signUp()` call with no error, show a confirmation message ("Check your email to verify your account") instead of leaving the form in loading state. Only applies when auto-confirm is disabled.

### `src/components/settings/PreferencesTab.tsx`
- On onboarding reset confirmation, also remove `realdeal:onboarding-step` from localStorage
- After clearing keys, reload the page so the AppShell re-evaluates `showOnboarding` (simplest approach; avoids threading state up through context)

### `src/components/onboarding/OnboardingFlow.tsx`
- Add a small close/X button in the top-right corner (next to the progress bar) that calls `onComplete` - gives users a clear, always-visible escape hatch

No database changes needed. All fixes are UI-layer.

