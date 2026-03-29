// Idempotent migration: create "Field Config" table in Airtable
//
// Usage: pnpm migrate:fieldconfig

const TOKEN = process.env.VITE_AIRTABLE_TOKEN!
const BASE_ID = process.env.VITE_AIRTABLE_BASE_ID!

if (!TOKEN || !BASE_ID) {
  console.error('Missing VITE_AIRTABLE_TOKEN or VITE_AIRTABLE_BASE_ID')
  process.exit(1)
}

const META_URL = `https://api.airtable.com/v0/meta/bases/${BASE_ID}`
const LISTS_TABLE_ID = 'tblnsxNUscKApvMsV'

async function metaRequest(path: string, options?: RequestInit) {
  const res = await fetch(`${META_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`Airtable meta ${res.status}: ${await res.text()}`)
  return res.json()
}

async function main() {
  console.log('Starting Field Config migration...\n')

  const schema = await metaRequest('/tables') as { tables: Array<{ id: string; name: string }> }
  const existingTableNames = schema.tables.map(t => t.name)

  if (existingTableNames.includes('Field Config')) {
    const existing = schema.tables.find(t => t.name === 'Field Config')!
    console.log(`Field Config table already exists: ${existing.id}`)
    console.log('Nothing to do.')
    return
  }

  console.log('Creating "Field Config" table...')
  const result = await metaRequest('/tables', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Field Config',
      fields: [
        { name: 'Name', type: 'singleLineText' },
        { name: 'Airtable Field ID', type: 'singleLineText' },
        {
          name: 'Field Type',
          type: 'singleSelect',
          options: { choices: [
            { name: 'text' },
            { name: 'multiline' },
            { name: 'number' },
            { name: 'select' },
            { name: 'date' },
            { name: 'checkbox' },
          ]},
        },
        {
          name: 'Scope Type',
          type: 'singleSelect',
          options: { choices: [
            { name: 'Contact' },
            { name: 'Company' },
            { name: 'Both' },
          ]},
        },
        {
          name: 'Scope Pod',
          type: 'multipleRecordLinks',
          options: { linkedTableId: LISTS_TABLE_ID },
        },
        { name: 'Required', type: 'checkbox' },
        { name: 'Display Order', type: 'number', options: { precision: 0 } },
      ],
    }),
  }) as { id: string }

  console.log(`\nField Config table created: ${result.id}`)
  console.log(`\nUpdate TABLES.fieldConfig in src/lib/airtable.ts:`)
  console.log(`  fieldConfig: '${result.id}',`)
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
