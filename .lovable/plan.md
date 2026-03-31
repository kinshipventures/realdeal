

# Guided Onboarding Flow

## Overview

4-step fullscreen onboarding overlay shown once after first Google sign-in. Uses `localStorage` key `realdeal:onboarding-complete` to track completion.

## Detection (in AppShell)

Check order in `AppShell`, after auth resolves:
1. `isDemoMode()` -- if true, skip onboarding entirely
2. `session` must be non-null (authenticated)
3. `localStorage.getItem('realdeal:onboarding-complete')` must be absent

Only when all three conditions align does the onboarding render.

## Flow Steps

1. **Welcome** -- "Welcome to RealDeal" with app description, animated orb visual, "Get Started" button
2. **Pods** -- Explain pods as relationship groups, show example orb visuals, option to create first pod inline or skip
3. **Import contacts** -- Explain the value of importing contacts, single CTA button that sets `localStorage` key and navigates to existing `/import` route. No second import UI built -- just a link. Also offers "I'll do this later" skip.
4. **Quick tour** -- Icons + one-line descriptions for Pulse, Map, Contacts, Pipelines, Projects. "Let's go" finishes onboarding.

## Files

### New
- `src/components/onboarding/OnboardingFlow.tsx` -- step state, progress dots, back/skip/next navigation, all 4 screens

### Modified
- `src/App.tsx` -- inside `AppShell`, after auth loading resolves, render `<OnboardingFlow>` gated by the three checks above. Pass `onComplete` callback that sets localStorage and dismisses.

## Design

- Fullscreen overlay, z-index above nav
- Centered card, max-width ~480px, `--color-bg` background
- Fraunces headings, DM Sans body, `--color-brand` accents
- Step indicator dots at bottom
- "Skip" on every step, "Back" from step 2+
- Fade/slide transitions between steps

## Key constraints

- No new import UI -- step 3 links to existing `/import`
- No database migration -- localStorage only
- Demo mode users never see onboarding

