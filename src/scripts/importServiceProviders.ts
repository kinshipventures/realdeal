// Service Providers CSV import script
// Usage: pnpm run seed
//
// Reads ~/Downloads/Service Providers - Sheet1 (1).csv
// Imports contacts into the 'Services for Founders' list, bucketed by category

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { Database } from '../lib/types'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// CSV column → DB field mapping
// Agency, Contact name, Category, Website, Contact Info, Email,
// Location, Specialization, Past Clients, Recommended by, Notes
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

async function run() {
  const csvPath = join(homedir(), 'Downloads', 'Service Providers - Sheet1 (1).csv')
  const content = readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content).filter(r => r['Agency']?.trim())

  // Fetch the Services for Founders list
  const { data: list, error: listErr } = await supabase
    .from('lists')
    .select('id')
    .eq('name', 'Services for Founders')
    .single()

  if (listErr || !list) {
    console.error('Could not find "Services for Founders" list. Run seed migrations first.')
    process.exit(1)
  }

  // Fetch all categories for this list
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('list_id', list.id)

  const categoryMap = new Map(categories?.map(c => [c.name.toLowerCase(), c.id]) ?? [])

  let imported = 0
  let skipped = 0

  for (const row of rows) {
    const name = row['Agency']?.trim()
    if (!name) continue

    const contactNote = row['Contact name']?.trim()
      ? `Contact: ${row['Contact name'].trim()}`
      : ''
    const existingNotes = row['Notes']?.trim()
    const notes = [contactNote, existingNotes].filter(Boolean).join('\n') || null

    const contactData = {
      name,
      email: row['Email']?.trim() || null,
      phone: row['Contact Info']?.trim() || null,
      website: row['Website']?.trim() || null,
      location: row['Location']?.trim() || null,
      specialization: row['Specialization']?.trim() || null,
      past_clients: row['Past Clients']?.trim() || null,
      recommended_by: row['Recommended by']?.trim() || null,
      notes,
    }

    // Upsert on email (if present), otherwise insert
    let contactId: string | null = null

    if (contactData.email) {
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', contactData.email)
        .single()

      if (existing) {
        await supabase.from('contacts').update(contactData).eq('id', existing.id)
        contactId = existing.id
        skipped++
      }
    }

    if (!contactId) {
      const { data: inserted, error } = await supabase
        .from('contacts')
        .insert(contactData)
        .select('id')
        .single()

      if (error || !inserted) {
        console.error(`Failed to insert ${name}:`, error?.message)
        continue
      }
      contactId = inserted.id
      imported++
    }

    // Resolve category
    const rawCategory = row['Category']?.trim().toLowerCase()
    const categoryId = rawCategory ? (categoryMap.get(rawCategory) ?? null) : null

    // Create list membership
    await supabase.from('list_memberships').upsert({
      contact_id: contactId,
      list_id: list.id,
      category_id: categoryId,
    }, { onConflict: 'contact_id,list_id,category_id' })
  }

  console.log(`Done. Imported: ${imported}, updated: ${skipped}`)
}

run().catch(console.error)
