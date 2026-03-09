// Seed Airtable with Moj's lists and categories
// Usage: pnpm run seed:lists
//
// Clears existing lists + categories, then inserts the full set.

const TOKEN = process.env.VITE_AIRTABLE_TOKEN!
const BASE_ID = process.env.VITE_AIRTABLE_BASE_ID!
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`

if (!TOKEN || !BASE_ID) {
  console.error('Missing VITE_AIRTABLE_TOKEN or VITE_AIRTABLE_BASE_ID')
  process.exit(1)
}

const TABLES = {
  lists: 'tblnsxNUscKApvMsV',
  categories: 'tblVAgv23LUXs7Q0p',
}

async function airtable(path: string, options?: RequestInit) {
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

async function fetchAllIds(table: string): Promise<string[]> {
  const ids: string[] = []
  let offset: string | undefined
  do {
    const url = offset ? `${table}?offset=${offset}` : table
    const data = await airtable(url)
    ids.push(...data.records.map((r: { id: string }) => r.id))
    offset = data.offset
  } while (offset)
  return ids
}

async function deleteAll(table: string) {
  const ids = await fetchAllIds(table)
  // Airtable delete supports up to 10 at a time
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10)
    const params = batch.map(id => `records[]=${id}`).join('&')
    await airtable(`${table}?${params}`, { method: 'DELETE' })
  }
  console.log(`Deleted ${ids.length} records from ${table}`)
}

async function createList(name: string, color: string, owner: string, isPriority: boolean): Promise<string> {
  const r = await airtable(TABLES.lists, {
    method: 'POST',
    body: JSON.stringify({ fields: { Name: name, Color: color, Owner: owner, 'Is Priority': isPriority } }),
  })
  return r.id
}

async function createCategories(names: string[], listId: string) {
  // Airtable create supports up to 10 at a time
  for (let i = 0; i < names.length; i += 10) {
    const batch = names.slice(i, i + 10)
    await airtable(TABLES.categories, {
      method: 'POST',
      body: JSON.stringify({ records: batch.map(name => ({ fields: { Name: name, List: [listId] } })) }),
    })
  }
}

async function run() {
  console.log('Clearing existing data...')
  await deleteAll(TABLES.categories)
  await deleteAll(TABLES.lists)

  console.log('Seeding lists...')
  const [
    mapsId, mapsLiteId, talentId, mmProfId, familyId, generalId, servicesId,
    lpsId, pipelineId, spvId, companiesId
  ] = await Promise.all([
    createList('MAPS',                          '#E53E3E', 'moj_mahdara',      true),
    createList('MAPS Lite',                     '#ED8936', 'moj_mahdara',      false),
    createList('Talent & Influencers',          '#38B2AC', 'moj_mahdara',      false),
    createList('MM Professionals & Resources',  '#805AD5', 'moj_mahdara',      false),
    createList('Family & Friends',              '#D69E2E', 'moj_mahdara',      false),
    createList('General',                       '#718096', 'moj_mahdara',      false),
    createList('Services for Founders',         '#48BB78', 'moj_mahdara',      false),
    createList('LPs',                           '#F6AD55', 'kinship_ventures', false),
    createList('Pipeline',                      '#68D391', 'kinship_ventures', false),
    createList('SPV',                           '#63B3ED', 'kinship_ventures', false),
    createList('Companies',                     '#FC8181', 'kinship_ventures', false),
  ])
  console.log('Lists created.')

  console.log('Seeding categories...')
  await Promise.all([
    createCategories([
      'Art', 'Music', 'VCS / Investment Exec', 'Hospitality',
      'Silicon Valley / Tech', 'Philanthropy', 'Beauty', 'Fashion', 'Family & Friends',
    ], mapsId),
    createCategories([
      'Celebrities', 'Musicians', 'Athletes', 'Execs / Thought Leaders',
      'Micro (5-20k)', 'Pro / MUA / Industry', 'Fashion', 'Beauty Editors',
      'DJs', 'Models', 'Fitness', 'Music', 'Latinx', 'Asian', 'Natural Hair', 'African American',
    ], talentId),
    createCategories(['LP ABG', 'LP Internal', 'LP PR', 'Existing SPVs'], lpsId),
    createCategories([
      'Web Development & Design', 'Branding', 'PR', 'Marketing',
      'Legal', 'Finance', 'HR + Benefits', 'Recruiting',
      'Executive Coaching', 'SEO', 'Design', 'Copywriting',
    ], servicesId),
  ])

  // Suppress unused var warnings for lists with no categories yet
  void mapsLiteId; void mmProfId; void familyId; void generalId
  void pipelineId; void spvId; void companiesId

  console.log('Done. All lists and categories seeded.')
}

run().catch(err => { console.error(err); process.exit(1) })
