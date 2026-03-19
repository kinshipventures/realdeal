# Testing Patterns

**Analysis Date:** 2026-03-18

## Test Framework

**Status:** No test framework installed or configured

**Decision Rationale:**
- Project is early stage with rapid iteration prioritized over test coverage
- Strong TypeScript types catch many potential bugs at compile time
- Component behavior is visual/interactive — difficult to test without E2E setup
- Data layer (Airtable) changes infrequently and is well-typed
- Manual testing of UI interactions drives faster feedback loops

**If tests are needed in future:**
- **Unit tests:** Vitest (lightweight, Vite-native)
- **Component tests:** React Testing Library (behavior-focused)
- **E2E tests:** Playwright (visual + interaction)

## Current Testing Approach

**Manual Testing:**
- Browser-based during dev (`pnpm dev`)
- React StrictMode enabled in `src/main.tsx` to catch lifecycle issues
- TypeScript strict mode catches nullability and type errors at build time (`pnpm build`)
- ESLint pre-commit checks (via `pnpm lint`)

**Test Infrastructure Not Present:**
- No `jest.config.js`, `vitest.config.ts`, or test runner
- No `*.test.ts`, `*.spec.ts` files in codebase
- No testing library dependencies

## Code Patterns That Aid Testing (if added)

**Pure Functions (Easily Testable):**
```typescript
// src/lib/equity.ts — pure domain logic
export function contactEquityScore(interactions: Interaction[]): number {
  const now = Date.now()
  let raw = 0
  for (const ix of interactions) {
    const weight = INTERACTION_WEIGHTS[ix.type]
    if (weight === 0) continue
    const daysAgo = (now - new Date(ix.date).getTime()) / DAY_MS
    raw += weight * recencyMultiplier(daysAgo)
  }
  return Math.min(100, Math.round(raw * SCORE_SCALE))
}
```
**Why testable:** No side effects, deterministic, array input → number output

**Utility Functions (Easily Testable):**
```typescript
// src/lib/utils.ts
export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  // ...
}
```
**Why testable:** Pure, time-based but can inject Date.now() for determinism

**Component Isolation:**
- Components receive all data via props, no implicit global state
- Example: `ContactPanel` takes `categoryId` and `onClose` — can be rendered in isolation
- Event handlers (`handleClose`, `handleSaved`) are callbacks — testable as functions

## Component Testing Patterns (Manual Today)

**Component Test Approach (if Vitest + RTL added):**

```typescript
// Testing ContactPanel behavior
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactPanel } from './ContactPanel'

test('loads contacts on mount', async () => {
  render(<ContactPanel categoryId="cat123" onClose={() => {}} />)
  expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true')
  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })
})

test('closes on escape key', async () => {
  const onClose = vi.fn()
  render(<ContactPanel categoryId="cat123" onClose={onClose} />)
  await userEvent.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalled()
})
```

## Data Layer Testing (Airtable)

**Current Approach:** Rely on Airtable API direct calls during dev

**If Unit Tests Added:**
- Mock `fetch` responses using `vi.mock('global.fetch')`
- Test cache behavior: stale-while-revalidate patterns
- Test error handling: non-200 responses throw `Error`
- Test data transformation: `mapContact`, `mapPod` produce correct domain models

**Example (Vitest):**
```typescript
// src/lib/__tests__/airtable.test.ts
import { vi, describe, it, expect } from 'vitest'
import { getContacts } from '../airtable'

describe('getContacts', () => {
  it('returns cached contacts on fresh hit', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ records: [...] })
    })

    const first = await getContacts()
    const second = await getContacts()

    expect(fetch).toHaveBeenCalledTimes(1)  // no second fetch
    expect(second).toEqual(first)
  })
})
```

## Equity Scoring Tests (Prime Candidate)

**Why test this:**
- Complex algorithm with many edge cases (dormancy, overdue cadence, serendipity)
- Small, pure functions — easy to test
- Business logic critical to app correctness

**Example test cases:**
```typescript
describe('contactEquityScore', () => {
  it('returns 0 for contact with no interactions', () => {
    expect(contactEquityScore([])).toBe(0)
  })

  it('applies recency multiplier correctly', () => {
    const interactions = [
      { type: 'call', date: '2026-03-01' }, // 17 days ago = 0.6x
      { type: 'meeting', date: '2026-02-01' }, // 45 days ago = 0.3x
    ]
    const score = contactEquityScore(interactions)
    // (3 * 0.6) + (4 * 0.3) * SCORE_SCALE = 3 * 5 = 15
    expect(score).toBe(15)
  })

  it('caps score at 100', () => {
    const interactions = [
      { type: 'intro', date: new Date().toISOString() },
      { type: 'intro', date: new Date().toISOString() },
      { type: 'intro', date: new Date().toISOString() },
    ]
    const score = contactEquityScore(interactions)
    expect(score).toBeLessThanOrEqual(100)
  })
})
```

## Secrets & Environment Variables

**Testing env vars:**
- `VITE_AIRTABLE_TOKEN` required in `.env.local`
- `VITE_AIRTABLE_BASE_ID` required in `.env.local`
- Neither should be committed
- Tests would mock these via `vi.stubGlobal('import.meta.env', {...})`

## Integration Test Approach

**If E2E tests added (Playwright):**

1. **Seed test data** in Airtable before test suite runs
2. **Navigate to home** — Dashboard should load
3. **Check equity score renders** — Overall score visible
4. **Click pod** — OrbMap navigates to category view
5. **Search contacts** — Filter works
6. **Open contact detail** — Edit field auto-saves
7. **Log interaction** — Last contacted updates immediately

**No current E2E setup.** Manual browser testing covers these scenarios during development.

## Regression Prevention

**Strong Type System:**
- TypeScript strict mode catches refactoring regressions
- Component prop changes caught at build time
- API shape changes fail type checks

**Code Organization:**
- Pure functions in `lib/` are isolated and easy to test manually
- React components have clear contracts (props interface)
- Stale-while-revalidate caching tested implicitly through manual UI interaction

## Future Testing Roadmap

**Phase 1 (if needed):** Unit tests for equity scoring algorithms
- Pure, deterministic functions
- High business logic complexity
- Low friction to add

**Phase 2:** Component snapshot tests
- Orb layout and visual output
- Compare before/after UI changes

**Phase 3:** E2E tests
- Full flow: dashboard → map → detail → interaction log
- Airtable integration
- Browser interactions

---

*Testing analysis: 2026-03-18*
