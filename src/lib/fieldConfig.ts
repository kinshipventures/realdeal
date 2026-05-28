import { supabase } from '@/integrations/supabase/client'
import type { RelationshipType } from './types'
import { isDemoMode, DEMO_FIELD_CONFIGS } from './sampleData'

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

const CACHE_TTL = 5 * 60 * 1000

let _fieldConfigCache: FieldConfig[] | null = null
let _fieldConfigCacheTime = 0
let _fieldConfigFetch: Promise<FieldConfig[]> | null = null

function mapFieldConfig(r: any): FieldConfig {
  return {
    id: r.id,
    name: r.name ?? '',
    airtable_field_id: r.airtable_field_id ?? '',
    field_type: (r.field_type as FieldConfig['field_type']) ?? 'text',
    scope_type: (r.scope_type as FieldConfig['scope_type']) ?? 'Both',
    scope_pod_id: r.scope_pod_id ?? null,
    required: r.required ?? false,
    display_order: r.display_order ?? 0,
  }
}

async function fetchAllFieldConfigs(): Promise<FieldConfig[]> {
  const { data, error } = await supabase.from('field_config').select('*')
  if (error) throw error
  return (data ?? []).map(mapFieldConfig)
}

export function getFieldConfigs(): Promise<FieldConfig[]> {
  if (isDemoMode()) return Promise.resolve(DEMO_FIELD_CONFIGS as FieldConfig[])

  const isExpired = !_fieldConfigCache || Date.now() - _fieldConfigCacheTime > CACHE_TTL
  if (_fieldConfigCache && !isExpired) return Promise.resolve(_fieldConfigCache!)

  if (_fieldConfigCache && isExpired && !_fieldConfigFetch) {
    const stale = _fieldConfigCache
    _fieldConfigFetch = fetchAllFieldConfigs().then(records => {
      _fieldConfigCache = records; _fieldConfigCacheTime = Date.now(); _fieldConfigFetch = null
      return _fieldConfigCache
    }).catch(err => { _fieldConfigFetch = null; throw err })
    return Promise.resolve(stale)
  }

  if (!_fieldConfigFetch) {
    _fieldConfigFetch = fetchAllFieldConfigs().then(records => {
      _fieldConfigCache = records; _fieldConfigCacheTime = Date.now(); _fieldConfigFetch = null
      return _fieldConfigCache
    }).catch(err => { _fieldConfigFetch = null; throw err })
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

export async function createCustomField(spec: {
  name: string
  field_type: FieldConfig['field_type']
  scope_type: FieldConfig['scope_type']
  scope_pod_id: string | null
  required: boolean
  display_order: number
}): Promise<FieldConfig> {
  void spec
  throw new Error('Custom field creation is disabled. Use an existing standard field or request an approved schema change.')
}
