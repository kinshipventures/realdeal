import type { RelationshipType } from './types'

export type PropertyObjectType = 'Contact' | 'Company' | 'Pod' | 'Sub-pod' | 'Campaign'

export type ContactDisplaySectionId =
  | 'relationship_overview'
  | 'health'
  | 'pods'
  | 'sub_pods'
  | 'details'
  | 'pod_fields'
  | 'fund_activity'
  | 'associated_company'
  | 'associated_people'
  | 'campaigns'

export interface PropertyOption {
  id: string
  label: string
  fieldType: string
  group: string
  objectType: PropertyObjectType
  ownerLabel: string
}

export interface ContactDisplaySectionOption extends PropertyOption {
  id: ContactDisplaySectionId
  appliesTo: RelationshipType | 'Both'
}

export interface ContactDisplaySettings {
  hiddenSectionIds: ContactDisplaySectionId[]
  hiddenStandardFieldIds: string[]
  hiddenFieldConfigIds: string[]
  pinnedPodIds: string[]
  pinnedSubPodIds: string[]
  pinnedCampaignIds: string[]
  pinnedCompanyIds: string[]
  pinnedFieldOptionValues: Record<string, string[]>
}

export interface ContactDisplaySettingsStore extends ContactDisplaySettings {
  contactOverrides: Record<string, ContactDisplaySettings>
}

export const CONTACT_DISPLAY_SETTINGS_EVENT = 'realdeal:contact-display-settings-changed'

const STORAGE_KEY_PREFIX = 'realdeal:contact-display-settings'

export const DEFAULT_CONTACT_DISPLAY_SETTINGS: ContactDisplaySettings = {
  hiddenSectionIds: [],
  hiddenStandardFieldIds: [],
  hiddenFieldConfigIds: [],
  pinnedPodIds: [],
  pinnedSubPodIds: [],
  pinnedCampaignIds: [],
  pinnedCompanyIds: [],
  pinnedFieldOptionValues: {},
}

export const DEFAULT_CONTACT_DISPLAY_SETTINGS_STORE: ContactDisplaySettingsStore = {
  ...DEFAULT_CONTACT_DISPLAY_SETTINGS,
  contactOverrides: {},
}

export const CONTACT_DISPLAY_SECTION_OPTIONS: ContactDisplaySectionOption[] = [
  {
    id: 'relationship_overview',
    label: 'Relationship overview',
    fieldType: 'Section',
    group: 'Contact activity',
    objectType: 'Contact',
    ownerLabel: 'Real Deal',
    appliesTo: 'Contact',
  },
  {
    id: 'health',
    label: 'Relationship health',
    fieldType: 'Section',
    group: 'Calculated contact information',
    objectType: 'Company',
    ownerLabel: 'Real Deal',
    appliesTo: 'Company',
  },
  {
    id: 'sub_pods',
    label: 'Sub-pods',
    fieldType: 'Section',
    group: 'Contact organization',
    objectType: 'Contact',
    ownerLabel: 'Real Deal',
    appliesTo: 'Both',
  },
  {
    id: 'pods',
    label: 'Pods',
    fieldType: 'Section',
    group: 'Contact organization',
    objectType: 'Pod',
    ownerLabel: 'Real Deal',
    appliesTo: 'Both',
  },
  {
    id: 'details',
    label: 'Details',
    fieldType: 'Section',
    group: 'Contact information',
    objectType: 'Contact',
    ownerLabel: 'Real Deal',
    appliesTo: 'Both',
  },
  {
    id: 'pod_fields',
    label: 'Pod fields',
    fieldType: 'Section',
    group: 'Custom pod information',
    objectType: 'Pod',
    ownerLabel: 'Real Deal',
    appliesTo: 'Both',
  },
  {
    id: 'fund_activity',
    label: 'Fund activity',
    fieldType: 'Section',
    group: 'Investment information',
    objectType: 'Contact',
    ownerLabel: 'Real Deal',
    appliesTo: 'Contact',
  },
  {
    id: 'associated_company',
    label: 'Associated company',
    fieldType: 'Section',
    group: 'Company information',
    objectType: 'Company',
    ownerLabel: 'Real Deal',
    appliesTo: 'Contact',
  },
  {
    id: 'associated_people',
    label: 'Associated people',
    fieldType: 'Section',
    group: 'Company information',
    objectType: 'Company',
    ownerLabel: 'Real Deal',
    appliesTo: 'Company',
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    fieldType: 'Section',
    group: 'Campaign information',
    objectType: 'Campaign',
    ownerLabel: 'Real Deal',
    appliesTo: 'Both',
  },
]

export const CONTACT_STANDARD_PROPERTY_OPTIONS: PropertyOption[] = [
  { id: 'relationship_context', label: 'Context', fieldType: 'Multi-line text', group: 'Contact activity', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'intel_notes', label: 'Intel', fieldType: 'Multi-line text', group: 'Contact activity', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'communication_preferences', label: 'Reach', fieldType: 'Multi-line text', group: 'Contact activity', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'email', label: 'Email', fieldType: 'Single-line text', group: 'Contact information', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'birthday', label: 'Birthday', fieldType: 'Date', group: 'Contact information', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'location', label: 'Location', fieldType: 'Single-line text', group: 'Contact information', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'linkedin', label: 'LinkedIn', fieldType: 'URL', group: 'Contact information', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'notes', label: 'Notes', fieldType: 'Multi-line text', group: 'Contact information', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'gender', label: 'Gender', fieldType: 'Single select', group: 'Contact information', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'country', label: 'Country', fieldType: 'Single-line text', group: 'Contact information', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'global_region', label: 'Region', fieldType: 'Single select', group: 'Contact information', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'contact_frequency', label: 'Contact Frequency', fieldType: 'Single select', group: 'Contact activity', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'kv_fund_investor', label: 'Kinship Investments', fieldType: 'Multiple checkboxes', group: 'Investment information', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'email_2', label: 'Email 2', fieldType: 'Single-line text', group: 'Contact information', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'email_3', label: 'Email 3', fieldType: 'Single-line text', group: 'Contact information', objectType: 'Contact', ownerLabel: 'Real Deal' },
  { id: 'website', label: 'Website', fieldType: 'URL', group: 'Contact information', objectType: 'Contact', ownerLabel: 'Real Deal' },
]

export const COMPANY_STANDARD_PROPERTY_OPTIONS: PropertyOption[] = [
  { id: 'email', label: 'Email', fieldType: 'Single-line text', group: 'Company information', objectType: 'Company', ownerLabel: 'Real Deal' },
  { id: 'email_2', label: 'Email 2', fieldType: 'Single-line text', group: 'Company information', objectType: 'Company', ownerLabel: 'Real Deal' },
  { id: 'email_3', label: 'Email 3', fieldType: 'Single-line text', group: 'Company information', objectType: 'Company', ownerLabel: 'Real Deal' },
  { id: 'website', label: 'Website', fieldType: 'URL', group: 'Company information', objectType: 'Company', ownerLabel: 'Real Deal' },
  { id: 'notes', label: 'Notes', fieldType: 'Multi-line text', group: 'Company information', objectType: 'Company', ownerLabel: 'Real Deal' },
]

function storageKey(workspaceId?: string | null): string {
  return `${STORAGE_KEY_PREFIX}:${workspaceId || 'local'}`
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function normalizeContactDisplaySettings(value: unknown): ContactDisplaySettings {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<ContactDisplaySettings>
    : {}

  return {
    hiddenSectionIds: normalizeStringArray(raw.hiddenSectionIds) as ContactDisplaySectionId[],
    hiddenStandardFieldIds: normalizeStringArray(raw.hiddenStandardFieldIds),
    hiddenFieldConfigIds: normalizeStringArray(raw.hiddenFieldConfigIds),
    pinnedPodIds: normalizeStringArray(raw.pinnedPodIds),
    pinnedSubPodIds: normalizeStringArray(raw.pinnedSubPodIds),
    pinnedCampaignIds: normalizeStringArray(raw.pinnedCampaignIds),
    pinnedCompanyIds: normalizeStringArray(raw.pinnedCompanyIds),
    pinnedFieldOptionValues: normalizeFieldOptionValues(raw.pinnedFieldOptionValues),
  }
}

function normalizeFieldOptionValues(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([fieldId, values]) => [fieldId, normalizeStringArray(values)])
      .filter(([fieldId, values]) => fieldId.length > 0 && values.length > 0),
  )
}

function mergeFieldOptionValues(
  globalValues: Record<string, string[]>,
  contactValues: Record<string, string[]> = {},
): Record<string, string[]> {
  const fieldIds = new Set([...Object.keys(globalValues), ...Object.keys(contactValues)])
  return Object.fromEntries(
    [...fieldIds].map(fieldId => [
      fieldId,
      [...new Set([...(globalValues[fieldId] ?? []), ...(contactValues[fieldId] ?? [])])],
    ]),
  )
}

function normalizeContactOverrides(value: unknown): Record<string, ContactDisplaySettings> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([contactId]) => typeof contactId === 'string' && contactId.length > 0)
      .map(([contactId, settings]) => [contactId, normalizeContactDisplaySettings(settings)]),
  )
}

export function normalizeContactDisplaySettingsStore(value: unknown): ContactDisplaySettingsStore {
  const globalSettings = normalizeContactDisplaySettings(value)
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<ContactDisplaySettingsStore>
    : {}

  return {
    ...globalSettings,
    contactOverrides: normalizeContactOverrides(raw.contactOverrides),
  }
}

function mergeDisplaySettings(globalSettings: ContactDisplaySettings, contactSettings?: ContactDisplaySettings): ContactDisplaySettings {
  if (!contactSettings) return globalSettings

  return {
    hiddenSectionIds: [...new Set([...globalSettings.hiddenSectionIds, ...contactSettings.hiddenSectionIds])],
    hiddenStandardFieldIds: [...new Set([...globalSettings.hiddenStandardFieldIds, ...contactSettings.hiddenStandardFieldIds])],
    hiddenFieldConfigIds: [...new Set([...globalSettings.hiddenFieldConfigIds, ...contactSettings.hiddenFieldConfigIds])],
    pinnedPodIds: [...new Set([...globalSettings.pinnedPodIds, ...contactSettings.pinnedPodIds])],
    pinnedSubPodIds: [...new Set([...globalSettings.pinnedSubPodIds, ...contactSettings.pinnedSubPodIds])],
    pinnedCampaignIds: [...new Set([...globalSettings.pinnedCampaignIds, ...contactSettings.pinnedCampaignIds])],
    pinnedCompanyIds: [...new Set([...globalSettings.pinnedCompanyIds, ...contactSettings.pinnedCompanyIds])],
    pinnedFieldOptionValues: mergeFieldOptionValues(globalSettings.pinnedFieldOptionValues, contactSettings.pinnedFieldOptionValues),
  }
}

function isEmptySettings(settings: ContactDisplaySettings): boolean {
  return settings.hiddenSectionIds.length === 0 &&
    settings.hiddenStandardFieldIds.length === 0 &&
    settings.hiddenFieldConfigIds.length === 0 &&
    settings.pinnedPodIds.length === 0 &&
    settings.pinnedSubPodIds.length === 0 &&
    settings.pinnedCampaignIds.length === 0 &&
    settings.pinnedCompanyIds.length === 0 &&
    Object.keys(settings.pinnedFieldOptionValues).length === 0
}

export function getContactDisplaySettingsStore(workspaceId?: string | null): ContactDisplaySettingsStore {
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    if (!raw) return DEFAULT_CONTACT_DISPLAY_SETTINGS_STORE
    return normalizeContactDisplaySettingsStore(JSON.parse(raw))
  } catch {
    return DEFAULT_CONTACT_DISPLAY_SETTINGS_STORE
  }
}

export function getContactDisplaySettings(workspaceId?: string | null): ContactDisplaySettings {
  const store = getContactDisplaySettingsStore(workspaceId)
  return normalizeContactDisplaySettings(store)
}

export function getContactOverrideDisplaySettings(workspaceId: string | null | undefined, contactId: string): ContactDisplaySettings {
  return getContactDisplaySettingsStore(workspaceId).contactOverrides[contactId] ?? DEFAULT_CONTACT_DISPLAY_SETTINGS
}

export function getResolvedContactDisplaySettings(workspaceId: string | null | undefined, contactId?: string | null): ContactDisplaySettings {
  const store = getContactDisplaySettingsStore(workspaceId)
  const globalSettings = normalizeContactDisplaySettings(store)
  if (!contactId) return globalSettings
  return mergeDisplaySettings(globalSettings, store.contactOverrides[contactId])
}

export function saveContactDisplaySettingsStore(workspaceId: string | null | undefined, store: ContactDisplaySettingsStore) {
  const normalized = normalizeContactDisplaySettingsStore(store)
  try {
    localStorage.setItem(storageKey(workspaceId), JSON.stringify(normalized))
    window.dispatchEvent(new CustomEvent(CONTACT_DISPLAY_SETTINGS_EVENT, { detail: { workspaceId, settings: normalized } }))
  } catch {
    // Display preferences should never block the product.
  }
}

export function saveContactDisplaySettings(workspaceId: string | null | undefined, settings: ContactDisplaySettings) {
  const existing = getContactDisplaySettingsStore(workspaceId)
  saveContactDisplaySettingsStore(workspaceId, {
    ...normalizeContactDisplaySettings(settings),
    contactOverrides: existing.contactOverrides,
  })
}

export function saveContactOverrideDisplaySettings(
  workspaceId: string | null | undefined,
  contactId: string,
  settings: ContactDisplaySettings,
) {
  const existing = getContactDisplaySettingsStore(workspaceId)
  const nextOverrides = { ...existing.contactOverrides }
  const normalized = normalizeContactDisplaySettings(settings)

  if (isEmptySettings(normalized)) {
    delete nextOverrides[contactId]
  } else {
    nextOverrides[contactId] = normalized
  }

  saveContactDisplaySettingsStore(workspaceId, {
    ...normalizeContactDisplaySettings(existing),
    contactOverrides: nextOverrides,
  })
}

export function isSectionVisible(settings: ContactDisplaySettings, sectionId: ContactDisplaySectionId): boolean {
  return !settings.hiddenSectionIds.includes(sectionId)
}

export function isStandardFieldVisible(settings: ContactDisplaySettings, fieldId: string): boolean {
  return !settings.hiddenStandardFieldIds.includes(fieldId)
}

export function isFieldConfigVisible(settings: ContactDisplaySettings, fieldConfigId: string): boolean {
  return !settings.hiddenFieldConfigIds.includes(fieldConfigId)
}
