# Contact Activity Timeline

**Date:** 2026-03-12
**Status:** Brainstorm complete — ready for planning

## What We're Building

An enhanced activity timeline for each contact in Kinship Brain that shows communication history across channels (call, email, text, meeting) with a channel summary bar for at-a-glance freshness per channel.

### The Problem

Moj needs to see the full picture of her relationship with any contact — when she last talked to them, what they discussed, and across which channels. Currently, interactions are logged in a flat list with no channel differentiation, no per-channel freshness signals, and no visual hierarchy.

### The Solution (Pragmatic First Step)

**Channel Summary Bar** at the top of ContactDetail showing per-channel recency:
- Last call: 3d ago
- Last email: 2w ago
- Last text: never
- Last meeting: 1mo ago

**Styled Chronological Timeline** below the summary bar:
- Channel icons per interaction (phone, envelope, message bubble, calendar)
- Better spacing and visual hierarchy
- Same edit/delete hover actions

**Interaction Type Updates:**
- Add `text` as a new interaction type
- Primary channels (shown in summary bar): call, email, text, meeting
- Secondary types (logged, not in summary bar): intro, note
- Note remains excluded from `last_contacted_at` updates

## Why This Approach

- **Builds on existing infrastructure** — interaction CRUD, the flat list, and `last_contacted_at` are already built. This is a display upgrade, not a data model rewrite.
- **CRM-grade activity tracking** — modeled after HubSpot-style activity logging (calls, emails, meetings, notes) adapted for relationship management.
- **Foundation for bigger vision** — Moj's long-term vision includes auto-sync from Gmail/iMessage/phone and drag-to-orb gestures. Build the viewer first, plug in the data sources later. Manual logging is fine until her actual tools are confirmed.

## Key Decisions

1. **4 primary channels in summary bar**: call, email, text, meeting — keeps it scannable
2. **Intro and note stay as secondary types** — intro is unique to relationship management, note is internal-only
3. **Chronological list, not grouped or visual timeline** — clean, scannable, doesn't over-design for the current data volume
4. **Note type still excluded from `last_contacted_at`** — existing behavior, correct semantics
5. **No auto-sync in this phase** — manual logging only
6. **Summary bar always shows all 4 channels** — static layout with "never" for unused channels, so gaps are visible

## Future Vision (Not This Phase)

- **Auto-sync from channels**: Gmail API for emails, possibly iMessage/call log access (platform-dependent, needs research)
- **Drag-to-orb**: A sidebar showing recent communications that can be dragged onto contact orbs to associate them — Moj's preferred interaction model
- **Channel activity orbs**: Small satellite indicators around contact orbs on the map showing per-channel recency
- **Quick-log gestures**: Long-press radial menu on orbs for 2-tap interaction logging

## Open Questions

- What are Moj's actual communication tools? (Gmail? iPhone? This affects future auto-sync feasibility)

## Planning Should Cover

- Update `InteractionType` to include `text`
- Add `TYPE_LABELS` and icons for all types
- Build channel summary bar component in ContactDetail
- Restyle interaction list with channel icons and better visual hierarchy
- Update Airtable `Type` field options to include `Text`
