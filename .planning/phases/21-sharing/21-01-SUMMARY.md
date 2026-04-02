---
phase: 21-sharing
plan: 01
subsystem: database, ui
tags: [supabase, rls, sharing, public-route, react, typescript]

requires:
  - phase: 22-airtable-to-supabase-data-migration
    provides: Supabase schema, RLS patterns, contact_pods/pods/contacts tables

provides:
  - share_links table with RLS for both authenticated and anon access
  - ShareLink TypeScript type
  - sharing.ts data layer (generateToken, hashPin, verifyPin, createShareLink, getActiveShareLinks, revokeShareLink, getShareLink, getSharedContacts)
  - SharedListPage public component with expired/PIN-gate/ready states
  - /s/:token route outside RequireAuth guard

affects: [21-02-sharing, PodDetailPage share management UI]

tech-stack:
  added: []
  patterns:
    - "Anon RLS via token: share_links public SELECT policy + contacts/pods/contact_pods policies scoped to valid share links"
    - "Public route pattern: Route outside RequireAuth wrapper in App.tsx"
    - "Web Crypto PIN hashing: SubtleCrypto SHA-256 via crypto.subtle.digest"
    - "getSharedContacts returns only name/role/company/pod_name - never email/phone/notes"

key-files:
  created:
    - supabase/migrations/20260402_share_links.sql
    - src/lib/sharing.ts
    - src/components/sharing/SharedListPage.tsx
  modified:
    - src/lib/types.ts
    - src/App.tsx

key-decisions:
  - "Excluded contacts filtered client-side in getSharedContacts rather than using NOT IN SQL - simpler, RLS already enforces top-level access"
  - "getSharedContacts only returns name/role/company/pod_name per D-02/SHR-02 - no private fields exposed via public route"
  - "Share links use same supabase client for anon queries - RLS policies enforce access, no separate anon client needed"

patterns-established:
  - "Public route: add Route outside RequireAuth block in App.tsx, import component"
  - "Anon RLS: policy USING clause with EXISTS subquery on share_links validates token + expiry + revocation"

requirements-completed: [SHR-01, SHR-02]

duration: 12min
completed: 2026-04-02
---

# Phase 21 Plan 01: Sharing Read Path Summary

**Share links data layer and public /s/:token page with token-based RLS, PIN gating, and branded expired state**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-02T18:30:00Z
- **Completed:** 2026-04-02T18:42:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- share_links table with RLS: authenticated users manage their own links, anon users SELECT by token, contacts/pods/contact_pods open to anon only for active share links
- Full sharing.ts data layer - token generation, SHA-256 PIN hashing, all CRUD functions
- SharedListPage handles all states: loading, expired (branded), PIN gate, ready (searchable table)
- /s/:token route wired outside RequireAuth - first public URL in RealDeal

## Task Commits

1. **Task 1: Share links schema migration + data layer** - `296a151` (feat)
2. **Task 2: Public share page + route wiring** - `bb8c54b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `supabase/migrations/20260402_share_links.sql` - share_links table + 5 RLS policies
- `src/lib/sharing.ts` - generateToken, hashPin, verifyPin, createShareLink, getActiveShareLinks, revokeShareLink, getShareLink, getSharedContacts
- `src/lib/types.ts` - ShareLink interface added
- `src/components/sharing/SharedListPage.tsx` - public share page
- `src/App.tsx` - /s/:token route + SharedListPage import

## Decisions Made

- Excluded contacts filtered client-side in getSharedContacts for simplicity - RLS handles top-level pod access
- getSharedContacts returns only name/role/company/pod_name - no email, phone, notes, or private fields per SHR-02
- Same supabase client for anon queries - RLS policies enforce access, no separate anon client setup needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

The migration file at `supabase/migrations/20260402_share_links.sql` must be applied to the Supabase project. Run via Supabase dashboard SQL editor or `supabase db push`.

## Next Phase Readiness

- Plan 01 complete: data layer and public page ready
- Plan 02 (share management UX) can build on top: share button on PodDetailPage, creation popover, active links list, revocation flow

---
*Phase: 21-sharing*
*Completed: 2026-04-02*

## Self-Check: PASSED

- migration file: FOUND
- sharing.ts: FOUND
- SharedListPage.tsx: FOUND
- task1 commit 296a151: FOUND
- task2 commit bb8c54b: FOUND
