# Real Deal CRM Guardrails

This document is mandatory project guidance for every Real Deal CRM change.

## Permanent Boundaries

- App logic, calculations, and functionality are locked behavior.
- Today Focus, pods, sub-pods, campaigns, auth, signup/login, Excel template behavior, imports, dashboard calculations, and relationship scoring are locked behavior.
- Supabase is storage only. Supabase must not own or drive product logic, calculations, or feature behavior.
- App code, UI text, variables, commits, scripts, and technical artifacts stay in English.
- User communication stays in Spanish.
- No purchase, subscription, paid action, or paid service may be started without explicit user approval.

## Required Scope Contract

Before editing, write down the exact scope:

- What files or folders may be touched.
- What behavior may change.
- What behavior is explicitly prohibited from changing.
- What checks will prove the change is safe.
- Whether deployment is required.

If a file appears in the diff outside the approved scope, stop.

## Change Unit Rule

Use one small change at a time:

- One scope.
- One diff review.
- One verification pass.
- One commit, when a commit is requested or needed.
- One deploy, only when the change affects the deployed app.

Do not bundle unrelated UI, auth, Excel, data, and logic changes.

## Locked Behavior Rule

Approved behavior becomes locked behavior after verification. Examples:

- Login and signup.
- Excel template generation.
- Today Focus.
- Pods and sub-pods.
- Campaigns.
- Calculations and scoring.
- Supabase storage boundaries.
- Import behavior that has already been verified.

Locked behavior may only be changed when the user explicitly names that behavior as the target of the task.

## Required Checks

For app changes:

- Review the diff before commit.
- Run `npm.cmd run verify:import-safety` before any build or deploy. The `prebuild` script also runs this automatically.
- Run `npm.cmd run lint`.
- Run `npm.cmd run test`.
- Run `npm.cmd run build`.
- Perform visual verification when UI changes.

For import-related work:

- Do not change import mapping, parsing, pod/sub-pod assignment, campaign linking, template behavior, or storage behavior unless the user explicitly approves that exact scope.
- Run `npm.cmd run verify:import-safety`.
- The import safety check must prove that a real Excel fixture imports without stalled progress and stores contacts, companies, pods, sub-pods, campaigns, commitment amounts, and import metadata in the expected places.
- If import safety fails, do not deploy.

For auth changes:

- Run `npm.cmd run verify:auth-production`.
- Perform production login/signup verification if requested or if auth surfaces changed.

For deploys:

- Verify the Vercel project and production URL before deploy.
- Deploy only the approved scope.
- Inspect deployment status.
- Check production route health.
- Check error logs after deploy.

For documentation-only or guardrail-only changes:

- Review the diff.
- Run the guardrail script against the staged files.
- Do not deploy unless the deployed app changes.

## Diff Review Rule

Before commit or deploy, confirm the diff contains only approved files.

Use:

```powershell
git status --short
git diff --name-only
git diff --cached --name-only
node scripts/check-realdeal-guardrails.mjs --staged-only --scope docs/REALDEAL_GUARDRAILS.md,scripts/check-realdeal-guardrails.mjs
```

Adjust the `--scope` list to match the approved files for the current task.
