import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'

const SOURCE_SUPABASE_URL = process.env.SOURCE_SUPABASE_URL
const SOURCE_SUPABASE_PUBLISHABLE_KEY = process.env.SOURCE_SUPABASE_PUBLISHABLE_KEY
const SOURCE_SUPABASE_ACCESS_TOKEN = process.env.SOURCE_SUPABASE_ACCESS_TOKEN
const WORKSPACE_ID = process.env.WORKSPACE_ID
const EXPORT_PATH = resolve(process.cwd(), process.env.EXPORT_PATH || 'tmp/realdeal-supabase-export.json')

const missing = (
  [
    ['SOURCE_SUPABASE_URL', SOURCE_SUPABASE_URL],
    ['SOURCE_SUPABASE_PUBLISHABLE_KEY', SOURCE_SUPABASE_PUBLISHABLE_KEY],
    ['SOURCE_SUPABASE_ACCESS_TOKEN', SOURCE_SUPABASE_ACCESS_TOKEN],
    ['WORKSPACE_ID', WORKSPACE_ID],
  ] as [string, string | undefined][]
).filter(([, value]) => !value).map(([key]) => key)

if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(', ')}`)
  process.exit(1)
}

const source = createClient(SOURCE_SUPABASE_URL!, SOURCE_SUPABASE_PUBLISHABLE_KEY!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      Authorization: `Bearer ${SOURCE_SUPABASE_ACCESS_TOKEN!}`,
    },
  },
})

const PAGE_SIZE = 1000

const WORKSPACE_TABLES = [
  'pods',
  'categories',
  'companies',
  'contacts',
  'contact_pods',
  'contact_categories',
  'contact_companies',
  'interactions',
  'pipelines',
  'pipeline_stages',
  'opportunities',
  'opportunity_contacts',
  'campaigns',
  'campaign_stages',
  'campaign_contacts',
  'projects',
  'project_contacts',
  'project_opportunities',
  'field_config',
  'share_links',
  'workspace_invites',
  'gmail_sync_state',
] as const

type ExportPayload = {
  generated_at: string
  workspace_id: string
  source_url: string
  tables: Record<string, unknown[]>
}

type SelectQuery = ReturnType<ReturnType<typeof source.from>['select']>

async function fetchAll(table: string, build?: (query: SelectQuery) => SelectQuery) {
  const rows: unknown[] = []
  let from = 0

  while (true) {
    let query = source.from(table).select('*')
    if (build) query = build(query)

    const { data, error } = await query.range(from, from + PAGE_SIZE - 1)
    if (error) {
      if (isMissingTableError(error.message)) {
        console.warn(`Skipping missing table: ${table}`)
        return []
      }
      throw new Error(`${table}: ${error.message}`)
    }

    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

function isMissingTableError(message: string) {
  return message.includes('Could not find the table')
}

async function main() {
  const payload: ExportPayload = {
    generated_at: new Date().toISOString(),
    workspace_id: WORKSPACE_ID!,
    source_url: SOURCE_SUPABASE_URL!,
    tables: {},
  }

  payload.tables.workspaces = await fetchAll('workspaces', query => query.eq('id', WORKSPACE_ID))
  payload.tables.workspace_members = await fetchAll('workspace_members', query => query.eq('workspace_id', WORKSPACE_ID))

  const memberRows = payload.tables.workspace_members as Array<{ user_id: string }>
  const memberIds = [...new Set(memberRows.map(row => row.user_id).filter(Boolean))]

  if (memberIds.length > 0) {
    const profileRows: unknown[] = []
    for (const chunk of chunked(memberIds, 100)) {
      const { data, error } = await source.from('profiles').select('*').in('id', chunk)
      if (error) throw new Error(`profiles: ${error.message}`)
      profileRows.push(...(data ?? []))
    }
    payload.tables.profiles = profileRows
  } else {
    payload.tables.profiles = []
  }

  for (const table of WORKSPACE_TABLES) {
    if (table === 'gmail_sync_state') {
      payload.tables[table] = await fetchByUserIds(table, memberIds)
      continue
    }
    payload.tables[table] = await fetchAll(table, query => query.eq('workspace_id', WORKSPACE_ID))
  }

  mkdirSync(dirname(EXPORT_PATH), { recursive: true })
  writeFileSync(EXPORT_PATH, JSON.stringify(payload, null, 2))

  console.log(`Exported workspace ${WORKSPACE_ID} to ${EXPORT_PATH}`)
  for (const [table, rows] of Object.entries(payload.tables)) {
    console.log(`${table}: ${rows.length}`)
  }
}

function chunked<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

async function fetchByUserIds(table: string, userIds: string[]) {
  if (userIds.length === 0) return []

  const rows: unknown[] = []
  for (const chunk of chunked(userIds, 100)) {
    const { data, error } = await source.from(table).select('*').in('user_id', chunk)
    if (error) {
      if (isMissingTableError(error.message)) {
        console.warn(`Skipping missing table: ${table}`)
        return []
      }
      throw new Error(`${table}: ${error.message}`)
    }
    rows.push(...(data ?? []))
  }
  return rows
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
