export type LpTrackerFieldType = 'text' | 'long_text' | 'checkbox' | 'multi_select'

export type LpTrackerFieldDefinition = {
  key: string
  target: string
  label: string
  section: 'Investor Profile' | 'Fund Details' | 'Operations' | 'ClickUp Source'
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
    key: 'linkedInLabels',
    target: 'LinkedIn Labels',
    label: 'LinkedIn Labels',
    section: 'Investor Profile',
    type: 'multi_select',
    aliases: ['linkedin labels', 'linkedin label', 'linkedin tags'],
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
    key: 'category',
    target: 'Category',
    label: 'Category',
    section: 'Investor Profile',
    type: 'text',
    aliases: ['category', 'categories'],
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
    aliases: ['kv status', 'kv_status', 'kv pipeline status', 'fundraise status', 'fundraising status'],
  },
  {
    key: 'kvLpStatus',
    target: 'KV LP Status',
    label: 'KV LP Status',
    section: 'Fund Details',
    type: 'text',
    aliases: ['kv lp status', 'lp status'],
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
    key: 'correspondingInvestments',
    target: 'Corresponding Investments',
    label: 'Corresponding Investments',
    section: 'Fund Details',
    type: 'multi_select',
    aliases: [
      'corresponding investments',
      'related investments',
      'lp investments',
      'investments',
      'investment names',
      'portfolio investments',
      'pipeline investments',
      'pipeline overlap',
    ],
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
    aliases: ['notables', 'noteables', 'notable notes'],
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
  {
    key: 'clickupTaskType',
    target: 'ClickUp Task Type',
    label: 'ClickUp Task Type',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['task type', 'clickup task type'],
  },
  {
    key: 'clickupTaskId',
    target: 'ClickUp Task ID',
    label: 'ClickUp Task ID',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['task id', 'clickup task id'],
  },
  {
    key: 'clickupStatus',
    target: 'ClickUp Status',
    label: 'ClickUp Status',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['status', 'task status', 'clickup status'],
  },
  {
    key: 'clickupTaskContent',
    target: 'ClickUp Task Content',
    label: 'ClickUp Task Content',
    section: 'ClickUp Source',
    type: 'long_text',
    aliases: ['task content', 'task description', 'clickup task content'],
  },
  {
    key: 'assignee',
    target: 'Assignee',
    label: 'Assignee',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['assignee', 'assignees'],
  },
  {
    key: 'priority',
    target: 'Priority',
    label: 'Priority',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['priority'],
  },
  {
    key: 'latestComment',
    target: 'Latest Comment',
    label: 'Latest Comment',
    section: 'ClickUp Source',
    type: 'long_text',
    aliases: ['latest comment', 'last comment'],
  },
  {
    key: 'commentCount',
    target: 'Comment Count',
    label: 'Comment Count',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['comment count'],
  },
  {
    key: 'assignedCommentCount',
    target: 'Assigned Comment Count',
    label: 'Assigned Comment Count',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['assigned comment count'],
  },
  {
    key: 'dueDate',
    target: 'Due Date',
    label: 'Due Date',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['due date'],
  },
  {
    key: 'startDate',
    target: 'Start Date',
    label: 'Start Date',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['start date'],
  },
  {
    key: 'dateCreated',
    target: 'Date Created',
    label: 'Date Created',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['date created', 'created date'],
  },
  {
    key: 'dateUpdated',
    target: 'Date Updated',
    label: 'Date Updated',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['date updated', 'updated date'],
  },
  {
    key: 'dateClosed',
    target: 'Date Closed',
    label: 'Date Closed',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['date closed', 'closed date'],
  },
  {
    key: 'dateDone',
    target: 'Date Done',
    label: 'Date Done',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['date done', 'done date'],
  },
  {
    key: 'createdBy',
    target: 'Created By',
    label: 'Created By',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['created by'],
  },
  {
    key: 'space',
    target: 'Space',
    label: 'Space',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['space'],
  },
  {
    key: 'folder',
    target: 'Folder',
    label: 'Folder',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['folder'],
  },
  {
    key: 'subtaskIds',
    target: 'Subtask IDs',
    label: 'Subtask IDs',
    section: 'ClickUp Source',
    type: 'multi_select',
    aliases: ['subtask ids', 'subtask id', 'subtask ids'],
  },
  {
    key: 'subtaskUrls',
    target: 'Subtask URLs',
    label: 'Subtask URLs',
    section: 'ClickUp Source',
    type: 'multi_select',
    aliases: ['subtask urls', 'subtask url'],
  },
  {
    key: 'tags',
    target: 'Tags',
    label: 'Tags',
    section: 'ClickUp Source',
    type: 'multi_select',
    aliases: ['tags', 'tag'],
  },
  {
    key: 'sprints',
    target: 'Sprints',
    label: 'Sprints',
    section: 'ClickUp Source',
    type: 'multi_select',
    aliases: ['sprints', 'sprint'],
  },
  {
    key: 'linkedTasks',
    target: 'Linked Tasks',
    label: 'Linked Tasks',
    section: 'ClickUp Source',
    type: 'multi_select',
    aliases: ['linked tasks', 'linked task'],
  },
  {
    key: 'linkedDocs',
    target: 'Linked Docs',
    label: 'Linked Docs',
    section: 'ClickUp Source',
    type: 'multi_select',
    aliases: ['linked docs', 'linked doc'],
  },
  {
    key: 'timeLogged',
    target: 'Time Logged',
    label: 'Time Logged',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['time logged'],
  },
  {
    key: 'timeEstimate',
    target: 'Time Estimate',
    label: 'Time Estimate',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['time estimate'],
  },
  {
    key: 'timeEstimateRolledUp',
    target: 'Time Estimate Rolled Up',
    label: 'Time Estimate Rolled Up',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['time estimate rolled up'],
  },
  {
    key: 'timeInStatus',
    target: 'Time In Status',
    label: 'Time In Status',
    section: 'ClickUp Source',
    type: 'long_text',
    aliases: ['time in status'],
  },
  {
    key: 'pointsEstimate',
    target: 'Points Estimate',
    label: 'Points Estimate',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['points estimate'],
  },
  {
    key: 'pointsEstimateRolledUp',
    target: 'Points Estimate Rolled Up',
    label: 'Points Estimate Rolled Up',
    section: 'ClickUp Source',
    type: 'text',
    aliases: ['points estimate rolled up'],
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
