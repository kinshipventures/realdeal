

# Enhanced Onboarding Flow - 5 Steps

## Overview
Add two new/modified steps to the onboarding flow, keeping total at 5 steps.

## Step Order

1. **Welcome** - no changes
2. **"This isn't a CRM"** - NEW
3. **Pods + Cadence** - ENHANCED
4. **Import** - no changes
5. **Quick Tour** - no changes

## Step 2: "This isn't a CRM"

- Heading: "This isn't a CRM"
- Body: one sentence - "We track relationship health, not sales pipelines."
- 3 principles as compact icon+label rows:
  - "Give more than you take"
  - "Trust is built on micro-habits"
  - "Relationship debt is real"
- Below: a static SVG circular progress ring, 70% filled with brand green arc on a light gray track. Four text labels below it in a row: Thriving / Steady / Cooling / Fading (each in its corresponding color from the design system).
- Single "Next" button

## Step 3: Pods + Cadence

- Keep existing three example pod orbs (Talent, LPs, Advisors)
- Add cadence picker below orbs: 4 pill-shaped radio buttons in a row (Weekly / Biweekly / Monthly / Quarterly), Monthly pre-selected
- Body copy: "Pods group your relationships. Set how often you want to check in."
- Selection stored in local component state only - no persistence
- Single "Next" button

## Technical Details

- **Single file**: `src/components/onboarding/OnboardingFlow.tsx`
- Update `STEP_COUNT` from 4 to 5
- New component: `StepPhilosophy` - presentational only
- Modified component: `StepPods` - add cadence pill selector with `useState`
- Step index mapping: 0=Welcome, 1=Philosophy, 2=Pods+Cadence, 3=Import, 4=Tour
- No database migrations, no new files, no new dependencies
- Equity ring is a plain hand-drawn SVG (circle + arc), not imported from EquityWidget

