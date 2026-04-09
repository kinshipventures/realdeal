#!/usr/bin/env npx tsx
/**
 * Upload staging JSON from ClickUp import into Supabase.
 *
 * Reads staging/*.json files and inserts into Supabase tables in FK order.
 * Requires authenticated Supabase session (email/password via env).
 *
 * Usage:
 *   SUPABASE_EMAIL=x SUPABASE_PASSWORD=y npx tsx scripts/upload-clickup-staging.ts
 *
 * Or with --dry-run to just validate without inserting.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const STAGING_DIR = 'context/imports/clickup-kv-crms/2026-04-08/staging'
const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 50

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY
const email = process.env.SUPABASE_EMAIL
const password = process.env.SUPABASE_PASSWORD

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in .env')
  process.exit(1)
}

if (!email || !password) {
  console.error('Set SUPABASE_EMAIL and SUPABASE_PASSWORD env vars to authenticate')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function loadStaging<T>(name: string): T[] {
  return JSON.parse(readFileSync(join(STAGING_DIR, `${name}.json`), 'utf-8'))
}

async function batchInsert(table: string, rows: Record<string, any>[]) {
  if (DRY_RUN) {
    console.log(`  [dry-run] ${table}: ${rows.length} rows`)
    return
  }
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from(table).insert(batch)
    if (error) {
      console.error(`  ERROR inserting into ${table} (batch ${i}-${i + batch.length}):`, error.message)
      // Try one-by-one to find the bad row
      for (const row of batch) {
        const { error: rowError } = await supabase.from(table).insert(row)
        if (rowError) {
          console.error(`    Bad row: ${JSON.stringify(row).slice(0, 200)}`)
          console.error(`    Error: ${rowError.message}`)
        } else {
          inserted++
        }
      }
    } else {
      inserted += batch.length
    }
  }
  console.log(`  ${table}: ${inserted}/${rows.length} inserted`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Upload ClickUp staging to Supabase ===\n')
  if (DRY_RUN) console.log('** DRY RUN MODE **\n')

  // Authenticate
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError || !authData.user) {
    console.error('Auth failed:', authError?.message || 'No user returned')
    process.exit(1)
  }
  const userId = authData.user.id
  console.log(`Authenticated as ${email} (${userId})`)

  // Get workspace
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)

  if (!memberships?.length) {
    console.error('No workspace found for user')
    process.exit(1)
  }
  const workspaceId = memberships[0].workspace_id
  console.log(`Workspace: ${workspaceId}\n`)

  // Load all staging data
  const pods = loadStaging('pods')
  const contacts = loadStaging('contacts')
  const contactPods = loadStaging('contact_pods')
  const categories = loadStaging('categories')
  const contactCategories = loadStaging('contact_categories')
  const companies = loadStaging('companies')
  const pipelines = loadStaging('pipelines')
  const pipelineStages = loadStaging('pipeline_stages')
  const opportunities = loadStaging('opportunities')
  const opportunityContacts = loadStaging('opportunity_contacts')

  const stamp = (rows: Record<string, any>[]) =>
    rows.map(r => ({ ...r, user_id: userId, workspace_id: workspaceId }))

  // Insert in FK order
  console.log('Inserting pods...')
  await batchInsert('pods', stamp(pods))

  console.log('Inserting contacts...')
  await batchInsert('contacts', stamp(contacts))

  console.log('Inserting contact_pods...')
  await batchInsert('contact_pods', stamp(contactPods))

  console.log('Inserting categories...')
  await batchInsert('categories', stamp(categories))

  console.log('Inserting contact_categories...')
  await batchInsert('contact_categories', stamp(contactCategories))

  console.log('Inserting companies...')
  await batchInsert('companies', stamp(companies))

  console.log('Inserting pipelines...')
  await batchInsert('pipelines', stamp(pipelines))

  console.log('Inserting pipeline_stages...')
  await batchInsert('pipeline_stages', stamp(pipelineStages))

  console.log('Inserting opportunities...')
  await batchInsert('opportunities', stamp(opportunities))

  console.log('Inserting opportunity_contacts...')
  await batchInsert('opportunity_contacts', stamp(opportunityContacts))

  console.log('\nDone!')
}

main()
