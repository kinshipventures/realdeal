

## Plan: Deduplicate Pods, Contacts, and Companies

### Current state

**Pods - 3 duplicate pairs (case differences):**
| Survivor (more members) | Duplicate (fewer) | Members |
|---|---|---|
| Maps (462) | MAPS (6 + 9 categories) | Merge into Maps |
| Maps Lite (817) | MAPS Lite (5) | Merge into Maps Lite |
| SPV (35) | SPV (0) | Delete empty one |

Also: "Services Providers" (typo) vs "Service Providers" - merge into "Service Providers".

**Contacts - 534 duplicate name groups, ~1500 excess rows** out of 2788 total. Most duplicates are sparse (no email/phone/company). Strategy: keep the earliest-created record as survivor, merge any non-null fields from duplicates, reassign all junction records (contact_pods, contact_categories, interactions, campaign_contacts, opportunity_contacts, project_contacts), then delete losers.

**Companies - 3 duplicate pairs** (anthropic, moonpay, alice). Same merge strategy.

### Implementation

A single backend function (edge function) that runs the dedup in three phases:

**Phase 1 - Merge duplicate pods**
- For each pair: move contact_pods from loser to survivor (skip if already exists), move categories, then delete loser pod
- Handle "Services Providers" -> "Service Providers" merge

**Phase 2 - Deduplicate contacts**
- Group by `LOWER(TRIM(name))` within workspace
- For each group: pick earliest `created_at` as survivor
- Coalesce non-null fields from duplicates into survivor (first non-null wins for each field)
- Reassign all junction rows (contact_pods, contact_categories, interactions, campaign_contacts, opportunity_contacts, project_contacts) from loser IDs to survivor ID, skipping duplicates
- Delete loser contact records

**Phase 3 - Deduplicate companies**
- Same pattern: group by `LOWER(TRIM(name))`, merge fields, update `contacts.company_id` references, delete losers

### Expected outcome
- ~1300 duplicate contacts removed (2788 -> ~1288)
- 4 duplicate pods eliminated
- 3 duplicate companies merged
- All junction records preserved on survivor records

### Files
- `supabase/functions/dedup-workspace/index.ts` - new edge function that runs the dedup SQL
- No UI changes needed - the data layer already works with the cleaned data

### Safety
- The function will log counts before/after for each phase
- Runs within a single workspace scope
- Junction reassignment uses `ON CONFLICT DO NOTHING` pattern to avoid constraint violations

