# Codebase Structure

**Analysis Date:** 2026-03-18

## Directory Layout

```
kinshipbrain/
├── src/
│   ├── main.tsx                 # Entry point: React root, providers
│   ├── App.tsx                  # Routes, AppShell (background, nav)
│   ├── components/
│   │   ├── dashboard/
│   │   │   └── Dashboard.tsx    # Home view: equity ring, pods, focus, overdue, dormant
│   │   ├── map/
│   │   │   ├── OrbMap.tsx       # Spatial view: React Flow canvas, home/category states
│   │   │   ├── ListNode.tsx     # Pod orb (96px)
│   │   │   ├── CategoryNode.tsx # Category orb (64px)
│   │   │   ├── MojNode.tsx      # Hub orb (116px)
│   │   │   ├── CreateCategoryNode.tsx  # Add category button
│   │   │   └── GlassOrb.tsx     # Reusable orb visual
│   │   ├── contacts/
│   │   │   ├── ContactDetail.tsx  # Edit/create form, right drawer
│   │   │   ├── ContactPanel.tsx   # Category contacts list
│   │   │   ├── ContactCard.tsx    # Contact row
│   │   │   └── InteractionSection.tsx  # Interaction history + log form
│   │   ├── ui.tsx              # Primitives: Spinner, Avatar, CloseButton
│   │   └── (other)             # (future components)
│   ├── lib/
│   │   ├── airtable.ts         # Data layer: API client, caching, mutations
│   │   ├── equity.ts           # Domain: scoring, dormancy, focus algorithm
│   │   ├── types.ts            # Type definitions
│   │   ├── utils.ts            # Helpers: color conversion, formatting, hashing
│   │   └── escapeStack.ts      # Keyboard: Escape key handler
│   ├── hooks/
│   │   └── useNodePositions.ts # localStorage: node position persistence
│   ├── scripts/
│   │   ├── seedLists.ts        # CLI: seed Pods table
│   │   └── importServiceProviders.ts  # CLI: import contacts from CSV
│   ├── styles/
│   │   └── globals.css         # Global styles, animations, CSS custom properties
│   └── assets/
│       └── (icons, images)
├── docs/
│   ├── design-system.md        # Design tokens, typography, spacing
│   ├── brainstorms/            # Ideas and explorations
│   ├── plans/                  # Implementation plans
│   └── solutions/              # Technical solutions, React patterns
├── .planning/
│   └── codebase/              # Generated: ARCHITECTURE.md, STRUCTURE.md, etc.
├── dist/                       # Build output (Vite)
├── node_modules/               # Dependencies
├── package.json                # Scripts, dependencies
├── vite.config.ts              # Vite build config
├── tsconfig.json               # TypeScript config
├── eslint.config.js            # ESLint rules
├── tailwind.config.js          # Tailwind CSS config
└── .env.local                  # Secrets (Airtable token, base ID)
```

## Directory Purposes

**`src/`:**
- Purpose: All source code
- Contains: TypeScript/TSX files, styles, utilities
- Key files: `main.tsx` (bootstrap), `App.tsx` (router), all components and libs

**`src/components/`:**
- Purpose: React components organized by feature/layout
- Contains: Dashboard view, Orb Map view, contacts interface, UI primitives
- Key files: Dashboard, OrbMap, ContactDetail

**`src/components/dashboard/`:**
- Purpose: Dashboard (Pulse) view components
- Contains: Main Dashboard component with nested sub-components (EquityRing, PodCard, FocusCard, OverdueRow, DormantRow)
- Key files: `Dashboard.tsx`

**`src/components/map/`:**
- Purpose: Orb Map (spatial) view and React Flow node components
- Contains: OrbMap orchestrator, ListNode/CategoryNode/MojNode specifications, GlassOrb reusable visual
- Key files: `OrbMap.tsx`, `GlassOrb.tsx`

**`src/components/contacts/`:**
- Purpose: Contact management UI
- Contains: Detail form, list view, card row, interaction history with logging
- Key files: `ContactDetail.tsx` (form), `ContactPanel.tsx` (list), `InteractionSection.tsx` (history)

**`src/components/ui.tsx`:**
- Purpose: Reusable UI primitives
- Contains: `Spinner`, `Avatar` (initials-based), `CloseButton` components
- Pattern: Minimal, no external UI library

**`src/lib/`:**
- Purpose: Non-component logic: data access, domain logic, types, utilities
- Contains: Airtable API wrapper, equity scoring, type definitions, helper functions
- Key files: `airtable.ts` (data layer), `equity.ts` (domain), `types.ts` (types), `utils.ts` (helpers)

**`src/lib/airtable.ts`:**
- Purpose: Airtable REST API wrapper and caching
- Contains: CRUD functions, table ID constants, field mappers, cache management, helper functions
- Exports: `getPods()`, `getCategories()`, `getContacts()`, `getInteractions()`, `createInteraction()`, `updateContact()`, `logInteraction()`, etc.
- Pattern: Stale-while-revalidate caching at module level

**`src/lib/equity.ts`:**
- Purpose: Relationship equity domain logic
- Contains: Interaction weighting, score calculations, overdue/dormant detection, Today's Focus algorithm
- Exports: `contactEquityScore()`, `podEquityScore()`, `overallEquityScore()`, `isDormant()`, `todaysFocus()`, helpers
- Constants: `INTERACTION_WEIGHTS`, `CADENCE_DAYS`

**`src/lib/types.ts`:**
- Purpose: Single source of truth for domain types
- Contains: Interfaces (`Pod`, `Category`, `Contact`, `Interaction`, `FocusItem`) and semantic type aliases
- Used by: All layers

**`src/lib/utils.ts`:**
- Purpose: Shared utility functions
- Contains: Color conversion (`hexToRgba`, `hexToRgbValues`), date formatting (`formatRelativeTime`), avatar hashing (`avatarHue`, `initials`), overdue calculation
- Pattern: Pure functions, no side effects

**`src/hooks/`:**
- Purpose: React hooks for shared behavior
- Contains: Position persistence logic (not a traditional hook, but hook-like)
- Key files: `useNodePositions.ts` - `getPositions()`, `savePosition()`, `clearPositionsForIds()`

**`src/scripts/`:**
- Purpose: One-off data import/seed scripts
- Contains: CLI tools for seeding Pods, importing contacts from CSV
- Run via: `pnpm seed:lists`, `pnpm seed:csv`
- Note: Require `.env.local` and should not be bundled

**`src/styles/`:**
- Purpose: Global CSS
- Contains: Reset, custom properties (--orb-*), animations (@keyframes pulse-ring, spin), Tailwind directives
- Key file: `globals.css`

**`docs/`:**
- Purpose: Design and planning documentation
- Contains: Design system spec, brainstorm notes, implementation plans
- Key file: `docs/design-system.md`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Renders React app into DOM, wraps with ReactFlowProvider and BrowserRouter
- `src/App.tsx`: Routes and layout shell

**Configuration:**
- `package.json`: Scripts, dependencies
- `vite.config.ts`: Vite build settings
- `tsconfig.json`: TypeScript strict mode, path aliases
- `eslint.config.js`: Linting rules
- `tailwind.config.js`: Tailwind design tokens (if used)
- `.env.local`: Environment variables (not committed)

**Core Logic:**
- `src/lib/airtable.ts`: All data access
- `src/lib/equity.ts`: All scoring and analysis
- `src/lib/types.ts`: Domain types

**Testing:**
- No test files found. Manual testing only.

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., `Dashboard.tsx`, `ListNode.tsx`)
- Utilities/libraries: camelCase (e.g., `airtable.ts`, `useNodePositions.ts`)
- Types: camelCase with `.d.ts` suffix if standalone (not used; all types in `types.ts`)

**Directories:**
- Feature/layout-based grouping: `components/dashboard/`, `components/map/`, `components/contacts/`
- Utilities: `lib/`, `hooks/`, `scripts/`
- Styles: `styles/`
- Build output: `dist/`

**Functions:**
- Action handlers: `handle*` (e.g., `handleListClick`, `handleBlur`)
- Queries/getters: `get*` or verb (e.g., `getContacts()`, `todaysFocus()`)
- Computations: verb noun (e.g., `contactEquityScore()`, `formatRelativeTime()`)
- Checks/predicates: `is*` (e.g., `isDormant()`, `isOverdue()`)

**Variables:**
- State: no prefix (e.g., `contacts`, `selectedContact`)
- Cache/module-level: `_prefixed` (e.g., `_contactsCache`, `_interactionsFetch`)
- DOM refs: `*Ref` (e.g., `saveGenRef`)
- Event handlers: `on*` props (e.g., `onClick`, `onSaved`)

**Types:**
- Interfaces: PascalCase (e.g., `Pod`, `Contact`)
- Type aliases: PascalCase (e.g., `HexColor`, `ISODate`, `FocusReason`)
- Enums: Not used; discriminated unions preferred

## Where to Add New Code

**New Feature (e.g., Pod filtering):**
- Primary code: `src/lib/airtable.ts` (add query function) + `src/components/dashboard/Dashboard.tsx` (add UI)
- Tests: Not applicable (no test setup)

**New Component/Module:**
- Implementation: `src/components/[feature]/` for UI, `src/lib/` for domain logic
- If reusable: add to `src/components/ui.tsx` or create `src/components/shared/`
- If domain logic: add to `src/lib/` (airtable, equity, utils, or new module)

**Utilities:**
- Shared helpers: `src/lib/utils.ts`
- Domain-specific: `src/lib/[domain].ts` (e.g., `equity.ts`)
- Hooks: `src/hooks/`

**Styles:**
- Global: `src/styles/globals.css`
- Component-scoped: Inline styles (preferred, no component-level CSS files)

## Special Directories

**`supabase/`:**
- Purpose: Stale. Project switched from Supabase to Airtable.
- Generated: No
- Committed: Yes, but unused. Can be deleted.

**`dist/`:**
- Purpose: Built output from Vite
- Generated: Yes (from `pnpm build`)
- Committed: No

**`.planning/codebase/`:**
- Purpose: Generated analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: Yes (via codebase mapping)
- Committed: Yes

**`docs/`:**
- Purpose: Hand-written design and planning documentation
- Generated: No
- Committed: Yes

**`node_modules/`:**
- Purpose: Dependencies
- Generated: Yes (from `pnpm install`)
- Committed: No

---

*Structure analysis: 2026-03-18*
