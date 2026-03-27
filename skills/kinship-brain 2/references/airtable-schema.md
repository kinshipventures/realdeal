# Kinship Brain — Airtable Schema Reference

Base ID: stored in env var `AIRTABLE_BASE_ID` (format: `appXXX`)
Auth: Personal access token in env var `AIRTABLE_TOKEN` (format: `patXXX`)
API base: `https://api.airtable.com/v0/{baseId}/{tableIdOrName}`

---

## Table IDs

| Table | ID | Purpose |
|---|---|---|
| Lists (Pods) | `tblnsxNUscKApvMsV` | Top-level groupings of contacts (VC, Talent, Friends, etc.) |
| Categories | `tblVAgv23LUXs7Q0p` | Subdivisions within a pod |
| Contacts | `tbll75mRMMVBGiNpj` | People in Moj's network |
| Interactions | `tblbxLX5EM09Y6xim` | Logged touchpoints with contacts |
| Campaigns | `tblnrhkuIQgRdnt9w` | Grouped outreach efforts (events, investments) |
| CampaignContacts | `tbliW2w3R21yTqTQk` | Junction table linking campaigns ↔ contacts |

Always use table IDs, not names. Names can change; IDs are stable.

---

## Lists (Pods)

The app calls these "pods" in the UI. Airtable table is named "Lists."

| Field | Airtable Name | Type | Notes |
|---|---|---|---|
| Name | `Name` | Single line text | Required |
| Color | `Color` | Single line text | Hex string, e.g. `#718096` |
| Owner | `Owner` | Single select | Values: `moj_mahdara`, `kinship_ventures` |
| Is Priority | `Is Priority` | Checkbox | Priority pods drive equity scoring and Today's Focus |
| Cadence | `Cadence` | Single select | Values: `weekly`, `biweekly`, `monthly`, `quarterly` |
| Categories | `Categories` | Linked records → Categories | Auto-populated |
| Contacts | `Contacts` | Linked records → Contacts | Auto-populated |

**Key behavior:** Priority pods (`Is Priority` = true) are weighted in equity scoring and Today's Focus. Cadence determines how often contacts should be reached — defaults to `monthly` if null.

---

## Categories

Subdivisions within a pod. A category belongs to exactly one pod.

| Field | Airtable Name | Type | Notes |
|---|---|---|---|
| Name | `Name` | Single line text | Required |
| List | `List` | Linked record → Lists | Single link (Airtable returns as array, use index 0) |
| Color | `Color` | Single line text | Hex string |
| Contacts | `Contacts` | Linked records → Contacts | Auto-populated |

---

## Contacts

The core entity. Every person in Moj's network.

### Core fields

| Field | Airtable Name | Type | Notes |
|---|---|---|---|
| Name | `Name` | Single line text | Required. Full name. |
| First Name | `First Name` | Single line text | |
| Last Name | `Last Name` | Single line text | |
| Email | `Email` | Email | |
| Phone | `Phone` | Phone | |
| Company | `Company` | Single line text | |
| Role | `Role` | Single line text | |
| Location | `Location` | Single line text | |
| Website | `Website` | URL | |
| LinkedIn | `LinkedIn` | URL | |
| Country | `Country` | Single line text | |
| Global Region | `Global Region` | Single select | Values: `AMER`, `APAC`, `ME`, `LATAM`, `EU` |
| Gender | `Gender` | Single select | Values: `Male`, `Female`, `Non-binary`, `Other` |

### Relationship fields

| Field | Airtable Name | Type | Notes |
|---|---|---|---|
| Notes | `Notes` | Long text | General notes |
| Intel / Notes | `Intel / Notes` | Long text | Strategic intel |
| Recommended By | `Recommended By` | Single line text | Who introduced them |
| Introduced By | `Introduced By` | Single line text | V1 expanded field |
| Specialization | `Specialization` | Single line text | |
| Past Clients | `Past Clients` | Single line text | |
| Birthday | `Birthday` | Date | YYYY-MM-DD format |
| Milestones | `Milestones` | Long text | Life events, achievements |
| Interests | `Interests` | Long text | Hobbies, passions |
| Relationship Context | `Relationship Context` | Long text | How Moj knows them, shared history |
| Relationship Owner | `Relationship Owner` | Single line text | Who on the team manages this relationship |

### Engagement fields

| Field | Airtable Name | Type | Notes |
|---|---|---|---|
| Last Contacted | `Last Contacted` | Date | Auto-updated when interactions are logged (except notes) |
| Contact Frequency | `Contact Frequency` | Single select | Values: `Weekly`, `Monthly`, `Quarterly`, `Annual`, `As Needed` |
| Next Follow-Up Date | `Next Follow-Up Date` | Date | |
| Next Action | `Next Action` | Single line text | |
| Needs Review | `Needs Review` | Checkbox | Flagged for data cleanup |

### Link fields

| Field | Airtable Name | Type | Notes |
|---|---|---|---|
| Lists | `Lists` | Linked records → Lists | Pod membership (can be in multiple pods) |
| Categories | `Categories` | Linked records → Categories | Category membership |
| Interactions | `Interactions` | Linked records → Interactions | Auto-populated |
| KV Fund Investor | `KV Fund Investor` | Linked records | Investment relationship |
| SPV Investor | `SPV Investor` | Linked records | SPV participation |

---

## Interactions

Every logged touchpoint with a contact.

| Field | Airtable Name | Type | Notes |
|---|---|---|---|
| Contact | `Contact` | Linked record → Contacts | Required. Single link (array with 1 element). |
| Type | `Type` | Single select | Values: `call`, `email`, `text`, `meeting`, `intro`, `note` |
| Date | `Date` | Date | When the interaction happened |
| Notes | `Notes` | Long text | Details about the interaction |
| Summary | `Summary` | Long text | AI-generated or manual summary |
| Source | `Source` | Single select | Values: `Gmail`, `Granola`, `Manual` |
| Email Link | `Email Link` | URL | Link to original email |
| Granola Link | `Granola Link` | URL | Link to Granola meeting notes |

**Key behavior:**
- Interaction type `note` does NOT update `Last Contacted` on the contact. All other types do.
- The `event` type in Airtable maps to `meeting` in the app.

### Interaction weights (for equity scoring)

| Type | Weight | Description |
|---|---|---|
| intro | 5 | Highest value — introductions build social capital |
| meeting | 4 | Face time, strong signal |
| call | 3 | Voice contact |
| text | 2 | Quick touchpoint |
| email | 2 | Written communication |
| note | 0 | Internal only, doesn't count toward equity |

---

## Campaigns

Grouped outreach efforts — events, investment rounds, general outreach.

| Field | Airtable Name | Type | Notes |
|---|---|---|---|
| Name | `Name` | Single line text | Required |
| Type | `Type` | Single select | Values: `event`, `investment`, `outreach`, `other` |
| Deadline | `Deadline` | Date | |
| Status | `Status` | Single select | Values: `active`, `completed` |

---

## CampaignContacts (Junction)

Links contacts to campaigns with per-contact status tracking.

| Field | Airtable Name | Type | Notes |
|---|---|---|---|
| Campaign | `Campaign` | Linked record → Campaigns | Single link (array) |
| Contact | `Contact` | Linked record → Contacts | Single link (array) |
| Status | `Status` | Single select | Values: `pending`, `reached`, `responded`, `confirmed` |
| Notes | `Notes` | Long text | Per-contact campaign notes |

---

## Relationships Between Tables

```
Lists (Pods)
  └── Categories (many per pod)
        └── Contacts (many per category, can span multiple pods/categories)
              └── Interactions (many per contact)

Campaigns ←→ CampaignContacts ←→ Contacts
```

Linked fields in Airtable always return arrays of record IDs, even for single links. Always use index `[0]` for single-link fields (Category.List, Interaction.Contact, CampaignContact.Campaign, CampaignContact.Contact).

---

## Social Equity Scoring

Equity scores measure relationship health on a 0–100 scale.

**Calculation:**
1. For each interaction in the last 90 days, multiply its type weight by a recency multiplier
2. Recency: 0–30 days = 1.0, 31–60 days = 0.6, 61–90 days = 0.3, 90+ days = 0
3. Sum weighted scores, multiply by 5, cap at 100

**Score labels:**
| Score | Label | Meaning |
|---|---|---|
| 85+ | Thriving | Relationship is strong and active |
| 70–84 | Steady | Good cadence, on track |
| 40–69 | Cooling | Starting to drift, needs attention |
| 0–39 | Fading | At risk, overdue for contact |

**Pod equity** = average of all contact scores in the pod.
**Overall equity** = average across priority pods only.

**Dormancy:** A contact is dormant if no interaction in 90+ days.
- 90–119 days: "Cooling off"
- 120–179 days: "Going quiet"
- 180+ days: "Slipping away"

**Today's Focus algorithm:**
1. Find overdue contacts in priority pods (past their cadence threshold)
2. Sort by most overdue first
3. Fill remaining slots with serendipity picks (deterministic shuffle by day)

**Overdue logic:**
- Contacts in a 14-day grace period after creation are never overdue
- Overdue = never contacted OR last contact exceeds cadence threshold
- Per-contact `Contact Frequency` overrides pod cadence if set

---

## Efficient Query Patterns

### Fetch all records (paginated)

Airtable returns max 100 records per page. Use `offset` for pagination.

```
GET /v0/{baseId}/{tableId}?offset={offset}
```

### Filter server-side with filterByFormula

Prefer server-side filtering to reduce payload:

```
# Interactions in last 90 days
filterByFormula=IS_AFTER({Date}, DATEADD(TODAY(), -90, 'days'))

# Interactions for a specific contact
filterByFormula=FIND("recXXXXXXXXXXXXXX,", ARRAYJOIN({Contact}, ","))

# Active campaigns only
filterByFormula={Status}="active"

# Contacts in a specific pod
filterByFormula=FIND("recXXXXXXXXXXXXXX", ARRAYJOIN({Lists}, ","))

# Contacts needing review
filterByFormula={Needs Review}=TRUE()

# Upcoming birthdays (rough — better to fetch all and filter client-side)
filterByFormula=AND({Birthday}!="", IS_BEFORE({Birthday}, DATEADD(TODAY(), 30, 'days')))
```

### Sort server-side

```
sort[0][field]=Date&sort[0][direction]=desc
```

### Limit records

```
maxRecords=10
```

### Select specific fields (reduce payload)

```
fields[]=Name&fields[]=Email&fields[]=Last Contacted
```

### Write operations

**Create:** POST to table ID with `{ fields: { ... } }`
**Update:** PATCH to `{tableId}/{recordId}` with `{ fields: { ... } }`
**Delete:** DELETE to `{tableId}/{recordId}`

Linked fields must be arrays of record IDs: `{ Lists: ["recXXX"] }`

### Batch operations

Airtable supports up to 10 records per batch create/update:
```json
{ "records": [{ "fields": { ... } }, { "fields": { ... } }] }
```
