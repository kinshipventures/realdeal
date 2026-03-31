

# Add Research Stats to Onboarding Philosophy Step

## What changes

The `StepPhilosophy` component currently shows 3 principles as icon + label rows. Add a single punchy research stat line beneath each label - the most compelling data point from each principle's research.

## Principle stats (one line each)

1. **Give more than you take** - "Teams where people give more outperform on every measurable metric."
2. **Trust is built on micro-habits** - "Emotional closeness fades within months without contact."
3. **Relationship debt is real** - "5% monthly neglect compounds to 46% annual relationship loss."

## Implementation

**File**: `src/components/onboarding/OnboardingFlow.tsx` - `StepPhilosophy` only

- Add a `stat` field to each principle object in the `principles` array
- Render it as a second line beneath the label: smaller font (11px), italic, muted color (`var(--color-text-secondary)`)
- The principle row height grows slightly to accommodate the second line - no layout changes needed

## What stays the same

- 5 steps, same order
- No new files, no new dependencies
- Equity ring, labels, button all unchanged

