# Real Deal Auth Production Checklist

Production Supabase is `zsecxtxpwmvgggqksdfb`.

No other Supabase project is allowed in app source, local Supabase config, Vercel production bundle, or auth verification scripts. If a previous Supabase ref appears anywhere, stop the deploy and remove it before continuing.

Use this checklist when a real user cannot sign in or when auth is verified before and after a deploy.

## Before Deploy

1. Run `npm run verify:protected-baseline`.
   - This checks canonical Supabase refs in the repo.
   - This checks local Supabase config and linked project refs.
   - This checks the production bundle.
   - This checks that signup is enabled.
   - This checks that app code does not delete Supabase Auth users.
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

- The only allowed Supabase production ref is `zsecxtxpwmvgggqksdfb`.
- Removing a workspace member deletes only from `workspace_members`.
- Revoking an invite deletes only from `workspace_invites`.
- App flows must not delete Supabase Auth users.
- The app can create independent users and workspaces in one production Supabase as long as data remains scoped by `user_id` and `workspace_id`.
- Do not ship auth changes unless `npm run verify:protected-baseline`, `npm run build`, and `npm run test` pass.
