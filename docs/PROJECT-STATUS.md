# Kinship Brain — Project Status & Context

**Last updated:** March 29, 2026
**Author:** Gabriel Murray
**Status:** Course correction in progress

---

## What This Project Is

Kinship Brain is a relationship intelligence platform for Moj Mahdara, CEO of Kinship Ventures / Trolley. It has two components:

1. **The App** (mojrm.vercel.app) — A visual relationship manager built in React + Vite, backed by Airtable. Pods, contacts, equity scoring, dashboards, campaigns.
2. **The AI Assistant** (Telegram) — A conversational interface on Moj's phone via OpenClaw on a dedicated Mac Mini. Queries her systems, surfaces priorities, generates briefs.

The contract is a 6-week engagement ($1,000/week + $1,000 completion bonus) as AI & Technical Specialist. Started March 5, 2026. Reports to Moj. Collaborates with Briell Huddleston (Operations).

---

## How We Got Here

### Pre-Contract (Feb 17–Mar 4)

- **Feb 17:** Kickoff meeting with Moj + Briell. Scope: 15 hrs/week, ClickUp cleanup first, then CRM build. V1 = Gmail integration + contact enrichment.
- **Feb 26:** Strategy reset. Lovable deemed too limited for real integrations (no backend, no API control). Shifted to OpenClaw + Claude Code on a self-hosted Mac Mini. Moj agreed.
- **Feb 27:** Scope clarified into two products: "Moj's Brain" (Telegram AI assistant) and "Kinship Brain" (the web app). ClickUp stays for deal pipeline, Airtable for CRM data.

### Contract Period (Mar 5–present)

**Week 1 (Mar 5–11):** Contract signed via Adobe Sign (Nicole Camacho). Finance meeting with Moj. Mac Mini provisioned — macOS, Tailscale, OpenClaw, iMessage bridge. Project scaffolded in React + Vite. Dashboard home view, contact CRUD, CSV import built. Briell 1:1 confirmed Airtable as database.

**Week 2 (Mar 12–18):** Moj + Briell meeting defined CRM timeline vision (drag emails/texts to contacts, history backfill). In-person dev session at Fairfax office on Mar 18 — the pivotal session. Moj brainstormed social equity scoring live, directed visual design ("make everything bolder," Spotify Wrapped energy, Trolley CRM PDF as reference). Built equity scoring module, interactions cache, inline category creation, floating pill nav, race condition fixes all during/after this session.

**Week 3 (Mar 19–25):** Heavy build week (23+ hours). Visual redesign aligned to Trolley CRM. Full design system (7 implementation plans). Search palette, birthday tracking, Wrapped insight cards. Campaign module with full CRUD and UAT. Two milestones completed (v1.0 + v1.1). Meeting with Moj + Briell + Gabriela decoupled Lovable case study from Kinship Brain.

**Week 4 (Mar 26–28):** v1.2 "Demo Ready" milestone. Schema expansion, data import, dashboard enrichment, contact card restructure, add contact modal, category table view. Lovable compatibility conversion (separate branch). Two Lovable calls (case study review + tech call with Zuzana). In-person meeting with Moj at Fairfax — critical realignment.

---

## The Escalation (Mar 26–28)

### What Happened

On **March 26 at 10:30am**, Moj sent a group email to Briell, Nicole, Mariana, and Gaby expressing frustration. Key quotes:

> "I do not feel any dramatic impact in my work"
> "Everything feels incredibly vague"
> "Toast has not been able to accomplish a single task for me. I have no idea what to do with it; it just feels like ChatGPT on my phone."

Gabe responded at 1:00pm with a status update (done, incomplete, blockers, what's needed). Moj pushed back: "This doesn't satisfy an update for me. I really don't understand what we're doing right now."

Gabe went to Fairfax for an in-person meeting. Realignment:
- Priority #1: Ship Service Providers category end-to-end
- Priority #2: LP Tracker
- ClickUp → Notion migration = Phase 2
- Briell's lane: Lovable + ClickUp only. Gabe works directly with Moj.

### The March 28 Email

On **March 28 at 4:31pm**, Moj sent a comprehensive email (2000+ words) to the full team. This is the defining document of the current situation. Key points:

**Her grievances:**
1. The Lovable → OpenClaw pivot was presented as a technical requirement but came across as a preference on the Lovable call, undermining credibility with a portfolio company/partner.
2. Three weeks in, no usable product. Toast "does nothing for me."
3. No product roadmap, feature set, or delivery plan exists.
4. No formal checklist of what's needed from her team — "nothing is waiting on me."
5. Scope expanded without clear communication about tradeoffs.

**Her demands (in writing):**
1. Acknowledge gaps and misalignment
2. Confirm full ownership (product, PM, engineering)
3. Commit to delivery within 3–4 weeks
4. Detailed roadmap + delivery plan
5. Clear list of what's needed from team
6. ClickUp as source of truth with post-meeting updates

**What she attached:** "Kinship Brain — MVP" PDF — a detailed product spec covering relationship records, pods, pipelines, campaigns, Gmail integration, copilot, dashboard, reporting. This is now the canonical spec.

**The carrot:** "You mentioned stepping into a more involved role longer-term. That opportunity is still there." Full-time Relationship Activator role described in the email — 40 hrs/week, competitive base + variable comp tied to outcomes.

---

## What's Actually Built

### App (mojrm.vercel.app)
- ✅ Relationship records — full CRUD, Cmd+K search, auto-save
- ✅ Pods with sub-categories (orb map + list views)
- ✅ Social equity scoring — weighted by type, cadence-aware, 0–100
- ✅ Dashboard — equity ring, pod health, Today's Focus, dormant cleanup
- ✅ Interaction timeline — type-based logging
- ✅ Birthday tracking + Coming Up
- ✅ Campaign module — create, manage recipients, track status
- ✅ Wrapped insight cards
- ✅ Category table view with sort, filter, equity scores
- ✅ Add contact modal (structured + brain dump modes)
- ✅ Design system (Trolley CRM aligned)
- ✅ Responsive layout (mobile + desktop)
- ✅ Airtable backend with caching + optimistic updates
- ✅ Supabase schema written (migration ready)

### AI Assistant (Mac Mini)
- ✅ Mac Mini provisioned, secured, Tailscale remote access
- ✅ OpenClaw running, Telegram bot active
- ✅ Voice profile built from Moj's feedback
- ✅ Airtable skill created (can query contacts, log interactions)
- ❌ Not customized to Moj's actual workflow
- ❌ No Gmail, Calendar, or ClickUp integration
- ❌ No daily digest

### Not Built
- ❌ Gmail integration (blocked: need OAuth)
- ❌ Google Calendar sync (blocked: need OAuth)
- ❌ ClickUp integration (blocked: need API token from Moj's account)
- ❌ Real data import (blocked: need Google Sheets from team)
- ❌ Pipeline module (Kanban view)
- ❌ Reporting + exports
- ❌ Multi-user access
- ❌ Share links

---

## Access Blockers (Not On Gabe)

These have been requested multiple times (Mar 26 email, in-person meetings) and not provided:

| Item | Requested | Status |
|---|---|---|
| Gmail OAuth for Moj's account(s) | Mar 26 | Not provided |
| Google Calendar OAuth | Mar 26 | Not provided |
| ClickUp API token (Moj's personal) | Mar 26 | Not provided |
| Google Sheets (LP lists, Talent, Service Providers) | Mar 11 | Partial (some discussed, not shared) |
| X/Twitter account access | Mar 26 | Not provided |
| Confirmation of which Gmail accounts are in scope | Mar 26 | Not provided |

---

## What's Happening Now

### Response Plan
A detailed roadmap and delivery plan has been created (`ROADMAP-AND-DELIVERY-PLAN.md`) addressing all 6 of Moj's demands:

- 4-week milestone plan (Mar 31 – Apr 25)
- Weekly deliverables mapped to her MVP PDF spec
- Clear checklist of what's needed from team with deadlines
- Operating cadence: ClickUp updates after every session, weekly status emails
- Written commitments on ownership, delivery, and process

### Open Decisions
- **Airtable → Supabase migration:** Supabase schema is written and ready. Needed for Lovable compatibility and scaling. Needs Moj's sign-off.
- **Lovable relationship:** Damaged by the pivot. Briell owns this workstream. Separate from Kinship Brain.
- **ClickUp vs Notion:** Moj hinted ClickUp should go. But her email demands ClickUp as source of truth. Contradiction to resolve.

### Risks
1. **Trust deficit.** Moj used the word "misled." Rebuilding trust requires visible, undeniable output over the next 2–3 weeks.
2. **Access dependencies.** Half the remaining deliverables require OAuth/tokens from Moj's team. If those don't come, timeline slips — and it won't be on Gabe.
3. **Scope vs. hours.** 15 hrs/week for the full MVP spec is tight. The roadmap is ambitious but achievable if blockers clear on time.
4. **Paper trail.** Moj cc'd Finance (Nicole) and Ops (Mariana) on an email that uses words like "misled" and "impacted trust." This could be positioning for contract dispute. All work should be documented and visible in ClickUp going forward.

---

## Key People

| Person | Role | Context |
|---|---|---|
| **Moj Mahdara** | CEO, Kinship Ventures | Client. Wants operational AI layer + relationship tool. Frustrated with pace. Direct communicator. |
| **Briell Huddleston** | Operations / Systems Strategist | Manages Airtable data, ClickUp. Owns Lovable case study. Not PM'ing Gabe. |
| **Nicole Camacho** | Financial Controller | Handles contract, payments, SOW. cc'd on escalation email. |
| **Mariana Dominguez** | Operations | cc'd on escalation. Involved in process/accountability tracking. |
| **Gabriela Trujillo** | Media / Case Study | Owns Lovable case study narrative. Pushed back on "shoehorning." |
| **Zuzana** | Lovable (external) | Lovable contact for tech integration. Call on Mar 27. |
| **Gwyneth** | Goop (deferred) | Wants her own workspace. Microsoft ecosystem. Separate scope entirely. |

---

## Key Files

| File | Location | Purpose |
|---|---|---|
| Roadmap & Delivery Plan | `docs/ROADMAP-AND-DELIVERY-PLAN.md` | The response to Moj's email — milestones, deliverables, asks |
| Context Map | `docs/context-map.md` | Synthesized from 9 Granola transcripts — full project history |
| MVP Spec (Moj's) | `~/Downloads/Kinship Brain — MVP.pdf` | The canonical product spec Moj attached to her email |
| Design System | `DESIGN.md` | Typography, colors, component specs |
| Architecture | `.planning/research/ARCHITECTURE.md` | System architecture, component map |
| Engagement Memo | `docs/engagement-memo.md` | Week 5 status summary (pre-escalation) |
| SOW | `SOW - AI & Technical Specialist - Gabe.docx` | Original scope of work |
| Trolley CRM Reference | `2026 Trolley CRM.pdf` | Visual design reference from Moj |
| Supabase Schema | `supabase/schema.sql` | Ready for migration |
| Airtable Skill | `skills/kinship-brain/SKILL.md` | AI assistant's guide to querying Airtable |

---

## Contract Terms

- **Rate:** $1,000/week × 6 weeks
- **Completion bonus:** $1,000
- **Hours:** ~15 hrs/week (90 total)
- **Duration:** Mar 5 – Apr 16 (original), extended by the 3–4 week proposal to ~Apr 25
- **Signed:** Mar 5 via Adobe Sign
- **Payment status:** No indication of withholding, but Moj cc'd Finance on escalation email
