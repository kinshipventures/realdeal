// One-time idempotent Airtable schema migration script
// Transforms the existing base into the v2.0 relationship-first data model.
//
// Usage: pnpm migrate:schema
//
// Steps:
//   1. Add Type, Status, Industry, Stage, Ticker, Domain fields to Contacts
//   2. Set existing contacts to Type=Contact, Status=Active
//   3. Create Company records from unique company text values
//   4. Add Company Record linked field and link contacts
//   5. Create Pipelines table
//   6. Create Pipeline Stages table
//   7. Create Opportunities table
//   8. Create Projects table

const TOKEN = process.env.VITE_AIRTABLE_TOKEN!
const BASE_ID = process.env.VITE_AIRTABLE_BASE_ID!

if (!TOKEN || !BASE_ID) {
  console.error('Missing VITE_AIRTABLE_TOKEN or VITE_AIRTABLE_BASE_ID')
  process.exit(1)
}

const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`
const META_URL = `https://api.airtable.com/v0/meta/bases/${BASE_ID}`
const CONTACTS_TABLE_ID = 'tbll75mRMMVBGiNpj'
const RATE_LIMIT_DELAY = 300

// ── Helpers ──────────────────────────────────────────────────────────────────

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

async function recordRequest(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`)
  return res.json()
}

async function getBaseSchema(): Promise<{ tables: Array<{ id: string; name: string; fields: Array<{ id: string; name: string; type: string }> }> }> {
  return metaRequest('/tables')
}

async function addFieldIfMissing(tableId: string, fieldSpec: Record<string, unknown>, existingFieldNames: string[]) {
  const name = fieldSpec.name as string
  if (existingFieldNames.includes(name)) {
    console.log(`  Skipping "${name}" — already exists`)
    return null
  }
  console.log(`  Adding "${name}"...`)
  const result = await metaRequest(`/tables/${tableId}/fields`, {
    method: 'POST',
    body: JSON.stringify(fieldSpec),
  })
  await delay(RATE_LIMIT_DELAY)
  return result
}

async function createTableIfMissing(name: string, fields: Record<string, unknown>[], existingTableNames: string[]) {
  if (existingTableNames.includes(name)) {
    console.log(`  Skipping table "${name}" — already exists`)
    // Return the existing table's ID
    return null
  }
  console.log(`  Creating table "${name}"...`)
  const result = await metaRequest('/tables', {
    method: 'POST',
    body: JSON.stringify({ name, fields }),
  })
  await delay(RATE_LIMIT_DELAY)
  return result
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchAllContacts(): Promise<Array<{ id: string; fields: Record<string, unknown> }>> {
  const records: Array<{ id: string; fields: Record<string, unknown> }> = []
  let offset: string | undefined
  do {
    const url = offset
      ? `${CONTACTS_TABLE_ID}?offset=${offset}`
      : CONTACTS_TABLE_ID
    const data = await recordRequest(url)
    records.push(...data.records)
    offset = data.offset
    if (offset) await delay(RATE_LIMIT_DELAY)
  } while (offset)
  return records
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Starting schema migration...\n')

  // ── Step 1: Add fields to Contacts table ────────────────────────────────

  console.log('[Step 1/8] Adding fields to Contacts table...')
  const schema = await getBaseSchema()
  const contactsTable = schema.tables.find(t => t.id === CONTACTS_TABLE_ID)
  if (!contactsTable) throw new Error(`Contacts table ${CONTACTS_TABLE_ID} not found in base`)

  const existingFieldNames = contactsTable.fields.map(f => f.name)
  console.log(`  Existing fields: ${existingFieldNames.join(', ')}`)

  await addFieldIfMissing(CONTACTS_TABLE_ID, {
    name: 'Type',
    type: 'singleSelect',
    options: { choices: [{ name: 'Contact' }, { name: 'Company' }] },
  }, existingFieldNames)

  await addFieldIfMissing(CONTACTS_TABLE_ID, {
    name: 'Status',
    type: 'singleSelect',
    options: { choices: [{ name: 'Active' }, { name: 'Pending' }, { name: 'Archived' }] },
  }, existingFieldNames)

  await addFieldIfMissing(CONTACTS_TABLE_ID, { name: 'Industry', type: 'singleLineText' }, existingFieldNames)
  await addFieldIfMissing(CONTACTS_TABLE_ID, { name: 'Stage', type: 'singleLineText' }, existingFieldNames)
  await addFieldIfMissing(CONTACTS_TABLE_ID, { name: 'Ticker', type: 'singleLineText' }, existingFieldNames)
  await addFieldIfMissing(CONTACTS_TABLE_ID, { name: 'Domain', type: 'singleLineText' }, existingFieldNames)

  console.log('Step 1 complete.\n')

  // ── Step 2: Set defaults on existing contacts ────────────────────────────

  console.log('[Step 2/8] Setting defaults on existing contacts...')
  const contacts = await fetchAllContacts()
  console.log(`  Found ${contacts.length} contacts`)

  const needsDefaults = contacts.filter(c => !c.fields['Type'] || !c.fields['Status'])
  console.log(`  ${needsDefaults.length} contacts need Type/Status defaults`)

  let updatedCount = 0
  for (const batch of chunk(needsDefaults, 10)) {
    await recordRequest(CONTACTS_TABLE_ID, {
      method: 'PATCH',
      body: JSON.stringify({
        records: batch.map(c => ({
          id: c.id,
          fields: {
            ...(c.fields['Type'] ? {} : { Type: 'Contact' }),
            ...(c.fields['Status'] ? {} : { Status: 'Active' }),
          },
        })),
      }),
    })
    updatedCount += batch.length
    await delay(RATE_LIMIT_DELAY)
  }
  console.log(`  Updated ${updatedCount} records`)
  console.log('Step 2 complete.\n')

  // ── Step 3: Create Company records ──────────────────────────────────────

  console.log('[Step 3/8] Creating Company records from existing contact data...')
  // Re-fetch to get fresh data including newly set Type field
  const freshContacts = await fetchAllContacts()

  // Collect unique company names (case-insensitive dedup, skip existing Company-type records)
  const companyMap = new Map<string, string>() // lowercase name → record ID
  const originalCasing = new Map<string, string>() // lowercase → first-seen original casing

  for (const c of freshContacts) {
    const companyName = (c.fields['Company'] as string | undefined)?.trim()
    if (!companyName) continue
    const key = companyName.toLowerCase()
    if (!originalCasing.has(key)) {
      originalCasing.set(key, companyName)
    }
  }

  // Check which Company records already exist (Type = 'Company')
  const existingCompanies = freshContacts.filter(c => c.fields['Type'] === 'Company')
  for (const c of existingCompanies) {
    const name = (c.fields['Name'] as string | undefined)?.trim()
    if (name) companyMap.set(name.toLowerCase(), c.id)
  }

  const namesToCreate = [...originalCasing.keys()].filter(key => !companyMap.has(key))
  console.log(`  Found ${originalCasing.size} unique company names, ${namesToCreate.length} need records`)

  for (const batch of chunk(namesToCreate, 10)) {
    const data = await recordRequest(CONTACTS_TABLE_ID, {
      method: 'POST',
      body: JSON.stringify({
        records: batch.map(key => ({
          fields: {
            Name: originalCasing.get(key)!,
            Type: 'Company',
            Status: 'Active',
          },
        })),
      }),
    })
    for (let i = 0; i < batch.length; i++) {
      companyMap.set(batch[i], data.records[i].id)
    }
    await delay(RATE_LIMIT_DELAY)
  }
  console.log(`  Company records total: ${companyMap.size}`)
  console.log('Step 3 complete.\n')

  // ── Step 4: Add Company Record linked field + link contacts ──────────────

  console.log('[Step 4/8] Adding Company Record linked field and linking contacts...')

  // Refresh schema to check for the new field
  const schemaAfterStep3 = await getBaseSchema()
  const contactsTableAfterStep3 = schemaAfterStep3.tables.find(t => t.id === CONTACTS_TABLE_ID)!
  const existingFieldNamesAfterStep3 = contactsTableAfterStep3.fields.map(f => f.name)

  let companyRecordFieldCreated = false
  if (!existingFieldNamesAfterStep3.includes('Company Record')) {
    console.log('  Adding "Company Record" self-referencing linked field...')
    try {
      const fieldResult = await metaRequest(`/tables/${CONTACTS_TABLE_ID}/fields`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Company Record',
          type: 'multipleRecordLinks',
          options: { linkedTableId: CONTACTS_TABLE_ID },
        }),
      })
      console.log(`  "Company Record" field created. Auto-created inverse field response:`, JSON.stringify(fieldResult, null, 2))
      companyRecordFieldCreated = true
      await delay(RATE_LIMIT_DELAY)
    } catch (err) {
      console.error(`  Self-referencing linked field not supported via API. Company Record field must be created manually in Airtable UI.`)
      console.error(`  Error details: ${err}`)
      console.log('  Skipping contact linking step — no Company Record field available.')
    }
  } else {
    console.log('  "Company Record" field already exists')
    companyRecordFieldCreated = true
  }

  if (companyRecordFieldCreated) {
    // Link contacts to their Company records
    const contactsWithCompany = freshContacts.filter(c => {
      const company = (c.fields['Company'] as string | undefined)?.trim()
      return company && c.fields['Type'] !== 'Company' && companyMap.has(company.toLowerCase())
    })
    console.log(`  Linking ${contactsWithCompany.length} contacts to Company records...`)

    let linkedCount = 0
    for (const batch of chunk(contactsWithCompany, 10)) {
      await recordRequest(CONTACTS_TABLE_ID, {
        method: 'PATCH',
        body: JSON.stringify({
          records: batch.map(c => {
            const company = (c.fields['Company'] as string).trim()
            return {
              id: c.id,
              fields: {
                'Company Record': [companyMap.get(company.toLowerCase())!],
              },
            }
          }),
        }),
      })
      linkedCount += batch.length
      await delay(RATE_LIMIT_DELAY)
    }
    console.log(`  Linked ${linkedCount} contacts`)
  }
  console.log('Step 4 complete.\n')

  // ── Step 5: Create Pipelines table ──────────────────────────────────────

  console.log('[Step 5/8] Creating Pipelines table...')
  const schemaForTables = await getBaseSchema()
  const existingTableNames = schemaForTables.tables.map(t => t.name)
  const existingTablesByName = Object.fromEntries(schemaForTables.tables.map(t => [t.name, t.id]))

  let pipelinesTableId: string
  if (existingTablesByName['Pipelines']) {
    pipelinesTableId = existingTablesByName['Pipelines']
    console.log(`  Pipelines table already exists: ${pipelinesTableId}`)
  } else {
    const result = await createTableIfMissing('Pipelines', [
      { name: 'Name', type: 'singleLineText' },
      {
        name: 'Pipeline Status',
        type: 'singleSelect',
        options: { choices: [{ name: 'active' }, { name: 'hidden' }] },
      },
    ], existingTableNames)
    pipelinesTableId = result.id
    console.log(`  Pipelines table created: ${pipelinesTableId}`)
  }
  console.log('Step 5 complete.\n')

  // ── Step 6: Create Pipeline Stages table ────────────────────────────────

  console.log('[Step 6/8] Creating Pipeline Stages table...')
  let pipelineStagesTableId: string
  if (existingTablesByName['Pipeline Stages']) {
    pipelineStagesTableId = existingTablesByName['Pipeline Stages']
    console.log(`  Pipeline Stages table already exists: ${pipelineStagesTableId}`)
  } else {
    const result = await createTableIfMissing('Pipeline Stages', [
      { name: 'Name', type: 'singleLineText' },
      { name: 'Color', type: 'singleLineText' },
      { name: 'Order', type: 'number', options: { precision: 0 } },
      {
        name: 'Pipeline',
        type: 'multipleRecordLinks',
        options: { linkedTableId: pipelinesTableId },
      },
    ], existingTableNames)
    pipelineStagesTableId = result.id
    console.log(`  Pipeline Stages table created: ${pipelineStagesTableId}`)
  }
  console.log('Step 6 complete.\n')

  // ── Step 7: Create Opportunities table ──────────────────────────────────

  console.log('[Step 7/8] Creating Opportunities table...')
  let opportunitiesTableId: string
  if (existingTablesByName['Opportunities']) {
    opportunitiesTableId = existingTablesByName['Opportunities']
    console.log(`  Opportunities table already exists: ${opportunitiesTableId}`)
  } else {
    const result = await createTableIfMissing('Opportunities', [
      { name: 'Name', type: 'singleLineText' },
      {
        name: 'Stage',
        type: 'multipleRecordLinks',
        options: { linkedTableId: pipelineStagesTableId },
      },
      {
        name: 'Relationships',
        type: 'multipleRecordLinks',
        options: { linkedTableId: CONTACTS_TABLE_ID },
      },
      { name: 'Notes', type: 'multipleLineText' },
      {
        name: 'Priority',
        type: 'singleSelect',
        options: { choices: [{ name: 'high' }, { name: 'medium' }, { name: 'low' }] },
      },
      {
        name: 'Opportunity Status',
        type: 'singleSelect',
        options: { choices: [{ name: 'open' }, { name: 'won' }, { name: 'lost' }, { name: 'archived' }] },
      },
    ], existingTableNames)
    opportunitiesTableId = result.id
    console.log(`  Opportunities table created: ${opportunitiesTableId}`)
  }
  console.log('Step 7 complete.\n')

  // ── Step 8: Create Projects table ───────────────────────────────────────

  console.log('[Step 8/8] Creating Projects table...')
  let projectsTableId: string
  if (existingTablesByName['Projects']) {
    projectsTableId = existingTablesByName['Projects']
    console.log(`  Projects table already exists: ${projectsTableId}`)
  } else {
    const result = await createTableIfMissing('Projects', [
      { name: 'Name', type: 'singleLineText' },
      { name: 'Description', type: 'multipleLineText' },
      { name: 'Owner', type: 'singleLineText' },
      {
        name: 'Relationships',
        type: 'multipleRecordLinks',
        options: { linkedTableId: CONTACTS_TABLE_ID },
      },
      {
        name: 'Opportunities',
        type: 'multipleRecordLinks',
        options: { linkedTableId: opportunitiesTableId },
      },
      { name: 'Notes', type: 'multipleLineText' },
    ], existingTableNames)
    projectsTableId = result.id
    console.log(`  Projects table created: ${projectsTableId}`)
  }
  console.log('Step 8 complete.\n')

  // ── Summary ──────────────────────────────────────────────────────────────

  console.log('Migration complete!\n')
  console.log('New table IDs (copy this into Plan 02 for airtable.ts update):')
  console.log(JSON.stringify({
    pipelines: pipelinesTableId,
    pipelineStages: pipelineStagesTableId,
    opportunities: opportunitiesTableId,
    projects: projectsTableId,
  }, null, 2))
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
