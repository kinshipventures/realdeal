# RealDeal Weekly Build Plan - Response to Briell

## Current State

Weeks 1-2 of your proposed breakdown are largely built. The core loop - dashboard, pods, contacts, search, import, interaction logging, pipelines - is live and testable now. This response resequences the remaining work based on what's actually ready vs. what needs building.

---

## Revised Four-Week Breakdown

### Week 1 - Dashboard & Core Navigation (Ready Now)

What Moj can test:

- See all relationship pods on one screen (visual map + dashboard cards)
- Click into any pod to view its contacts and categories
- See network health at a glance: equity score, who needs attention, upcoming birthdays, today's focus
- Customize which dashboard widgets are visible and save a preferred layout
- Search across all contacts instantly (Cmd+K)
- View the orb map as an alternative visual navigation

**Status: Built. Can demo immediately.**

### Week 2 - Contacts & Organization (Ready Now)

What Moj can test:

- View, add, edit, and delete contacts
- See every contact's full timeline - interactions, notes, key dates - in one place
- Import contacts from a CSV spreadsheet
- Create and customize unlimited pods (name, color, description)
- Move contacts between categories via the categorization queue
- Add a contact to multiple pods
- Filter contacts by overdue/grace period/dormant status within the nurturing hub
- Pipelines with drag-and-drop Kanban board (LP contacts, deal tracking, etc.)

**Status: Built. Can demo immediately.**

One gap: advanced filtering (by location, status, priority) on the main contacts list. Currently filtering is available within the nurturing hub and per-pod views, but not as a global filter bar. Can be added during Week 2 demo prep if prioritized.

### Week 3 - Staying Connected & Reminders (Needs ~1 Week of Build)

What Moj can test:

- Get flagged when a relationship has gone stale (equity scoring: Cooling/Fading labels)
- See a daily queue of who needs attention (Today's Focus + Nurturing Hub)
- Log an interaction with one click
- Track birthdays and key dates on the dashboard
- **NEW BUILD: Set a follow-up date and next action on any contact, see it surface on the dashboard when due**
- **NEW BUILD: Complete a follow-up from the nurturing hub with one click (logs to timeline, clears the signal)**
- **NEW BUILD: Mobile-responsive pass across all views**

What moves OUT of this week:

- "Share a filtered contact list via read-only link" -> moves to Week 4. Requires auth infrastructure and a public route, better sequenced after follow-ups.

**Status: Partially built. Stale detection, daily queue, interaction logging, and birthdays are live. Follow-up reminders and mobile polish are the new work.**

### Week 4 - Reporting, Sharing & Polish (Needs ~1 Week of Build)

What Moj can test:

- View reports: pod distribution, pipeline velocity, engagement activity over time
- Export any report as CSV
- Generate a read-only share link for a curated contact list
- Revoke a share link instantly
- Onboarding flow for new users

What moves to POST-MVP (separate milestone):

- **Gmail integration** (thread matching, send from app) - requires Gmail API OAuth, background sync infrastructure, and email composition UI. This is a 2-3 week project on its own.
- **Google Calendar auto-logging** - requires Calendar API integration and a matching/dedup system. ~1-2 weeks.
- **Group/bulk email** - depends on Gmail integration landing first.
- **Team member invites** - multi-tenancy is an architecture decision that touches auth, data isolation, and permissions. ~2-3 weeks.

**Status: Not started. Reporting (Phase 20) and Sharing (Phase 21) are scoped on the roadmap and ready to build.**

---

## What Changed vs. Your Proposal

| Your Week | What Stayed | What Moved |
|-----------|-------------|------------|
| Week 1 | Everything | Nothing - it's built |
| Week 2 | Everything | Nothing - it's built |
| Week 3 | Stale alerts, daily queue, interaction logging, birthdays | Share links moved to Week 4 |
| Week 4 | Reporting, export | Gmail, Calendar, email, team invites moved to post-MVP |

### Why the integrations move

Gmail, Calendar, email sending, and team invites are each independent engineering projects that require:

- Third-party API OAuth flows
- Background sync/matching systems
- New UI surfaces (email composer, calendar view, team management)
- A real backend (current app is client-side only with Airtable)

Cramming them into one week guarantees none of them work well. Better to ship a tight MVP without integrations and add them as a focused follow-on milestone where each one gets proper attention.

---

## Weekly Check-In Format

Recommendation: **Shared checklist + 2-min Loom per week.**

- Before each weekly check-in, Moj gets a checklist of that week's testable features (like the bullets above) in a shared doc or Notion page
- She tests on her own time, marks what works, flags what doesn't
- Gabriel records a 2-min Loom walking through anything new or complex
- Quick sync call only if there are blockers or design questions

This keeps Moj in control of her testing pace, avoids scheduling overhead, and creates a paper trail of what's been validated. Live walkthroughs are better saved for milestone demos (end of Week 2, end of Week 4) where the cumulative progress is more impressive.

---

## Timeline Summary

| Week | Theme | Build Status | Demo Readiness |
|------|-------|-------------|----------------|
| 1 | Dashboard & Navigation | Done | Ready now |
| 2 | Contacts & Organization | Done | Ready now |
| 3 | Follow-ups & Mobile | ~1 week build | After follow-up flow ships |
| 4 | Reporting & Sharing | ~1 week build | After reports + share links ship |
| Post-MVP | Gmail, Calendar, Email, Teams | ~6-8 weeks total | Separate milestone |
