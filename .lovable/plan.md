

# Standardized Onboarding Transitions & Animations

## Current State

The onboarding flow has a basic `onboard-enter` fade-up animation applied via `key={step}` on a wrapper div with `display: contents`. This means:
- Step transitions all use the same simple fade-up
- No exit animation (content just disappears)
- No directional awareness (forward vs back look identical)
- Individual elements within steps use ad-hoc stagger delays inconsistently

## Plan

### 1. Add directional slide transitions

Track navigation direction (forward/back) in state. Apply a CSS class that slides content in from the right when going forward, from the left when going back. The exiting content fades out in the opposite direction.

**Approach**: Replace `display: contents` wrapper with a real div that gets a direction-aware animation class. Use two new keyframes:
- `onboard-slide-left` (content enters from right - forward)
- `onboard-slide-right` (content enters from left - back)

### 2. Standardize element stagger pattern

Define a consistent stagger system for child elements within each step:
- Heading: 0ms delay
- Body text: 60ms
- Visual/illustration: 120ms
- Action row: 180ms

Apply via inline `animationDelay` on each element using the existing `onboard-enter` keyframe with `animation-fill-mode: both` and initial `opacity: 0`.

### 3. Smooth progress bar indicator

Add a transition on the segmented progress pill's active state so the green highlight smoothly moves between segments rather than instantly jumping.

### 4. Skip/back button transitions

Fade the Skip button and back arrow in after the main content settles (~200ms delay) so they don't compete with the primary content entrance.

## Technical Details

**File modified**: `src/components/onboarding/OnboardingFlow.tsx`

- Add `direction` state (`'forward' | 'back'`), set in `next()` and `back()` functions
- Add two new `@keyframes` in the existing `<style>` block
- Replace the `key={step}` wrapper's animation with direction-conditional class
- Add `animationDelay` + `opacity: 0` + `animation-fill-mode: both` to heading/body/visual/action elements in each step component
- Add `transition: transform 0.3s ease, background 0.3s ease` to progress pill buttons (already partially there)

No new files. No new dependencies.

