#!/usr/bin/env npx tsx
/**
 * ClickUp KV CRMs -> realdeal staging importer
 *
 * Reads tasks.flat.json + fields.json from each list, normalizes into
 * the current Supabase schema, dedupes contacts, and emits staging JSON.
 *
 * Usage: npx tsx scripts/import-clickup-kv-crms.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { randomUUID } from 'crypto'
import { join } from 'path'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATA_ROOT = 'context/imports/clickup-kv-crms/2026-04-08'
const STAGING_DIR = join(DATA_ROOT, 'staging')

const CONTACT_LISTS = ['maps', 'maps-lite-for-sorting', 'talent', 'service-providers', 'spv'] as const
const ALL_LISTS = [...CONTACT_LISTS, 'companies', 'pipeline'] as const

const POD_DEFS = [
  { slug: 'maps', name: 'Maps', sources: ['maps'] },
  { slug: 'maps-lite', name: 'Maps Lite', sources: ['maps-lite-for-sorting'] },
  { slug: 'talent', name: 'Talent', sources: ['talent'] },
  { slug: 'service-providers', name: 'Service Providers', sources: ['service-providers'] },
  { slug: 'spv', name: 'SPV', sources: ['spv'] },
]

const IGNORE_FIELDS = new Set([
  'Progress Tracker', 'Remove', 'Points Estimate Rolled Up',
  'Date Updated', 'Date Closed', 'Latest Comment', 'Task Content',
])

// Fields that map to first-class contact columns
const CONTACT_FIELD_MAP: Record<string, string> = {
  'FIRST NAME': 'first_name',
  'LAST NAME': 'last_name',
  '\u{1F48C} Email': 'email',
  '\u{2709}\u{FE0F} Email': 'email',
  'Email 2': 'email_2',
  '\u{1F4DE} Phone': 'phone',
  'Mobile Number': 'phone',
  '\u{1F3E2} Company': 'company',
  '\u{1F4BC} Job Title': 'role',
  '\u{1F310} Website': 'website',
  'LinkedIn': 'linkedin',
  'COUNTRY': 'country',
  '\u{1F30E} GLOBAL REGION': 'global_region',
  'GENDER': 'gender',
  'Referred by': 'recommended_by',
  'Introduced By': 'introduced_by',
  'Relationship Owner': 'relationship_owner',
  'Specialization': 'specialization',
  '\u{1F382} Birthday': 'birthday',
  '\u{1F389} Birthday': 'birthday',
  'SPV Investor': 'spv_investor',
  'Needs Update': 'needs_review',
  'Need Update?': 'needs_review',
  'Notes': 'notes',
}

const COMPANY_FIELD_MAP: Record<string, string> = {
  '\u{1F310} Website': 'website',
  'Sector': 'industry',
  'Company Type': 'industry',
  'Type': 'industry',
  'Current Fundraise': 'stage',
  'Investment Stage': 'stage',
  'STAGE': 'stage',
}

const COMPANY_LOCATION_FIELDS = ['\u{1F3E2} Address', 'HQ', 'CITY', 'State', 'COUNTRY']
const COMPANY_NOTES_FIELDS = ['Comments', 'Summary', 'TLDR', '\u{270D}\u{FE0F} Noteables', 'Assistant Info']

// Category field names per list
const CATEGORY_FIELDS: Record<string, string[]> = {
  'maps': ['Category', 'Maps Category'],
  'maps-lite-for-sorting': ['Category', 'Maps Category'],
  'talent': ['Talent Category', 'Category', 'Specialization'],
  'service-providers': ['TYPE', 'Type', 'Service Category', 'Specialization'],
  'spv': ['SPV Investor'],
}

// Action row name patterns - skip these from companies
const ACTION_PATTERNS = [
  /^Schedule /i, /^Follow up /i, /^Send /i, /^Intro /i,
  /^Book /i, /^Call /i, /^Email /i, /^Remind /i,
]

// Pipeline stage status mapping
const PIPELINE_STAGE_ORDER: Record<string, number> = {
  'new': 0,
  'incoming lead': 1,
  'for connecting': 2,
  'initial outreach': 3,
  'meeting': 4,
  'for follow-up': 5,
  'next steps': 6,
  'closed': 7,
  'passed': 8,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClickUpTask {
  id: string
  name: string
  text_content: string
  description: string
  url: string
  status: string
  status_color: string
  priority: string | null
  date_created: string
  date_updated: string
  date_closed: string | null
  archived: boolean
  parent: string | null
  tags: string[]
  list: { id: string; name: string }
  custom_fields: Record<string, any>
  custom_fields_raw: Record<string, any>
}

interface FieldOption {
  id: string
  name: string
  orderindex: number
}

interface FieldDef {
  id: string
  name: string
  type: string
  type_config?: { options?: FieldOption[] }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function writeStaging(name: string, data: any[]) {
  mkdirSync(STAGING_DIR, { recursive: true })
  const path = join(STAGING_DIR, `${name}.json`)
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
  console.log(`  ${name}.json: ${data.length} rows`)
}

/** Build orderindex -> label map for dropdown/labels fields */
function buildOptionResolver(fields: FieldDef[]): Record<string, Record<number, string>> {
  const resolvers: Record<string, Record<number, string>> = {}
  for (const f of fields) {
    const opts = f.type_config?.options
    if (opts && (f.type === 'drop_down' || f.type === 'labels')) {
      resolvers[f.name] = {}
      for (const o of opts) {
        resolvers[f.name][o.orderindex] = o.name
      }
    }
  }
  return resolvers
}

/** Resolve a field value using option maps */
function resolveValue(fieldName: string, value: any, resolver: Record<string, Record<number, string>>): any {
  if (value === null || value === undefined) return null
  const optMap = resolver[fieldName]
  if (!optMap) return value
  if (typeof value === 'number') return optMap[value] ?? value
  if (Array.isArray(value)) {
    return value.map(v => typeof v === 'number' ? (optMap[v] ?? v) : v).filter(Boolean)
  }
  return value
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null
  return email.trim().toLowerCase() || null
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null
  return phone.replace(/[^+\d]/g, '') || null
}

function normalizeName(name: string | null | undefined): string | null {
  if (!name || typeof name !== 'string') return null
  return name.replace(/\s+/g, ' ').trim() || null
}

function normalizeGender(val: any): string | null {
  if (!val) return null
  const s = String(val).trim().toLowerCase()
  if (s === 'male') return 'Male'
  if (s === 'female') return 'Female'
  if (s === 'non-binary') return 'Non-binary'
  if (s === 'other') return 'Other'
  return null
}

function normalizeRegion(val: any): string | null {
  if (!val) return null
  const s = String(val).trim().toUpperCase()
  if (['AMER', 'APAC', 'ME', 'LATAM', 'EU'].includes(s)) return s
  return null
}

function normalizeBirthday(val: any): string | null {
  if (!val || typeof val !== 'string') return null
  // Could be ISO date, "April 22", "04/22", etc - preserve as-is for now
  return val.trim() || null
}

function isActionRow(name: string): boolean {
  return ACTION_PATTERNS.some(p => p.test(name))
}

function hasPersonSignals(cf: Record<string, any>): boolean {
  return !!(cf['FIRST NAME'] || cf['LAST NAME'] || cf['\u{1F48C} Email'] ||
    cf['\u{2709}\u{FE0F} Email'] || cf['\u{1F4DE} Phone'] || cf['\u{1F4BC} Job Title'])
}

/** Generate dedupe key for contact merging */
function dedupeKey(email: string | null, linkedin: string | null, firstName: string | null, lastName: string | null, company: string | null): string {
  if (email) return `email:${email}`
  if (linkedin) return `linkedin:${linkedin.toLowerCase().replace(/\/+$/, '')}`
  const name = [firstName, lastName].filter(Boolean).join(' ').toLowerCase()
  if (name && company) return `name+co:${name}|${(company as string).toLowerCase()}`
  if (name) return `name:${name}`
  return `id:${randomUUID()}`
}

// ---------------------------------------------------------------------------
// Main processing
// ---------------------------------------------------------------------------

function main() {
  console.log('=== ClickUp KV CRMs -> realdeal staging import ===\n')

  // Step 1: Load all data + field resolvers
  const listData: Record<string, { tasks: ClickUpTask[]; resolver: Record<string, Record<number, string>> }> = {}

  for (const listSlug of ALL_LISTS) {
    const tasks: ClickUpTask[] = loadJson(join(DATA_ROOT, listSlug, 'tasks.flat.json'))
    const fields: FieldDef[] = loadJson(join(DATA_ROOT, listSlug, 'fields.json'))
    const resolver = buildOptionResolver(fields)
    listData[listSlug] = { tasks, resolver }
    console.log(`Loaded ${listSlug}: ${tasks.length} tasks, ${fields.length} fields`)
  }

  // Step 2: Create pods
  const podIdMap: Record<string, string> = {} // slug -> uuid
  const pods: any[] = []
  for (const def of POD_DEFS) {
    const id = randomUUID()
    podIdMap[def.slug] = id
    pods.push({
      id,
      name: def.name,
      color: null,
      owner: 'moj_mahdara',
      is_priority: false,
      cadence: null,
      description: `Imported from ClickUp ${def.name} list`,
      capacity: null,
      enrichment_opt_in: false,
    })
  }
  console.log(`\nCreated ${pods.length} pods`)

  // Step 3: Process contact lists - build raw contacts then dedupe
  const rawContacts: any[] = []
  const contactSourceMap: Map<string, string[]> = new Map() // dedupeKey -> source list slugs

  for (const listSlug of CONTACT_LISTS) {
    const { tasks, resolver } = listData[listSlug]
    const podId = podIdMap[POD_DEFS.find(p => p.sources.includes(listSlug))!.slug]

    for (const task of tasks) {
      const cf = task.custom_fields
      const resolve = (field: string) => resolveValue(field, cf[field], resolver)

      // Extract canonical fields
      const firstName = normalizeName(resolve('FIRST NAME') as string)
      const lastName = normalizeName(resolve('LAST NAME') as string)
      const email = normalizeEmail(resolve('\u{1F48C} Email') as string || resolve('\u{2709}\u{FE0F} Email') as string)
      const email2 = normalizeEmail(resolve('Email 2') as string)
      const phone = normalizePhone(resolve('\u{1F4DE} Phone') as string || resolve('Mobile Number') as string)
      const company = normalizeName(resolve('\u{1F3E2} Company') as string)
      const role = normalizeName(resolve('\u{1F4BC} Job Title') as string)
      const website = cf['\u{1F310} Website'] || null
      const linkedin = cf['LinkedIn'] || null
      const country = resolve('COUNTRY') as string || null
      const globalRegion = normalizeRegion(resolve('\u{1F30E} GLOBAL REGION'))
      const gender = normalizeGender(resolve('GENDER'))
      const recommendedBy = resolve('Referred by') as string || null
      const introducedBy = resolve('Introduced By') as string || null
      const relationshipOwner = resolve('Relationship Owner') as string || null
      const specialization = resolve('Specialization') as string || null
      const birthday = normalizeBirthday(resolve('\u{1F382} Birthday') || resolve('\u{1F389} Birthday'))
      const spvInvestor = resolve('SPV Investor')
      const needsReview = !!(resolve('Needs Update') || resolve('Need Update?'))
      const notes = resolve('Notes') as string || null

      // Build name from parts or task name
      let name = [firstName, lastName].filter(Boolean).join(' ')
      if (!name) name = normalizeName(task.name) || 'Unknown'

      // Collect custom_fields (everything not mapped to a first-class column)
      const customFields: Record<string, any> = {
        clickup_task_id: task.id,
        clickup_list: task.list?.name || listSlug,
        clickup_url: task.url,
        clickup_status: task.status,
      }
      for (const [key, val] of Object.entries(cf)) {
        if (IGNORE_FIELDS.has(key)) continue
        if (CONTACT_FIELD_MAP[key]) continue // already mapped
        if (key === 'Main List' || key === 'Additional Lists') continue // handled as pod membership
        const resolved = resolveValue(key, val, resolver)
        if (resolved !== null && resolved !== undefined && resolved !== '' && resolved !== 0) {
          customFields[key] = resolved
        }
      }

      // Category values for this list
      const categoryValues: string[] = []
      for (const catField of (CATEGORY_FIELDS[listSlug] || [])) {
        const val = resolveValue(catField, cf[catField], resolver)
        if (val) {
          if (Array.isArray(val)) categoryValues.push(...val.filter(Boolean).map(String))
          else categoryValues.push(String(val))
        }
      }

      // Noteables/Summary/etc -> intel_notes
      const noteable = cf['\u{270D}\u{FE0F} Noteables'] as string || null
      const summary = cf['Summary'] as string || null
      const tldr = cf['TLDR'] as string || null

      const key = dedupeKey(email, linkedin, firstName, lastName, company)
      const existing = contactSourceMap.get(key)
      if (existing) {
        existing.push(listSlug)
      } else {
        contactSourceMap.set(key, [listSlug])
      }

      rawContacts.push({
        _dedupeKey: key,
        _listSlug: listSlug,
        _podId: podId,
        _categoryValues: categoryValues,
        name, first_name: firstName, last_name: lastName,
        email, email_2: email2, phone, company, role, website, linkedin,
        country, global_region: globalRegion, gender, recommended_by: recommendedBy,
        introduced_by: introducedBy, relationship_owner: relationshipOwner,
        specialization, birthday, needs_review: needsReview,
        spv_investor: spvInvestor ? (Array.isArray(spvInvestor) ? spvInvestor : [String(spvInvestor)]) : null,
        notes,
        intel_notes: [noteable, summary, tldr].filter(Boolean).join('\n\n') || null,
        custom_fields: customFields,
      })
    }
  }

  console.log(`\nRaw contact rows: ${rawContacts.length}`)

  // Step 4: Dedupe contacts - merge by key, keep richest data
  const deduped = new Map<string, any>()
  const contactPodLinks: { contactKey: string; podId: string; isPrimary: boolean }[] = []
  const contactCategoryValues: { contactKey: string; podSlug: string; values: string[] }[] = []

  for (const raw of rawContacts) {
    const key = raw._dedupeKey
    const existing = deduped.get(key)
    if (existing) {
      // Merge: prefer non-null values from richer record
      for (const [k, v] of Object.entries(raw)) {
        if (k.startsWith('_')) continue
        if (k === 'custom_fields') {
          existing.custom_fields = { ...existing.custom_fields, ...raw.custom_fields }
          continue
        }
        if ((existing[k] === null || existing[k] === undefined) && v !== null && v !== undefined) {
          existing[k] = v
        }
      }
      // Add pod link (secondary)
      contactPodLinks.push({ contactKey: key, podId: raw._podId, isPrimary: false })
    } else {
      deduped.set(key, { ...raw })
      // First occurrence = primary pod
      contactPodLinks.push({ contactKey: key, podId: raw._podId, isPrimary: true })
    }

    // Category values
    if (raw._categoryValues.length > 0) {
      const podSlug = POD_DEFS.find(p => p.sources.includes(raw._listSlug))?.slug || raw._listSlug
      contactCategoryValues.push({ contactKey: key, podSlug, values: raw._categoryValues })
    }
  }

  // Assign UUIDs and build final contacts
  const contactIdMap = new Map<string, string>() // dedupeKey -> uuid
  const contacts: any[] = []
  for (const [key, raw] of deduped) {
    const id = randomUUID()
    contactIdMap.set(key, id)
    const { _dedupeKey, _listSlug, _podId, _categoryValues, ...fields } = raw
    contacts.push({
      id,
      type: 'Contact',
      status: 'Active',
      ...fields,
    })
  }

  console.log(`Deduped contacts: ${contacts.length} (from ${rawContacts.length} raw rows)`)

  // Step 5: Build contact_pods
  const contactPodsOut: any[] = []
  const seenPodLinks = new Set<string>()
  for (const link of contactPodLinks) {
    const contactId = contactIdMap.get(link.contactKey)
    if (!contactId) continue
    const linkKey = `${contactId}:${link.podId}`
    if (seenPodLinks.has(linkKey)) continue
    seenPodLinks.add(linkKey)
    contactPodsOut.push({
      id: randomUUID(),
      contact_id: contactId,
      pod_id: link.podId,
      is_primary: link.isPrimary,
    })
  }
  console.log(`Contact-pod links: ${contactPodsOut.length}`)

  // Step 6: Build categories + contact_categories
  // Group category values by pod, dedupe category names per pod
  const categoryIdMap = new Map<string, string>() // "podSlug:categoryName" -> uuid
  const categoriesOut: any[] = []
  const contactCategoriesOut: any[] = []

  for (const { contactKey, podSlug, values } of contactCategoryValues) {
    const contactId = contactIdMap.get(contactKey)
    const podId = podIdMap[podSlug]
    if (!contactId || !podId) continue

    for (const catName of values) {
      const catKey = `${podSlug}:${catName}`
      let catId = categoryIdMap.get(catKey)
      if (!catId) {
        catId = randomUUID()
        categoryIdMap.set(catKey, catId)
        categoriesOut.push({
          id: catId,
          pod_id: podId,
          name: catName,
          color: null,
        })
      }
      // Link contact to category
      contactCategoriesOut.push({
        id: randomUUID(),
        contact_id: contactId,
        category_id: catId,
      })
    }
  }
  console.log(`Categories: ${categoriesOut.length}`)
  console.log(`Contact-category links: ${contactCategoriesOut.length}`)

  // Step 7: Process companies list
  const { tasks: companyTasks, resolver: companyResolver } = listData['companies']
  const companiesOut: any[] = []
  const skippedActions: string[] = []

  for (const task of companyTasks) {
    // Skip action/task rows
    if (isActionRow(task.name)) {
      skippedActions.push(task.name)
      continue
    }

    // Skip subtasks (parent != null) that look like actions
    if (task.parent && isActionRow(task.name)) continue

    const cf = task.custom_fields
    const resolve = (field: string) => resolveValue(field, cf[field], companyResolver)

    // Determine if this is a company or a contact
    const hasCompanySignals = !!(cf['\u{1F310} Website'] || cf['HQ'] || resolve('Sector') || resolve('Company Type'))
    const hasPerson = hasPersonSignals(cf)

    // If it has person signals but no company signals, might be a contact
    // For first pass, if it's in the Companies list and has a company-like name, treat as company
    if (hasPerson && !hasCompanySignals && task.parent) {
      // Subtask with person signals = probably a contact reference, skip for now
      continue
    }

    const name = normalizeName(task.name) || 'Unknown'
    const website = cf['\u{1F310} Website'] || null
    const industry = resolve('Sector') as string || resolve('Company Type') as string || resolve('Type') as string || null
    const stage = resolve('Current Fundraise') as string || resolve('Investment Stage') as string || resolve('STAGE') as string || null

    // Location parts
    const locationParts = COMPANY_LOCATION_FIELDS.map(f => {
      const v = resolve(f)
      return v && typeof v === 'string' ? v : null
    }).filter(Boolean)
    const location = locationParts.join(', ') || null

    // Notes
    const notesParts = COMPANY_NOTES_FIELDS.map(f => cf[f]).filter(Boolean)
    const notes = notesParts.join('\n\n') || null

    // Domain from website
    let domain: string | null = null
    if (website) {
      try {
        domain = new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace(/^www\./, '')
      } catch { }
    }

    // Custom fields
    const customFields: Record<string, any> = {
      clickup_task_id: task.id,
      clickup_list: 'Companies',
      clickup_url: task.url,
      clickup_status: task.status,
    }
    for (const [key, val] of Object.entries(cf)) {
      if (IGNORE_FIELDS.has(key)) continue
      if (COMPANY_FIELD_MAP[key]) continue
      if (COMPANY_LOCATION_FIELDS.includes(key)) continue
      if (COMPANY_NOTES_FIELDS.includes(key)) continue
      const resolved = resolveValue(key, val, companyResolver)
      if (resolved !== null && resolved !== undefined && resolved !== '' && resolved !== 0) {
        customFields[key] = resolved
      }
    }

    companiesOut.push({
      id: randomUUID(),
      name,
      website,
      domain,
      location,
      industry,
      stage,
      notes,
      custom_fields: customFields,
    })
  }
  console.log(`\nCompanies: ${companiesOut.length} (skipped ${skippedActions.length} action rows)`)

  // Step 8: Process pipeline
  const { tasks: pipelineTasks, resolver: pipelineResolver } = listData['pipeline']

  // Collect all unique statuses to build stages
  const statusSet = new Set<string>()
  for (const task of pipelineTasks) {
    if (task.status) statusSet.add(task.status.toLowerCase())
  }

  // Create a single "KV Pipeline" pipeline
  const pipelineId = randomUUID()
  const pipelinesOut = [{
    id: pipelineId,
    name: 'KV Pipeline',
    status: 'active',
  }]

  // Build stages from observed statuses
  const stageIdMap = new Map<string, string>()
  const stagesOut: any[] = []
  for (const status of statusSet) {
    const id = randomUUID()
    stageIdMap.set(status, id)
    stagesOut.push({
      id,
      pipeline_id: pipelineId,
      name: status.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      color: null,
      order: PIPELINE_STAGE_ORDER[status] ?? 99,
    })
  }
  stagesOut.sort((a, b) => a.order - b.order)

  // Build opportunities
  const opportunitiesOut: any[] = []
  const opportunityContactsOut: any[] = []

  // Build email->contactId lookup for linking
  const emailToContactId = new Map<string, string>()
  for (const c of contacts) {
    if (c.email) emailToContactId.set(c.email, c.id)
    if (c.email_2) emailToContactId.set(c.email_2, c.id)
  }
  // Name+company lookup
  const nameCompanyToContactId = new Map<string, string>()
  for (const c of contacts) {
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ').toLowerCase()
    if (name && c.company) nameCompanyToContactId.set(`${name}|${c.company.toLowerCase()}`, c.id)
  }

  for (const task of pipelineTasks) {
    const cf = task.custom_fields
    const resolve = (field: string) => resolveValue(field, cf[field], pipelineResolver)

    const stageId = stageIdMap.get(task.status?.toLowerCase() || '') || null
    const name = normalizeName(task.name) || 'Unknown'

    // Determine opportunity status
    let oppStatus: 'open' | 'won' | 'lost' | 'archived' = 'open'
    const statusLower = (task.status || '').toLowerCase()
    if (statusLower === 'closed') oppStatus = 'won'
    if (statusLower === 'passed') oppStatus = 'lost'
    if (task.archived) oppStatus = 'archived'

    // Priority mapping
    let priority: 'high' | 'medium' | 'low' | null = null
    if (task.priority === 'high' || task.priority === 'urgent') priority = 'high'
    else if (task.priority === 'normal') priority = 'medium'
    else if (task.priority === 'low') priority = 'low'

    // Custom fields for opportunity
    const customFields: Record<string, any> = {
      clickup_task_id: task.id,
      clickup_url: task.url,
      clickup_status: task.status,
    }
    const oppFields = [
      'Estimated Close Date', '\u{1F504} Next Contact', 'Current Fundraise',
      'Capital Raised to Date', '\u{1F44D} Likelihood', 'Pitch Deck',
      'Investment Entity', 'KV Status', 'Fundraise Status', 'Sector',
      'Anything Else', 'Status',
    ]
    for (const field of oppFields) {
      const val = resolve(field)
      if (val !== null && val !== undefined && val !== '' && val !== 0) {
        customFields[field] = val
      }
    }

    // Include text_content as notes
    const notes = [task.text_content, cf['Summary'], cf['TLDR'], cf['\u{270D}\u{FE0F} Noteables']]
      .filter(Boolean).join('\n\n') || null

    // Opportunities table has no custom_fields column - append metadata to notes
    const metadataLines = Object.entries(customFields)
      .filter(([k]) => !k.startsWith('clickup_'))
      .map(([k, v]) => `${k}: ${v}`)
    const fullNotes = [notes, metadataLines.length ? `---\n${metadataLines.join('\n')}` : null]
      .filter(Boolean).join('\n\n') || null

    const oppId = randomUUID()
    opportunitiesOut.push({
      id: oppId,
      name,
      stage_id: stageId,
      notes: fullNotes,
      priority,
      status: oppStatus,
    })

    // Try to link to existing contacts
    const oppEmail = normalizeEmail(resolve('\u{1F48C} Email') as string || resolve('\u{2709}\u{FE0F} Email') as string)
    const oppFirstName = normalizeName(resolve('FIRST NAME') as string)
    const oppLastName = normalizeName(resolve('LAST NAME') as string)
    const oppCompany = normalizeName(resolve('\u{1F3E2} Company') as string)

    let linkedContactId: string | null = null
    if (oppEmail) linkedContactId = emailToContactId.get(oppEmail) || null
    if (!linkedContactId && oppFirstName && oppLastName && oppCompany) {
      const nameKey = `${oppFirstName} ${oppLastName}`.toLowerCase()
      linkedContactId = nameCompanyToContactId.get(`${nameKey}|${oppCompany.toLowerCase()}`) || null
    }

    if (linkedContactId) {
      opportunityContactsOut.push({
        id: randomUUID(),
        opportunity_id: oppId,
        contact_id: linkedContactId,
      })
    }
  }

  console.log(`\nPipeline: 1 pipeline, ${stagesOut.length} stages, ${opportunitiesOut.length} opportunities`)
  console.log(`Opportunity-contact links: ${opportunityContactsOut.length}`)

  // Step 9: Write staging files
  console.log('\n--- Writing staging files ---')
  writeStaging('pods', pods)
  writeStaging('contacts', contacts)
  writeStaging('contact_pods', contactPodsOut)
  writeStaging('categories', categoriesOut)
  writeStaging('contact_categories', contactCategoriesOut)
  writeStaging('companies', companiesOut)
  writeStaging('pipelines', pipelinesOut)
  writeStaging('pipeline_stages', stagesOut)
  writeStaging('opportunities', opportunitiesOut)
  writeStaging('opportunity_contacts', opportunityContactsOut)

  // Summary stats
  console.log('\n=== Import summary ===')
  console.log(`Contacts: ${contacts.length} (deduped from ${rawContacts.length})`)
  console.log(`Companies: ${companiesOut.length}`)
  console.log(`Pods: ${pods.length}`)
  console.log(`Categories: ${categoriesOut.length}`)
  console.log(`Pipeline stages: ${stagesOut.length}`)
  console.log(`Opportunities: ${opportunitiesOut.length}`)
  console.log(`Opportunity-contact links: ${opportunityContactsOut.length}`)
  console.log(`\nStaging files written to ${STAGING_DIR}/`)
}

main()
