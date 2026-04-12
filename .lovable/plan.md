

## Audit: Team Accounts, Invites, Email Notifications & Gmail Integration

### Current State

**Team / Workspace system (built)**
- Workspace CRUD, switching, localStorage persistence
- Role model: owner / admin / member (stored in `workspace_members`)
- Invite flow: create invite row with token, copy link to clipboard
- Accept invite page (`/invite?token=...`) redirects unauthenticated users to login with `return_to`
- Role management UI for owners (change role, remove member)
- Leave team for non-owners

**Gmail integration (partially built)**
- `src/lib/gmail.ts` calls a `sync-gmail` Edge Function - but the Edge Function does not exist (`supabase/functions/` only has `cleanup-workspace` and `dedup-workspace`)
- `gmail_sync_state` table exists in the database
- Login requests `gmail.readonly` scope via Google OAuth
- `GmailSyncWidget` renders on dashboard with sync button
- Memory note says provider_token from Lovable Cloud OAuth is not usable for Gmail - needs standalone OAuth flow with dedicated Client ID/Secret

---

### Missing Areas

#### 1. Invite Email Notifications
**Status:** Not built. Invites only produce a clipboard link.
- No email service configured
- No Edge Function or trigger to send invite emails
- `workspace_invites` has an `email` field but it is only used for display
- **What to build:**
  - Set up Lovable email domain + transactional email infrastructure
  - Create a `send-invite-email` Edge Function (or trigger on `workspace_invites` insert)
  - Email contains: inviter name, workspace name, accept link
  - Fall back to link-copy if email delivery is not yet configured

#### 2. Accept-Invite Edge Function
**Status:** Missing. `AcceptInvitePage` calls `supabase.functions.invoke('accept-invite')` but no such function exists in `supabase/functions/`.
- **What to build:**
  - `supabase/functions/accept-invite/index.ts` - validates token, checks email match, inserts `workspace_members` row, marks invite accepted
  - Use service role key for cross-user operations

#### 3. Password Reset Flow
**Status:** Missing. Login page has email/password auth but no "Forgot password" link and no `/reset-password` route.
- **What to build:**
  - "Forgot password?" link on login page
  - `/reset-password` route with new password form
  - Calls `supabase.auth.updateUser({ password })` on recovery token

#### 4. Profile Avatar
**Status:** `profiles` table has `avatar_url` column but no upload UI. Members list shows initials only.
- **What to build (optional):**
  - Storage bucket for avatars
  - Upload UI on account page
  - Display in member list and elsewhere

#### 5. Workspace Switcher
**Status:** `WorkspaceContext` supports multiple workspaces but there is no UI to switch between them or create new ones (only programmatic via `switchWorkspace` / `createWorkspace`).
- **What to build:**
  - Dropdown or menu in sidebar to switch workspaces
  - "Create workspace" option

#### 6. Gmail Integration - Edge Function
**Status:** Client code exists, Edge Function does not.
- **What to build:**
  - `supabase/functions/sync-gmail/index.ts` that:
    - Receives Google access token from client
    - Fetches last 30 days of email threads via Gmail API
    - Matches participants by email to contacts (including `email_2`, `email_3`)
    - Creates `interactions` records with `source: 'Gmail'`, `email_link` for dedup
    - Updates `gmail_sync_state` with `last_history_id` for incremental sync
  - **Blocker:** Lovable Cloud's managed Google OAuth does not expose `provider_token` reliably. The login page requests `gmail.readonly` scope, but per memory notes this approach has known issues. Two options:
    - **Option A:** Use the current approach (provider_token from session) - simpler but token may not persist across refreshes
    - **Option B:** Standalone Google OAuth with dedicated Client ID/Secret stored as secrets - more reliable, requires separate connect flow

---

### Recommended Priority Order

1. **Accept-invite Edge Function** - currently broken (invite accept fails without it)
2. **Invite email notifications** - set up email domain + transactional email
3. **Password reset flow** - basic auth completeness
4. **Gmail sync Edge Function** - core feature request
5. **Workspace switcher UI** - multi-team usability
6. **Profile avatars** - polish

### Technical Details

- Email setup uses Lovable's built-in transactional email system (no third-party service needed)
- `accept-invite` function needs `SUPABASE_SERVICE_ROLE_KEY` (already in secrets) to insert `workspace_members` for a different user
- Gmail sync function needs either the provider_token approach or a Google OAuth connector - will need to clarify which path

