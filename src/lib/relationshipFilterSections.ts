export const RELATIONSHIP_NONE_FILTER_VALUE = '__realdeal_none__'

export type RelationshipFilterFieldDef = {
  id: string
  label: string
}

type RelationshipFilterStateLike = {
  propertyValue?: string | null
  propertyValues?: string[] | null
}

function normalizedFilterText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function uniqueValues(values: Iterable<string>): string[] {
  const seen = new Map<string, string>()
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = normalizedFilterText(trimmed)
    if (!seen.has(key)) seen.set(key, trimmed)
  }
  return [...seen.values()]
}

export function normalizeRelationshipFilterFieldId(fieldId: string | null | undefined): string | null {
  if (!fieldId) return null
  if (/^Pod \d+$/.test(fieldId) || fieldId === 'Pods') return 'Pods'
  if (/^Sub-pod \d+$/.test(fieldId) || fieldId === 'Sub-pods') return 'Sub-pods'
  if (/^Kinship Investments \d+$/.test(fieldId) || fieldId === 'Kinship Investments') return 'Kinship Investments'
  if (/^Campaign \d+$/.test(fieldId) || fieldId === 'Campaigns') return 'Campaigns'
  if (/^Campaign \d+ Status$/.test(fieldId) || fieldId === 'Campaign Status') return 'Campaign Status'
  if (/^Campaign \d+ Target Commitment$/.test(fieldId) || fieldId === 'Campaign Target Commitment') return 'Campaign Target Commitment'
  return fieldId
}

export function buildRelationshipFilterFields(fields: RelationshipFilterFieldDef[]): RelationshipFilterFieldDef[] {
  const deduped = new Map<string, RelationshipFilterFieldDef>()
  for (const field of fields) {
    const id = normalizeRelationshipFilterFieldId(field.id)
    if (!id || deduped.has(id)) continue
    deduped.set(id, { id, label: id === field.id ? field.label : id })
  }
  return [...deduped.values()]
}

export function selectedRelationshipFilterValues(filters: RelationshipFilterStateLike): string[] {
  return uniqueValues([
    ...(Array.isArray(filters.propertyValues) ? filters.propertyValues : []),
    ...(filters.propertyValue ? [filters.propertyValue] : []),
  ])
}

export function relationshipFilterValueLabel(value: string): string {
  return value === RELATIONSHIP_NONE_FILTER_VALUE ? 'None' : value
}

export function relationshipMatchesSelectedValues(contactValues: string[], selectedValues: string[]): boolean {
  if (selectedValues.length === 0) return true
  const normalizedValues = new Set(contactValues.map(normalizedFilterText).filter(Boolean))
  return selectedValues.some(value => (
    value === RELATIONSHIP_NONE_FILTER_VALUE
      ? normalizedValues.size === 0
      : normalizedValues.has(normalizedFilterText(value))
  ))
}
