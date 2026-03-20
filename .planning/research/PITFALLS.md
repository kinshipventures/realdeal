# Pitfalls Research

**Domain:** Relationship management app — consulting engagement, no backend, Airtable REST, CSV imports, visual redesign
**Researched:** 2026-03-20
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: Duplicate Contacts from CSV Imports

**Severity:** CRITICAL

**What goes wrong:**
Running a second CSV import (LP list, Talent list) without dedup logic creates double or triple records for the same person. Airtable's REST API has no native upsert — a POST always creates a new record. Fuzzy name variants ("Jonathan Smith" vs "Jon Smith") slip past exact-match checks entirely.

**Why it happens:**
The current `seed:csv` script likely does a straight create. When Briell preps a second list that shares contacts with the first, every overlap becomes a duplicate in Airtable.

**How to avoid:**
Before each import run, fetch all existing contacts and build an email-keyed lookup map. Match incoming rows by email first, name second. If a match exists, PATCH (update) instead of POST (create). Implement this before importing LP or Talent lists — not after.

**Warning signs:**
If you see a contact appear twice on the orb map, or the contact count jumps unexpectedly after an import, duplicates are in.

**If you see X, do Y:**
If duplicate records appear post-import → run a one-time dedup: fetch all contacts, group by email, keep the most recently updated record, delete the rest. Do not try to merge in Airtable UI — it's slow and error-prone at scale.

**Phase to address:** Data Import phase (week 4-5)

---

### Pitfall 2: Gmail OAuth is Blocked Without a Backend

**Severity:** CRITICAL

**What goes wrong:**
Google's OAuth for Gmail API requires a `client_secret` — even when using PKCE. For browser-only apps (no server), there is no safe place to store `client_secret`. Exposing it in the browser bundle is a security hole. Google has also deprecated the implicit flow in OAuth 2.1.

**Why it happens:**
SPAs expect PKCE to work without a secret. Google's implementation diverges from the RFC 7636 standard and still requires the secret for web app client types. This is a Google-specific deviation.

**How to avoid:**
Gmail integration requires a lightweight backend — even a single serverless function — to hold `client_secret` and exchange the auth code. Options: Supabase Edge Functions, Vercel serverless function, or a Cloudflare Worker. Without this, Gmail OAuth cannot be safely implemented.

**Warning signs:**
If you attempt OAuth from the browser and get a `401` or "invalid_client" error, it's the missing secret. If you store the secret in `.env` and ship it in the Vite bundle, it will be visible in browser devtools.

**If you see X, do Y:**
If Gmail integration is unblocked by Moj providing credentials → do not attempt browser-only OAuth. Spin up a single Supabase Edge Function as the OAuth callback handler before touching any Gmail API code.

**Phase to address:** Integration Readiness phase (only when credentials arrive)

---

### Pitfall 3: Visual Redesign Blows the 2-Week Timeline

**Severity:** HIGH

**What goes wrong:**
"Align with Trolley CRM PDF" is open-ended. Without a bounded scope, it becomes a full redesign — new color system, typography, layout changes, orb rework — and displaces the data import work that is the actual deliverable for Gwyneth demo readiness.

**Why it happens:**
Design reference PDFs show polished end-states. The natural instinct is to match everything. But the app already has a design system; the PDF is directional guidance, not a pixel-perfect spec.

**How to avoid:**
Read the PDF and identify 3-5 specific delta changes (color palette, card style, typography weight, etc.) that close most of the gap. Implement those only. Time-box the redesign phase to 3-4 days max. Anything beyond that goes on a post-engagement list.

**Warning signs:**
If you're still iterating on the design at day 5 of week 5 → stop. Ship what you have. The data being clean and present matters more to Moj than pixel perfection.

**If you see X, do Y:**
If Moj or Gabby request design changes during the visual phase → capture them in a "post-engagement" doc and explicitly confirm they're out of current scope before implementing.

**Phase to address:** Visual Redesign phase (week 5-6)

---

### Pitfall 4: CSV Column Name Assumptions Break the Import Script

**Severity:** HIGH

**What goes wrong:**
The existing `seed:csv` script is likely hardcoded to the Service Providers column headers. Briell's next CSV (LP list, Talent list) will have different headers, different encoding, and possibly merged cells or extra blank rows exported from Excel. The script throws or silently drops data.

**Why it happens:**
Scripts written for one CSV assume its structure. "First Name" vs "first_name" vs "FirstName" all break strict key lookups. Excel exports often include BOM characters, trailing commas, and Windows line endings.

**How to avoid:**
Before running any new import: `head -5 filename.csv` to inspect headers. Add a validation step that logs unmapped columns before writing anything. Normalize column names (lowercase, strip spaces) at the top of the script. Treat any column that doesn't map as an error, not a silent skip.

**Warning signs:**
If any field in Airtable comes back empty for a batch of contacts that definitely had that data in the CSV, the column mapping silently failed.

**If you see X, do Y:**
If a new CSV has unexpected headers → update the mapping object in the script, do a dry run with `--dry-run` flag (or log without writing), confirm output looks right, then run for real.

**Phase to address:** Data Import phase (week 4-5)

---

## High Pitfalls

### Pitfall 5: Airtable Rate Limiting During Bulk Import

**Severity:** HIGH

**What goes wrong:**
Airtable enforces 5 requests/second per base. A 500-contact import with per-record POST calls (plus linked-field lookups) will hit the rate limit, get 429 errors, and either fail silently or corrupt partial state.

**Why it happens:**
Sequential single-record creates are the simplest implementation. At 500 records that's 500+ API calls, which exceeds the rate limit budget within seconds.

**How to avoid:**
Airtable supports batch creates of up to 10 records per request. Always batch. Add exponential backoff on 429 responses. At 10 records/batch with a 250ms delay between requests, 500 contacts completes in ~12 seconds cleanly.

**If you see X, do Y:**
If the import script errors with 422/429 → add `await sleep(250)` between batches and confirm batch size is 10.

**Phase to address:** Data Import phase (week 4-5)

---

### Pitfall 6: Client-Side Filtering Fetches All Records on Every Page Load

**Severity:** MEDIUM

**What goes wrong:**
`fetchAll()` in `airtable.ts` fetches all contacts on load, then filters client-side. At 500 contacts this is fast. At 2,000+ contacts (post-engagement growth) initial load becomes sluggish and the module-level cache becomes the only thing keeping it tolerable.

**Why it happens:**
Airtable's API has no server-side full-text search. All filtering is client-side by design in this architecture. The cache helps but is invalidated on every mutation.

**How to avoid:**
For current 2-week scope: no action needed. The cache is sufficient. If the app continues past this engagement, plan a view-filtered fetch strategy (Airtable's `filterByFormula` API param narrows the fetch to a specific list/category before returning records).

**If you see X, do Y:**
If load time exceeds 2 seconds on initial app open → add `filterByFormula` to scope queries by the active list, rather than fetching all records globally.

**Phase to address:** Not a current risk. Flag for post-engagement if contact count grows.

---

### Pitfall 7: Consulting Engagement Ends Without a Handoff Document

**Severity:** HIGH

**What goes wrong:**
Briell becomes the ongoing Airtable admin. If there's no doc explaining field conventions, import script usage, and "do not touch" configs, she'll break something within a week. The app becomes an orphan.

**Why it happens:**
The last week of a consulting engagement is always crunch. Documentation is the first thing cut.

**How to avoid:**
Write a 1-page `HANDOFF.md` covering: how to run the import script, what each Airtable table is for, how linked fields work, and who to contact for app issues. This is a 2-hour task, not a week of writing. Do it before the final deliverable meeting.

**If you see X, do Y:**
If week 6 arrives without this doc existing → write it before the final demo, not after.

**Phase to address:** Week 6 close-out

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Airtable token in browser bundle | No backend needed | Token is public to any user who opens devtools | Acceptable for private URL, small trusted team — not acceptable if URL becomes public |
| No duplicate detection in import script | Faster to build | Every re-run creates duplicate contacts, compounding with each list | Never acceptable — fix before running second import |
| Module-level in-memory cache | Zero infrastructure | Cache doesn't survive page refresh; multiple tabs get out of sync | Acceptable at current scale and team size |
| Client-side all-records fetch | Simple implementation | Slow at 2000+ records | Acceptable under 1000 contacts |
| Security through URL obscurity | No auth infrastructure | Any leaked link = full access | Acceptable for 6-week scope, not for long-term |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Airtable linked fields | Assuming they return data — they return arrays of record IDs | Always resolve IDs with a second fetch or include linked table fields via `fields[]` param |
| Gmail OAuth | Attempting browser-only OAuth with client_secret | Must have a backend endpoint to safely hold the secret and handle the callback |
| Airtable PATCH | Sending full record object in update | PATCH only needs the `fields` you're changing — sending the full object can overwrite linked-field IDs |
| Airtable `filterByFormula` | Using it without URL-encoding the formula | Always encode the formula param — spaces and special chars break the request silently |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all contacts on every panel open | Panel feels slow to open; network tab shows repeated 500-record fetches | Use the module-level cache; only invalidate after writes | Currently fine; breaks at ~1500 contacts |
| Sequential single-record creates in import | Script runs for 5+ minutes; random 429 errors midway | Batch 10 records per request with 250ms delay | Breaks immediately above ~50 records |
| React Flow re-rendering all nodes on any state change | Orb map stutters when contact panel opens | Keep React Flow node state separate from contact/panel state | Already partially mitigated by existing architecture |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Airtable PAT in VITE_* env var | Ships to browser bundle, visible in devtools | Accepted for this engagement. Document this risk explicitly in handoff. |
| No CORS enforcement on Airtable | Anyone can query your base if they find the token | Airtable tokens are scoped to specific bases — minimize scopes when creating the token |
| Gmail refresh tokens stored in localStorage | Token theft via XSS gives permanent Gmail access | Never store tokens in localStorage — requires a backend session store |

---

## "Looks Done But Isn't" Checklist

- [ ] **CSV Import:** Verify no duplicates by checking contact count before and after. Cross-check 5 spot-check names manually.
- [ ] **Visual Redesign:** Test on the actual device Moj uses (likely MacBook) — orb shadows and glass effects render differently at different DPI settings.
- [ ] **Import script:** Confirm all columns from the new CSV mapped — log unmapped columns explicitly, don't silently drop them.
- [ ] **Equity scores:** After import, verify new contacts show correct dormancy/grace-period status (14-day new contact grace should apply from import date, not from Airtable record creation).
- [ ] **Handoff doc:** Briell has read it and confirmed she can run the import script without help.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate contacts after import | MEDIUM | Fetch all contacts, group by email, delete duplicates via Airtable DELETE endpoint. Write a one-time cleanup script. |
| Visual redesign blew timeline | LOW | Ship current state, document remaining changes as post-engagement recommendations. |
| Import script broke on new CSV format | LOW | Fix column mapping, add dry-run mode, re-run. No data loss if script errored before writing. |
| Rate limit hit during import | LOW | Add exponential backoff + batching, restart import. If partial import happened, run dedup cleanup first. |
| Gmail OAuth attempted browser-only, failed | HIGH | Requires spinning up a backend endpoint. Block until infrastructure decision is made. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Duplicate contacts | Data Import (week 4-5) | Contact count matches expected after import; 5 spot-checks pass |
| CSV column mismatch | Data Import (week 4-5) | Script logs all mapped/unmapped columns before writing |
| Rate limiting during import | Data Import (week 4-5) | Import completes without 429 errors in logs |
| Visual redesign scope creep | Visual Redesign (week 5-6) | Change list is bounded to 3-5 specific deltas from PDF |
| Gmail OAuth without backend | Integration Readiness | Not built until backend decision is made |
| No handoff doc | Week 6 close-out | Briell confirms she can run import script independently |

---

## Sources

- [Airtable Rate Limits — official docs](https://airtable.com/developers/web/api/rate-limits)
- [Managing API Call Limits in Airtable](https://support.airtable.com/docs/managing-api-call-limits-in-airtable)
- [Google OAuth2 JavaScript Implicit Flow — official](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
- [Google OAuth2 PKCE and client_secret requirement](https://ktaka.blog.ccmp.jp/2025/07/oogle-oauth2-and-pkce-understanding.html)
- [OAuth 2.0 Implicit Flow is Dead — Postman](https://blog.postman.com/pkce-oauth-how-to/)
- [CRM Deduplication Guide 2025](https://www.rtdynamic.com/blog/crm-deduplication-guide-2025/)
- [Airtable performance troubleshooting](https://support.airtable.com/docs/troubleshooting-airtable-performance)
- [How to use Airtable as a production database — DEV Community](https://dev.to/hacubu/how-to-use-airtable-as-a-production-database-analyzing-airtable-performance-41e9)
- Project context: `.planning/PROJECT.md`, `CLAUDE.md`

---
*Pitfalls research for: Kinship Brain — relationship management app, Airtable + React, no backend*
*Researched: 2026-03-20*
