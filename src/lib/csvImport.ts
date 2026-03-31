import type { RelationshipType } from './types'
import { getContacts, createContact } from './airtable'

// ── Types ────────────────────────────────────────────────────────────────────

export type ParsedCSV = { headers: string[]; rows: Record<string, string>[] }

export type ColumnMapping = { csvHeader: string; airtableField: string | null }[]

export type ImportProgress = { current: number; total: number; imported: number; skipped: number }

export type ImportResult = { imported: number; skipped: number; errors: string[] }

// ── Known field aliases ───────────────────────────────────────────────────────

const KNOWN_FIELDS: Record<string, string> = {
  'name': 'Name',
  'email': 'Email',
  'phone': 'Phone',
  'company': 'Company',
  'role': 'Role',
  'location': 'Location',
  'website': 'Website',
  'notes': 'Notes',
  'specialization': 'Specialization',
  'recommended by': 'Recommended By',
  'past clients': 'Past Clients',
  'contact info': 'Phone',
  'agency': 'Name',
  'category': '_category',
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

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

export function parseCSV(content: string): ParsedCSV {
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(line => {
    const values = parseRow(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  }).filter(row => Object.values(row).some(v => v.trim() !== ''))

  return { headers, rows }
}

// ── Column detection ─────────────────────────────────────────────────────────

export function detectColumns(headers: string[]): ColumnMapping {
  return headers.map(csvHeader => {
    const lower = csvHeader.toLowerCase().trim()
    const airtableField = KNOWN_FIELDS[lower] ?? null
    return { csvHeader, airtableField }
  })
}

// ── Import ────────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export function countInvalidRows(
  rows: Record<string, string>[],
  type: RelationshipType
): number {
  return rows.filter(row => {
    if (type === 'Company') {
      const name = (row['Name'] ?? row['Agency'] ?? row['Company Name'] ?? '').trim()
      return !name
    }
    const name = (row['Name'] ?? row['Agency'] ?? '').trim()
    return !name
  }).length
}

export async function importContacts(
  rows: Record<string, string>[],
  podId: string,
  onProgress?: (progress: ImportProgress) => void,
  options?: { type?: RelationshipType; podIds?: string[] }
): Promise<ImportResult> {
  const recordType: RelationshipType = options?.type ?? 'Contact'
  const listIds: string[] = options?.podIds ?? [podId]
  const existing = await getContacts()

  // Build dual dedup index
  const emailIndex = new Map<string, string>()
  const nameIndex = new Map<string, string>()
  for (const c of existing) {
    if (c.email) emailIndex.set(c.email.toLowerCase(), c.id)
    if (c.name) nameIndex.set(c.name.toLowerCase().trim(), c.id)
  }

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    // Resolve name — support different column conventions
    const name = (
      recordType === 'Company'
        ? (row['Name'] ?? row['Company Name'] ?? row['Agency'] ?? '')
        : (row['Name'] ?? row['Agency'] ?? '')
    ).trim()

    if (!name) {
      skipped++
      onProgress?.({ current: i + 1, total: rows.length, imported, skipped })
      continue
    }

    const email = (row['Email'] ?? '').trim()
    const nameLower = name.toLowerCase()
    const emailLower = email.toLowerCase()

    const isDup = (emailLower && emailIndex.has(emailLower)) || nameIndex.has(nameLower)
    if (isDup) {
      skipped++
      onProgress?.({ current: i + 1, total: rows.length, imported, skipped })
      continue
    }

    try {
      const contact = await createContact({
        name,
        type: recordType,
        status: 'Pending',
        email: email || null,
        phone: (row['Phone'] ?? row['Contact Info'] ?? '').trim() || null,
        company: (row['Company'] ?? '').trim() || null,
        role: (row['Role'] ?? '').trim() || null,
        location: (row['Location'] ?? '').trim() || null,
        website: (row['Website'] ?? '').trim() || null,
        notes: (row['Notes'] ?? '').trim() || null,
        recommended_by: (row['Recommended By'] ?? '').trim() || null,
        specialization: (row['Specialization'] ?? '').trim() || null,
        past_clients: (row['Past Clients'] ?? '').trim() || null,
        industry: (row['Industry'] ?? '').trim() || null,
        domain: (row['Domain'] ?? '').trim() || null,
        stage: (row['Stage'] ?? '').trim() || null,
        ticker: (row['Ticker'] ?? '').trim() || null,
        linkedin: (row['LinkedIn'] ?? row['Linkedin'] ?? '').trim() || null,
        birthday: null,
        milestones: null,
        interests: null,
        relationship_context: null,
        last_contacted_at: null,
        list_ids: listIds,
        category_ids: [],
        first_name: null, last_name: null,
        country: null, global_region: null, gender: null,
        introduced_by: null, intel_notes: null, relationship_owner: null,
        contact_frequency: null, next_follow_up_date: null, next_action: null,
        kv_fund_investor: null, spv_investor: null, needs_review: false,
        company_record_id: null, custom_fields: {},
        primary_list_id: null, cadence_override: null,
        email_2: null, email_3: null,
      })

      // Update dedup index with newly created contact
      if (email) emailIndex.set(emailLower, contact.id)
      nameIndex.set(nameLower, contact.id)
      imported++
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`)
    }

    onProgress?.({ current: i + 1, total: rows.length, imported, skipped })
    await delay(250) // Airtable rate limit: 5 req/sec
  }

  return { imported, skipped, errors }
}
