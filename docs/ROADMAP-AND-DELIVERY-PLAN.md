# Kinship Brain — Product Roadmap & Delivery Plan

**Prepared by:** Gabriel Murray
**Date:** March 29, 2026
**Timeline:** 3–4 weeks (March 31 – April 25)
**Hours:** 15 hrs/week

---

## Where We Are

### Delivered (Live at mojrm.vercel.app)
- Relationship records — full CRUD, search (Cmd+K), auto-save
- Pod-based organization with sub-categories (orb map + list views)
- Social equity scoring — weighted by interaction type, cadence-aware, 0–100
- Dashboard — equity ring, pod health cards, Today's Focus queue, dormant cleanup
- Interaction timeline — type-based logging (call, email, text, meeting, intro, note)
- Birthday tracking with upcoming alerts
- Inline category creation
- Airtable as backend with 90-day scoped interaction caching
- Design system aligned to Trolley CRM reference (Fraunces + Plus Jakarta Sans, brand green, Wrapped energy)
- System documentation and maintenance runbook

### What's Not Done
- The app exists but isn't customized to Moj's actual data — demo data, not her real network
- No Gmail, Calendar, or ClickUp integration
- No data imports (LP lists, talent lists, service providers)
- No AI assistant (Telegram) connected to this data
- No multi-user access
- No campaign/pipeline module

### What Went Wrong
The scope expanded from "AI assistant on Telegram" to "visual relationship intelligence app" based on direction from our working sessions — specifically the Mar 18 in-person build session where social equity scoring, orb maps, and the Trolley CRM visual direction became the priority. I followed that energy without clearly resetting the timeline or flagging what it displaced. That's on me.

The Lovable pivot was driven by real technical limitations (no API integration support, no backend control), but I didn't communicate the tradeoffs clearly enough, and the Lovable call created confusion. I take responsibility for how that landed.

---

## What I'm Building (3–4 Week Scope)

The MVP PDF Moj shared defines the product clearly. Below is what I'm committing to deliver, mapped against that spec, within the remaining engagement window.

### Project 1: Kinship Brain App (Relationship Manager)

The app at mojrm.vercel.app, rebuilt to match the MVP spec and populated with real data.

### Project 2: Moj's AI Assistant (Telegram)

The conversational interface — Moj asks questions in Telegram, gets answers from her actual systems.

---

## Weekly Milestones

### Week 1 (Mar 31 – Apr 4): Foundation + Real Data
**Theme:** Make it real. Moj's actual network in the app.

| Deliverable | MVP Spec Section | Status |
|---|---|---|
| Migrate to Supabase (schema already written) | Core Architecture | Ready to build |
| Import Service Providers category — full records | Relationship Records | Need: CSV or Google Sheet from team |
| Import LP lists (all tabs, mapped per-list) | Relationship Records | Need: Google Sheet access |
| Import Talent list | Relationship Records | Need: Google Sheet access |
| Pod + sub-pod structure matching Moj's actual categories | Pods + Subpods | Ready to build |
| Pending Categorization Tray (intake flow for new contacts) | Intake Flow | Ready to build |

**Checkpoint:** Moj opens the app and sees her real contacts organized in her real pods. She can add new contacts through intake flow.

**What I need from you/team by Mar 31:**
- [ ] Google Sheets for LP lists, Talent list, Service Providers
- [ ] Confirmation of pod/sub-pod structure (which categories under which pods)
- [ ] Any contacts Moj wants imported first (priority list)

---

### Week 2 (Apr 7 – Apr 11): Gmail + Timeline + Pipelines
**Theme:** Context flows in. Relationships have history.

| Deliverable | MVP Spec Section | Status |
|---|---|---|
| Gmail integration — email summaries on contact timelines | Gmail Integration | Need: OAuth access to Moj's Gmail(s) |
| Gmail Chrome extension — create/attach relationship from inbox | Gmail Extension | Ready to build |
| Relationship timeline — emails, notes, field changes, pod changes | Timeline | Partially built (interactions exist, need email + system events) |
| Pipeline module — create pipelines, custom stages, Kanban | Pipelines | Ready to build |
| Pipeline cards linked to relationship records | Pipelines | Ready to build |

**Checkpoint:** Moj can see email history on any contact's timeline. She can create a fundraising pipeline with stages and move relationship cards across them. Gmail extension lets her capture contacts directly from her inbox.

**What I need from you/team by Apr 7:**
- [ ] OAuth authorization for Moj's Gmail account(s) — which accounts are in scope?
- [ ] List of initial pipelines to set up (fundraising? events? partnerships?)
- [ ] Pipeline stage names for each

---

### Week 3 (Apr 14 – Apr 18): AI Assistant + Campaigns + Calendar
**Theme:** The brain comes alive. Moj can talk to it.

| Deliverable | MVP Spec Section | Status |
|---|---|---|
| Telegram AI assistant — connected to Kinship Brain data | Copilot (MVP) | Mac Mini infrastructure ready |
| Assistant answers: "When did I last talk to X?", "Who needs follow-up?", "Brief me for tomorrow" | Copilot | Ready to build |
| Google Calendar sync — meetings on timeline + dashboard | Integrations | Need: Calendar OAuth |
| Campaign module — create campaigns, attach recipients, draft management | Email Campaigns | Ready to build |
| Nurturing/Maintenance hub — stale relationships, upcoming milestones, missing info | Maintenance Hub | Partially built (dormant cleanup exists, need full feed) |

**Checkpoint:** Moj opens Telegram, asks "who should I follow up with this week?" and gets a real answer from her data. Campaigns can be created and recipients managed. Calendar events show on the dashboard.

**What I need from you/team by Apr 14:**
- [ ] Google Calendar access (OAuth)
- [ ] Confirmation of which calendar(s) to sync
- [ ] First campaign to set up as a test (event, outreach, etc.)

---

### Week 4 (Apr 21 – Apr 25): Polish, Reporting, Handoff
**Theme:** Production-ready. Documented. Demo-able.

| Deliverable | MVP Spec Section | Status |
|---|---|---|
| Reporting — pod distribution, pipeline conversion, engagement activity | Reporting | Ready to build |
| Export — CSV export of any filtered list | Sharing + Exports | Ready to build |
| Share links — read-only shareable views for curated lists | Sharing + Exports | Ready to build |
| Multi-user basics — Briell + team get filtered views | Workspace | Ready to build |
| Documentation — full system docs, maintenance runbook, admin guide | Handoff | Partially done |
| Bug fixes, performance, edge cases | — | Ongoing |

**Checkpoint:** Moj can demo the full system — app + assistant + integrations. Team has access. Reports exportable. Everything documented for ongoing operation without developer dependency.

---

## What I Need From You (Complete Checklist)

### Access (Blocking — Nothing Can Ship Without These)
| Item | Who | Priority | Needed By |
|---|---|---|---|
| Google Sheets (LP lists, Talent, Service Providers) | Moj / Briell | Critical | Mar 31 |
| Gmail OAuth authorization | Moj | Critical | Apr 7 |
| Google Calendar OAuth | Moj | Critical | Apr 14 |
| ClickUp API token (Moj's personal account) | Moj | High | Apr 7 |
| Confirmation: which Gmail accounts are in scope | Moj | High | Apr 7 |

### Decisions (Need Sign-Off)
| Decision | Options | Needed By |
|---|---|---|
| Pod/sub-pod structure | Confirm or revise current categories | Mar 31 |
| Pipeline definitions | Names + stages for initial pipelines | Apr 7 |
| Campaign setup | First campaign to build as test | Apr 14 |
| Data migration: Airtable → Supabase | Confirm or redirect | Mar 31 |

### Team Coordination
| Item | Who | Needed By |
|---|---|---|
| Briell: any existing data in ClickUp that should migrate to Kinship Brain | Briell | Apr 7 |
| Briell: ClickUp structure audit (what stays in ClickUp vs. moves to app) | Briell | Apr 7 |

---

## Operating Cadence (Going Forward)

- **ClickUp:** Updated after every working session — task status, blockers, next steps, feature progress
- **Weekly update email:** Sent to Moj, Nicole, Mariana, Gaby, Briell every Friday — what shipped, what's next, what's blocked
- **Feature sign-off:** No feature goes live without Moj reviewing and approving
- **Architecture changes:** No changes to stack, tools, or direction without team alignment first
- **Time tracking:** Time Doctor active for all working hours

---

## Commitments

1. I understand the gaps and misalignment outlined in Moj's email of March 28.
2. I am taking full ownership across product definition, project management, and engineering execution.
3. I will deliver both projects (Kinship Brain app + Telegram AI assistant) within 4 weeks, contingent on access/inputs listed above being provided on schedule.
4. This document is my detailed roadmap and delivery plan.
5. The checklist above is what I need from the team — nothing is waiting on me that isn't listed there.
6. I will operate within ClickUp as the system of record, with updates after every session and weekly reports to the full team.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Gmail/Calendar OAuth delayed | Medium | High — blocks Week 2–3 | Requested explicitly with deadline. Will pull forward other work if delayed. |
| Data imports blocked by missing spreadsheets | Medium | High — blocks Week 1 | Can use existing Airtable data as bridge. Need sheets by Mar 31. |
| Scope expansion during build | High | Medium | All new requests go through ClickUp. No unaligned additions. |
| Lovable relationship needs repair | Medium | Low (for delivery) | Separate from this scope. Briell owns Lovable workstream. |
| 15 hrs/week insufficient for full scope | Low | Medium | Milestones are scoped to 15 hrs. Will flag early if timeline slips. |
