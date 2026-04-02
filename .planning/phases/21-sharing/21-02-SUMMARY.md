---
phase: 21-sharing
plan: "02"
subsystem: sharing
tags: [sharing, share-links, pod-detail, popover]
dependency_graph:
  requires: [21-01]
  provides: [share-link-creation-ui, pod-sharing-management]
  affects: [src/components/pods/PodDetailPage.tsx, src/components/sharing/SharePopover.tsx]
tech_stack:
  added: []
  patterns: [inline-popover, click-outside-mousedown, confirmation-gate]
key_files:
  created:
    - src/components/sharing/SharePopover.tsx
  modified:
    - src/components/pods/PodDetailPage.tsx
decisions:
  - SharePopover uses position absolute anchored to parent div so Share button controls its context naturally
  - getActiveShareLinks wrapped in .catch(() => []) so auth failures during load don't break the page
  - Revoke confirmation is inline row replacement (not modal) -- keeps interaction in context
metrics:
  duration: "8 minutes"
  completed: "2026-04-02"
  tasks_completed: 2
  tasks_total: 3
  files_changed: 2
---

# Phase 21 Plan 02: Share Link Creation UI Summary

SharePopover component and PodDetailPage integration -- full write path for generating, viewing, and revoking share links.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Share creation popover component | 345c1b6 | src/components/sharing/SharePopover.tsx |
| 2 | Integrate share button and active links into PodDetailPage | 8a70b0e | src/components/pods/PodDetailPage.tsx |

## Task 3: Pending Checkpoint

**Task 3: Verify full sharing flow** is a `checkpoint:human-verify` task and requires manual end-to-end verification.

Steps to verify:
1. Start dev server: `pnpm dev`
2. Navigate to any pod detail page (e.g. /pod/{id})
3. Click "Share" button -- popover should appear with exclusion list, column picker, expiration, PIN
4. Exclude one contact, keep default columns, pick 30 days, leave PIN blank
5. Click "Create link" -- URL should be copied to clipboard, popover closes
6. Verify "Shared links" section now shows the new link with expiration
7. Open the copied URL in an incognito/private browser window
8. Verify: contact table renders with pod name heading, excluded contact is NOT shown
9. Verify: table columns match what was selected
10. Verify: search input filters contacts by name
11. Go back to the pod detail page, click "Revoke" on the link
12. Confirm revocation
13. Refresh the incognito tab -- should show "This link has expired" page
14. Create a new link WITH a PIN set
15. Open in incognito -- should show PIN gate, wrong PIN shows error, correct PIN shows contacts

**Status: Awaiting human verification. Type "approved" or describe issues to continue.**

## What Was Built

**SharePopover (`src/components/sharing/SharePopover.tsx`):**
- Inline popover anchored below the Share button via `position: absolute; top: 100%; right: 0`
- Contact exclusion: scrollable checkbox list of pod members (max-height 160px)
- Column picker: Name (always on, disabled), Role, Company, Pod
- Expiration: radio-style buttons for 7/30/90 days
- PIN input: optional numeric text field
- On create: calls `createShareLink`, copies URL to clipboard, shows "Link copied!" for 1.8s then calls `onCreated`
- Click-outside to close via `mousedown` listener on document

**PodDetailPage changes:**
- Added imports: `ShareLink` type, `getActiveShareLinks`, `revokeShareLink`, `SharePopover`
- New state: `shareLinks`, `showSharePopover`, `revokingId`, `confirmRevoke`
- `getActiveShareLinks` added to Promise.all in load effect (wrapped in `.catch(() => [])` so auth errors don't break page load)
- Share button in pod header (chain-link SVG icon, opens popover)
- Active links section renders when `shareLinks.length > 0` -- shows token path, days until expiry, PIN badge if set, Revoke button
- Revoke flow: click Revoke -> inline confirmation row ("Yes, revoke" / Cancel) -> calls `revokeShareLink` -> removes from state

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None -- share link creation calls real Supabase via `sharing.ts`, active links load from database, revocation writes to database.

## Self-Check: PASSED

Files exist:
- FOUND: src/components/sharing/SharePopover.tsx
- FOUND: src/components/pods/PodDetailPage.tsx (modified)

Commits exist:
- 345c1b6: feat(21-02): add SharePopover component
- 8a70b0e: feat(21-02): integrate share button and active links into PodDetailPage
