# Feature Research

**Domain:** Personal relationship management / network intelligence
**Researched:** 2026-03-20
**Confidence:** MEDIUM-HIGH (verified against Dex, folk, Monica, Covve, Clay; milestone-specific features extrapolated from patterns)

## Context

This research covers four specific feature areas being added to an existing app that already has: orb map navigation, social equity scoring, dashboard, interaction timeline, and dormant contact cleanup.

The four areas under research:
1. CSV import with varying column formats
2. Visual redesign aligned to a design reference (Trolley CRM PDF)
3. Gmail integration for email context in contact timelines
4. Enriched contact profiles (milestones, interests, birthday, relationship context)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features in this category are present in every serious personal CRM. Their absence signals an incomplete product.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| CSV import with column mapping UI | Every data handoff starts as a spreadsheet; no-code import is table stakes for a tool Briell operates | MEDIUM | Need header detection + field mapping; Airtable's own import does this — a script-based approach is acceptable for the current scope given Gabe runs imports manually |
| Deduplication on import | Reimporting a revised CSV without creating duplicate contacts is assumed baseline | MEDIUM | Key off email or name+company; Airtable doesn't deduplicate natively — must be handled in import script |
| Birthday / key date tracking | Monica, Dex, Covve all treat birthday reminders as core — it's the minimum form of relationship memory | LOW | Single date field on Contact; reminder logic is separate complexity |
| Notes / freeform context on contact | All tools support a freeform notes field as a relationship memory dump | LOW | Already have Notes field in Airtable; this is about surfacing it better in the profile UI |
| Contact profile custom fields | Dex, folk, and Monica all let users store arbitrary structured data (interests, shared context, how they met) | LOW | Airtable custom fields are trivially addable; the UI to display them is the work |
| Email thread visibility on contact | Dex and Covve both surface recent email exchanges in the contact view — users expect to see communication history without leaving the app | HIGH | Requires Gmail OAuth + Gmail API; blocked on credential access |
| Visual consistency / polish | A product shown to Gwyneth Paltrow that looks unpolished signals low quality before the idea lands | MEDIUM | Design reference (Trolley CRM PDF) exists; this is UI execution, not feature work |

### Differentiators (Competitive Advantage)

These features go beyond what competitors offer and align with Kinship Brain's core value of relationship investment and social equity.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-contact equity score with breakdown | No competitor shows you a relationship health score per contact — Dex shows recency, Covve shows news signals, but neither synthesizes an equity view | MEDIUM | Score math already exists; this is a profile-level display of what the dashboard already computes |
| Relationship context fields (how we met, shared interests, what I want to give) | Generic CRMs treat relationships transactionally. Kinship Brain can encode Moj's giving-first philosophy directly in the data model | LOW | A handful of structured fields in Airtable; meaning comes from how they're labeled and surfaced |
| Milestone tracking tied to interaction prompts | Monica has birthdays; Dex has calendar reminders. Neither links milestones to "this is a good time to reach out" prompts | MEDIUM | Store milestone date + type on contact; Today's Focus algo can surface milestone-triggered nudges |
| Email context as signal, not noise | Clay and Covve do enrichment from external sources. Gmail integration that reads *actual thread history* to surface last-discussed topics is a qualitatively different signal | HIGH | Requires Gmail API read scope; value comes from summarizing thread context, not just logging email count |
| Import pipeline handles Briell's non-standard CSVs | Competitors assume clean Salesforce-exported CSVs. A pipeline that accepts "whatever Briell prepares" — flexible header matching, typo tolerance — is specific to this workflow | MEDIUM | Column alias mapping in the import script; handle common header variations (e.g. "First Name" vs "firstname" vs "Name") |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automatic contact enrichment from external APIs (Clearbit, PDL) | Clay/folk do it; seems like free data | For Moj's network (VCs, executives, artists), enrichment APIs return stale/wrong data or nothing at all — high-signal people are often low-coverage in enrichment databases. Creates false confidence. | Curated manual context fields that Moj/Briell fill in intentionally — signals matter more than quantity |
| Mass email / bulk outreach | CRMs like Covve are adding this | Antithetical to Moj's philosophy of authentic 1:1 relationship investment. Bulk outreach is relationship debt at scale. | One-at-a-time interaction logging and Today's Focus queue |
| Real-time Gmail sync / two-way write | Seems like the natural extension of read-only Gmail integration | Writing back to Gmail from the app introduces auth complexity, conflict risk, and scope creep. Full bidirectional sync is a multi-week project that competes with the 2-week runway. | Read-only: pull email thread metadata and surface in contact timeline |
| In-app CSV prep / cleaning UI | Uploading a CSV and mapping columns in the browser sounds elegant | Adds UI complexity for a workflow that Gabe controls end-to-end. Script-based is faster to ship and easier to debug. Avoid building what isn't needed. | Import script with documented column aliases; Briell follows a template |
| News monitoring (job changes, company news) | Covve's signature feature; Dex is adding it | Adds ongoing API costs and noise for a personal network where Moj already knows her contacts well. Signal-to-noise is low for intimate networks. | Milestone fields (new role, life event) that Moj/Briell add intentionally when they learn something |
| AI auto-categorization of imported contacts | Seems like it would save time during imports | Categorization carries Moj's meaning — which pod someone belongs in is a judgment call, not a pattern match. Miscategorization damages trust faster than it saves time. | Manual review post-import with uncategorized contacts surfaced in the UI |

---

## Feature Dependencies

```
Gmail Integration (email context)
    └──requires──> Gmail OAuth credentials (blocked on Moj)
    └──requires──> Gmail API read scope + token handling
    └──enhances──> Contact Profile (surfaces thread history)
    └──enhances──> Interaction Timeline (email events alongside manual logs)

Enriched Contact Profiles
    └──requires──> Airtable schema additions (milestone, interests, birthday fields)
    └──enhances──> Today's Focus (milestone-triggered nudges)
    └──enhances──> Per-contact equity score display

CSV Import Pipeline
    └──requires──> Column alias mapping in import script
    └──requires──> Deduplication logic keyed on email/name
    └──enables──> LP list import
    └──enables──> Talent list import

Visual Redesign
    └──requires──> Trolley CRM PDF extracted as design tokens
    └──independent──> all other features (cosmetic, not functional)

Per-contact Equity Score Display
    └──requires──> Equity scoring logic (already exists)
    └──requires──> Contact Profile UI (the surface to display it)
```

### Dependency Notes

- **Gmail Integration requires credentials:** Everything else can ship without it. Do not block other work on this.
- **Enriched profiles require schema first:** Add Airtable fields before building UI or Today's Focus can reference them.
- **CSV import is independent:** Purely in the import script layer; does not touch the app UI.
- **Visual redesign is independent of data features:** Can be parallelized or sequenced separately.

---

## MVP Definition (for this milestone)

### Launch With (current scope — 2 weeks)

- [ ] CSV import handles LP and Talent list column variations — core deliverable, Briell is waiting
- [ ] Contact profile displays: birthday, milestones, interests, how-we-met, relationship context fields
- [ ] Per-contact equity score visible on profile with score breakdown
- [ ] Visual redesign aligned to Trolley CRM design direction — dashboard must look Gwyneth-ready

### Add After Validation (v1.x — post-engagement)

- [ ] Gmail integration (email context in timeline) — blocked on credentials; architecture is ready
- [ ] Milestone-triggered Today's Focus nudges — depends on milestone fields being populated
- [ ] Toast ↔ Airtable bridge — Telegram bot writes interaction data to same base

### Future Consideration (v2+)

- [ ] Calendar sync for meeting auto-logging
- [ ] WhatsApp integration
- [ ] Mobile app
- [ ] AI summarization of email threads (requires Gmail integration + LLM call)
- [ ] Bumble-style contact triage swipe UI

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| CSV import (flexible column handling) | HIGH | MEDIUM | P1 |
| Enriched contact profiles (fields) | HIGH | LOW | P1 |
| Per-contact equity score on profile | HIGH | LOW | P1 |
| Visual redesign (Trolley direction) | HIGH | MEDIUM | P1 |
| Gmail integration (email timeline) | HIGH | HIGH | P2 (blocked) |
| Milestone → Today's Focus nudges | MEDIUM | MEDIUM | P2 |
| Toast ↔ Airtable bridge | MEDIUM | HIGH | P2 |
| Deduplication in import | MEDIUM | MEDIUM | P1 (part of import) |
| News/job change monitoring | LOW | HIGH | P3 (anti-feature) |
| Auto-enrichment from external APIs | LOW | MEDIUM | P3 (anti-feature) |

---

## Competitor Feature Analysis

| Feature | Dex | Monica | Covve | Clay | Kinship Brain approach |
|---------|-----|--------|-------|------|------------------------|
| Email integration | Gmail + Calendar, native | None | Gmail (send/receive) | Not personal CRM | Read-only Gmail API; surface thread context in timeline |
| Contact enrichment | Manual + import | Manual only | AI enriches from external sources + news | 150+ data providers, waterfall | Manual structured fields (milestones, interests, context) — quality over coverage |
| Birthday / milestones | Birthdays + reminders | Birthdays + custom reminders | Reminders | Not applicable | Birthday + milestone fields; hook into Today's Focus algo |
| CSV import | Yes, multi-source | Yes, basic | Yes | Yes, complex transforms | Script-based with flexible column alias matching |
| Custom fields | Limited | Limited | Limited | Extensive (Magic Fields) | Airtable custom fields surfaced in profile UI |
| Relationship scoring | Recency-based reminders | None | News signal strength | Engagement signals | Social equity score (giving-weighted, cadence-aware) — differentiator |
| Design quality | Good, clean | Functional | Mobile-first | Spreadsheet-heavy | Target: Trolley CRM aesthetic — the most distinctive of this set |

---

## Sources

- [Dex Product Overview](https://getdex.com/product/) — Gmail/Calendar integration, contact profiles, Keep in Touch system
- [Dex vs Clay comparison](https://getdex.com/blog/dex-vs-clay/) — personal CRM feature positioning
- [Monica features](https://www.monicahq.com/features) — birthday reminders, milestone tracking, no external enrichment
- [Covve personal CRM](https://covve.com/personal-crm) — news engine, AI enrichment, Gmail integration
- [Folk CRM review 2026](https://work-management.org/crm/folk-crm-review/) — Smart Fields, Magic Fields, waterfall enrichment
- [Clay enrichment overview](https://www.clay.com/use-cases/crm-enrichment) — 150+ providers, waterfall, Claygent AI
- [Best Personal CRM 2026 — CRM.org](https://crm.org/crmland/personal-crm) — comparative feature overview
- [Flatfile CSV import errors](https://flatfile.com/blog/top-6-csv-import-errors-and-how-to-fix-them/) — import pipeline patterns
- [Gmail API integration guide — Unipile](https://www.unipile.com/gmail-api-integration-made-easy-a-comprehensive-guide/) — messages().list() + messages().get() pattern

---

*Feature research for: Kinship Brain — relationship intelligence OS*
*Researched: 2026-03-20*
