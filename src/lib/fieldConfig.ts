import { supabase } from '@/integrations/supabase/client'
import type { RelationshipType } from './types'
import { isDemoMode, DEMO_FIELD_CONFIGS } from './sampleData'

export interface FieldConfig {
  id: string
  name: string
  source_field_id: string
  field_type: 'text' | 'multiline' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'email' | 'url'
  scope_type: 'Contact' | 'Company' | 'Both'
  scope_pod_id: string | null
  required: boolean
  display_order: number
}

const CACHE_TTL = 5 * 60 * 1000

let _fieldConfigCache: FieldConfig[] | null = null
let _fieldConfigCacheTime = 0
let _fieldConfigFetch: Promise<FieldConfig[]> | null = null
let _demoFieldConfigCache: FieldConfig[] | null = null
const DEMO_CUSTOM_FIELD_CONFIGS_KEY = 'realdeal:demo-custom-field-configs'

function mapFieldConfig(r: any): FieldConfig {
  const fieldType = String(r.field_type ?? 'text') as FieldConfig['field_type']

  return {
    id: r.id,
    name: r.name ?? '',
    source_field_id: r.airtable_field_id ?? '',
    field_type: fieldType,
    scope_type: (r.scope_type as FieldConfig['scope_type']) ?? 'Both',
    scope_pod_id: r.scope_pod_id ?? null,
    required: r.required ?? false,
    display_order: r.display_order ?? 0,
  }
}

function sourceFieldIdForName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'field'

  return `custom_${slug}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

async function fetchAllFieldConfigs(): Promise<FieldConfig[]> {
  const { data, error } = await supabase.from('field_config').select('*')
  if (error) throw error
  return (data ?? []).map(mapFieldConfig)
}

function getDemoFieldConfigs(): FieldConfig[] {
  if (!_demoFieldConfigCache) {
    _demoFieldConfigCache = [
      ...(DEMO_FIELD_CONFIGS as FieldConfig[]),
      ...readDemoCustomFieldConfigs(),
    ]
  }
  return _demoFieldConfigCache
}

function readDemoCustomFieldConfigs(): FieldConfig[] {
  try {
    const raw = localStorage.getItem(DEMO_CUSTOM_FIELD_CONFIGS_KEY)
    if (!raw) return []
    const records = JSON.parse(raw)
    if (!Array.isArray(records)) return []
    return records.filter((record): record is FieldConfig => {
      return Boolean(
        record &&
        typeof record.id === 'string' &&
        typeof record.name === 'string' &&
        typeof record.source_field_id === 'string' &&
        record.source_field_id.startsWith('custom_'),
      )
    })
  } catch {
    return []
  }
}

function writeDemoCustomFieldConfigs(records: FieldConfig[]) {
  try {
    localStorage.setItem(
      DEMO_CUSTOM_FIELD_CONFIGS_KEY,
      JSON.stringify(records.filter(record => record.source_field_id.startsWith('custom_'))),
    )
  } catch {
    // Demo persistence is best effort only.
  }
}

export function getFieldConfigs(): Promise<FieldConfig[]> {
  if (isDemoMode()) return Promise.resolve(getDemoFieldConfigs())

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
  workspace_id: string
  user_id: string
  name: string
  field_type: FieldConfig['field_type']
  scope_type: FieldConfig['scope_type']
  scope_pod_id: string | null
  required: boolean
  display_order: number
}): Promise<FieldConfig> {
  if (isDemoMode()) {
    const sourceFieldId = sourceFieldIdForName(spec.name)
    const created = {
      id: sourceFieldId,
      name: spec.name,
      source_field_id: sourceFieldId,
      field_type: spec.field_type,
      scope_type: spec.scope_type,
      scope_pod_id: spec.scope_pod_id,
      required: spec.required,
      display_order: spec.display_order,
    }
    _demoFieldConfigCache = [...getDemoFieldConfigs(), created]
    writeDemoCustomFieldConfigs(_demoFieldConfigCache)
    return created
  }

  const { data, error } = await supabase
    .from('field_config')
    .insert({
      workspace_id: spec.workspace_id,
      user_id: spec.user_id,
      name: spec.name.trim(),
      airtable_field_id: sourceFieldIdForName(spec.name),
      field_type: spec.field_type,
      scope_type: spec.scope_type,
      scope_pod_id: spec.scope_pod_id,
      required: spec.required,
      display_order: spec.display_order,
    })
    .select('*')
    .single()

  if (error) throw error
  invalidateFieldConfigCache()
  return mapFieldConfig(data)
}

export async function deleteCustomField(id: string): Promise<void> {
  if (isDemoMode()) {
    _demoFieldConfigCache = getDemoFieldConfigs().filter(config => config.id !== id)
    writeDemoCustomFieldConfigs(_demoFieldConfigCache)
    return
  }

  const { error } = await supabase
    .from('field_config')
    .delete()
    .eq('id', id)

  if (error) throw error
  invalidateFieldConfigCache()
}
