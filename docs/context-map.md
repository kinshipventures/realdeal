# Kinship Brain — Context Map

> Synthesized from 9 Granola meeting transcripts (Feb 17 – Mar 23, 2026) and in-session brainstorming with Moj. This is the single source of truth for project scope, commitments, and stakeholder expectations.

---

## Project Timeline

| Date | Event | Key Decision |
|---|---|---|
| Feb 17 | Kickoff with Moj + Briell | 15hrs/week, 6-week scope. ClickUp cleanup first, then CRM build. V1 = Gmail + contact enrichment. |
| Feb 26 | Strategy reset with Moj | Dropped Lovable — too limited for integrations. Moved to OpenClaw/Claude Code. Self-hosted via Mac Mini. |
| Feb 27 | Scope clarification | Separated "Moj's Brain" (Telegram AI assistant) from "Kinship Brain" (the app). ClickUp as interim backend, Airtable for future. |
| Mar 5 | Finance meeting | Not app-related but reveals business pressure — need systematic processes. |
| Mar 11 | Briell catchup | Airtable confirmed as DB. Two-part system: CRM nurturing (Airtable + app) + deal pipeline (ClickUp board). Prototype ready to show Moj. |
| Mar 12 | Moj + Briell 1:1 | CRM timeline vision — drag emails/texts to contacts, history backfill, iMessage bot setup. Feature brain dump requested. |
| Mar 18 | In-person dev session | The big one. Social equity vision brainstormed with Moj. Inline category creation built live. Trolley CRM PDF as design reference. Gabby on board for Lovable case study (separate project). |
| Mar 23 | Moj + Brielle + Gabriela | Lovable case study fully decoupled from Kinship Brain. Gabriela flagged duplicate work isn't genuine for case study. Brielle pivots to separate Lovable project (NotebookLM-style content tool). Gabe continues Airtable+Claude Code build independently. |

**Current status:** Week 5 of 6. Dashboard, equity scoring, nav shell, search, birthdays shipped. Visual redesign (Trolley CRM alignment) complete. Data layer solid. Wrapped slides and campaigns remain.

---

## What's Built

- Orb map with pod → category → contact navigation
- Inline category creation (+ orb in circle)
- Contact management (CRUD, search, auto-save)
- Interaction timeline with type-based logging
- Social equity scoring (weighted, cadence-aware, 0-100 normalized)
- Dashboard home with equity ring, pod health cards, Today's Focus, dormant cleanup
- Floating pill navigation (Pulse / Map tabs)
- React Flow viewport persistence across tab switches
- Airtable as sole backend (direct browser REST, no server)
- 90-day scoped interactions cache with optimistic append
- Race condition fixes across 4 components

---

## What's Committed (Not Yet Built)

These were explicitly discussed and agreed to in meetings:

### Data Imports (High Priority)
- **LP lists** — multiple tabs in Google Sheet, different data structures per tab. Need per-list CSV mapping. Moj said "nail talent and investors" as the focus. (3/18)
- **Talent list** — separate dataset to import. (3/18)
- Each list has slightly different columns — automated cleanup during migration. (3/11)

### Gmail Integration (V1 Priority)
- Auto-ingest email context into contact timelines. (2/17, 3/12, 3/18)
- Multiple Gmail accounts — Moj has several. (3/18)
- Contact reconciliation across email addresses. (3/18)
- "This person hasn't responded to our last three emails, but are you texting with them?" — cross-channel visibility. (3/18)

### iMessage Integration
- Read-only on Mac Mini setup. (2/26, 3/12, 3/18)
- Bot reads iMessage history, surfaces context in contact cards. (3/12)
- Separate Apple ID account for the bot. (3/12)
- Mac Mini hosts 24/7 AI assistant gateway. (3/11)

### Calendar Sync
- Meeting/call tracking from Google Calendar. (3/18)
- Show upcoming meetings on dashboard. (3/18 brainstorm)

### Visual Direction
- Align with Trolley CRM PDF (`2026 Trolley CRM.pdf` in repo root). (3/18)
- "Make everything bolder" — Moj's direct feedback during dev session. (3/18)
- Spotify Wrapped energy — vibrant gradients, bold, expressive. (3/18 brainstorm)

### Multi-User / Team Access
- Briell, Gwyneth, and others need to see and use the tool. (3/18, 3/12)
- Users table in Airtable, filtered views per user. (3/18)
- Team needs to understand the network — who people are, why they matter. (3/18 brainstorm)

---

## What's Aspirational (Phase 2 / Future)

Mentioned but not committed to within the 6-week scope:

- **WhatsApp** as data source (2/27)
- **Gwyneth / Goop workspace** — separate workspace, same architecture. Microsoft ecosystem, not Gmail. Organizational-level overhaul. (2/26, 2/27)
- **Campaign management** — pipeline for investments, events, summits. Mass communication with tailored drafts. (3/18 summary)
- **AI auto-categorization** — detect new contacts, suggest pod assignment. Bloomberg editor example. (2/26)
- **Bumble-style swipe** for new contact triage. (3/18 summary)
- **History backfill** from existing software data. (3/12)
- **Push notifications** for daily nudges. (3/18 brainstorm)
- **Mobile app**. (3/18 brainstorm)
- **AI enrichment** — surface signals from social, email, messages. (3/18 brainstorm)

### Separate Projects (Not This Repo)
- **Lovable case study** — Fully decoupled from Kinship Brain as of 3/23. Brielle pivoting to a separate Lovable project (NotebookLM-style content tool or recruiting funnel). Not connected to this repo or Airtable data.
- **Telegram AI assistant ("Moj's Brain")** — separate from this app. Personal AI for relationship context via chat. (2/27)

---

## Stakeholder Map

### Moj Mahdara (CEO, Kinship Ventures)
- **Wants:** Social equity dashboard, visual pods, relationship health scoring, "send love" nudges
- **Philosophy:** Give more than you take. Trust transfers. Dopamine triggers. Curate ruthlessly.
- **Working style:** Wants pre-aligned recommendations, not live problem-solving. Impatient with process — wants to see results. "Can I just do this myself?" (3/18)
- **Design taste:** Bold, expressive. Spotify Wrapped energy. "Make everything bolder." Refers to Trolley CRM deck as visual reference.

### Briell (Operations / Team)
- **Wants:** Data entry efficiency, team visibility into Moj's network, pipeline tracking
- **Working style:** Manages Airtable data directly. Handles bulk imports and cleanup.
- **Concern:** Clear deliverable ownership, daily progress expectations. (2/26)

### Gwyneth (Goop, Deferred)
- **Wants:** Her own workspace, same tool
- **Context:** Microsoft ecosystem. Organizational-level, not personal. Separate scope entirely. (2/26, 2/27)
- **Status:** Signed up for Granola and Claude. Migrating from Trello to ClickUp. Deferred from current scope.

### Gabriela (Case Study / Media)
- **Role:** Owns case study narrative and media presentation. Gatekeeper for what goes public. (3/23)
- **Key stance:** Case studies must demonstrate genuine problem-solving, not just visual replication. Pushed back on Lovable integration that felt like "shoehorning." (3/23)
- **Note:** "Gabby" in earlier transcripts may refer to Gabriela or be a different person.

---

## Key Constraints

- **6-week engagement** — started Feb 17, ~week 4 now (Mar 20). Deadline pressure is real.
- **15 hours/week** — not full-time. Every hour counts.
- **No backend server** — Airtable REST from browser. No auth layer. No SSR.
- **Moj wants pre-aligned recs** — "don't problem-solve live in meetings, come with answers" (2/26)
- **ClickUp stays for deal pipeline** — LP board view, task management. Don't migrate that.
- **Iteration over perfection** — "I'm nervous about waiting 6 weeks and not having something" (3/18)

---

## Decisions Already Made

| Decision | Chosen | Rejected | Source |
|---|---|---|---|
| Database | Airtable | Supabase, ClickUp | 3/11 |
| Frontend framework | React + Vite + Claude Code | Lovable | 2/26 |
| AI assistant platform | Telegram (separate project) | In-app chat | 2/27 |
| Deal pipeline | ClickUp board view | Airtable | 3/11 |
| Hosting | Vercel (app) + Mac Mini (bot) | Self-hosted server | 2/26, 3/11 |
| Grouping terminology | Pods (UI) / Lists (Airtable) | Categories as top-level | 3/18 |
| Scoring model | Weighted by type, cadence-aware | Simple overdue count | 3/18 |
| Design direction | Spotify Wrapped energy | Muted glass (original) | 3/18 |
| Navigation | Floating pill (Pulse / Map) | Tab bar, hamburger | 3/18 |

---

## What to Build Next (Priority Order)

1. **Wrapped slides** — monthly/quarterly celebration views. Spotify Wrapped energy per Moj. (v1.1 Phase 5)
2. **Campaign tracking** — lightweight pipeline view for investments, events, SPVs. (v1.1 Phase 6)
3. **Gmail integration** — V1 priority across every meeting. Cross-channel contact timeline. (future milestone)
4. **Multi-user basics** — Briell needs to use the tool, not just Airtable. (future milestone)
5. **Import LP + Talent lists** — still blocked on data from Moj/Briell.
