# Google Integration Locked Behavior

This file documents the approved Real Deal Google Workspace integration contract. It contains no Google project IDs, Supabase keys, OAuth client secrets, refresh tokens, access tokens, user emails, or workspace-specific data.

## Locked Scope

The current Google Workspace integration is approved behavior and must remain intact unless the user explicitly asks to change Google integration behavior.

Protected behavior:

- Users can connect Google Workspace through OAuth with Gmail, Calendar, Contacts, profile, email, and OpenID scopes.
- Gmail sync is owned by the app/API. Supabase only stores the connection state, diagnostics, and resulting interactions.
- Gmail sync matches sent and received Gmail messages against each contact's `email`, `email_2`, and `email_3` fields.
- Matched Gmail messages are saved as permanent `interactions` rows with `type = email`, `source = Gmail`, a stable `gmail:<messageId>` key, direction metadata, and the Gmail thread/message details.
- Gmail interactions are deduplicated by contact and Gmail message key. Repeated syncs must not duplicate activity.
- Gmail sync is multi-user and workspace-scoped. Each Google connection processes only the connected user's workspaces and contacts.
- Manual sync uses `POST /api/google/sync-gmail` for the authenticated user.
- Background sync runs automatically while an authenticated session is active.
- Vercel Cron runs `/api/cron/sync-gmail` for all active Gmail-enabled Google connections, guarded by `CRON_SECRET`.
- Incremental Gmail history sync is backed by rolling recent-message reconciliation so messages missed by Gmail History are recovered.
- Rolling reconciliation uses the current approved 14-day lookback window.
- Diagnostics remain available after each sync: messages scanned, contacts indexed, email addresses indexed, matches found, inserted rows, duplicates skipped, sync mode, and last error.

## Sensitive Data Boundary

Never hard-code or commit:

- Google project identifiers.
- OAuth client IDs or client secrets.
- Access tokens, refresh tokens, or encrypted token values.
- Supabase service role keys, publishable keys, personal access tokens, or project-specific secrets.
- Real user emails or workspace-specific test data.

## Verification

Run this guardrail before committing or deploying changes that could affect the Google integration:

```powershell
npm.cmd run verify:google-integration
```

The guardrail intentionally checks implementation files without changing them. If it fails, stop and inspect whether an approved Google integration behavior was removed or changed.
