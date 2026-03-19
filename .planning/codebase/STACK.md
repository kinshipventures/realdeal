# Technology Stack

**Analysis Date:** 2026-03-18

## Languages

**Primary:**
- TypeScript ~5.9.3 - Type-safe frontend application, build tooling, and data import scripts
- JavaScript (via TypeScript) - React components, utility functions

**Secondary:**
- CSS (Tailwind v4) - Styling and design system implementation

## Runtime

**Environment:**
- Node.js (version not pinned, inferred from tsconfig and dev dependencies)

**Package Manager:**
- pnpm - Preferred package manager for this project
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- React 19.2.0 - UI library, functional components
- react-router 7.13.1 - Client-side routing (two routes: `/` → Dashboard, `/map` → OrbMap)
- @xyflow/react 12.10.1 - React Flow graph visualization for orb map canvas

**Styling:**
- Tailwind CSS 4.2.1 - Utility-first CSS framework
- @tailwindcss/vite 4.2.1 - Vite plugin for Tailwind integration

**Build/Dev:**
- Vite 7.3.1 - Frontend build tool and dev server
- @vitejs/plugin-react 5.1.1 - React Fast Refresh integration for Vite

**Type Checking:**
- TypeScript - Static type checking with separate configs for app and node

**Linting:**
- ESLint 9.39.1 - Code linting and style enforcement
- typescript-eslint 8.48.0 - TypeScript support for ESLint
- eslint-plugin-react-hooks 7.0.1 - React hooks linting rules
- eslint-plugin-react-refresh 0.4.24 - React Fast Refresh validation

## Key Dependencies

**Critical:**
- @xyflow/react 12.10.1 - Core visualization library for the orb map (relationship network graph). Manages node/edge rendering, drag interactions, canvas state
- @dagrejs/dagre 2.0.4 - Graph layout algorithm library (used for calculating node positions)

**Utilities:**
- tsx 4.21.0 - TypeScript execution runtime for data import scripts

## Configuration

**Environment:**
- Vite environment variables via `import.meta.env` prefix
- Required vars (set in `.env.local`, never committed):
  - `VITE_AIRTABLE_TOKEN` - Personal access token for Airtable API
  - `VITE_AIRTABLE_BASE_ID` - Airtable base ID for the Kinship Brain database

**Build:**
- `vite.config.ts` - Vite configuration with React and Tailwind plugins
- `tsconfig.json` - Root TypeScript config referencing app and node configs
- `tsconfig.app.json` - TypeScript config for source code
- `tsconfig.node.json` - TypeScript config for build/dev files
- `eslint.config.js` - Flat config format with recommended rules for TypeScript, React, and React hooks

**Tailwind:**
- Tailwind v4 with Vite plugin (no separate config file — integrated via `@tailwindcss/vite` plugin)
- CSS entry: `src/styles/globals.css` (where Tailwind directives are applied)

## Development Scripts

```bash
pnpm dev              # Start Vite dev server with HMR
pnpm build            # Type-check (tsc -b) then build (vite build) to dist/
pnpm lint             # Run ESLint on codebase
pnpm preview          # Preview production build locally
pnpm seed:lists       # Import lists from Airtable seed script (requires .env.local)
pnpm seed:csv         # Import service providers CSV into Airtable (requires .env.local)
```

## Platform Requirements

**Development:**
- Node.js (version not pinned - check with `node -v`)
- pnpm (package manager)
- Modern browser with ES2020+ support

**Production:**
- Static hosting (SPA deployed to CDN or static host)
- Browser-only, no backend server required
- Airtable API access from browser (CORS enabled for Kinship Brain base)

---

*Stack analysis: 2026-03-18*
