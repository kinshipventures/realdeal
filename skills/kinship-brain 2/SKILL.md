---
name: kinship-brain
description: This skill should be used when querying, updating, or reasoning about Moj Mahdara's relationship network in Kinship Brain (Airtable). Covers schema navigation, efficient API patterns, equity scoring, and communication voice. Trigger on any mention of contacts, pods, interactions, campaigns, birthdays, follow-ups, relationship health, or Airtable operations.
metadata: {"openclaw":{"requires":{"env":["AIRTABLE_TOKEN","AIRTABLE_BASE_ID"]},"primaryEnv":"AIRTABLE_TOKEN","emoji":"🧠"}}
---

# Kinship Brain — Network Intelligence

Operational guide for querying and managing Moj Mahdara's relationship network stored in Airtable. This is NOT a CRM — it is a relationship health tool. Every feature exists to help Moj invest in people, not extract from them.

## When to Load the Schema Reference

Before any Airtable operation, read `{baseDir}/references/airtable-schema.md` for:
- Table IDs (never use table names in API calls)
- Field names and types for each table
- Linked field behavior (always arrays, use index 0 for single links)
- filterByFormula patterns for efficient queries
- Social equity scoring rules and thresholds

## API Access: MCP vs REST

### Decision framework

**Use the Airtable MCP integration when available:**
- MCP handles auth, pagination, and error retry automatically
- Preferred for: listing records, searching, reading schemas
- Call sequence: `search_bases` → `list_tables_for_base` → `list_records_for_table`
- Always operate on Airtable internal IDs (appXXX, tblXXX, recXXX, fldXXX) — never substitute names for IDs

**Use direct REST API (curl) when:**
- MCP is unavailable or the MCP server is not configured
- Write operations need precise control (create, update, delete)
- Batch operations (up to 10 records per request)
- Complex filterByFormula that MCP doesn't expose cleanly

**REST pattern:**
```bash
curl -s "https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/{tableId}" \
  -H "Authorization: Bearer ${AIRTABLE_TOKEN}" \
  -H "Content-Type: application/json"
```

### Efficiency rules

1. **Always use filterByFormula server-side** when possible — do not fetch all records and filter locally unless the query is complex (e.g. birthday date math)
2. **Use `fields[]` parameter** to select only needed fields — contacts have 30+ fields, most queries need 3–5
3. **Use `maxRecords`** for "top N" queries (recent interactions, focus list)
4. **Use `sort[0][field]` + `sort[0][direction]`** server-side instead of sorting after fetch
5. **Paginate** — Airtable returns max 100 records. Check for `offset` in response and loop until absent
6. **Batch writes** — group up to 10 creates/updates per request instead of one at a time

## Core Operations

### Look up a contact

Efficient approach: filter by name server-side.
```
filterByFormula=SEARCH(LOWER("jane"), LOWER({Name}))
fields[]=Name&fields[]=Company&fields[]=Role&fields[]=Last Contacted&fields[]=Lists
```
To get full context on a found contact, fetch their record by ID and include all fields.

### Check relationship health

1. Fetch the contact's interactions from the last 90 days:
   ```
   Table: tblbxLX5EM09Y6xim
   filterByFormula=AND(FIND("recXXX,", ARRAYJOIN({Contact}, ",")), IS_AFTER({Date}, DATEADD(TODAY(), -90, 'days')))
   sort[0][field]=Date&sort[0][direction]=desc
   ```
2. Apply equity scoring from the schema reference (type weights × recency multipliers)
3. Report the score label: Thriving (85+), Steady (70+), Cooling (40+), Fading (<40)
4. If Fading or Cooling, suggest a specific action based on the last interaction type

### Find who needs attention (Today's Focus)

1. Fetch all contacts in priority pods (pods where `Is Priority` = true)
2. For each, compare `Last Contacted` against their cadence threshold
3. Sort by most overdue first
4. Return top 3 with: name, pod, days overdue, suggested action

### Log an interaction

1. Create an interaction record in `tblbxLX5EM09Y6xim`:
   ```json
   { "fields": { "Contact": ["recXXX"], "Type": "call", "Date": "2026-03-26", "Notes": "..." } }
   ```
2. If the type is NOT `note`, also update the contact's `Last Contacted` field:
   ```json
   PATCH {contactTableId}/{contactRecId} → { "fields": { "Last Contacted": "2026-03-26" } }
   ```
   This two-step write is critical — `Last Contacted` drives overdue detection and equity scoring.

### Birthday reminders

Fetch all contacts with birthdays, then compute upcoming:
```
filterByFormula={Birthday}!=""
fields[]=Name&fields[]=Birthday&fields[]=Lists
```
Parse month/day from each birthday. If this year's occurrence has passed, roll to next year. Return contacts within the next 14–30 days, sorted by soonest first.

### Campaign operations

Campaigns use a junction table. To get a campaign's contacts:
1. Fetch campaign from `tblnrhkuIQgRdnt9w`
2. Fetch CampaignContacts from `tbliW2w3R21yTqTQk` filtered by campaign ID
3. Each CampaignContact has a `Status`: pending → reached → responded → confirmed
4. To add a contact: create a CampaignContact record linking both IDs
5. To update status: PATCH the CampaignContact record

### Overdue contacts for a pod

```
# Step 1: Get pod record to find its cadence
GET tblnsxNUscKApvMsV/{podId}

# Step 2: Get contacts in that pod
filterByFormula=FIND("recPODID", ARRAYJOIN({Lists}, ","))
fields[]=Name&fields[]=Last Contacted&fields[]=Contact Frequency

# Step 3: For each contact, check if overdue
# Overdue = no Last Contacted OR last contact > cadence days ago
# Skip contacts created in the last 14 days (grace period)
```

## Communication Voice

Moj Mahdara is the founder of Kinship Ventures. The assistant communicates directly with her.

### Principles

- **Warm but direct.** No corporate jargon. No "I hope this helps." Speak like a trusted advisor, not a chatbot.
- **Relationship-first framing.** Never say "contacts to manage" — say "people to connect with." Never "outreach targets" — say "who to reach out to." This is about investing in humans.
- **Actionable over informational.** Don't dump data. Lead with what to do: "Text Sarah — you haven't connected in 45 days and her birthday is next week."
- **Social equity language.** Use the scoring vocabulary: Thriving, Steady, Cooling, Fading. Moj designed this mental model. It resonates.
- **Celebrate wins.** When she logs an interaction or a score improves, acknowledge it: "Nice — your VC pod is back to Steady."
- **Flag drift without guilt.** If someone is Fading, frame it as opportunity not failure: "Haven't connected with Marcus in 3 months — quick text could go a long way."
- **Concise by default.** Moj wants pre-aligned recommendations, not lengthy explanations. Lead with the answer. 2–3 sentences max per item. See Response Modes below.

### Response modes

**Quick mode (default):** Actionable nudges. 2–3 sentences per item. Use for daily check-ins, follow-up reminders, status updates, and interaction logging confirmations.

**Deep mode:** Full contact dossier. Triggered when Moj asks to "tell me about," "prepare me for," "brief me on," "what do I know about," or any request that implies she needs comprehensive context before a meeting or conversation. In deep mode, include:
- Who they are (name, company, role, how Moj knows them)
- Relationship context and shared history (from `Relationship Context`, `Intel / Notes`)
- Recent interactions (last 3–5, with dates and summaries)
- Equity score and trend (improving, stable, declining)
- Mutual connections if visible (who introduced them, shared pods)
- Interests, milestones, birthday proximity
- Suggested talking points based on recent interactions and shared context
- Any pending campaign involvement or next actions

Deep mode still leads with the most important thing — "Sarah's launching Fund III next month, that's your opener" — then layers in supporting context. Never lead with a data dump.

### What Moj cares about

- **Social equity** — relationships are investments. Small consistent deposits > grand gestures.
- **Dopamine triggers** — be the person others are excited to hear from. Help Moj be that person.
- **Feed what feeds you** — prioritize relationships that are mutual and generative.
- **Curate ruthlessly** — if nobody's investing, flag it for cleanup. Dormant contacts taking up attention is relationship debt.
- **Team visibility** — Briell and others need to understand who people are and why they matter. Context is everything.

### Response format examples

**Daily check-in:**
> 3 people to connect with today:
> 1. **Sarah Chen** (VC pod) — 42 days, Cooling. She mentioned a new fund launch last time. Quick congrats text.
> 2. **Marcus Rivera** (Talent) — 67 days, Fading. Birthday in 5 days. Perfect timing for a call.
> 3. **Aisha Okafor** (Friends) — serendipity pick. Haven't chatted since the dinner in Feb.

**After logging an interaction:**
> Logged your call with Sarah. VC pod equity: 73 → 78 (Steady). Next follow-up in ~2 weeks based on her cadence.

**Campaign status:**
> Gala Outreach: 12/18 reached, 8 responded, 4 confirmed. 6 still pending — want me to draft follow-ups for the ones who haven't responded?

## Data Model Mental Map

```
Pods (Lists)
  "VC Investors", "Talent Network", "Friends & Family", etc.
  Each has: color, owner, priority flag, cadence
    │
    └── Categories
        "Series A", "Angel Network", "LA Friends", etc.
        Each belongs to exactly one pod
          │
          └── Contacts
              People. Can be in multiple pods and categories.
              Have: relationship context, birthday, interests, milestones
              Track: last contacted, equity score, follow-up dates
                │
                └── Interactions
                    Every touchpoint: call, email, text, meeting, intro, note
                    Drive equity scoring and overdue detection

Campaigns (separate track)
  "Gala Outreach", "Fund III", "Summit Invites"
  Linked to contacts via CampaignContacts junction
  Per-contact status: pending → reached → responded → confirmed
```

## Error Handling

- If a record ID doesn't match the `rec[A-Za-z0-9]{14}` pattern, reject it before making the API call
- If Airtable returns 422, the field name or value is wrong — check the schema reference
- If Airtable returns 429, back off and retry after the Retry-After header value
- Never create duplicate interactions — check if an interaction with the same contact, type, and date already exists before creating
