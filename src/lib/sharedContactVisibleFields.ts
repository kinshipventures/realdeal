import type { CollaborationFieldScope } from './collaboration'

export type SharedContactVisibleFieldId =
  | 'name'
  | 'company'
  | 'job_title'
  | 'city'
  | 'country'
  | 'linkedin'
  | 'pods'
  | 'sub_pods'
  | 'email'
  | 'email_2'
  | 'email_3'
  | 'phone'
  | 'address'
  | 'assistant_info'
  | 'referred_by'
  | 'gender'
  | 'birthday'
  | 'notables'
  | 'relationship_context'
  | 'recent_activity'
  | 'next_touchpoint'
  | 'kinship_investments'
  | 'investment_entity'
  | 'investment_email'
  | 'commitment_amount'
  | 'campaign'
  | 'campaign_status'
  | 'campaign_step'
  | 'campaign_notes'

export type SharedContactVisibleField = {
  id: SharedContactVisibleFieldId
  label: string
}

export type SharedContactVisibleFieldGroup = {
  scope: CollaborationFieldScope
  label: string
  summary: string
  required?: boolean
  fields: SharedContactVisibleField[]
}

const FIELD_SCOPE_ORDER: CollaborationFieldScope[] = [
  'public_profile',
  'private_contact',
  'relationship_private',
  'investment_private',
  'campaign_private',
]

const FIELD_SCOPE_SET = new Set<string>(FIELD_SCOPE_ORDER)
const VISIBLE_FIELD_TOKEN_PREFIX = 'visible:'

export const SHARED_CONTACT_VISIBLE_FIELD_GROUPS: SharedContactVisibleFieldGroup[] = [
  {
    scope: 'public_profile',
    label: 'Public profile',
    summary: 'Core contact card identity and list context.',
    required: true,
    fields: [
      { id: 'name', label: 'Name' },
      { id: 'company', label: 'Company' },
      { id: 'job_title', label: 'Job Title' },
      { id: 'city', label: 'City' },
      { id: 'country', label: 'Country' },
      { id: 'linkedin', label: 'LinkedIn' },
      { id: 'pods', label: 'Pods' },
      { id: 'sub_pods', label: 'Sub-pods' },
    ],
  },
  {
    scope: 'private_contact',
    label: 'Ways to contact',
    summary: 'Direct contact channels from the contact card.',
    fields: [
      { id: 'email', label: 'Email' },
      { id: 'email_2', label: 'Email 2' },
      { id: 'email_3', label: 'Email 3' },
      { id: 'phone', label: 'Phone' },
      { id: 'address', label: 'Address' },
      { id: 'assistant_info', label: 'Assistant Info' },
    ],
  },
  {
    scope: 'relationship_private',
    label: 'Relationship context',
    summary: 'Private relationship notes and activity context.',
    fields: [
      { id: 'referred_by', label: 'Referred By' },
      { id: 'gender', label: 'Gender' },
      { id: 'birthday', label: 'Birthday' },
      { id: 'notables', label: 'Notables' },
      { id: 'relationship_context', label: 'Context' },
      { id: 'recent_activity', label: 'Recent activity' },
      { id: 'next_touchpoint', label: 'Next touchpoint' },
    ],
  },
  {
    scope: 'investment_private',
    label: 'Investor profile',
    summary: 'Investment and commitment fields from the contact card.',
    fields: [
      { id: 'kinship_investments', label: 'Kinship Investments' },
      { id: 'investment_entity', label: 'Investment Entity' },
      { id: 'investment_email', label: 'Investment Email' },
      { id: 'commitment_amount', label: 'Commitment Amount' },
    ],
  },
  {
    scope: 'campaign_private',
    label: 'Campaigns',
    summary: 'Campaign participation, status, steps, and notes.',
    fields: [
      { id: 'campaign', label: 'Campaign' },
      { id: 'campaign_status', label: 'Campaign Status' },
      { id: 'campaign_step', label: 'Campaign Step' },
      { id: 'campaign_notes', label: 'Campaign Notes' },
    ],
  },
]

export const DEFAULT_SHARED_CONTACT_VISIBLE_FIELD_IDS = SHARED_CONTACT_VISIBLE_FIELD_GROUPS
  .filter(group => group.required)
  .flatMap(group => group.fields.map(field => field.id))

export const ALL_SHARED_CONTACT_VISIBLE_FIELD_IDS = SHARED_CONTACT_VISIBLE_FIELD_GROUPS
  .flatMap(group => group.fields.map(field => field.id))

const SHARED_CONTACT_VISIBLE_FIELD_ID_SET = new Set(ALL_SHARED_CONTACT_VISIBLE_FIELD_IDS)

export function isSharedContactVisibleFieldId(value: string): value is SharedContactVisibleFieldId {
  return SHARED_CONTACT_VISIBLE_FIELD_ID_SET.has(value as SharedContactVisibleFieldId)
}

export function isCollaborationFieldScope(value: string): value is CollaborationFieldScope {
  return FIELD_SCOPE_SET.has(value)
}

export function normalizeSharedContactFieldScopes(
  fieldScopes?: readonly string[] | null,
): CollaborationFieldScope[] {
  const selected = new Set(
    (fieldScopes ?? []).filter(isCollaborationFieldScope),
  )
  if (selected.size === 0) selected.add('public_profile')
  return FIELD_SCOPE_ORDER.filter(scope => selected.has(scope))
}

export function deriveSharedContactVisibleFieldIdsFromScopes(
  scopes: readonly string[] = ['public_profile'],
): SharedContactVisibleFieldId[] {
  const selectedScopes = new Set(normalizeSharedContactFieldScopes(scopes))
  return SHARED_CONTACT_VISIBLE_FIELD_GROUPS
    .filter(group => selectedScopes.has(group.scope))
    .flatMap(group => group.fields.map(field => field.id))
}

export function normalizeSharedContactVisibleFieldIds(
  selectedFieldIds?: readonly string[] | null,
  fallbackScopes: readonly string[] = ['public_profile'],
): SharedContactVisibleFieldId[] {
  const selected = selectedFieldIds?.filter(isSharedContactVisibleFieldId) ?? []
  const source = selected.length > 0
    ? [...DEFAULT_SHARED_CONTACT_VISIBLE_FIELD_IDS, ...selected]
    : deriveSharedContactVisibleFieldIdsFromScopes(fallbackScopes)
  const unique = new Set(source)
  return ALL_SHARED_CONTACT_VISIBLE_FIELD_IDS.filter(fieldId => unique.has(fieldId))
}

export function encodeSharedContactVisibleFieldToken(fieldId: SharedContactVisibleFieldId): string {
  return `${VISIBLE_FIELD_TOKEN_PREFIX}${fieldId}`
}

export function decodeSharedContactVisibleFieldIdsFromScopes(
  fieldScopes?: readonly string[] | null,
): SharedContactVisibleFieldId[] {
  const decoded = (fieldScopes ?? [])
    .filter(scope => scope.startsWith(VISIBLE_FIELD_TOKEN_PREFIX))
    .map(scope => scope.slice(VISIBLE_FIELD_TOKEN_PREFIX.length))
  return normalizeSharedContactVisibleFieldIds(decoded, fieldScopes ?? ['public_profile'])
}

export function encodeSharedContactFieldScopes(
  selectedFieldIds: readonly SharedContactVisibleFieldId[],
): string[] {
  const fieldScopes = deriveSharedContactFieldScopes([...selectedFieldIds])
  const visibleFieldIds = normalizeSharedContactVisibleFieldIds(selectedFieldIds, fieldScopes)
  return [
    ...fieldScopes,
    ...visibleFieldIds.map(encodeSharedContactVisibleFieldToken),
  ]
}

export function deriveSharedContactFieldScopes(
  selectedFieldIds: SharedContactVisibleFieldId[],
): CollaborationFieldScope[] {
  const selected = new Set(selectedFieldIds)
  const scopes = new Set<CollaborationFieldScope>(['public_profile'])

  SHARED_CONTACT_VISIBLE_FIELD_GROUPS.forEach(group => {
    if (group.required || group.fields.some(field => selected.has(field.id))) {
      scopes.add(group.scope)
    }
  })

  return FIELD_SCOPE_ORDER.filter(scope => scopes.has(scope))
}

