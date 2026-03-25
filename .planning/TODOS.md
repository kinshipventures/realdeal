# TODOs

## UI Polish
- [ ] Redesign "today's focus" cards — remove green dashed border (AI slop). Use spacing, subtle background, or shadow for card separation instead of decorative borders.
- [ ] Wrapped card show/hide toggle — need a way to both hide AND show the wrapped insight cards. Also review redundancy between wrapped stats and the top equity numbers on the dashboard (may be showing the same info twice).
- [ ] Pod cards horizontal scroll — no visible navigation (arrows, dots, or scroll indicator) to signal there are more pods off-screen. Horizontal scroll works but isn't discoverable.

## New Pages
- [ ] Settings page — accessible via gear icon somewhere in the UI. Scope TBD.

## UX / Interaction
- [ ] Pod navigation as map trail — clicking a pod card on the dashboard should feel like navigating a trail on a map. Shift attention, center the pod, zoom in to show contacts, reveal connecting lines from the hub-and-spoke structure. Smoothly navigate the tree back and forth (drill in, back out). Think of it as traversing the orb map but triggered from the dashboard.

## Bugs
- [ ] Pod cards clip on hover — hover scale/lift effect gets cut off at top of container. Likely overflow:hidden on parent needs padding or overflow:visible.

## Design Review Deferred (2026-03-25)
- [ ] Orb map broken on mobile — orbs use fixed pixel positions, off-screen at 375px. Needs scaled layout or simplified list view.
- [ ] Raw CSV data in contact names — imported data shows commas, URLs, field delimiters. Airtable data cleanup needed.
- [ ] Duplicate contacts in overdue list — likely duplicate Airtable records, not a rendering bug.

## Trolley CRM Gaps (from PDF review)

### Partially covered — needs attention
- [ ] Two-hub structure — Trolley shows Moj personal lists AND Kinship Ventures company lists (LP ABG, LP Internal, LP PR, Pipeline, SPV) as separate hubs. App currently has one hub.
- [ ] Show list owner prominently in UI — Trolley assigns primary owners per list (e.g. "Mara Sy - Relationship Manager", "Operations Manager"). Field exists in Airtable but not visible in app.

### New features — VIP / Aspirational layer
- [ ] "YOU Inc. Board" — 14 VIP contacts across categories that Moj consistently reaches out to. No two from the same category. Special treatment in dashboard/focus.
- [ ] Aspirational contacts — people Moj WANTS to know, visually distinct (different colored ring in Trolley). Track intro requests for these.
- [ ] Network holes — identify which categories are thin and need new contacts. Balance indicator toward ideal of 10 per category.
- [ ] Ideal list size guidance — Trolley says 150 MAPs with 10 per category. Show how balanced/unbalanced the network is.

### New features — Monitoring / Intelligence
- [ ] Milestone tracking — beyond birthdays: launches, awards, press, career moves. Trigger congratulations/gifting actions.
- [ ] 10-week interaction review — period-based view showing all outreach activity, helping target next calls.
- [ ] Monthly audit workflow — systematic review of 50 contacts for list cleanup. Keep/remove with notes on why.
- [ ] Google Alerts / social monitoring — be notified when a MAP contact is in the news (future/Phase 2+).
- [ ] Gifting/congratulations workflow — prompted actions when milestones or occasions are detected.
