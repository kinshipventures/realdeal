

# Phase 22: Create Supabase Schema

## Summary

Run the provided SQL as a database migration to create 18 tables, enums, triggers, indexes, and RLS policies in the Supabase database.

## What will be created

- **16 enums**: cadence, interaction_type, relationship_type, relationship_status, pipeline_status, opportunity_status, opportunity_priority, campaign_type, campaign_contact_status, campaign_status, global_region, gender_type, contact_frequency, owner_type, interaction_source
- **1 trigger function**: `update_updated_at()` for auto-setting `updated_at`
- **18 tables** with triggers, indexes, and RLS:
  - `pods`, `categories`, `companies`, `contacts`, `contact_pods`, `contact_categories`
  - `interactions`, `pipelines`, `pipeline_stages`, `opportunities`, `opportunity_contacts`
  - `campaigns`, `campaign_contacts`, `projects`, `project_contacts`, `project_opportunities`
  - `field_config`, `_migration_id_map`
- **RLS policies**: owner-based (`user_id = auth.uid()`) on all tables
- **Performance indexes**: on foreign keys and frequently queried columns

## Execution

The SQL will be split into batches if needed due to migration tool limits, run in FK dependency order. The SQL is ready as-is -- no modifications needed.

## Note

The `"order"` column in `pipeline_stages` uses quoted identifier since `order` is a SQL reserved word. This is handled correctly in the provided SQL.

