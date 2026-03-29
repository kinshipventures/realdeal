import type { RelationshipType } from './types'
import { isDemoMode, DEMO_FIELD_CONFIGS } from './sampleData'
import { TABLES } from './airtable'

export interface FieldConfig {
  id: string
  name: string
  airtable_field_id: string
  field_type: 'text' | 'multiline' | 'number' | 'select' | 'date' | 'checkbox'
  scope_type: 'Contact' | 'Company' | 'Both'
  scope_pod_id: string | null
  required: boolean
  display_order: number
}

interface AirtableFieldConfigRecord {
  id: string
  fields: {
    Name?: string
    'Airtable Field ID'?: string
    'Field Type'?: string
    'Scope Type'?: string
    'Scope Pod'?: string[]
    Required?: boolean
    'Display Order'?: number
  }
}

const BASE_URL = `https://api.airtable.com/v0/${import.meta.env.VITE_AIRTABLE_BASE_ID}`
const META_URL = `https://api.airtable.com/v0/meta/bases/${import.meta.env.VITE_AIRTABLE_BASE_ID}`
const TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN

const CACHE_TTL = 5 * 60 * 1000

let _fieldConfigCache: FieldConfig[] | null = null
let _fieldConfigCacheTime = 0
let _fieldConfigFetch: Promise<FieldConfig[]> | null = null

function mapFieldConfig(r: AirtableFieldConfigRecord): FieldConfig {
  return {
    id: r.id,
    name: r.fields.Name ?? '',
    airtable_field_id: r.fields['Airtable Field ID'] ?? '',
    field_type: (r.fields['Field Type'] as FieldConfig['field_type']) ?? 'text',
    scope_type: (r.fields['Scope Type'] as FieldConfig['scope_type']) ?? 'Both',
    scope_pod_id: r.fields['Scope Pod']?.[0] ?? null,
    required: r.fields.Required ?? false,
    display_order: r.fields['Display Order'] ?? 0,
  }
}

async function fetchAllFieldConfigs(): Promise<FieldConfig[]> {
  if (!TABLES.fieldConfig) return []

  const records: FieldConfig[] = []
  let offset: string | undefined

  do {
    const params = new URLSearchParams({ pageSize: '100', ...(offset ? { offset } : {}) })
    const res = await fetch(`${BASE_URL}/${TABLES.fieldConfig}?${params}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`)
    const data = await res.json() as { records: AirtableFieldConfigRecord[]; offset?: string }
    records.push(...data.records.map(mapFieldConfig))
    offset = data.offset
  } while (offset)

  return records
}

export function getFieldConfigs(): Promise<FieldConfig[]> {
  if (isDemoMode()) return Promise.resolve(DEMO_FIELD_CONFIGS as FieldConfig[])

  const isExpired = !_fieldConfigCache || Date.now() - _fieldConfigCacheTime > CACHE_TTL
  const isFresh = _fieldConfigCache && !isExpired

  if (isFresh) return Promise.resolve(_fieldConfigCache!)

  if (_fieldConfigCache && isExpired && !_fieldConfigFetch) {
    const stale = _fieldConfigCache
    _fieldConfigFetch = fetchAllFieldConfigs()
      .then(records => {
        _fieldConfigCache = records
        _fieldConfigCacheTime = Date.now()
        _fieldConfigFetch = null
        return _fieldConfigCache
      })
      .catch(err => { _fieldConfigFetch = null; throw err })
    return Promise.resolve(stale)
  }

  if (!_fieldConfigFetch) {
    _fieldConfigFetch = fetchAllFieldConfigs()
      .then(records => {
        _fieldConfigCache = records
        _fieldConfigCacheTime = Date.now()
        _fieldConfigFetch = null
        return _fieldConfigCache
      })
      .catch(err => { _fieldConfigFetch = null; throw err })
  }
  return _fieldConfigFetch
}

export function getFieldConfigsForRecord(
  configs: FieldConfig[],
  type: RelationshipType,
  podIds: string[]
): FieldConfig[] {
  return configs.filter(c =>
    (c.scope_type === type || c.scope_type === 'Both') &&
    (c.scope_pod_id === null || podIds.includes(c.scope_pod_id))
  )
}

export function invalidateFieldConfigCache() {
  _fieldConfigCache = null
}

const AIRTABLE_TYPE_MAP: Record<FieldConfig['field_type'], string> = {
  text: 'singleLineText',
  multiline: 'multilineText',
  number: 'number',
  select: 'singleSelect',
  date: 'date',
  checkbox: 'checkbox',
}

const CONTACTS_TABLE_ID = 'tbll75mRMMVBGiNpj'

export async function createCustomField(spec: {
  name: string
  field_type: FieldConfig['field_type']
  scope_type: FieldConfig['scope_type']
  scope_pod_id: string | null
  required: boolean
  display_order: number
}): Promise<FieldConfig> {
  // Create Airtable column on Contacts table via Metadata API
  const metaRes = await fetch(`${META_URL}/tables/${CONTACTS_TABLE_ID}/fields`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: spec.name,
      type: AIRTABLE_TYPE_MAP[spec.field_type],
    }),
  })
  if (!metaRes.ok) throw new Error(`Airtable meta ${metaRes.status}: ${await metaRes.text()}`)
  const metaData = await metaRes.json() as { id: string }

  if (!TABLES.fieldConfig) throw new Error('fieldConfig table ID not set — run pnpm migrate:fieldconfig first')

  // Write Field Config record
  const recRes = await fetch(`${BASE_URL}/${TABLES.fieldConfig}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        Name: spec.name,
        'Airtable Field ID': metaData.id,
        'Field Type': spec.field_type,
        'Scope Type': spec.scope_type,
        'Scope Pod': spec.scope_pod_id ? [spec.scope_pod_id] : undefined,
        Required: spec.required,
        'Display Order': spec.display_order,
      },
    }),
  })
  if (!recRes.ok) throw new Error(`Airtable ${recRes.status}: ${await recRes.text()}`)
  const recData = await recRes.json() as AirtableFieldConfigRecord

  invalidateFieldConfigCache()
  return mapFieldConfig(recData)
}
