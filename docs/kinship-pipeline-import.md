# Kinship Fund I Pipeline Import

## What this is

Import the Kinship Fund I LP pipeline CSV into Supabase. Creates a pipeline with 6 stages, imports ~7 committed investors and ~60 prospects as opportunities linked to contacts.

## CSV location

`Kinship Fund I Pipeline - Active Pipeline - Kinship Fund.csv` in repo root.

## Data quality issue

The prospects section has misaligned email columns - the email field contains emails belonging to different rows (column shift in the export). Committed investors section is clean.

**Rule:** Match prospects by name only. Do not use email matching for prospects. Do not save the misaligned emails to new contact records. Committed investors can use email matching safely.

## Script

`scripts/import-kinship-pipeline.ts` handles parsing and import. Already accounts for the email misalignment (nameOnly flag on prospect rows).

## What it does

1. Creates a "Kinship Fund I" pipeline
2. Creates 6 stages: For Connecting, Intro Call, In Data Room & Pitch, In Dilligence, Circle Back, Moved to Fund Tracker
3. For each row:
   - Matches against existing contacts by name (and email for committed only)
   - Creates new contact if no match
   - Creates an opportunity linked to the contact in the correct stage
   - Stores investment amount, referral source, and notes

## Required env vars

```
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard: Settings > API > service_role>
MIGRATION_USER_ID=<your auth user UUID from auth.users table>
WORKSPACE_ID=<target workspace UUID from workspaces table>
```

## Run

```bash
npx tsx scripts/import-kinship-pipeline.ts
```

## Alternative: build into app UI

Instead of a CLI script, this could be a client-side feature at /import that:
- Accepts the Kinship Fund CSV format (sections with headers)
- Uses existing `createPipeline()`, `createPipelineStage()`, `createOpportunity()`, `createContact()` from `src/lib/supabase-data.ts`
- No service role key needed (uses authenticated user session)
- Auto-deploys via Lovable

The existing import panel (`src/components/import/ImportPanel.tsx`) handles generic contact CSVs. A pipeline-specific import would need to parse the sectioned format and create pipeline/stages/opportunities rather than just contacts.
