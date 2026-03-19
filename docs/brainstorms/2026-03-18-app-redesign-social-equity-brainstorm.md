# App Redesign: Social Equity Relationship Manager

**Date:** 2026-03-18
**Participants:** Moj Mahdara (product owner), Gabe Murray (dev)
**Status:** Brainstorm complete

---

## Core Philosophy

The most important thing in life is social equity — your relationships, how you manage them, and how you take care of them. This app exists to **feed what feeds you**.

### Guiding Principles

1. **Give more than you take.** The app is about contributing to relationships, not extracting from them. Build equity so when you need something, you've already invested.
2. **Trust is built on small micro habits, not grand gestures.** Consistent check-ins, a quick congrats, reposting someone's content — these compound over time.
3. **Trigger dopamine.** The best relationships happen when people associate you with positivity, good news, shared passions, and excitement. The app should help you be that person.
4. **Curate ruthlessly.** A smaller, healthier network beats a large neglected one. If someone hasn't been contacted in 3+ months and neither side is investing, they should be removed.
5. **Relationship debt is real.** Like Oura's sleep debt — if you're not investing, you're withdrawing. The app should make that visible.

---

## What We're Building

### Two-View Architecture

**Dashboard (home screen)** — Social equity command center. Shows:
- Overall social equity score (ring/meter visualization)
- Per-pod health breakdown
- "Today's Focus" — curated 3-5 people who need love, with reasons why
- Full browsable list of everyone who's overdue
- Pod stats: how many pods, how many people, recently contacted, upcoming (via calendar sync)
- Active prompt for 3-month dormant contacts: keep, reach out now, or remove

**Orb Map (tab)** — Visual network exploration. Same flow as current:
- Hub → Pods → Categories → People panel
- But with new visual direction (see Design below)

Toggle/tab navigation between Dashboard and Map views.

### Pods (replaces "Lists")

- Pods are the primary grouping (e.g., Investors, Creatives, Family)
- Categories remain as sub-groups within pods
- Each pod has a configurable check-in cadence (weekly / biweekly / monthly / quarterly)
- Pods can be marked as "priority" — priority pods surface on the dashboard

### Social Equity Score

**Overall score** on dashboard, **per-person scores** when drilling into a pod. Progressive disclosure.

**Interaction weights** (highest to lowest):
1. **Intro** — connecting two people is the highest form of giving
2. **Meeting** — face-to-face time
3. **Call** — real-time voice connection
4. **Text / Email** — digital check-in
5. **Note** — internal only, doesn't count toward equity

**What builds equity:**
- Consistent check-ins at the pod's cadence
- Congratulating milestones (new job, baby, launch, birthday)
- Offering help or resources proactively
- Making intros

**What creates debt:**
- Missing the pod's check-in cadence
- Having no interaction for 3+ months (triggers active cleanup prompt)

**New contact grace period:** Newly added contacts get a grace window before showing as overdue — adding people shouldn't feel punishing.

### Contact Profiles (enriched)

Beyond basic info (name, company, email), contacts should show:
- **Life events & milestones** — birthdays, new jobs, babies, launches. Creates "send love" moments.
- **Relationship context** — how you know them, who introduced you, shared connections, what you've done for each other
- **Interests & passions** — what they care about, so you can connect on things that matter to them
- **Interaction timeline** — existing feature, stays

### Data Input Layers

1. **Briell / team** — heavy lifting in Airtable (bulk data entry, cleanup)
2. **Moj / in-app** — quick notes, milestones, logging interactions
3. **AI enrichment (future)** — surface signals from social media, email, messages, news to auto-suggest milestones and interests

### Reminders & Nudges

- **Always visible** — dashboard shows overdue people persistently
- **Curated daily nudge** — "Today's Focus" picks 3-5 people with context on why
- **3-month cleanup prompt** — active decision: keep, reach out now, or remove

### Team Access

- Moj is the primary network holder
- Team members (Briell, others) can view AND contribute — log interactions, add notes, update contact info
- Team needs to understand the network: who people are, why they matter, the context behind each relationship
- Team vs. Moj view differences: figure out later. Core experience first.

---

## Design Direction

### Visual Identity: Spotify Wrapped Energy

Moving away from soft glass-orb aesthetic toward:
- **Vibrant gradients** — alive, colorful, expressive
- **Playful data visualization** — your relationships as a story, not a spreadsheet
- **Bold personality** — this is about human connection, not finance
- **More color, more expression** — the app should feel emotional, not clinical

The orbs stay as a concept but should adopt this bolder, more expressive visual language.

### Platform

- **Desktop first** — primary experience
- **Mobile later** — design with mobile in mind but ship desktop first

---

## Key Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Primary view | Dashboard (tab toggle with Map) | Social equity health is the daily driver |
| Grouping terminology | "Pods" replace "Lists" | More human, less spreadsheet |
| Score model | Weighted by interaction type | Intros and face-time matter more than texts |
| Check-in cadence | Per-pod (weekly/monthly/quarterly) | Different relationships have different rhythms |
| Priority system | Pod-level priority | Pod marks importance, not individual stars |
| Reminders | Always visible + curated daily focus | Persistent awareness + actionable daily nudge |
| Network curation | Active 3-month cleanup prompt | Force the decision: keep, reach out, or remove |
| New contacts | Grace period before showing overdue | Adding people shouldn't feel punishing |
| Data input | Team + Moj + future AI | Three layers of enrichment |
| Design direction | Spotify Wrapped energy | Bold, vibrant, expressive, personal |
| Visual nav | Orbs stay, same flow | Hub → Pods → Categories → People panel |
| Platform | Desktop first, mobile later | Design for mobile but ship desktop |
| Team access | View + contribute | Team can log interactions and add notes |

---

## Open Questions

- **Calendar sync implementation** — Google Calendar integration for "upcoming" section. How to match calendar events to contacts? Future phase.
- **AI enrichment specifics** — What signals to pull from social/email/messages? What APIs? Future phase.
- **Team permissions detail** — Should team see social equity scores or just context? Deferred.
- **Grace period duration** — How long before a new contact shows as overdue? 7 days? 2 weeks?
- **Social equity score formula** — Exact weights for each interaction type. Needs definition.
- **"Removed" contacts** — Where do they go? Archive? Permanent delete? Can they be restored?
- **App name / terminology** — Still "Moj Relationship Manager"? Does "social equity" appear in the UI or is it internal language?

---

## Success Criteria

1. **Moj uses it daily** — it becomes a morning habit, like checking email
2. **Team gets it** — Briell can look at it and immediately understand the network and what needs attention
3. **Behavior changes** — Moj checks in with people more consistently. Relationships actually get healthier because of this tool.
