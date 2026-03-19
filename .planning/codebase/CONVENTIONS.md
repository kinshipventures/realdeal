# Coding Conventions

**Analysis Date:** 2026-03-18

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `ContactPanel.tsx`, `ListNode.tsx`)
- Utilities/libraries: camelCase (e.g., `airtable.ts`, `utils.ts`)
- Hooks: useXxx camelCase (e.g., `useNodePositions.ts`)
- CSS/style files: `globals.css`

**Functions:**
- Action-oriented verbs: `get*`, `create*`, `update*`, `delete*`, `fetch*`, `log*`, `handle*` (e.g., `getContacts`, `createCategory`, `updateContact`, `handleBlur`)
- Predicates: `is*` for booleans (e.g., `isOverdue`, `isDormant`, `isExpired`)
- Helpers with domain context: `scoreLabel`, `formatRelativeTime`, `avatarHue`, `initials`

**Variables:**
- State: camelCase (e.g., `contacts`, `loading`, `selectedContact`, `saveError`)
- Event handlers: `handle*` prefix (e.g., `handleClose`, `handleBlur`, `handleSaved`)
- Derived/computed: descriptive names (e.g., `priorityPods`, `filtered`, `candidates`)
- Constants: UPPER_SNAKE_CASE for module-level (e.g., `CACHE_TTL`, `DORMANT_MS`, `SCORE_SCALE`)

**Types:**
- Interfaces: PascalCase, suffix with "Props" for component props (e.g., `ContactPanelProps`, `ListNodeData`)
- Type aliases: PascalCase (e.g., `HexColor`, `ISODate`, `InteractionType`, `FocusReason`)
- Union/enum values: camelCase lowercase (e.g., `'call' | 'email' | 'text'`, `'weekly' | 'monthly'`)

## Code Style

**Formatting:**
- Uses Tailwind v4 for styling (via @tailwindcss/vite)
- ESLint with TypeScript support configured in `eslint.config.js`
- No explicit Prettier config — ESLint handles linting
- 2-space indentation (inferred from codebase)
- Single quotes in JSX attributes, template literals for interpolation

**Linting:**
- Tool: ESLint 9.39.1
- Config: `eslint.config.js` (flat config format)
- Extends: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Target: ES2022 with DOM + DOM.Iterable libs
- Key rules enabled: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`

**Build:**
- Vite 7.3.1 for dev server and bundling
- TypeScript strict mode enabled
- Modules: ESNext with bundler resolution
- JSX: react-jsx (automatic transforms)

## Import Organization

**Order:**
1. React/framework imports (e.g., `import { useState } from 'react'`)
2. Third-party (e.g., `@xyflow/react`, `react-router`)
3. Type imports (e.g., `import type { Node, Edge } from '@xyflow/react'`)
4. Local lib/utilities (e.g., `from '../../lib/airtable'`)
5. Local components (e.g., `from './ListNode'`)

**Path Aliases:**
- No path aliases configured. Uses relative paths throughout (e.g., `../../lib/airtable`)
- Barrel files not used — direct imports from source files

## Error Handling

**Patterns:**
- Guard clauses and early returns (e.g., `if (!contact) return`, `if (idx === -1) return`)
- Null checks with safe operators: `.?` for optional chaining, `??` for nullish coalescing
- Try-catch for localStorage access with silent fallback (e.g., `try { JSON.parse(...) } catch { return new Set() }`)
- Inline error state: `[createError, setCreateError]`, `[saveError, setSaveError]` — errors surface at point of failure
- Error messages propagated from API: `throw new Error('Airtable ${res.status}: ${text}')`
- Optimistic updates with rollback on error (e.g., `updateContact` returns updated contact or throws)
- Stale-while-revalidate caching with graceful degradation

**Pattern example from `ContactDetail.tsx`:**
```typescript
// Generation counter prevents stale responses from overwriting
const gen = ++saveGenRef.current
updateContact(...)
  .then(updated => {
    if (gen !== saveGenRef.current) return  // discard stale response
    if (saveError?.field === key) setSaveError(null)
    onSaved(updated)
  })
  .catch(() => {
    if (gen !== saveGenRef.current) return
    setSaveError({ field: key, value: v })
  })
```

## Logging

**Framework:** console only — no logging library

**Patterns:**
- Sparse. Used only for debugging complex async flows
- Example: Cache invalidation notes (`// Stale-while-revalidate: return stale immediately, refresh in background`)
- No console.log in production path — reserved for temporary debugging

## Comments

**When to Comment:**
- Algorithm explanation (e.g., `// Ranked selection: most overdue in priority pods first, then serendipity`)
- Non-obvious domain logic (e.g., `// Never contacted — high urgency`, `// Shuffle deterministically by day`)
- Cache/performance strategies (e.g., `// Cold cache — deduplicate concurrent fetches via in-flight Promise`)
- TypeScript/CSS subtleties (e.g., `// Must be raw channels, never rgb(...) — see CLAUDE.md CSS custom property note`)

**Comment Style:**
- Line comments only (`//`). Explanatory, not decorative.
- Sectional dividers using dashes: `// ── Section Name ────────────────────`
- Minimal inline comments — prefer clear code names
- Comments explain WHY, not WHAT (code shows WHAT)

## Function Design

**Size:**
- Small, focused functions: 10-30 lines typical
- Pure functions preferred (e.g., `formatRelativeTime`, `scoreLabel`, `indexByContact`)
- Side effects isolated in React components or specific library functions

**Parameters:**
- Destructure objects over many scalar params
- Type object parameters with interfaces (e.g., `contact: Contact`)
- Default arguments for optional values (e.g., `radius = 310`, `limit = 3`)

**Return Values:**
- Explicit return types on public functions (e.g., `Promise<Category[]>`, `ScoreLabel`)
- Functions ending in "Async" return Promise or undefined (convention implicit)
- Factory functions return typed objects with consistent keys

## Module Design

**Exports:**
- Named exports per file (e.g., `export function getContacts`, `export interface Pod`)
- Single default export for React components (e.g., `export default function App`)
- Type exports: `export type X = ...` for shared interfaces
- Utility modules export multiple functions (e.g., `airtable.ts` exports all CRUD + helpers)

**Barrel Files:**
- Not used. Direct imports preferred for clarity and tree-shaking.

## TypeScript

**Type Coverage:**
- Strict: `true`, `noUnusedLocals`, `noUnusedParameters` all enabled
- All public functions and component props typed
- Component data types explicitly defined (e.g., `ListNodeData`, `ContactPanelProps`)
- API response shapes wrapped in interfaces (`PodFields`, `CategoryFields`, `ContactFields`)
- Semantic type aliases for domain clarity (e.g., `HexColor`, `ISODate`)

**Pattern:**
```typescript
// Semantic alias — searchable, documented
export type HexColor = `#${string}`
export type ISODate = string

// Domain type wraps raw fields
interface ContactFields {
  Name: string
  Email?: string
  // ...
}

// Domain model exposes computed/cleaned interface
export interface Contact {
  id: string
  name: string
  email: string | null  // null > undefined
  // ...
}
```

## Code Organization

**Layer Structure:**
- `src/lib/`: Pure logic (data layer, domain math, utilities)
  - `airtable.ts`: All Airtable read/write with caching
  - `equity.ts`: Social equity scoring algorithms
  - `types.ts`: All type definitions
  - `utils.ts`: Utility functions (color, formatting, hashing)
- `src/components/`: React components organized by domain
  - `map/`: Orb graph visualization and interaction
  - `contacts/`: Contact detail panels and cards
  - `dashboard/`: Dashboard home and pod stats
  - `ui.tsx`: Shared UI primitives (Spinner, Avatar, buttons)
- `src/hooks/`: Custom hooks (`useNodePositions` for localStorage state)
- `src/styles/`: Global CSS (`globals.css`)

**Dependency Direction:**
- Components depend on lib (unidirectional)
- Components may depend on other components in the same domain
- No circular dependencies

---

*Convention analysis: 2026-03-18*
