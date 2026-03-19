# Codebase Concerns

**Analysis Date:** 2026-03-18

## Tech Debt

**Sparse error boundaries:**
- Issue: Most error handling is silent or displays generic toast-like messages. No structured error recovery.
- Files: `src/components/map/OrbMap.tsx` (lines 253-269), `src/components/dashboard/Dashboard.tsx` (lines 66-76)
- Impact: Network failures, Airtable rate limits, and data inconsistencies fail silently or show minimal feedback. Users can't distinguish between loading and failure states.
- Fix approach: Implement error recovery with retry UI. For network errors in OrbMap, show an inline error message that clears after user action. For critical dashboard failures, distinguish "load failed" from "loading" states visually.

**Multiple independent loading states in Dashboard:**
- Issue: Three separate `loading` flags (`contactsLoading`, `podsLoading`, `interactionsLoading`) with fragile coordination logic.
- Files: `src/components/dashboard/Dashboard.tsx` (lines 55-76)
- Impact: Complex loading state machine — if one fetch hangs, others can remain pending indefinitely. `dataReady` computed from two flags only, ignoring interactions.
- Fix approach: Consolidate into a single `loadingState` enum ('idle' | 'loading' | 'error') or track per-resource with a `Record<Resource, State>`. Use `Promise.all()` if resources must load together, or track each independently with better visibility.

**Airtable API token exposed in environment file:**
- Issue: `VITE_AIRTABLE_TOKEN` is passed directly to the browser as public env variable.
- Files: `src/lib/airtable.ts` (lines 4)
- Impact: Token can be extracted from browser and used to access/modify all data in Airtable base. Medium-term risk: rotate token, implement proxy layer before public release.
- Fix approach: Move token to server-side proxy. Create `/api/airtable/*` endpoints that validate requests server-side before forwarding to Airtable. This prevents client-side token exposure while keeping the UI logic unchanged.

**Manual cache invalidation scattered throughout codebase:**
- Issue: Developers must manually call `_contactsCache = null` or `invalidateInteractionsCache()` after mutations. Easy to forget.
- Files: `src/lib/airtable.ts` (lines 192, 285, 321, 386-387, 439), `src/components/map/OrbMap.tsx` (line 235)
- Impact: Stale cache bugs after contact creation/update. If you forget to invalidate, UI shows old data until cache TTL expires.
- Fix approach: Wrap mutation functions in a cache-aware layer that auto-invalidates. Example: `mutate(action, invalidate=['contacts', 'interactions'])` that clears specified caches after the mutation succeeds.

## Known Bugs

**Category positions reset on creation:**
- Issue: After creating a new category, the layout recalculates and node positions snap to defaults, losing any manual arrangement.
- Files: `src/components/map/OrbMap.tsx` (lines 234-238, 284-293)
- Impact: If user spends time positioning categories, creating a new one discards all positioning.
- Workaround: Save positions before fetching categories, then reapply.
- Fix approach: On new category, calculate position for the new node only and append it to existing positions without resetting the layout.

**Contact deletion in modal doesn't update parent list:**
- Issue: Deleting a contact from DetailPanel works, but ContactPanel's filtered list doesn't sync.
- Files: `src/components/contacts/ContactDetail.tsx` (line 14), `src/components/contacts/ContactPanel.tsx` (lines 45-56)
- Impact: After deletion, the contact still appears in the list until category is closed and reopened.
- Fix approach: Pass a callback from ContactPanel to ContactDetail that triggers local state update in the panel after deletion succeeds.

## Security Considerations

**SQL injection via Airtable filterByFormula:**
- Risk: User input in search could theoretically be reflected in filterByFormula.
- Files: `src/lib/airtable.ts` (lines 393-396)
- Current mitigation: Currently using hardcoded ID validation regex. Search is client-side filtering, not sent to Airtable.
- Recommendations: Keep input validation strict. If Airtable filters are added later, escape all user input via parameterized filters or validation functions.

**localStorage snooze state unencrypted:**
- Risk: Snooze data is stored in plaintext JSON in localStorage. Not sensitive, but sets bad precedent.
- Files: `src/components/dashboard/Dashboard.tsx` (lines 27-49)
- Current mitigation: Only contains contact IDs and timestamps — no PII.
- Recommendations: Low priority, but if sensitive user preferences are added to localStorage, implement encryption or server-side sync.

## Performance Bottlenecks

**Full contact re-index on every interaction fetch:**
- Problem: `indexByContact()` walks all 90 days of interactions and rebuilds the map on every update.
- Files: `src/lib/equity.ts` (lines 46-54), `src/components/dashboard/Dashboard.tsx` (line 79)
- Cause: Interactions cache invalidates frequently; rebuilding is O(m) where m = number of interactions.
- Improvement path: Memoize `byContact` more aggressively. Only rebuild when `allInteractions` identity changes, not on shallow equality. Consider incremental updates.

**OrbMap renders full node tree on single category selection:**
- Problem: When a category is clicked, the entire node/edge set is rebuilt and re-rendered.
- Files: `src/components/map/OrbMap.tsx` (lines 176-269)
- Cause: `setNodes()` replaces the entire array, triggering full React Flow re-render.
- Improvement path: Use React Flow's partial update API to replace only changed nodes. For category selection, update only the selected node's style/data, not the entire graph.

**Dashboard loads all contacts + interactions on mount:**
- Problem: `getAllInteractions()` fetches 90 days of data upfront. For large networks, this can be 10k+ records.
- Files: `src/components/dashboard/Dashboard.tsx` (lines 73-75)
- Cause: Interactions are needed for equity scoring, but the full 90-day window is always fetched even if only 7 days are displayed.
- Improvement path: Implement pagination or progressive loading. Fetch recent 30 days on mount, then backfill 90 days in background for score accuracy.

## Fragile Areas

**OrbMap view state machine:**
- Files: `src/components/map/OrbMap.tsx` (lines 140-154)
- Why fragile: Complex interplay between `view` (React state), `viewRef` (ref), `selectedPod` (state), `selectedPodRef` (ref). Switching views requires coordinating 4 pieces of state. Generation counter (`listClickGenRef`) prevents race conditions but is implicit.
- Safe modification: When adding new views or transitions, update all 4 state pieces atomically. Extract view state into a single reducer: `{ view, selectedPod }`.
- Test coverage: No tests for edge cases like rapid clicks, navigation during loading, or switching pods before category load completes.

**Cache invalidation protocol:**
- Files: `src/lib/airtable.ts` (all mutation functions)
- Why fragile: Each mutation must remember which caches to invalidate. Adding a new cache type requires updating all mutation sites.
- Safe modification: When adding a new cache (e.g., `_podsCa`), add it to a registry of caches and auto-invalidate all on mutation.
- Test coverage: No automated tests for cache consistency after mutations.

**Equity scoring recency multiplier:**
- Files: `src/lib/equity.ts` (lines 37-42)
- Why fragile: Hard-coded day thresholds (30, 60, 90) and multipliers (1.0, 0.6, 0.3) are baked in. Changing these requires updating multiple places and re-scoring the entire network.
- Safe modification: Extract thresholds and multipliers to a config object. Add comments explaining the weighting logic.
- Test coverage: No unit tests for scoring edge cases (e.g., interaction exactly on boundary, score at 100 cap).

## Scaling Limits

**In-memory caches unbounded:**
- Current capacity: Contacts and interactions cached in memory indefinitely (5-min TTL, but not garbage collected).
- Limit: With 1000+ contacts and 10k+ interactions, memory usage could reach 50+ MB per browser tab. No limits enforced.
- Scaling path: Implement cache size limits (LRU eviction) or move to IndexedDB for larger datasets. Add memory monitoring.

**Airtable read rate limits:**
- Current capacity: 5 API calls per second (Airtable free tier). App makes 3-4 parallel requests on dashboard load.
- Limit: With multiple users or rapid interactions, hitting 429 (rate limit) errors is likely.
- Scaling path: Implement request queuing with exponential backoff. Consider server-side caching layer to batch Airtable requests.

**React Flow graph rendering limit:**
- Current capacity: Tested up to ~50 nodes. Beyond that, drag/pan becomes slow.
- Limit: With 100+ categories visible at once, React Flow struggles.
- Scaling path: Implement clustering (group categories by first letter). Hide off-screen nodes. Lazy-load node details on demand.

## Dependencies at Risk

**React 19 early adoption:**
- Risk: React 19 is very new. Limited production use. Future updates may introduce breaking changes.
- Impact: If breaking bugs or API changes occur, upgrading could require refactoring components.
- Migration plan: Minor risk given no heavy hooks usage. Pin to ^19.2.0 and monitor changelogs. Can downgrade to 18 if needed.

**@xyflow/react v12 - breaking change history:**
- Risk: @xyflow has had major API changes between v11 and v12. Future v13 could break.
- Impact: Custom node logic depends on v12 APIs. Major upgrade could require rewriting OrbMap.
- Migration plan: Lock to v12.10.1. When planning v13 upgrade, allocate time for testing. Current architecture (custom node components) is stable.

**Tailwind v4 with Vite:**
- Risk: Tailwind v4 is recent. Integration with Vite plugin may have edge cases.
- Impact: Build performance or style bundling issues.
- Migration plan: Low risk given integration is handled by plugin. Monitor for next-gen CSS issues (e.g., cascade layers).

## Missing Critical Features

**No offline support:**
- Problem: App requires constant network connectivity. Airtable API must be reachable.
- Blocks: Can't use the app on flights, poor cell coverage, or if Airtable is down.
- Recommendation: Implement IndexedDB for offline read cache. Queue mutations locally and sync on reconnect.

**No bulk operations:**
- Problem: Can't snooze, update, or delete multiple contacts at once.
- Blocks: Managing dormant contacts requires clicking each one individually.
- Recommendation: Add multi-select mode to dashboard and panel. Batch mutations via Airtable batch API.

**No activity export:**
- Problem: Can't export interaction history, equity scores, or network snapshots.
- Blocks: Can't share progress with advisors, backup data, or analyze trends over time.
- Recommendation: Add CSV export for interactions and contacts. Add date-range filtering for historical queries.

## Test Coverage Gaps

**No unit tests for equity scoring:**
- What's not tested: Edge cases in `contactEquityScore()`, `isDormant()`, `todaysFocus()` algorithm.
- Files: `src/lib/equity.ts`
- Risk: Recency multiplier, dormancy thresholds, and focus ranking could be silently incorrect if refactored.
- Priority: **High** — scoring logic drives the entire app's value prop. A bug here undermines the product.

**No integration tests for Airtable mutations:**
- What's not tested: Cache invalidation after create/update/delete. Multi-mutation coordination (create contact, add to pod, log interaction).
- Files: `src/lib/airtable.ts`
- Risk: Stale cache bugs, orphaned records, race conditions during rapid interactions.
- Priority: **High** — data integrity is critical.

**No component tests for OrbMap view state:**
- What's not tested: Navigation between views, rapid clicks, switching pods during load, error states.
- Files: `src/components/map/OrbMap.tsx`
- Risk: Subtle race conditions, stale responses overwriting state, orphaned timeouts.
- Priority: **Medium** — view state is complex but not data-critical.

**No tests for Dashboard loading states:**
- What's not tested: Partial load failures (contacts load, interactions fail). Long network delays.
- Files: `src/components/dashboard/Dashboard.tsx`
- Risk: UI hangs or shows inconsistent state if individual fetches time out.
- Priority: **Medium** — affects UX but not data integrity.

**No tests for ContactDetail auto-save:**
- What's not tested: Rapid edits, save failures, concurrent saves, stale responses overwriting newer edits.
- Files: `src/components/contacts/ContactDetail.tsx`
- Risk: User edits could be lost or overwritten if auto-save logic races.
- Priority: **Medium** — common user flow, but edge cases are rare.

---

*Concerns audit: 2026-03-18*
