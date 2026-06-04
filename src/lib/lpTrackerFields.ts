export type LpTrackerFieldType = 'text' | 'long_text' | 'checkbox' | 'multi_select' | 'select' | 'url'

export type LpTrackerFieldDefinition = {
  key: string
  legacyKeys?: readonly string[]
  target: string
  label: string
  section: 'Investor Profile' | 'Fund Details' | 'Operations' | 'Notes'
  type: LpTrackerFieldType
  aliases: readonly string[]
}

export const LP_TRACKER_FIELDS = [
  {
    key: 'address',
    target: 'Address',
    label: 'Address',
    section: 'Investor Profile',
    type: 'text',
    aliases: ['address', 'address 1', 'address one', 'mailing address'],
  },
  {
    key: 'city',
    target: 'City',
    label: 'City',
    section: 'Investor Profile',
    type: 'select',
    aliases: ['city', 'city dropdown', 'home city', 'work city', 'town', 'metro'],
  },
  {
    key: 'category',
    target: 'Category',
    label: 'Category',
    section: 'Investor Profile',
    type: 'select',
    aliases: ['category', 'categories', 'contact category', 'lp category'],
  },
  {
    key: 'globalRegionDetail',
    target: 'Global Region',
    label: 'Global Region',
    section: 'Investor Profile',
    type: 'select',
    aliases: ['global region', 'global region detail', 'region detail', 'region'],
  },
  {
    key: 'fundType',
    target: 'Fund Type',
    label: 'Fund Type',
    section: 'Fund Details',
    type: 'select',
    aliases: ['fund type', 'fund', 'fund category'],
  },
  {
    key: 'spvInvestorFlag',
    target: 'SPV Investor (checkbox)',
    label: 'SPV Investor Checkbox',
    section: 'Fund Details',
    type: 'checkbox',
    aliases: ['spv investor flag', 'spv investor checkbox', 'spv investor boolean'],
  },
  {
    key: 'assistantInfo',
    target: 'Assistant Info',
    label: 'Assistant Info',
    section: 'Operations',
    type: 'long_text',
    aliases: ['assistant info', 'assistant notes'],
  },
  {
    key: 'notables',
    target: 'Notables',
    label: 'Notables',
    section: 'Operations',
    type: 'long_text',
    aliases: ['notables', 'noteables', 'notable notes'],
  },
  {
    key: 'upworkLink',
    target: 'Upwork Link',
    label: 'Upwork Link',
    section: 'Operations',
    type: 'url',
    aliases: ['upwork link'],
  },
  {
    key: 'notes',
    legacyKeys: ['clickupTaskContent'],
    target: 'Notes',
    label: 'Notes',
    section: 'Notes',
    type: 'long_text',
    aliases: ['notes', 'note', 'task content', 'task description', 'clickup task content', 'updates', 'recent activity', 'activity log', 'touchpoints'],
  },
] as const satisfies readonly LpTrackerFieldDefinition[]

export type LpTrackerTargetField = typeof LP_TRACKER_FIELDS[number]['target']

export const LP_TRACKER_TARGET_FIELDS: readonly LpTrackerTargetField[] = LP_TRACKER_FIELDS.map(field => field.target)

export const LP_TRACKER_ALIAS_ENTRIES = LP_TRACKER_FIELDS.flatMap(field =>
  field.aliases.map(alias => [alias, field.target] as const),
)

export function trimImportListItem(value: string): string {
  let trimmed = value.trim()
  const leading = new Set(['[', '(', '{', '"', "'"])
  const trailing = new Set([']', ')', '}', '"', "'"])
  while (trimmed && leading.has(trimmed[0])) trimmed = trimmed.slice(1).trimStart()
  while (trimmed && trailing.has(trimmed[trimmed.length - 1])) trimmed = trimmed.slice(0, -1).trimEnd()
  return trimmed.trim()
}

export function parseCheckboxImportValue(value: string): boolean | null {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (['true', 'yes', 'y', '1', 'checked', 'x'].includes(normalized)) return true
  if (['false', 'no', 'n', '0', 'unchecked'].includes(normalized)) return false
  return true
}

export function normalizeLpTrackerFieldValue(field: LpTrackerFieldDefinition, value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (field.type === 'checkbox') return parseCheckboxImportValue(trimmed)
  if (field.type === 'multi_select') {
    const items = trimmed
      .split(/[;,|\n]+/)
      .map(trimImportListItem)
      .filter(Boolean)
    return items.length > 0 ? items : null
  }
  if (field.key === 'contactSource') {
    const normalized = trimmed.toLowerCase().replace(/[\s_-]+/g, ' ')
    if (['business card', 'bc', 'card', 'business card given in person', 'bc was given in person'].includes(normalized)) {
      return 'Business Card'
    }
    if (['whatsapp', 'whats app', 'met in person and exchanged numbers', 'exchanged numbers'].includes(normalized)) {
      return 'WhatsApp'
    }
    if (['by association', 'association', 'introduced by another person', 'introduced', 'intro', 'referral'].includes(normalized)) {
      return 'By Association'
    }
  }
  return trimmed
}

export function hasLpTrackerValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.trim().length > 0
  return value !== null && value !== undefined
}

export function lpTrackerDisplayValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === null || value === undefined) return ''
  return String(value)
}
