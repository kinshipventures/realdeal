

# Layout Standardization + Gmail Email Integration

## Part A: Layout Standardization

Standardize padding, titling, and back buttons across all list and detail pages.

### List Pages

**RecordsList (Contacts)**
- Change header padding from `28px 40px 0` to `32px 32px 0`
- Change body padding from `0 40px 40px` to `0 32px`
- Add bottom padding `96px` to scroll container
- Add eyebrow "CONTACTS" (10px uppercase, 0.08em letter-spacing, tertiary color)
- Change title from 30px to 24px, add `letterSpacing: '-0.02em'`

**PipelinesPage**
- Add eyebrow "PIPELINES" + title "Pipelines" header before the tab bar
- Change padding from `32` to `32px 32px 96px`

**ProjectsPage**
- Change title from 22px to 24px (already closest to standard)

### Detail Pages

**Back buttons** - standardize all to: chevron-left polyline SVG (`15 18 9 12 15 6`), `fontSize: 13`, `gap: 6`, `padding: 0`, `marginBottom: 20`
- RecordHeader: currently uses `← Back` text entity, change to chevron SVG, adjust margin from 12 to 20
- PodDetailPage: already uses chevron - move inside the `maxWidth: 720` container, standardize padding
- NurturingHub: uses arrow-left SVG - swap to chevron, change `padding: '0 0 20px'` to `padding: 0, marginBottom: 20`
- ProjectDetailPage: uses arrow-left SVG - swap to chevron

**Padding normalization**
- NurturingHub: `28px 24px 80px` -> `32px 32px 96px`
- PodDetailPage: back button area `16px 24px 0` -> inside container; content `24px 24px` -> `32px 32px`; bottom `80` -> `96`
- NurturingHub title: `24px` -> `26px` (match RecordHeader/ProjectDetail convention)

### Files to modify
1. `src/components/records/RecordsList.tsx` - header sizing, eyebrow, padding
2. `src/components/pipelines/PipelinesPage.tsx` - add header, fix padding
3. `src/components/projects/ProjectsPage.tsx` - title size
4. `src/components/records/RecordHeader.tsx` - back button SVG + margin
5. `src/components/pods/PodDetailPage.tsx` - back button, padding
6. `src/components/nurturing/NurturingHub.tsx` - back button, padding, title size

---

## Part B: Gmail Email Integration

Integrate Gmail email data into the contact system to auto-populate interaction timelines and enrich contact data.

### Architecture

Since the user already signs in with Google OAuth, we can request Gmail read scopes during sign-in and use an Edge Function to fetch and process emails server-side.

```text
User signs in (Google OAuth + Gmail scopes)
          |
          v
   Edge Function: sync-gmail
   - Receives user's access token
   - Fetches recent email threads via Gmail API
   - Matches senders/recipients to existing contacts (by email)
   - Creates Interaction records (type: 'email', source: 'Gmail')
   - Updates last_contacted_at on matched contacts
   - Stores sync cursor (last history ID) for incremental sync
          |
          v
   Contact timelines show Gmail emails inline
```

### Implementation Steps

**Step 1: Request Gmail scopes on sign-in**
- Update the Google OAuth config to include `https://www.googleapis.com/auth/gmail.readonly` scope
- Store the provider access token from the auth session for API calls

**Step 2: Database additions**
- `gmail_sync_state` table: `user_id`, `last_history_id`, `last_synced_at` - tracks incremental sync cursor
- No new interaction fields needed - existing `email_link`, `source`, `summary` fields cover Gmail data

**Step 3: Edge Function `sync-gmail`**
- Accepts the user's Google access token (from `session.provider_token`)
- Calls Gmail API `messages.list` + `messages.get` for recent emails
- For each email thread:
  - Extracts sender/recipient email addresses
  - Matches against contacts table by `email`, `email_2`, `email_3`
  - Creates an Interaction record with `type: 'email'`, `source: 'Gmail'`, subject as `summary`, date from email headers
  - Updates `last_contacted_at` on matched contact if this email is more recent
- Stores `historyId` for next incremental sync
- Deduplicates by Gmail message ID (store in `email_link` field)

**Step 4: Trigger sync from the frontend**
- Add a "Sync Email" button in the dashboard or settings area
- On click, invoke the edge function with the user's provider token
- Show sync progress/result feedback
- Optionally auto-sync on login (after first manual sync)

**Step 5: Contact auto-fill from email signatures**
- Use AI (Lovable AI supported model like `google/gemini-2.5-flash`) to parse email signatures for company, role, phone, LinkedIn
- Apply the existing enrichment flow (`computeFieldDiffs` -> suggested updates UI) for any new data found
- This reuses the enrichment infrastructure already built in Phase 19

**Step 6: Timeline display**
- Gmail-sourced interactions already render via `InteractionSection` (type `email` with source `Gmail` shown as a distinct pill)
- Add a Gmail icon or "Gmail" label on email interactions where `source === 'Gmail'`

### Files to create/modify
- `supabase/functions/sync-gmail/index.ts` - new Edge Function
- `src/lib/gmail.ts` - client-side sync trigger + helpers
- `src/components/contacts/InteractionSection.tsx` - Gmail source indicator
- `src/components/settings/` or dashboard - Sync Email button
- Database migration for `gmail_sync_state` table

### Scope decisions
- Read-only Gmail access (no sending)
- Manual sync trigger first, auto-sync later
- Match by exact email address only (no fuzzy matching)
- Last 30 days of email on first sync, incremental after
- No email content storage - only metadata (subject, date, participants)

### Prerequisites
- Google OAuth must be configured with Gmail read scope
- User must grant Gmail permission on sign-in (re-auth prompt if scope not yet granted)

