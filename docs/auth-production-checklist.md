# Real Deal Auth Production Checklist

Production Supabase is `zsecxtxpwmvgggqksdfb`.

Use this checklist when a real user cannot sign in or when auth is verified before and after a deploy.

## Before Deploy

1. Run `npm run verify:auth-production`.
2. Confirm Vercel production env has:
   - `SUPABASE_URL` pointing to `https://zsecxtxpwmvgggqksdfb.supabase.co`
   - `VITE_SUPABASE_URL` pointing to `https://zsecxtxpwmvgggqksdfb.supabase.co`
   - `VITE_SUPABASE_PROJECT_ID` set to `zsecxtxpwmvgggqksdfb`
   - `VITE_USE_LOVABLE_AUTH_BRIDGE` set to `false`
3. Confirm local Supabase config uses `zsecxtxpwmvgggqksdfb`.
4. Do not use exported `tmp/*.json` Supabase snapshots for production auth checks.

## User Cannot Sign In

Check in this order:

1. Exact email the user typed.
2. Login method: Google OAuth or email/password.
3. Supabase Auth user exists in production project `zsecxtxpwmvgggqksdfb`.
4. Email is confirmed when email/password requires confirmation.
5. User has the expected `workspace_members` row.
6. Pending invite exists in `workspace_invites` if they were invited.
7. Invite email exactly matches the signed-in email.
8. Browser console error and Supabase Auth error message.

## Guardrails

- Removing a workspace member deletes only from `workspace_members`.
- Revoking an invite deletes only from `workspace_invites`.
- App flows must not delete Supabase Auth users.
- The app can create independent users and workspaces in one production Supabase as long as data remains scoped by `user_id` and `workspace_id`.
