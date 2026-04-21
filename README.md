# RealDeal

Relationship intelligence CRM for founders and investors. Tracks contacts, pods (relationship groups), interactions, campaigns, and social equity scores across your network.

## Stack

- React 19 + TypeScript + Vite
- Supabase (auth + database)
- Tailwind CSS + DM Sans + Fraunces
- React Flow (orb map / network graph)
- Deployed on Vercel

## Setup

```bash
# Install deps
pnpm install

# Copy env template and fill in values
cp .env.example .env.local

# Start dev server (runs on :8080)
pnpm dev
```

## Required env vars

```
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

## Commands

```bash
pnpm dev              # dev server on localhost:8080
pnpm build            # production build
pnpm lint             # eslint
pnpm test             # vitest (single run)
pnpm test:watch       # vitest watch mode

# Data scripts (require .env.local)
pnpm export:supabase-data
pnpm import:supabase-data
```

## Architecture

- `src/lib/supabase-data.ts` - all data reads/writes (real data layer)
- `src/lib/airtable.ts` - barrel re-export of supabase-data.ts (legacy naming, kept for import compatibility)
- `src/lib/types.ts` - all TypeScript interfaces
- `src/lib/equity.ts` - social equity scoring (0-100, recency-weighted)
- `src/lib/workspace.ts` - active workspace ID (module-level state + localStorage)
- `src/lib/sampleData.ts` - demo mode static data

Key routes: `/` (orb map), `/pulse` (dashboard), `/contacts`, `/campaigns`, `/projects`, `/reports`

See `CLAUDE.md` for full architecture reference.

## Deploy

Auto-deploys to Vercel from `main`. Production: https://real-deal-2.vercel.app
