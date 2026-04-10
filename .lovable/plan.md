

## Plan: Contact & Company Cleanup and Backfill

### Current state

| Metric | Contacts (1,822) | Companies (175) |
|---|---|---|
| Has email | 1,278 (70%) | - |
| Has first/last name split | 751 / 508 | - |
| Missing name split (fixable) | **1,071** | - |
| Has company text, no company_id link | **698** | - |
| Company text matches existing company | 10 | - |
| Unique company names with no company record | **615** | - |
| Has website/domain | 570 / - | 7 / 7 |
| Has industry | - | 119 (68%) |
| Has location | - | 109 (62%) |
| contact_companies junction rows | 23 | - |
| type='Company' records in contacts table | 18 (should move to companies) | - |

### What this will do

**Phase 1 - Split first/last names** (1,071 contacts)
- Parse `name` into `first_name` + `last_name` for all contacts where these are null but name contains a space
- Simple split: first word = first_name, remainder = last_name

**Phase 2 - Link contacts to existing companies** (10 contacts)
- Where `company` text matches an existing company name (case-insensitive), set `company_id` and create `contact_companies` junction row

**Phase 3 - Auto-create companies from contact data** (~615 new companies)
- For each distinct `company` text value on contacts that has no matching company record, create a new company
- Backfill company `website` and `domain` from the contact's website when the contact's website domain matches the company context
- Then link those contacts via `company_id` and `contact_companies`

**Phase 4 - Move 18 Company-type contacts to companies table**
- The 18 contacts with `type='Company'` (Anthropic, Adler Capital, etc.) are org records misclassified as contacts
- Move them to the `companies` table, reassign any junction records, delete from contacts
- Skip "(Formerly Goop)" and "Freelance" as they're not real companies

**Phase 5 - Backfill company domains from websites**
- For companies with `website` but no `domain`, extract domain from the URL
- For contacts linked to companies, propagate website/domain to the company if the company lacks them

### Implementation

A single edge function `supabase/functions/cleanup-workspace/index.ts` that runs all phases sequentially, returning a log of changes. Each phase is idempotent (safe to re-run).

### Files
- `supabase/functions/cleanup-workspace/index.ts` - new edge function

### Expected outcome
- ~1,071 contacts get first/last name populated
- ~698 contacts linked to companies (10 existing + ~615 newly created + remainder from Company-type migration)
- ~175 + ~615 = ~790 companies total
- 18 misclassified Company-type contacts moved to companies table
- Company domain/website coverage improved from 4% to significantly higher

