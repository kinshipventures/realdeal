export type LpTrackerFieldType = 'text' | 'long_text' | 'checkbox' | 'multi_select'

export type LpTrackerFieldDefinition = {
  key: string
  target: string
  label: string
  section: 'Investor Profile' | 'Fund Details' | 'Operations'
  type: LpTrackerFieldType
  aliases: readonly string[]
}

export const LP_TRACKER_FIELDS = [
  {
    key: 'phoneticName',
    target: 'Phonetic Name',
    label: 'Phonetic Name',
    section: 'Investor Profile',
    type: 'text',
    aliases: ['phonetic name', 'pronunciation', 'name pronunciation'],
  },
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
    type: 'text',
    aliases: ['city', 'home city', 'work city'],
  },
  {
    key: 'stateRegion',
    target: 'State / Region',
    label: 'State / Region',
    section: 'Investor Profile',
    type: 'text',
    aliases: ['state', 'state region', 'state / region', 'province', 'territory'],
  },
  {
    key: 'companyType',
    target: 'Company Type',
    label: 'Company Type',
    section: 'Investor Profile',
    type: 'text',
    aliases: ['company type', 'org type', 'organization type', 'company category'],
  },
  {
    key: 'companyLinkedIn',
    target: 'Company LinkedIn',
    label: 'Company LinkedIn',
    section: 'Investor Profile',
    type: 'text',
    aliases: ['company linkedin', 'company linkedin url', 'company linkedin profile', 'organization linkedin', 'org linkedin'],
  },
  {
    key: 'companyOverview',
    target: 'Company Overview',
    label: 'Company Overview',
    section: 'Investor Profile',
    type: 'long_text',
    aliases: ['company overview', 'organization overview', 'company description', 'company notes', 'business overview'],
  },
  {
    key: 'jobDescription',
    target: 'Job Description',
    label: 'Job Description',
    section: 'Investor Profile',
    type: 'long_text',
    aliases: ['job description', 'role description', 'professional bio'],
  },
  {
    key: 'likelihood',
    target: 'Likelihood',
    label: 'Likelihood',
    section: 'Investor Profile',
    type: 'text',
    aliases: ['likelihood', 'likelihood of investing', 'investing likelihood', 'investment likelihood'],
  },
  {
    key: 'mapsCategory',
    target: 'MAPS Category',
    label: 'MAPS Category',
    section: 'Investor Profile',
    type: 'text',
    aliases: ['maps category', 'map category'],
  },
  {
    key: 'talentCategory',
    target: 'Talent Category',
    label: 'Talent Category',
    section: 'Investor Profile',
    type: 'text',
    aliases: ['talent category'],
  },
  {
    key: 'globalRegionDetail',
    target: 'Global Region Detail',
    label: 'Global Region Detail',
    section: 'Investor Profile',
    type: 'text',
    aliases: ['global region', 'global region detail', 'region detail'],
  },
  {
    key: 'listRecommendation',
    target: 'List Recommendation',
    label: 'List Recommendation',
    section: 'Investor Profile',
    type: 'text',
    aliases: ['list id recommendation', 'list recommendation', 'main list recommendation'],
  },
  {
    key: 'fundType',
    target: 'Fund Type',
    label: 'Fund Type',
    section: 'Fund Details',
    type: 'text',
    aliases: ['fund type'],
  },
  {
    key: 'fundraiseStatus',
    target: 'KV Status',
    label: 'KV Status',
    section: 'Fund Details',
    type: 'text',
    aliases: ['status', 'kv status', 'kv_status', 'kv pipeline status', 'kv lp status', 'lp status', 'fundraise status', 'fundraising status'],
  },
  {
    key: 'investmentAmount',
    target: 'Investment Amount',
    label: 'Investment Amount',
    section: 'Fund Details',
    type: 'text',
    aliases: ['investment', 'investment amount', 'invested amount', 'amount invested'],
  },
  {
    key: 'investmentEntity',
    target: 'Investment Entity',
    label: 'Investment Entity',
    section: 'Fund Details',
    type: 'text',
    aliases: ['investment entity', 'investing entity', 'investor entity', 'investor k1 name', 'k1 name'],
  },
  {
    key: 'capitalCall',
    target: 'Capital Call',
    label: 'Capital Call',
    section: 'Fund Details',
    type: 'text',
    aliases: ['capital call', 'capital call amount'],
  },
  {
    key: 'kinshipInvestor',
    target: 'Kinship Investor',
    label: 'Kinship Investor',
    section: 'Fund Details',
    type: 'checkbox',
    aliases: ['kinship investor', 'kv investor', 'kinship ventures investor'],
  },
  {
    key: 'spvDistributionList',
    target: 'SPV Distribution List',
    label: 'SPV Distribution List',
    section: 'Fund Details',
    type: 'checkbox',
    aliases: ['spv distribution list', 'spv distro list'],
  },
  {
    key: 'spvInvestorFlag',
    target: 'SPV Investor Flag',
    label: 'SPV Investor Flag',
    section: 'Fund Details',
    type: 'checkbox',
    aliases: ['spv investor flag', 'spv investor checkbox', 'spv investor boolean'],
  },
  {
    key: 'contactSource',
    target: 'Contact Source',
    label: 'Contact Source',
    section: 'Operations',
    type: 'text',
    aliases: [
      'contact source',
      'relationship source',
      'source type',
      'met via',
      'met through source',
      'contact origin',
      'source category',
      'business card source',
      'whatsapp source',
      'by association source',
    ],
  },
  {
    key: 'summary',
    target: 'Summary',
    label: 'Summary',
    section: 'Operations',
    type: 'long_text',
    aliases: ['summary', 'contact summary', 'lp summary'],
  },
  {
    key: 'tldr',
    target: 'TLDR',
    label: 'TLDR',
    section: 'Operations',
    type: 'long_text',
    aliases: ['tldr', 'tl dr', 'short summary'],
  },
  {
    key: 'nextStep',
    target: 'Next Step',
    label: 'Next Step',
    section: 'Operations',
    type: 'long_text',
    aliases: ['next step', 'next steps', 'recommended next step'],
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
    aliases: ['notables', 'notable notes'],
  },
  {
    key: 'mainList',
    target: 'Main List',
    label: 'Main List',
    section: 'Operations',
    type: 'text',
    aliases: ['main list'],
  },
  {
    key: 'meetingDate',
    target: 'Meeting Date',
    label: 'Meeting Date',
    section: 'Operations',
    type: 'text',
    aliases: ['meeting date'],
  },
  {
    key: 'needsUpdate',
    target: 'Needs Update',
    label: 'Needs Update',
    section: 'Operations',
    type: 'checkbox',
    aliases: ['needs update', 'needs updates'],
  },
  {
    key: 'newHire',
    target: 'New Hire',
    label: 'New Hire',
    section: 'Operations',
    type: 'checkbox',
    aliases: ['new hire'],
  },
  {
    key: 'newOwner',
    target: 'New Owner',
    label: 'New Owner',
    section: 'Operations',
    type: 'text',
    aliases: ['new owner'],
  },
  {
    key: 'remove',
    target: 'Remove',
    label: 'Remove',
    section: 'Operations',
    type: 'checkbox',
    aliases: ['remove'],
  },
  {
    key: 'additionalLists',
    target: 'Additional Lists',
    label: 'Additional Lists',
    section: 'Operations',
    type: 'multi_select',
    aliases: ['additional lists', 'other lists'],
  },
  {
    key: 'areasOfInterest',
    target: 'Areas of Interest',
    label: 'Areas of Interest',
    section: 'Operations',
    type: 'multi_select',
    aliases: ['areas of interest', 'area of interest'],
  },
  {
    key: 'upworkLink',
    target: 'Upwork Link',
    label: 'Upwork Link',
    section: 'Operations',
    type: 'text',
    aliases: ['upwork link'],
  },
  {
    key: 'thirtySixtyNinety',
    target: '30/60/90',
    label: '30/60/90',
    section: 'Operations',
    type: 'text',
    aliases: ['30/60/90', '30 60 90', '30-60-90'],
  },
  {
    key: 'orgCategory',
    target: 'Org Category',
    label: 'Org Category',
    section: 'Operations',
    type: 'text',
    aliases: ['org category', 'organization category'],
  },
  {
    key: 'orgSubcategory',
    target: 'Org Subcategory',
    label: 'Org Subcategory',
    section: 'Operations',
    type: 'text',
    aliases: ['org subcategory', 'organization subcategory'],
  },
  {
    key: 'progressTracker',
    target: 'Progress Tracker',
    label: 'Progress Tracker',
    section: 'Operations',
    type: 'text',
    aliases: ['progress tracker'],
  },
  {
    key: 'credentials',
    target: 'Credentials',
    label: 'Credentials',
    section: 'Operations',
    type: 'text',
    aliases: ['credentials'],
  },
  {
    key: 'comments',
    target: 'Comments',
    label: 'Comments',
    section: 'Operations',
    type: 'long_text',
    aliases: ['comments'],
  },
] as const satisfies readonly LpTrackerFieldDefinition[]

export type LpTrackerTargetField = typeof LP_TRACKER_FIELDS[number]['target']

export const LP_TRACKER_TARGET_FIELDS: readonly LpTrackerTargetField[] = LP_TRACKER_FIELDS.map(field => field.target)

export const LP_TRACKER_ALIAS_ENTRIES = LP_TRACKER_FIELDS.flatMap(field =>
  field.aliases.map(alias => [alias, field.target] as const),
)

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
    const items = trimmed.split(/[;,|\n]+/).map(item => item.trim()).filter(Boolean)
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
