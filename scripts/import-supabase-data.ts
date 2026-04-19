import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const TARGET_SUPABASE_URL = process.env.TARGET_SUPABASE_URL
const TARGET_SUPABASE_SERVICE_ROLE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY
const TARGET_OWNER_USER_ID = process.env.TARGET_OWNER_USER_ID
const TARGET_OWNER_EMAIL = process.env.TARGET_OWNER_EMAIL ?? null
const TARGET_OWNER_DISPLAY_NAME = process.env.TARGET_OWNER_DISPLAY_NAME ?? null
const USER_ID_MAP = parseUserIdMap(process.env.USER_ID_MAP)
const IMPORT_PATH = resolve(process.cwd(), process.env.IMPORT_PATH || 'tmp/realdeal-supabase-export.json')

const missing = (
  [
    ['TARGET_SUPABASE_URL', TARGET_SUPABASE_URL],
    ['TARGET_SUPABASE_SERVICE_ROLE_KEY', TARGET_SUPABASE_SERVICE_ROLE_KEY],
    ['TARGET_OWNER_USER_ID', TARGET_OWNER_USER_ID],
  ] as [string, string | undefined | null][]
).filter(([, value]) => !value).map(([key]) => key)

if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(', ')}`)
  process.exit(1)
}

const target = createClient(TARGET_SUPABASE_URL!, TARGET_SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

const TABLE_ORDER = [
  'workspaces',
  'profiles',
  'workspace_members',
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

type ExportData = {
  workspace_id: string
  tables: Record<string, Record<string, unknown>[]>
}

async function main() {
  const raw = readFileSync(IMPORT_PATH, 'utf-8')
  const payload = JSON.parse(raw) as ExportData

  await upsertRows('workspaces', await prepareWorkspaces(payload.tables.workspaces ?? []))
  await upsertProfile(payload.tables.profiles ?? [])
  await upsertWorkspaceMembers(payload.workspace_id, payload.tables.workspace_members ?? [])

  for (const table of TABLE_ORDER) {
    if (table === 'workspaces' || table === 'profiles' || table === 'workspace_members') continue
    const rows = payload.tables[table] ?? []
    await upsertRows(table, rows.map(remapAuthReferences))
  }

  console.log(`Imported workspace ${payload.workspace_id} from ${IMPORT_PATH}`)
}

async function upsertProfile(rows: Record<string, unknown>[]) {
  const matchingProfile = rows
    .map(row => remapAuthReferences(row))
    .find(row => row.id === TARGET_OWNER_USER_ID)

  const profile = matchingProfile ?? {
    id: TARGET_OWNER_USER_ID!,
    display_name: TARGET_OWNER_DISPLAY_NAME,
    email: TARGET_OWNER_EMAIL,
  }

  await upsertRows('profiles', [profile])
}

async function upsertWorkspaceMembers(workspaceId: string, rows: Record<string, unknown>[]) {
  const deduped = new Map<string, Record<string, unknown>>()

  for (const row of rows.map(remapAuthReferences)) {
    const key = `${row.workspace_id}:${row.user_id}`
    const current = deduped.get(key)
    if (!current || roleRank(String(row.role)) > roleRank(String(current.role))) {
      deduped.set(key, row)
    }
  }

  const ownerKey = `${workspaceId}:${TARGET_OWNER_USER_ID}`
  deduped.set(ownerKey, {
    workspace_id: workspaceId,
    user_id: TARGET_OWNER_USER_ID,
    role: 'owner',
  })

  await upsertRows('workspace_members', [...deduped.values()], 'workspace_id,user_id')
}

async function upsertRows(table: string, rows: Record<string, unknown>[], onConflict = 'id') {
  if (rows.length === 0) {
    console.log(`${table}: 0`)
    return
  }

  const deduped = dedupeRows(rows, onConflict)

  for (let index = 0; index < deduped.length; index += 500) {
    const batch = deduped.slice(index, index + 500)
    const { error } = await target.from(table).upsert(batch, { onConflict })
    if (error) throw new Error(`${table}: ${error.message}`)
  }

  console.log(`${table}: ${deduped.length}`)
}

async function prepareWorkspaces(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return rows

  const { data, error } = await target.from('workspaces').select('id, slug')
  if (error) throw new Error(`workspaces lookup: ${error.message}`)

  const slugToId = new Map(
    (data ?? []).map((row: { id: string; slug: string | null }) => [row.slug ?? '', row.id]),
  )

  return rows.map((row) => {
    const next = { ...row }
    const slug = typeof next.slug === 'string' ? next.slug : ''
    const existingId = slugToId.get(slug)

    if (slug && existingId && existingId !== next.id) {
      const base = slugify(typeof next.name === 'string' ? next.name : slug)
      next.slug = `${base || 'workspace'}-imported`
    }

    return next
  })
}

function remapAuthReferences(row: Record<string, unknown>) {
  const next = { ...row }

  if (typeof next.user_id === 'string') next.user_id = mapUserId(next.user_id)
  if (typeof next.invited_by === 'string') next.invited_by = mapUserId(next.invited_by)
  if (typeof next.id === 'string' && looksLikeUserProfile(next)) next.id = mapUserId(next.id)

  return next
}

function looksLikeUserProfile(row: Record<string, unknown>) {
  return 'display_name' in row || 'avatar_url' in row || ('email' in row && !('workspace_id' in row))
}

function mapUserId(userId: string) {
  return USER_ID_MAP[userId] ?? TARGET_OWNER_USER_ID!
}

function parseUserIdMap(raw?: string) {
  if (!raw) return {} as Record<string, string>
  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed
  } catch (error) {
    throw new Error(`USER_ID_MAP must be valid JSON: ${error}`)
  }
}

function roleRank(role: string) {
  switch (role) {
    case 'owner':
      return 4
    case 'admin':
      return 3
    case 'member':
      return 2
    case 'viewer':
      return 1
    default:
      return 0
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function dedupeRows(rows: Record<string, unknown>[], onConflict: string) {
  const keys = onConflict.split(',').map((key) => key.trim()).filter(Boolean)
  if (keys.length === 0) return rows

  const deduped = new Map<string, Record<string, unknown>>()

  for (const row of rows) {
    const key = keys.map((field) => String(row[field] ?? '')).join('::')
    deduped.set(key, row)
  }

  return [...deduped.values()]
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
