// Service Providers CSV import script
// Usage: pnpm run seed:csv
//
// Reads ~/Downloads/Service Providers - Sheet1 (1).csv
// Imports contacts into the 'Services for Founders' list, bucketed by category

import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

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
  contacts: 'tbll75mRMMVBGiNpj',
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

async function fetchAll(table: string, params = ''): Promise<{ id: string; fields: Record<string, unknown> }[]> {
  const records: { id: string; fields: Record<string, unknown> }[] = []
  let offset: string | undefined
  do {
    const sep = params ? '&' : '?'
    const url = offset ? `${table}?${params}${sep}offset=${offset}` : params ? `${table}?${params}` : table
    let data
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        data = await airtable(url)
        break
      } catch (e) {
        if (attempt === 2) throw e
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
    records.push(...data.records)
    offset = data.offset
    if (offset) await new Promise(r => setTimeout(r, 200)) // pace pagination
  } while (offset)
  return records
}

// ── CSV parsing ──────────────────────────────────────────────────────────────

function parseCSV(content: string) {
  const lines = content.split('\n').filter(l => l.trim())
  const headers = parseRow(lines[0])
  return lines.slice(1).map(line => {
    const values = parseRow(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

function parseRow(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const csvPath = join(homedir(), 'Downloads', 'Service Providers - Sheet1 (1).csv')
  const content = readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content).filter(r => r['Agency']?.trim())

  console.log('Fetching list...')
  const lists = await fetchAll(TABLES.lists, `filterByFormula=${encodeURIComponent('Name="Services for Founders"')}`)
  const list = lists[0]
  if (!list) {
    console.error('Could not find "Services for Founders" list. Run pnpm run seed:lists first.')
    process.exit(1)
  }
  const listId = list.id
  console.log(`List found: ${list.fields.Name} (${listId})`)

  console.log('Fetching categories...')
  const allCategories = await fetchAll(TABLES.categories)
  // Filter client-side — formula FIND on linked fields matches names, not IDs
  const listCategories = allCategories.filter(c => {
    const linked = c.fields.List as string[] | undefined
    return linked?.includes(listId)
  })
  const categoryMap = new Map(
    listCategories.map(c => [(c.fields.Name as string).toLowerCase(), c.id])
  )
  console.log(`${listCategories.length} categories linked to list`)

  // Create any categories present in CSV but missing from Airtable
  const csvCategories = [...new Set(
    parseCSV(content).map(r => r['Category']?.trim()).filter(Boolean)
  )]
  for (const name of csvCategories) {
    if (!categoryMap.has(name.toLowerCase())) {
      console.log(`  Creating category: ${name}`)
      const r = await airtable(TABLES.categories, {
        method: 'POST',
        body: JSON.stringify({ fields: { Name: name, List: [listId] } }),
      })
      categoryMap.set(name.toLowerCase(), r.id)
      await new Promise(res => setTimeout(res, 250))
    }
  }
  console.log(`${categoryMap.size} categories ready`)

  console.log('Fetching existing contacts for dedup (email only)...')
  const existingContacts = await fetchAll(TABLES.contacts, 'fields[]=Email')
  const emailIndex = new Map(
    existingContacts
      .filter(c => c.fields.Email)
      .map(c => [(c.fields.Email as string).toLowerCase(), c.id])
  )
  console.log(`${existingContacts.length} existing contacts indexed. Starting import of ${rows.length} rows...`)

  let imported = 0
  let updated = 0
  let i = 0

  for (const row of rows) {
    const name = row['Agency']?.trim()
    if (!name) continue

    const contactNote = row['Contact name']?.trim()
      ? `Contact: ${row['Contact name'].trim()}`
      : ''
    const existingNotes = row['Notes']?.trim()
    const notes = [contactNote, existingNotes].filter(Boolean).join('\n') || undefined

    const rawCategory = row['Category']?.trim().toLowerCase()
    const categoryId = rawCategory ? (categoryMap.get(rawCategory) ?? null) : null

    const fields: Record<string, unknown> = {
      Name: name,
      Email: row['Email']?.trim() || undefined,
      Phone: row['Contact Info']?.trim() || undefined,
      Website: row['Website']?.trim() || undefined,
      Location: row['Location']?.trim() || undefined,
      Specialization: row['Specialization']?.trim() || undefined,
      'Past Clients': row['Past Clients']?.trim() || undefined,
      'Recommended By': row['Recommended by']?.trim() || undefined,
      Notes: notes,
      Lists: [listId],
      Categories: categoryId ? [categoryId] : undefined,
    }

    const email = row['Email']?.trim().toLowerCase()
    const existingId = email ? emailIndex.get(email) : undefined

    if (existingId) {
      await airtable(`${TABLES.contacts}/${existingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields }),
      })
      updated++
    } else {
      const r = await airtable(TABLES.contacts, {
        method: 'POST',
        body: JSON.stringify({ fields }),
      })
      if (email) emailIndex.set(email, r.id)
      imported++
    }

    i++
    if (i % 10 === 0) process.stdout.write(`\r${i}/${rows.length} (${imported} new, ${updated} updated)`)
    await new Promise(r => setTimeout(r, 250)) // stay under 5 req/sec
  }

  console.log(`\nDone. Imported: ${imported}, updated: ${updated}`)
}

run().catch(err => { console.error(err); process.exit(1) })
