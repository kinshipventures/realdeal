import type { RelationshipType } from './types'
import { getContacts, createContact } from './airtable'

// ── Types ────────────────────────────────────────────────────────────────────

export type ParsedCSV = { headers: string[]; rows: Record<string, string>[] }

export type ColumnMapping = { csvHeader: string; airtableField: string | null }[]

export type ImportProgress = { current: number; total: number; imported: number; skipped: number }

export type ImportResult = { imported: number; skipped: number; errors: string[] }

// ── Target fields (what RealDeal accepts) ────────────────────────────────────

export type RowWarning = { rowIndex: number; kind: 'missing_name' | 'duplicate' | 'bad_date'; detail?: string }

export const TARGET_FIELDS = [
  'Name', 'First Name', 'Last Name',
  'Email', 'Phone', 'Company', 'Role', 'Location',
  'Website', 'LinkedIn', 'Notes', 'Birthday',
  'Industry', 'Domain', 'Stage', 'Ticker',
  'Specialization', 'Recommended By', 'Past Clients',
  'Country', 'Gender',
  'Interests', 'Relationship Context',
  'Email 2', 'Email 3',
  'Introduced By', 'Intel Notes', 'Contact Frequency',
] as const

export type TargetField = typeof TARGET_FIELDS[number]

// ── Known field aliases ───────────────────────────────────────────────────────
// Maps normalized CSV header -> RealDeal target field.
// Covers Google Contacts, Apple Contacts, LinkedIn, Outlook, HubSpot, Salesforce.

const KNOWN_ALIASES: Record<string, TargetField> = {
  // Name
  'name': 'Name', 'full name': 'Name', 'display name': 'Name', 'contact name': 'Name',
  'agency': 'Name', 'company name': 'Name',
  'first name': 'First Name', 'given name': 'First Name', 'first': 'First Name', 'firstname': 'First Name',
  'last name': 'Last Name', 'family name': 'Last Name', 'surname': 'Last Name', 'last': 'Last Name', 'lastname': 'Last Name',
  // Email
  'email': 'Email', 'email address': 'Email', 'e-mail': 'Email', 'e-mail address': 'Email',
  'primary email': 'Email', 'email 1': 'Email', 'email 1 - value': 'Email',
  'work email': 'Email', 'personal email': 'Email', 'home email': 'Email',
  // Phone
  'phone': 'Phone', 'phone number': 'Phone', 'mobile': 'Phone', 'mobile phone': 'Phone',
  'cell': 'Phone', 'cell phone': 'Phone', 'telephone': 'Phone', 'contact info': 'Phone',
  'phone 1 - value': 'Phone', 'work phone': 'Phone', 'home phone': 'Phone',
  // Company
  'company': 'Company', 'organization': 'Company', 'organization 1 - name': 'Company',
  'employer': 'Company', 'firm': 'Company', 'account name': 'Company',
  'company/organization': 'Company',
  // Role
  'role': 'Role', 'title': 'Role', 'job title': 'Role', 'position': 'Role',
  'organization 1 - title': 'Role', 'designation': 'Role',
  // Location
  'location': 'Location', 'city': 'Location', 'address': 'Location',
  'city/town': 'Location', 'home city': 'Location', 'work city': 'Location',
  'address 1 - formatted': 'Location',
  // Website
  'website': 'Website', 'url': 'Website', 'web page': 'Website',
  'website 1 - value': 'Website', 'personal website': 'Website', 'blog': 'Website',
  // LinkedIn
  'linkedin': 'LinkedIn', 'linkedin url': 'LinkedIn', 'linkedin profile': 'LinkedIn',
  'linkedin profile url': 'LinkedIn',
  // Notes
  'notes': 'Notes', 'note': 'Notes', 'description': 'Notes', 'comments': 'Notes', 'bio': 'Notes',
  // Birthday
  'birthday': 'Birthday', 'date of birth': 'Birthday', 'dob': 'Birthday', 'birthdate': 'Birthday',
  // Industry
  'industry': 'Industry', 'sector': 'Industry',
  // Domain
  'domain': 'Domain', 'company domain': 'Domain', 'website domain': 'Domain',
  // Other
  'specialization': 'Specialization', 'specialty': 'Specialization', 'expertise': 'Specialization',
  'recommended by': 'Recommended By', 'referred by': 'Recommended By', 'referral': 'Recommended By', 'source': 'Recommended By',
  'past clients': 'Past Clients',
  'country': 'Country', 'country/region': 'Country', 'nation': 'Country',
  'gender': 'Gender', 'sex': 'Gender',
  'stage': 'Stage', 'funding stage': 'Stage',
  'ticker': 'Ticker', 'stock ticker': 'Ticker', 'symbol': 'Ticker',
  // Expanded fields
  'interests': 'Interests', 'hobbies': 'Interests', 'passions': 'Interests',
  'relationship context': 'Relationship Context', 'relationship notes': 'Relationship Context',
  'email 2': 'Email 2', 'email2': 'Email 2', 'secondary email': 'Email 2', 'email 2  value': 'Email 2',
  'email 3': 'Email 3', 'email3': 'Email 3', 'tertiary email': 'Email 3', 'email 3  value': 'Email 3',
  'introduced by': 'Introduced By', 'intro by': 'Introduced By',
  'intel notes': 'Intel Notes', 'intel': 'Intel Notes',
  'contact frequency': 'Contact Frequency', 'frequency': 'Contact Frequency', 'cadence': 'Contact Frequency',
  'category': '_category' as any,
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

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

export function detectColumns(headers: string[]): ColumnMapping {
  const used = new Set<string>()
  return headers.map(csvHeader => {
    const norm = normalize(csvHeader)
    const match = KNOWN_ALIASES[norm] ?? null
    // Avoid mapping two CSV columns to the same target (first wins)
    if (match && used.has(match)) {
      return { csvHeader, airtableField: null }
    }
    if (match) used.add(match)
    return { csvHeader, airtableField: match }
  })
}

// ── Row warnings ─────────────────────────────────────────────────────────────

export function getRowWarnings(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  existingEmails: Map<string, string>,
  existingNames: Map<string, string>,
): RowWarning[] {
  const warnings: RowWarning[] = []
  const seenEmails = new Set<string>()
  const seenNames = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const name = resolveName(row, mapping, 'Contact')
    if (!name) {
      warnings.push({ rowIndex: i, kind: 'missing_name' })
      continue
    }

    const email = resolve(row, mapping, 'Email')
    const nameLower = name.toLowerCase().trim()
    const emailLower = email.toLowerCase()

    if ((emailLower && (existingEmails.has(emailLower) || seenEmails.has(emailLower)))
        || (existingNames.has(nameLower) || seenNames.has(nameLower))) {
      warnings.push({ rowIndex: i, kind: 'duplicate', detail: email || name })
    }

    if (emailLower) seenEmails.add(emailLower)
    seenNames.add(nameLower)

    const birthday = resolve(row, mapping, 'Birthday')
    if (birthday && isNaN(Date.parse(birthday))) {
      warnings.push({ rowIndex: i, kind: 'bad_date', detail: birthday })
    }
  }
  return warnings
}

// ── Mapping helpers ──────────────────────────────────────────────────────────

/** Given a column mapping and a row, resolve the value for a target field. */
function resolve(row: Record<string, string>, mapping: ColumnMapping, target: string): string {
  const col = mapping.find(m => m.airtableField === target)
  if (!col) return ''
  return (row[col.csvHeader] ?? '').trim()
}

/** Resolve name: handles Name, or First Name + Last Name merge. */
function resolveName(row: Record<string, string>, mapping: ColumnMapping, type: RelationshipType): string {
  const direct = resolve(row, mapping, 'Name')
  if (direct) return direct
  if (type === 'Company') {
    const companyName = resolve(row, mapping, 'Company')
    if (companyName) return companyName
  }
  const first = resolve(row, mapping, 'First Name')
  const last = resolve(row, mapping, 'Last Name')
  return [first, last].filter(Boolean).join(' ')
}

// ── Import ────────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export function countInvalidRows(
  rows: Record<string, string>[],
  type: RelationshipType,
  mapping?: ColumnMapping
): number {
  if (!mapping) {
    // Legacy fallback
    return rows.filter(row => {
      const name = (row['Name'] ?? row['Agency'] ?? row['Company Name'] ?? '').trim()
      return !name
    }).length
  }
  return rows.filter(row => !resolveName(row, mapping, type)).length
}

export async function importContacts(
  rows: Record<string, string>[],
  podId: string,
  onProgress?: (progress: ImportProgress) => void,
  options?: {
    type?: RelationshipType
    podIds?: string[]
    mapping?: ColumnMapping
    customFieldMap?: Record<string, string>  // csvHeader -> fieldConfig.id
    categoryMap?: Map<string, string>        // normalized category value -> category id
  }
): Promise<ImportResult> {
  const recordType: RelationshipType = options?.type ?? 'Contact'
  const listIds: string[] = options?.podIds ?? [podId]
  const mapping = options?.mapping
  const customFieldMap = options?.customFieldMap ?? {}
  const categoryMap = options?.categoryMap ?? new Map<string, string>()
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

  // Helper: resolve a value using mapping or legacy hardcoded keys
  const r = (row: Record<string, string>, target: TargetField, ...legacyKeys: string[]): string => {
    if (mapping) return resolve(row, mapping, target)
    for (const k of legacyKeys) {
      const v = (row[k] ?? '').trim()
      if (v) return v
    }
    return ''
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    const name = mapping
      ? resolveName(row, mapping, recordType)
      : (recordType === 'Company'
          ? (row['Name'] ?? row['Company Name'] ?? row['Agency'] ?? '')
          : (row['Name'] ?? row['Agency'] ?? '')
        ).trim()

    if (!name) {
      skipped++
      onProgress?.({ current: i + 1, total: rows.length, imported, skipped })
      continue
    }

    const email = r(row, 'Email', 'Email')
    const nameLower = name.toLowerCase()
    const emailLower = email.toLowerCase()

    const isDup = (emailLower && emailIndex.has(emailLower)) || nameIndex.has(nameLower)
    if (isDup) {
      skipped++
      onProgress?.({ current: i + 1, total: rows.length, imported, skipped })
      continue
    }

    const firstName = mapping ? resolve(row, mapping, 'First Name') : null
    const lastName = mapping ? resolve(row, mapping, 'Last Name') : null

    try {
      // Build custom_fields from cf:-prefixed mappings
      const cfValues: Record<string, unknown> = {}
      if (mapping) {
        for (const [csvHeader, fieldId] of Object.entries(customFieldMap)) {
          const val = (row[csvHeader] ?? '').trim()
          if (val) cfValues[fieldId] = val
        }
      }

      // Resolve category from _category sentinel
      const catIds: string[] = []
      if (mapping) {
        const catCol = mapping.find(m => m.airtableField === '_category')
        if (catCol) {
          const catVal = (row[catCol.csvHeader] ?? '').trim()
          if (catVal) {
            const catId = categoryMap.get(normalize(catVal))
            if (catId) catIds.push(catId)
          }
        }
      }

      const contact = await createContact({
        name,
        type: recordType,
        status: 'Pending',
        email: email || null,
        phone: r(row, 'Phone', 'Phone', 'Contact Info') || null,
        company: r(row, 'Company', 'Company') || null,
        role: r(row, 'Role', 'Role') || null,
        location: r(row, 'Location', 'Location') || null,
        website: r(row, 'Website', 'Website') || null,
        notes: r(row, 'Notes', 'Notes') || null,
        recommended_by: r(row, 'Recommended By', 'Recommended By') || null,
        specialization: r(row, 'Specialization', 'Specialization') || null,
        past_clients: r(row, 'Past Clients', 'Past Clients') || null,
        industry: r(row, 'Industry', 'Industry') || null,
        domain: r(row, 'Domain', 'Domain') || null,
        stage: r(row, 'Stage', 'Stage') || null,
        ticker: r(row, 'Ticker', 'Ticker') || null,
        linkedin: r(row, 'LinkedIn', 'LinkedIn', 'Linkedin') || null,
        birthday: r(row, 'Birthday', 'Birthday') || null,
        milestones: null,
        interests: r(row, 'Interests', 'Interests') || null,
        relationship_context: r(row, 'Relationship Context', 'Relationship Context') || null,
        last_contacted_at: null,
        list_ids: listIds,
        category_ids: catIds,
        first_name: firstName || null,
        last_name: lastName || null,
        country: r(row, 'Country', 'Country') || null,
        global_region: null,
        gender: r(row, 'Gender', 'Gender') as any || null,
        introduced_by: r(row, 'Introduced By', 'Introduced By') || null,
        intel_notes: r(row, 'Intel Notes', 'Intel Notes') || null,
        relationship_owner: null,
        contact_frequency: r(row, 'Contact Frequency', 'Contact Frequency') as any || null,
        next_follow_up_date: null, next_action: null,
        kv_fund_investor: null, spv_investor: null, needs_review: false,
        company_record_id: null, custom_fields: cfValues,
        primary_list_id: null, cadence_override: null,
        email_2: r(row, 'Email 2', 'Email 2') || null,
        email_3: r(row, 'Email 3', 'Email 3') || null,
        communication_preferences: null,
      })

      if (email) emailIndex.set(emailLower, contact.id)
      nameIndex.set(nameLower, contact.id)
      imported++
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`)
    }

    onProgress?.({ current: i + 1, total: rows.length, imported, skipped })
    await delay(250)
  }

  return { imported, skipped, errors }
}
