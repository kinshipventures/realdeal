

# Onboarding Flow Polish

## Changes

### 1. Welcome step - match the voice
Replace generic SaaS copy with opinionated RealDeal voice from vision.md.
- Heading: "Feed what feeds you"
- Body: "RealDeal helps you invest in the relationships that actually matter. Not more contacts - deeper ones."

### 2. Philosophy step - reduce density
The step currently crams principles + research stats + animated ring + legend into one screen. Split the concern:
- Keep the 3 principles with research stats (they work well together)
- Move the equity ring + interaction legend into a brief "How scoring works" label above the ring, and add a one-liner: "Every interaction builds equity. Some carry more weight."
- Add a subtle divider (thin line or extra spacing) between principles and ring sections

### 3. Step transitions
Add a CSS fade+slide transition between steps. Wrap each step's content in a `div` with an `opacity`/`translateY` animation triggered by a `key={step}` remount. One shared keyframe, no libraries.

### 4. Cadence picker persistence
Store selected cadence to `localStorage` key `realdeal:default-cadence` on change. Read it as initial value. This lets downstream pod creation pick it up.

### 5. Progress dots contrast
Change inactive dot color from `rgba(0,0,0,0.12)` to `rgba(0,0,0,0.22)` for better visibility.

### 6. Hoist static data out of render
Move `interactions` and `principles` arrays to module-level constants (outside the component) to avoid re-creation on every render.

## Technical details

**Single file**: `src/components/onboarding/OnboardingFlow.tsx`

- Add a `@keyframes onboard-enter` in an inline `<style>` tag (opacity 0 -> 1, translateY 12px -> 0, 300ms ease-out)
- Wrap each step render in `<div key={step} style={{ animation: 'onboard-enter 0.3s ease-out' }}>` 
- Move `principles` and `interactions` arrays above `StepPhilosophy`
- `StepPods`: init cadence from `localStorage.getItem('realdeal:default-cadence') || 'monthly'`, write on change
- Update `StepWelcome` heading/body copy
- Add "How scoring works" subheading above ring in `StepPhilosophy`
- Bump inactive dot opacity

No new files, no new dependencies, no database changes.

