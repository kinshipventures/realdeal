

## Plan: Team Management Completeness, Domain-Based Member Discovery, and Company Data Quality

### Part 1: Team/Account Management Gaps

**Current state:** Invite flow, accept-invite Edge Function, workspace switcher, role management, and leave team are all built. The core functionality is solid.

**Missing pieces to add:**

1. **Domain-based team discovery** - Show users on the same email domain (e.g. @kinshipventures.com) as suggested teammates when inviting. Query `profiles.email` for matching domains among users who share at least one workspace, and display them as "People in your organization" on the Account page.

2. **Invite email notifications** - Currently invite links are clipboard-only. Set up transactional email infrastructure and send an email when an invite is created, containing the inviter's name, workspace name, and join link.

3. **Password reset flow** - `ResetPasswordPage.tsx` exists but needs verification that the route and auth flow work end-to-end.

4. **Admin can also edit workspace name** - Currently only owners can edit. Admins should be able to as well.

### Part 2: Company Dedup, Normalize, and Enrich

**Current state:** 2,086 companies in the database. Data quality is poor:
- 1,903 (91%) have no domain
- 113 records are role/title strings, not company names (e.g. "VP, Brand Partnerships - IZO")
- 20 records are LinkedIn URLs
- 5 records are "NA"/"N/A"
- Many case-insensitive duplicates (e.g. "Zendaya" x6, "Greatness Media" x5)

**New Edge Function: `normalize-companies`**

Phases:
1. **Garbage removal** - Delete or archive company records that are URLs, roles/titles (pattern: contains comma + hyphen + title keywords), or empty values (NA, N/A, none, -)
2. **Case-insensitive dedup** - Group by `lower(name)`, pick survivor (most data, earliest created), merge `contact_companies` junctions to survivor, delete losers
3. **Domain extraction** - For companies with a website but no domain, extract domain from website URL
4. **Domain-based dedup** - After domain backfill, merge companies sharing the same domain
5. **AI enrichment** - For companies with a name but no website/domain/industry, call Lovable AI (gemini-2.5-flash) with the company name to fill in website, domain, industry, and location

### Part 3: Implementation Steps

1. **Database migration** - Add `company_type` enum or `is_garbage` boolean flag to companies table for classification (optional - could just delete directly)
2. **Create `normalize-companies` Edge Function** - Phases 1-4 (deterministic cleanup)
3. **Create `enrich-companies` Edge Function** - Phase 5 (AI-powered, batch processing with rate limiting)
4. **Update `cleanup-workspace` Edge Function** - Add phase 6 that calls company normalization
5. **Domain-based member suggestion** - Add RPC function to find users by email domain, surface in AccountPage invite section
6. **Email infrastructure** - Set up transactional email for invite notifications
7. **Minor AccountPage fixes** - Let admins edit workspace name

### Technical Details

- Company normalization uses service-role client to batch-process across workspace
- AI enrichment batches 20 companies per call to minimize latency
- Domain-based member discovery uses a new `find_users_by_domain` RPC that queries `profiles.email` domain suffix, filtered to users in at least one shared workspace (privacy-safe)
- Transactional email uses the Lovable email infrastructure toolchain

