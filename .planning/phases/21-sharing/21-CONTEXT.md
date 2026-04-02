# Phase 21: Sharing - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can share curated relationship lists with external collaborators via read-only links. Share links are pod-scoped, live-queried, and revocable with expiration. Requirements: SHR-01, SHR-02, SHR-03.

</domain>

<decisions>
## Implementation Decisions

### Share unit and data scope
- **D-01:** Share links are pod-scoped -- each link shares one pod's contacts via a live Supabase query (not a frozen snapshot)
- **D-02:** User can exclude specific contacts from a share link before generating it
- **D-03:** Recipients see current pod membership minus exclusions -- contacts added/removed from the pod are reflected in the share link automatically
- **D-04:** A contact can appear in multiple share links (different pods)

### Link format and access model
- **D-05:** URL format: `/s/<8-char-token>` (short random token, no pod name in URL)
- **D-06:** Links are public by default -- anyone with the URL can view
- **D-07:** Optional PIN protection per link (user sets a PIN during creation, recipient enters it to view)
- **D-08:** Required expiration -- user picks duration (7 days, 30 days, 90 days) at creation time
- **D-09:** 8-char token length is acceptable security for internal use

### Recipient experience
- **D-10:** Shared page renders as a clean table (name, role, company, pod membership)
- **D-11:** Shared page uses RealDeal design system -- logo, Fraunces headings, DM Sans body, color tokens
- **D-12:** Recipients can search/filter within the shared list
- **D-13:** Sharer customizes which columns are visible per link (not a fixed set)
- **D-14:** Expired or revoked links show a branded "This link has expired" page (not a 404)

### Share management UX
- **D-15:** "Share" button lives on PodDetailPage
- **D-16:** Creation flow is an inline popover: exclude contacts, pick visible columns, set expiration, optional PIN, copy link
- **D-17:** Active share links are listed on PodDetailPage (scoped to that pod)
- **D-18:** Revocation requires a confirmation step before taking effect

### Claude's Discretion
- Database schema for share links (table structure, token generation)
- RLS policy design for public share access (bypasses user_id scoping)
- Popover component implementation
- How exclusions are stored (array of contact IDs on the share record vs junction table)
- Search implementation on the public page (client-side filter vs query param)
- PIN hashing strategy

</decisions>

<specifics>
## Specific Ideas

- This is the first public URL in RealDeal -- establishes the pattern for any future unauthenticated views
- Share links must bypass the RequireAuth guard (Phase 18 D-06 demo mode bypass is the precedent)
- Phase 22 D-19 explicitly carved out this exception: "No public access except future share links (Phase 21)"
- The existing saved views in RecordsList (localStorage filters/columns/sort) are a conceptual precursor but not reused -- share links are pod-scoped, not filter-scoped

</specifics>

<canonical_refs>
## Canonical References

### Sharing requirements
- `.planning/REQUIREMENTS.md` -- SHR-01, SHR-02, SHR-03 definitions
- `.planning/ROADMAP.md` Phase 21 section -- success criteria and dependency map

### Auth guard (share route must bypass)
- `src/components/auth/RequireAuth.tsx` -- Route protection logic, demo mode bypass pattern
- `src/App.tsx` -- Route definitions, AppShell layout wrapper
- `.planning/phases/18-authentication/18-CONTEXT.md` -- Auth decisions (D-06, D-07 demo bypass)

### Data layer (share queries hit Supabase directly)
- `src/lib/airtable.ts` -- Current data layer (Supabase-backed despite filename), pod/contact query patterns
- `src/integrations/supabase/client.ts` -- Supabase client with auth config
- `.planning/phases/22-airtable-to-supabase-data-migration/22-CONTEXT.md` -- Schema design, RLS approach (D-19 public access exception)

### Design system (shared page must match)
- `docs/design-system.md` -- Full token set, typography, spacing, colors

### Pod detail (share entry point)
- `src/components/pods/PodDetailPage.tsx` -- Where share button and link management will live

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RequireAuth` component: already has bypass logic (demo mode) -- share route needs similar bypass
- Supabase client: configured with auth, can also make unauthenticated queries with proper RLS
- Design tokens: CSS custom properties available for the public share page
- `EmptyState` component: pattern for the "link expired" page

### Established Patterns
- **RLS with user_id scoping**: All tables use `user_id = auth.uid()`. Share links need a second RLS policy for public SELECT using the share token.
- **Route structure**: Flat `<Routes>` in App.tsx with `<RequireAuth>` wrapper via `<Outlet>`. Share route goes outside this wrapper.
- **Popover precedent**: No existing popover components -- this will be the first. Could use Radix UI Popover or build minimal.
- **Stale-while-revalidate caching**: Current pattern in airtable.ts. Public share page likely doesn't need caching (single fetch per view).

### Integration Points
- `App.tsx`: Add `/s/:token` route outside `<RequireAuth>` wrapper
- `PodDetailPage.tsx`: Add share button and active links section
- Supabase schema: New `share_links` table with token, pod_id, excluded_contacts, visible_columns, expiration, optional PIN hash
- RLS policies: New policy on contacts/pods for public access via valid share token

</code_context>

<deferred>
## Deferred Ideas

- Share a saved view (not just a pod) -- could extend later by storing filter criteria instead of pod_id
- Share analytics (view count, last accessed) -- nice-to-have, not MVP
- Share link editing (change expiration, update exclusions after creation) -- regenerate for now
- Bulk share (share multiple pods in one link) -- single pod per link for now

</deferred>

---

*Phase: 21-sharing*
*Context gathered: 2026-04-02*
