#!/usr/bin/env npx tsx
/**
 * Airtable schema migration: add Description + Capacity to Lists table,
 * add Primary Pod + Cadence Override to Contacts table.
 *
 * Run: npx tsx scripts/addPodFields.ts
 * Requires: .env.local with VITE_AIRTABLE_TOKEN and VITE_AIRTABLE_BASE_ID
 */

import { readFileSync } from 'fs'

// Load env
const envFile = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const [k, ...v] = l.split('=')
      return [k.trim(), v.join('=').trim()]
    })
)

const TOKEN = env.VITE_AIRTABLE_TOKEN
const BASE_ID = env.VITE_AIRTABLE_BASE_ID
const META_URL = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`

// Table IDs
const LISTS_TABLE = 'tblnsxNUscKApvMsV'
const CONTACTS_TABLE = 'tbll75mRMMVBGiNpj'

async function addField(tableId: string, field: Record<string, unknown>) {
  const res = await fetch(`${META_URL}/${tableId}/fields`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(field),
  })

  const data = await res.json() as { id?: string; name?: string; error?: string; message?: string }
  if (!res.ok) {
    // Field may already exist — log and continue
    console.warn(`  [${res.status}] ${data.error ?? data.message ?? 'unknown error'} — field may already exist`)
    return null
  }

  console.log(`  + Created field: ${data.name} (${data.id})`)
  return data
}

async function run() {
  console.log('Adding fields to Lists table (Pods)...')

  await addField(LISTS_TABLE, {
    name: 'Description',
    type: 'multilineText',
  })

  await addField(LISTS_TABLE, {
    name: 'Capacity',
    type: 'number',
    options: { precision: 0 },
  })

  console.log('\nAdding fields to Contacts table...')

  await addField(CONTACTS_TABLE, {
    name: 'Primary Pod',
    type: 'singleLineText',
  })

  await addField(CONTACTS_TABLE, {
    name: 'Cadence Override',
    type: 'singleSelect',
    options: {
      choices: [
        { name: 'weekly' },
        { name: 'biweekly' },
        { name: 'monthly' },
        { name: 'quarterly' },
      ],
    },
  })

  console.log('\nDone. Run pnpm build to verify types compile.')
}

run().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
