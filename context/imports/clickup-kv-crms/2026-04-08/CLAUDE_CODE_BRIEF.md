# Claude Code brief - ClickUp KV CRMs import

Start here:
- `docs/clickup-kv-crms-to-realdeal.md`
- `context/imports/clickup-kv-crms/2026-04-08/realdeal-mapping.json`
- `context/imports/clickup-kv-crms/2026-04-08/manifest.json`
- `context/imports/clickup-kv-crms/2026-04-08/*/fields.json`
- `context/imports/clickup-kv-crms/2026-04-08/*/tasks.flat.json`

## What this data is

This is not a clean CRM. It is a mixed ClickUp folder export from `KV CRMs`.

Use these assumptions:
- `Maps`, `Maps Lite/For sorting`, `Talent`, `Service Providers`, and `SPV` are mostly relationship/contact sources
- `Companies` is mixed - some rows are real companies, some are action/task rows
- `Pipeline` should feed `pipelines`, `pipeline_stages`, `opportunities`, and `opportunity_contacts`
- unstable or duplicate fields should stay in `custom_fields` on the first pass

## Non-negotiables

- Do not mirror ClickUp 1:1 into the app
- Do not invent new first-class schema unless a field is clearly stable and broadly used
- Preserve ClickUp provenance in `custom_fields`
- Treat `Main List` as primary pod membership and `Additional Lists` as secondary memberships

## Best next implementation target

Build a staging importer that:
1. reads `tasks.flat.json`
2. classifies rows as `contact`, `company`, `opportunity`, or `skip`
3. normalizes canonical fields
4. keeps all leftovers in `custom_fields`
5. emits import-ready JSON for the current Supabase schema

## Suggested output artifacts

- `scripts/import-clickup-kv-crms.ts`
- `context/imports/clickup-kv-crms/2026-04-08/staging/contacts.json`
- `context/imports/clickup-kv-crms/2026-04-08/staging/companies.json`
- `context/imports/clickup-kv-crms/2026-04-08/staging/pipelines.json`
- `context/imports/clickup-kv-crms/2026-04-08/staging/pipeline_stages.json`
- `context/imports/clickup-kv-crms/2026-04-08/staging/opportunities.json`
- `context/imports/clickup-kv-crms/2026-04-08/staging/opportunity_contacts.json`

## Good first dedupe keys

For contacts:
- normalized primary email
- normalized phone
- linkedin URL
- full name + company

For companies:
- website/domain
- normalized company name

## Known garbage to ignore on first pass

- `Progress Tracker`
- `Remove`
- `Points Estimate Rolled Up`
- `Date Updated`
- `Date Closed`
- `Latest Comment`
- `Task Content`
