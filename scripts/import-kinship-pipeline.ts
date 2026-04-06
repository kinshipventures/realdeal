/**
 * Import Kinship Fund I pipeline CSV into Supabase pipelines
 * Run: npx tsx scripts/import-kinship-pipeline.ts
 *
 * Required env vars in .env.local:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   MIGRATION_USER_ID
 *   WORKSPACE_ID
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Env ───────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const USER_ID = process.env.MIGRATION_USER_ID
const WORKSPACE_ID = process.env.WORKSPACE_ID

const missing = (
  [
    ['VITE_SUPABASE_URL', SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY],
    ['MIGRATION_USER_ID', USER_ID],
    ['WORKSPACE_ID', WORKSPACE_ID],
  ] as [string, string | undefined][]
).filter(([, v]) => !v).map(([k]) => k)

if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

// ── CSV parsing ───────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const csvPath = join(__dirname, '..', 'Kinship Fund I Pipeline - Active Pipeline - Kinship Fund.csv')
const raw = readFileSync(csvPath, 'utf-8')
const lines = raw.split('\n').map(l => l.trim())

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ''; continue }
    current += ch
  }
  fields.push(current.trim())
  return fields
}

// ── Parse sections ────────────────────────────────────────────────────────────

interface CommittedRow {
  owner: string; name: string; company: string; email: string
  investment: string; notes: string; spvInvestments: string
  listMembership: string; status: string
}

interface ProspectRow {
  owner: string; name: string; company: string; status: string
  targetCommitment: string; email: string; listMembership: string
  referredBy: string; notes: string
}

const committed: CommittedRow[] = []
const prospects: ProspectRow[] = []

let section: 'none' | 'committed' | 'prospects' = 'none'
let headerSeen = false

for (const line of lines) {
  if (!line || line.replace(/,/g, '').trim() === '') continue

  if (line.includes('COMMITTED INVESTORS')) { section = 'committed'; headerSeen = false; continue }
  if (line.includes('PIPELINE')) {
    if (line.includes('PROSPECTS')) { section = 'prospects'; headerSeen = false; continue }
  }

  const fields = parseCsvLine(line)

  // Skip header rows (first row after section label)
  if (!headerSeen && (fields[0] === 'Owner' || fields[0] === 'owner')) {
    headerSeen = true
    continue
  }

  // Skip total/summary rows
  if (fields[0] === 'Total' || fields[0]?.includes('total')) continue
  if (!fields[1]) continue // no name = skip

  if (section === 'committed') {
    committed.push({
      owner: fields[0] || '', name: fields[1] || '', company: fields[2] || '',
      email: fields[3] || '', investment: fields[4] || '', notes: fields[5] || '',
      spvInvestments: fields[6] || '', listMembership: fields[7] || '', status: fields[8] || '',
    })
  } else if (section === 'prospects') {
    prospects.push({
      owner: fields[0] || '', name: fields[1] || '', company: fields[2] || '',
      status: fields[3] || '', targetCommitment: fields[4] || '', email: fields[5] || '',
      listMembership: fields[7] || '', referredBy: fields[8] || '', notes: fields[9] || '',
    })
  }
}

console.log(`Parsed ${committed.length} committed investors, ${prospects.length} prospects`)

// ── Stage ordering (funnel progression) ───────────────────────────────────────

const STAGE_ORDER = [
  'For Connecting',
  'Intro Call',
  'In Data Room & Pitch',
  'In Dilligence',
  'Circle Back',
  'Moved to Fund Tracker',
]

// ── Import ────────────────────────────────────────────────────────────────────

async function run() {
  // 1. Create pipeline
  const { data: pipeline, error: pipeErr } = await supabase
    .from('pipelines')
    .insert({ user_id: USER_ID, workspace_id: WORKSPACE_ID, name: 'Kinship Fund I' })
    .select().single()
  if (pipeErr) throw pipeErr
  console.log(`Created pipeline: ${pipeline.id}`)

  // 2. Create stages
  const stageMap = new Map<string, string>() // stage name -> stage id
  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const { data: stage, error } = await supabase
      .from('pipeline_stages')
      .insert({ user_id: USER_ID, workspace_id: WORKSPACE_ID, pipeline_id: pipeline.id, name: STAGE_ORDER[i], order: i })
      .select().single()
    if (error) throw error
    stageMap.set(STAGE_ORDER[i], stage.id)
    console.log(`  Stage: ${STAGE_ORDER[i]} -> ${stage.id}`)
  }

  // 3. Fetch existing contacts for matching
  const { data: existingContacts, error: contactsErr } = await supabase
    .from('contacts')
    .select('id, name, email, first_name, last_name')
    .eq('workspace_id', WORKSPACE_ID)
  if (contactsErr) throw contactsErr

  function matchContact(name: string, email: string): string | null {
    const normName = name.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim()
    const normEmail = email.toLowerCase().trim()
    for (const c of existingContacts!) {
      if (normEmail && c.email?.toLowerCase() === normEmail) return c.id
      const cName = (c.name || '').toLowerCase().trim()
      if (cName && cName === normName) return c.id
      // Try first + last
      const full = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().trim()
      if (full && full === normName) return c.id
    }
    return null
  }

  // 4. Process all rows into opportunities
  let created = 0, matched = 0, newContacts = 0

  async function importRow(
    name: string, company: string, email: string, stageName: string,
    notes: string, investment: string, referredBy: string
  ) {
    const stageId = stageMap.get(stageName)
    if (!stageId) {
      console.warn(`  Skipping "${name}" - unknown stage "${stageName}"`)
      return
    }

    // Build notes string
    const noteParts: string[] = []
    if (investment) noteParts.push(`Investment: ${investment}`)
    if (referredBy) noteParts.push(`Referred by: ${referredBy}`)
    if (notes) noteParts.push(notes)
    const noteStr = noteParts.join(' | ') || null

    // Match or create contact
    let contactId = matchContact(name, email)
    if (contactId) {
      matched++
    } else {
      // Parse first/last name
      const cleaned = name.replace(/\s*\(.*?\)\s*/g, '').trim()
      const parts = cleaned.split(/\s+/)
      const firstName = parts[0] || ''
      const lastName = parts.slice(1).join(' ') || ''

      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({
          user_id: USER_ID, workspace_id: WORKSPACE_ID,
          name: cleaned, first_name: firstName, last_name: lastName,
          email: email || null, company: company || null,
          type: 'Contact', status: 'Active',
        })
        .select('id').single()
      if (error) throw error
      contactId = newContact.id
      existingContacts!.push({ id: contactId, name: cleaned, email, first_name: firstName, last_name: lastName })
      newContacts++
    }

    // Create opportunity
    const oppName = company ? `${name} (${company})` : name
    const { data: opp, error: oppErr } = await supabase
      .from('opportunities')
      .insert({ user_id: USER_ID, workspace_id: WORKSPACE_ID, name: oppName, stage_id: stageId, notes: noteStr, status: 'open' })
      .select('id').single()
    if (oppErr) throw oppErr

    // Link contact
    await supabase
      .from('opportunity_contacts')
      .insert({ user_id: USER_ID, workspace_id: WORKSPACE_ID, opportunity_id: opp.id, contact_id: contactId })

    created++
  }

  // Committed investors -> "Moved to Fund Tracker" stage
  for (const row of committed) {
    const notes = [row.notes, row.spvInvestments ? `SPV: ${row.spvInvestments}` : ''].filter(Boolean).join(' | ')
    await importRow(row.name, row.company, row.email, 'Moved to Fund Tracker', notes, row.investment, '')
  }

  // Prospects -> their respective stages
  for (const row of prospects) {
    const stageName = STAGE_ORDER.includes(row.status) ? row.status : 'Circle Back'
    await importRow(row.name, row.company, row.email, stageName, row.notes, row.targetCommitment, row.referredBy)
  }

  console.log(`\nDone!`)
  console.log(`  Opportunities created: ${created}`)
  console.log(`  Contacts matched: ${matched}`)
  console.log(`  New contacts created: ${newContacts}`)
}

run().catch(err => { console.error(err); process.exit(1) })
