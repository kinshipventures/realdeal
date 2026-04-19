# Personal Supabase Migration

This keeps the current Lovable setup untouched while you build the new project in parallel.

## 1. Keep the live app unchanged

- Do not change current production env vars yet.
- `VITE_USE_LOVABLE_AUTH_BRIDGE` defaults to on.
- The live app keeps using Lovable sign-in until you explicitly set:

```bash
VITE_USE_LOVABLE_AUTH_BRIDGE=false
```

## 2. Build your new Supabase project

- Create a new Supabase project you own.
- Enable Google auth there.
- Add local and production redirect URLs.
- Link this repo to that project with the Supabase CLI.
- Run the repo migrations against the new project.
- Regenerate `src/integrations/supabase/types.ts` from the new project.

Example:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

## 3. Export data from the current project

You need a valid logged-in access token from the current app plus the current public key and URL.

Set these in `.env.local`:

```bash
SOURCE_SUPABASE_URL=https://<old-project>.supabase.co
SOURCE_SUPABASE_PUBLISHABLE_KEY=<old-publishable-key>
SOURCE_SUPABASE_ACCESS_TOKEN=<jwt-from-current-session>
WORKSPACE_ID=<workspace-id-to-move>
EXPORT_PATH=tmp/realdeal-supabase-export.json
```

Run:

```bash
pnpm export:supabase-data
```

What it exports:

- the chosen workspace
- workspace members and matching profiles
- workspace-scoped app tables

## 4. Import data into your new project

Set these in `.env.local`:

```bash
TARGET_SUPABASE_URL=https://<new-project>.supabase.co
TARGET_SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key>
TARGET_OWNER_USER_ID=<your-user-id-in-the-new-project>
TARGET_OWNER_EMAIL=<optional>
TARGET_OWNER_DISPLAY_NAME=<optional>
IMPORT_PATH=tmp/realdeal-supabase-export.json
```

Optional if you later migrate more than one user:

```bash
USER_ID_MAP={"old-user-id":"new-user-id"}
```

Run:

```bash
pnpm import:supabase-data
```

Default behavior:

- old `user_id` values get remapped to your user in the new project
- workspace membership is rebuilt so your user owns the imported workspace
- the current Lovable project is not changed

## 5. Test locally against the new project

Set the app env vars to your new project:

```bash
VITE_SUPABASE_URL=https://<new-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<new-publishable-key>
VITE_USE_LOVABLE_AUTH_BRIDGE=false
```

Then verify:

- Google sign-in
- email sign-in
- workspace loading
- dashboard
- map
- contact detail
- interactions
- campaigns
- invites
- share links
- imports and sync if their secrets are configured

## 6. Cut over later

Only when local verification is done:

- update Vercel env vars to the new project
- set `VITE_USE_LOVABLE_AUTH_BRIDGE=false`
- deploy

Until then, the Lovable version stays as-is.
