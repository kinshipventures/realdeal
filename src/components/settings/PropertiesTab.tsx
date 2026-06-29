import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, RotateCcw, Search, X } from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useContactDisplaySettings } from '@/hooks/useContactDisplaySettings'
import {
  COMPANY_STANDARD_PROPERTY_OPTIONS,
  CONTACT_DISPLAY_SECTION_OPTIONS,
  CONTACT_STANDARD_PROPERTY_OPTIONS,
  DEFAULT_CONTACT_DISPLAY_SETTINGS,
  type ContactDisplaySettings,
  type ContactDisplaySectionId,
  type ContactDisplaySectionOption,
  type PropertyObjectType,
  type PropertyOption,
} from '@/lib/contactDisplaySettings'
import { getCampaigns, getCategories, getContacts, getPods } from '@/lib/data'
import { getFieldConfigs, type FieldConfig } from '@/lib/fieldConfig'
import { DEFAULT_KINSHIP_INVESTMENTS } from '@/lib/kinshipInvestments'
import type { Campaign, Category, Contact, Pod } from '@/lib/types'

type PropertyRow = PropertyOption & {
  checked: boolean
  statusLabel: string
  onToggle: () => void
  depth?: number
}

type PropertyRowGroup = {
  row: PropertyRow
  children: PropertyRow[]
}

const TABLE_GRID_COLUMNS = '42px minmax(180px, 1.4fr) minmax(120px, 0.8fr) minmax(150px, 1fr) minmax(110px, 0.8fr) 86px'
const CHILD_GRID_COLUMNS = '36px minmax(170px, 1.4fr) minmax(120px, 0.8fr) minmax(110px, 0.8fr) 86px'

const OBJECT_OPTIONS: { value: PropertyObjectType; label: string }[] = [
  { value: 'Contact', label: 'Contact properties' },
  { value: 'Company', label: 'Company properties' },
  { value: 'Pod', label: 'Pod properties' },
  { value: 'Sub-pod', label: 'Sub-pod properties' },
  { value: 'Campaign', label: 'Campaign properties' },
]

const REMOVED_CONTACT_PROPERTY_NAMES = new Set([
  'category',
  'fund type',
  'notes',
  'spv investor',
  'spv investor checkbox',
])

const CONTACT_CARD_SECTION_ORDER: ContactDisplaySectionId[] = [
  'details',
  'ways_to_contact',
  'fund_activity',
  'pods',
  'campaigns',
  'associated_company',
  'recent_activity',
  'next_touchpoint',
]

function normalizeRemovedPropertyName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
}

const FIELD_TYPE_LABELS: Record<FieldConfig['field_type'], string> = {
  text: 'Single-line text',
  multiline: 'Multi-line text',
  number: 'Number',
  select: 'Single select',
  date: 'Date',
  checkbox: 'Checkbox',
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value]
}

function replaceSettings(settings: ContactDisplaySettings, patch: Partial<ContactDisplaySettings>): ContactDisplaySettings {
  return { ...settings, ...patch }
}

function optionValues(values: unknown[]): string[] {
  return [...new Set(
    values
      .flatMap(value => Array.isArray(value) ? value : [value])
      .map(value => String(value ?? '').trim())
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b))
}

function checkboxStyle(checked: boolean): React.CSSProperties {
  return {
    width: 16,
    height: 16,
    cursor: 'pointer',
    accentColor: checked ? 'var(--color-brand)' : undefined,
  }
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      color: active ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
      background: active ? 'rgba(37,180,57,0.10)' : 'var(--tint)',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function buildPropertyRowGroups(rows: PropertyRow[]): PropertyRowGroup[] {
  return rows.reduce<PropertyRowGroup[]>((groups, row) => {
    if (row.depth && groups.length > 0) {
      groups[groups.length - 1].children.push(row)
      return groups
    }

    groups.push({ row, children: [] })
    return groups
  }, [])
}

function groupChildrenBySection(rows: PropertyRow[]): Array<{ label: string; rows: PropertyRow[] }> {
  const groups = new Map<string, PropertyRow[]>()

  rows.forEach(row => {
    const label = row.group || 'Options'
    groups.set(label, [...(groups.get(label) ?? []), row])
  })

  return Array.from(groups.entries()).map(([label, groupedRows]) => ({ label, rows: groupedRows }))
}

function propertyGroupDisplayLabel(row: PropertyRow): string {
  return row.fieldType === 'Section' ? row.label : row.group
}

function optionPanelGroupDisplayLabel(groupLabel: string, parentSectionLabel?: string): string {
  if (!parentSectionLabel || parentSectionLabel === 'Pods' || parentSectionLabel === 'Sub-pods') return groupLabel
  return parentSectionLabel
}

function PropertyCheckbox({ row }: { row: PropertyRow }) {
  return (
    <input
      type="checkbox"
      checked={row.checked}
      onChange={row.onToggle}
      style={checkboxStyle(row.checked)}
      aria-label={`Toggle ${row.label}`}
    />
  )
}

function contactDetailSectionLabel(id: string, fallback: string, objectType: PropertyObjectType): string {
  if (id === 'details') return objectType === 'Company' ? 'Company information' : 'Contact information'
  if (id === 'associated_company') return 'Companies'
  if (id === 'associated_people') return 'Contacts'
  if (id === 'fund_activity') return 'Investor profile'
  return fallback
}

function PropertyOptionPanel({ rows, sectionLabel }: { rows: PropertyRow[]; sectionLabel?: string }) {
  const groupedRows = groupChildrenBySection(rows)

  return (
    <div style={{
      background: 'rgba(248,250,252,0.55)',
      borderTop: '1px solid var(--divider)',
      borderBottom: '1px solid var(--divider)',
      padding: '10px 14px 12px 42px',
    }}>
      <div style={{
        display: 'grid',
        gap: 10,
        maxWidth: '100%',
      }}>
        {groupedRows.map(group => (
          <div key={group.label} style={{
            border: '1px solid var(--edge)',
            borderRadius: 8,
            background: 'var(--surface-panel)',
            overflow: 'hidden',
          }}>
            {optionPanelGroupDisplayLabel(group.label, sectionLabel) !== sectionLabel && (
              <div style={{
                minHeight: 34,
                display: 'grid',
                gridTemplateColumns: CHILD_GRID_COLUMNS,
                alignItems: 'center',
                borderBottom: '1px solid var(--divider)',
                background: 'linear-gradient(180deg, rgba(248,250,252,0.95), rgba(248,250,252,0.72))',
              }}>
                <div />
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '0 10px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {optionPanelGroupDisplayLabel(group.label, sectionLabel)}
                </span>
                <div />
                <div />
                <span style={{
                  padding: '0 10px',
                  fontSize: 11,
                  color: 'var(--color-text-tertiary)',
                  whiteSpace: 'nowrap',
                  textAlign: 'right',
                }}>
                  {group.rows.length} options
                </span>
              </div>
            )}

            {group.rows.map((row, index) => (
              <label
                key={`${row.objectType}:${row.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: CHILD_GRID_COLUMNS,
                  alignItems: 'center',
                  minHeight: 42,
                  borderBottom: index === group.rows.length - 1 ? 'none' : '1px solid var(--divider)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PropertyCheckbox row={row} />
                </div>
                <div style={{ padding: '7px 10px', minWidth: 0 }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--color-text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {row.label}
                  </div>
                </div>
                <div style={{ padding: '7px 10px', fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.fieldType}</div>
                <div style={{ padding: '7px 10px', fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.ownerLabel}</div>
                <div style={{ padding: '7px 10px' }}>
                  <StatusPill active={row.checked} label={row.statusLabel} />
                </div>
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function PropertiesTable({ rows, emptyLabel }: { rows: PropertyRow[]; emptyLabel: string }) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set())
  const rowGroups = useMemo(() => buildPropertyRowGroups(rows), [rows])
  const expandableRowKeys = useMemo(
    () => rowGroups
      .filter(group => group.children.length > 0)
      .map(group => `${group.row.objectType}:${group.row.id}`),
    [rowGroups],
  )

  useEffect(() => {
    setExpandedRows(current => {
      const next = new Set(current)
      let changed = false

      expandableRowKeys.forEach(rowKey => {
        if (!next.has(rowKey)) {
          next.add(rowKey)
          changed = true
        }
      })

      return changed ? next : current
    })
  }, [expandableRowKeys])

  if (rows.length === 0) {
    return (
      <div style={{
        border: '1px solid var(--edge)',
        borderRadius: 10,
        padding: 18,
        color: 'var(--color-text-tertiary)',
        fontSize: 13,
      }}>
        {emptyLabel}
      </div>
    )
  }

  return (
    <div style={{
      border: '1px solid var(--edge)',
      borderRadius: 10,
      overflow: 'hidden',
      background: 'var(--surface-panel)',
      boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
    }}>
      {rowGroups.map(({ row, children }) => {
        const hasChildren = children.length > 0
        const isSectionRow = row.fieldType === 'Section'
        const rowKey = `${row.objectType}:${row.id}`
        const isExpanded = expandedRows.has(rowKey)
        const selectedChildren = children.filter(child => child.checked).length

        return (
          <div key={rowKey}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: TABLE_GRID_COLUMNS,
                alignItems: 'center',
                minHeight: 54,
                borderBottom: hasChildren && isExpanded ? 'none' : '1px solid var(--divider)',
                background: hasChildren ? 'rgba(248,250,252,0.36)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PropertyCheckbox row={row} />
              </div>
              <div style={{ padding: '9px 12px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  {hasChildren ? (
                    <button
                      type="button"
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${row.label} options`}
                      aria-expanded={isExpanded}
                      onClick={() => {
                        setExpandedRows(current => {
                          const next = new Set(current)
                          if (next.has(rowKey)) next.delete(rowKey)
                          else next.add(rowKey)
                          return next
                        })
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: '1px solid var(--edge)',
                        background: 'var(--surface-panel)',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ChevronDown
                        size={14}
                        style={{
                          transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                          transition: 'transform 0.15s ease',
                        }}
                      />
                    </button>
                  ) : (
                    <span style={{ width: 26, flexShrink: 0 }} />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: 'var(--color-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {row.label}
                    </div>
                    {hasChildren && (
                      <div style={{
                        marginTop: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--color-text-tertiary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {selectedChildren > 0 ? `${selectedChildren} selected · ` : ''}{children.length} options
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {isSectionRow ? (
                <>
                  <div />
                  <div />
                  <div />
                  <div />
                </>
              ) : (
                <>
                  <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.fieldType}</div>
                  <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{propertyGroupDisplayLabel(row)}</div>
                  <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.ownerLabel}</div>
                  <div style={{ padding: '8px 12px' }}>
                    <StatusPill active={row.checked} label={row.statusLabel} />
                  </div>
                </>
              )}
            </div>
            {hasChildren && isExpanded && <PropertyOptionPanel rows={children} sectionLabel={row.label} />}
          </div>
        )
      })}
    </div>
  )
}

export function PropertiesTab() {
  const { activeWorkspace } = useWorkspace()
  const [objectType, setObjectType] = useState<PropertyObjectType>('Contact')
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [contactQuery, setContactQuery] = useState('')
  const [settings, updateSettings] = useContactDisplaySettings(activeWorkspace?.id, selectedContactId)
  const [pods, setPods] = useState<Pod[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const workspaceOwner = activeWorkspace?.name || 'Workspace'

  useEffect(() => {
    let stale = false
    Promise.all([getPods(), getCategories(), getCampaigns(), getFieldConfigs(), getContacts()])
      .then(([nextPods, nextCategories, nextCampaigns, nextFieldConfigs, nextContacts]) => {
        if (stale) return
        setPods(nextPods)
        setCategories(nextCategories)
        setCampaigns(nextCampaigns.filter(campaign => campaign.status !== 'hidden'))
        setFieldConfigs(nextFieldConfigs)
        setContacts(nextContacts.filter(contact => contact.status !== 'Archived'))
      })
      .catch(() => {
        if (stale) return
        setPods([])
        setCategories([])
        setCampaigns([])
        setFieldConfigs([])
        setContacts([])
      })
    return () => { stale = true }
  }, [])

  const podById = useMemo(() => new Map(pods.map(pod => [pod.id, pod])), [pods])
  const companyContacts = useMemo(
    () => contacts.filter(contact => contact.type === 'Company' && contact.status !== 'Archived'),
    [contacts],
  )
  const kinshipInvestmentOptions = useMemo(
    () => optionValues([
      ...DEFAULT_KINSHIP_INVESTMENTS,
      ...contacts.flatMap(contact => contact.kv_fund_investor ?? []),
    ]),
    [contacts],
  )
  const selectedContact = useMemo(
    () => contacts.find(contact => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  )
  const filteredContacts = useMemo(() => {
    const query = contactQuery.trim().toLowerCase()
    if (!query) return []

    return contacts
      .filter(contact => contact.type !== 'Company')
      .filter(contact => {
        const haystack = [contact.name, contact.company, contact.email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(query)
      })
      .slice(0, 8)
  }, [contacts, contactQuery])

  const toggleSection = useCallback((id: string) => {
    updateSettings(current => replaceSettings(current, {
      hiddenSectionIds: toggleValue(current.hiddenSectionIds, id) as ContactDisplaySettings['hiddenSectionIds'],
    }))
  }, [updateSettings])

  const toggleStandardField = useCallback((id: string) => {
    updateSettings(current => replaceSettings(current, {
      hiddenStandardFieldIds: toggleValue(current.hiddenStandardFieldIds, id),
    }))
  }, [updateSettings])

  const toggleFieldConfig = useCallback((id: string) => {
    updateSettings(current => replaceSettings(current, {
      hiddenFieldConfigIds: toggleValue(current.hiddenFieldConfigIds, id),
    }))
  }, [updateSettings])

  const toggleHiddenPod = useCallback((id: string) => {
    updateSettings(current => replaceSettings(current, {
      hiddenPodIds: toggleValue(current.hiddenPodIds, id),
    }))
  }, [updateSettings])

  const toggleHiddenSubPod = useCallback((id: string) => {
    updateSettings(current => replaceSettings(current, {
      hiddenSubPodIds: toggleValue(current.hiddenSubPodIds, id),
    }))
  }, [updateSettings])

  const toggleHiddenCampaign = useCallback((id: string) => {
    updateSettings(current => replaceSettings(current, {
      hiddenCampaignIds: toggleValue(current.hiddenCampaignIds, id),
    }))
  }, [updateSettings])

  const toggleHiddenCompany = useCallback((id: string) => {
    updateSettings(current => replaceSettings(current, {
      hiddenCompanyIds: toggleValue(current.hiddenCompanyIds, id),
    }))
  }, [updateSettings])

  const toggleHiddenFieldOption = useCallback((fieldId: string, value: string) => {
    updateSettings(current => {
      const currentValues = current.hiddenFieldOptionValues[fieldId] ?? []
      const nextValues = toggleValue(currentValues, value)
      const nextFieldOptions = { ...current.hiddenFieldOptionValues }

      if (nextValues.length > 0) {
        nextFieldOptions[fieldId] = nextValues
      } else {
        delete nextFieldOptions[fieldId]
      }

      return replaceSettings(current, {
        hiddenFieldOptionValues: nextFieldOptions,
      })
    })
  }, [updateSettings])

  const rows = useMemo<PropertyRow[]>(() => {
    const hiddenLabelValues = settings.hiddenFieldOptionValues.kv_fund_investor ?? []
    const displayStatus = (checked: boolean) => checked ? 'Shown' : (selectedContact ? 'Hidden here' : 'Hidden')

    const podRows = (depth = 0): PropertyRow[] => pods.map(pod => {
      const checked = !settings.hiddenPodIds.includes(pod.id)
      return {
        id: `pod:${pod.id}`,
        label: pod.name,
        fieldType: 'Pod option',
        group: 'Pods',
        objectType: 'Pod',
        ownerLabel: workspaceOwner,
        checked,
        statusLabel: displayStatus(checked),
        onToggle: () => toggleHiddenPod(pod.id),
        depth,
      }
    })

    const subPodRows = (depth = 0): PropertyRow[] => categories.map(category => {
      const parentPod = podById.get(category.list_id)
      const checked = !settings.hiddenSubPodIds.includes(category.id)
      return {
        id: `sub-pod:${category.id}`,
        label: category.name,
        fieldType: 'Sub-pod option',
        group: parentPod?.name ?? 'Sub-pods',
        objectType: 'Sub-pod',
        ownerLabel: workspaceOwner,
        checked,
        statusLabel: displayStatus(checked),
        onToggle: () => toggleHiddenSubPod(category.id),
        depth,
      }
    })

    const campaignRows = (depth = 0): PropertyRow[] => campaigns.map(campaign => {
      const checked = !settings.hiddenCampaignIds.includes(campaign.id)
      return {
        id: `campaign:${campaign.id}`,
        label: campaign.name,
        fieldType: campaign.type,
        group: 'Campaign options',
        objectType: 'Campaign',
        ownerLabel: workspaceOwner,
        checked,
        statusLabel: displayStatus(checked),
        onToggle: () => toggleHiddenCampaign(campaign.id),
        depth,
      }
    })

    const companyRows = (depth = 0): PropertyRow[] => companyContacts.map(company => {
      const checked = !settings.hiddenCompanyIds.includes(company.id)
      return {
        id: `company:${company.id}`,
        label: company.name,
        fieldType: 'Company option',
        group: 'Company options',
        objectType: 'Company',
        ownerLabel: workspaceOwner,
        checked,
        statusLabel: displayStatus(checked),
        onToggle: () => toggleHiddenCompany(company.id),
        depth,
      }
    })

    const kinshipInvestmentRows = (depth = 0): PropertyRow[] => kinshipInvestmentOptions.map(label => {
      const checked = !hiddenLabelValues.includes(label)
      return {
        id: `kv_fund_investor:${label}`,
        label,
        fieldType: 'Label option',
        group: 'Kinship Investments',
        objectType: 'Contact',
        ownerLabel: workspaceOwner,
        checked,
        statusLabel: displayStatus(checked),
        onToggle: () => toggleHiddenFieldOption('kv_fund_investor', label),
        depth,
      }
    })

    function standardFieldRows(options: PropertyOption[], ids: string[], depth = 0): PropertyRow[] {
      const optionById = new Map(options.map(option => [option.id, option]))

      return ids
        .map(id => optionById.get(id))
        .filter((option): option is PropertyOption => Boolean(option))
        .map(option => {
          const checked = !settings.hiddenStandardFieldIds.includes(option.id)
          return {
            ...option,
            objectType,
            checked,
            statusLabel: checked ? 'Shown' : (selectedContact ? 'Hidden here' : 'Hidden'),
            onToggle: () => toggleStandardField(option.id),
            depth,
          }
        })
    }

    if (objectType === 'Pod') {
      return podRows()
    }

    if (objectType === 'Sub-pod') {
      return subPodRows()
    }

    if (objectType === 'Campaign') {
      return campaignRows()
    }

    const standardOptions = objectType === 'Company'
      ? COMPANY_STANDARD_PROPERTY_OPTIONS
      : CONTACT_STANDARD_PROPERTY_OPTIONS

    const availableSections = CONTACT_DISPLAY_SECTION_OPTIONS
      .filter(section => section.appliesTo === objectType || section.appliesTo === 'Both')
    const sectionById = new Map<ContactDisplaySectionId, ContactDisplaySectionOption>(
      availableSections.map(section => [section.id, section]),
    )
    const orderedSections = objectType === 'Contact'
      ? CONTACT_CARD_SECTION_ORDER
          .map(sectionId => sectionById.get(sectionId))
          .filter((section): section is ContactDisplaySectionOption => Boolean(section))
      : availableSections

    const sectionRows = orderedSections
      .flatMap(section => {
        const checked = !settings.hiddenSectionIds.includes(section.id)
        const rowsForSection: PropertyRow[] = [{
          ...section,
          label: contactDetailSectionLabel(section.id, section.label, objectType),
          checked,
          statusLabel: checked ? 'Shown' : (selectedContact ? 'Hidden here' : 'Hidden'),
          onToggle: () => toggleSection(section.id),
        }]

        if (objectType === 'Contact') {
          if (section.id === 'relationship_overview') {
            rowsForSection.push(...standardFieldRows(
              standardOptions,
              ['relationship_context', 'intel_notes', 'communication_preferences', 'contact_frequency'],
              1,
            ))
          }

          if (section.id === 'details') {
            rowsForSection.push(...standardFieldRows(
              standardOptions,
              ['name', 'primary_company', 'role', 'linkedin', 'recommended_by', 'gender', 'birthday', 'notables'],
              1,
            ))
          }

          if (section.id === 'ways_to_contact') {
            rowsForSection.push(...standardFieldRows(
              standardOptions,
              ['email', 'email_2', 'email_3', 'phone', 'address', 'city', 'state', 'country', 'global_region', 'assistantContactIds'],
              1,
            ))
          }

          if (section.id === 'pods') {
            rowsForSection.push(...podRows(1))

            const subPodsSection = sectionById.get('sub_pods')
            if (subPodsSection) {
              const subPodsChecked = !settings.hiddenSectionIds.includes(subPodsSection.id)
              rowsForSection.push({
                ...subPodsSection,
                label: contactDetailSectionLabel(subPodsSection.id, subPodsSection.label, objectType),
                group: 'Sub-pods',
                checked: subPodsChecked,
                statusLabel: subPodsChecked ? 'Shown' : (selectedContact ? 'Hidden here' : 'Hidden'),
                onToggle: () => toggleSection(subPodsSection.id),
                depth: 1,
              })
              rowsForSection.push(...subPodRows(1))
            }
          }
          if (section.id === 'campaigns') rowsForSection.push(...campaignRows(1))
          if (section.id === 'associated_company') rowsForSection.push(...companyRows(1))

          if (section.id === 'fund_activity') {
            rowsForSection.push(...standardFieldRows(
              standardOptions,
              ['kv_fund_investor', 'investmentEntity', 'investmentEmail'],
              1,
            ))
            rowsForSection.push(...kinshipInvestmentRows(1))
          }
        }

        if (objectType === 'Company') {
          if (section.id === 'details') {
            rowsForSection.push(...standardFieldRows(
              standardOptions,
              ['name', 'website', 'linkedin', 'companyType', 'industry', 'fundType', 'notes'],
              1,
            ))
          }

          if (section.id === 'ways_to_contact') {
            rowsForSection.push(...standardFieldRows(
              standardOptions,
              ['email', 'phone', 'address', 'city', 'state', 'country', 'global_region'],
              1,
            ))
          }
        }

        return rowsForSection
      })

    const customRows = fieldConfigs
      .filter(config => config.scope_type === objectType || config.scope_type === 'Both')
      .filter(config => objectType !== 'Contact' || !REMOVED_CONTACT_PROPERTY_NAMES.has(normalizeRemovedPropertyName(config.name)))
      .sort((a, b) => a.display_order - b.display_order)
      .map(config => {
        const checked = !settings.hiddenFieldConfigIds.includes(config.id)
        const pod = config.scope_pod_id ? podById.get(config.scope_pod_id) : null
        return {
          id: config.id,
          label: config.name,
          fieldType: FIELD_TYPE_LABELS[config.field_type] ?? config.field_type,
          group: pod ? `${pod.name} fields` : 'Custom properties',
          objectType,
          ownerLabel: workspaceOwner,
          checked,
          statusLabel: checked ? 'Shown' : (selectedContact ? 'Hidden here' : 'Hidden'),
          onToggle: () => toggleFieldConfig(config.id),
        }
      })

    return objectType === 'Contact' ? sectionRows : [...sectionRows, ...customRows]
  }, [
    categories,
    campaigns,
    companyContacts,
    fieldConfigs,
    kinshipInvestmentOptions,
    objectType,
    podById,
    pods,
    settings,
    selectedContact,
    toggleFieldConfig,
    toggleHiddenCampaign,
    toggleHiddenCompany,
    toggleHiddenFieldOption,
    toggleHiddenPod,
    toggleHiddenSubPod,
    toggleSection,
    toggleStandardField,
    workspaceOwner,
  ])

  const currentLabel = OBJECT_OPTIONS.find(option => option.value === objectType)?.label ?? 'Properties'

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{
            fontSize: 16,
            fontWeight: 800,
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-text-primary)',
            margin: '0 0 4px',
          }}>
            Properties
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.45 }}>
            {selectedContact ? `Only ${selectedContact.name}` : 'All contacts'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => updateSettings(() => DEFAULT_CONTACT_DISPLAY_SETTINGS)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 34,
            padding: '7px 10px',
            borderRadius: 8,
            border: '1px solid var(--edge)',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={13} />
          {selectedContact ? 'Reset contact' : 'Reset'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8, marginBottom: 18, position: 'relative' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Contact scope</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 420 }}>
            <Search size={14} style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-tertiary)',
              pointerEvents: 'none',
            }} />
            <input
              type="text"
              value={contactQuery}
              onChange={event => {
                setContactQuery(event.target.value)
                if (selectedContactId) setSelectedContactId(null)
              }}
              placeholder="Search a contact"
              style={{
                width: '100%',
                height: 40,
                borderRadius: 8,
                border: '1px solid var(--edge)',
                background: 'var(--surface-panel)',
                color: 'var(--color-text-primary)',
                fontSize: 13,
                fontFamily: 'inherit',
                padding: '0 36px 0 34px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {contactQuery && (
              <button
                type="button"
                onClick={() => {
                  setContactQuery('')
                  setSelectedContactId(null)
                }}
                aria-label="Clear contact search"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
            {!selectedContact && filteredContacts.length > 0 && (
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 'calc(100% + 6px)',
                zIndex: 20,
                borderRadius: 10,
                border: '1px solid var(--edge)',
                background: 'var(--surface-panel)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
                overflow: 'hidden',
              }}>
                {filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => {
                      setSelectedContactId(contact.id)
                      setContactQuery(contact.name)
                    }}
                    style={{
                      width: '100%',
                      border: 'none',
                      borderBottom: '1px solid var(--divider)',
                      background: 'transparent',
                      padding: '10px 12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{contact.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      {[contact.company, contact.email].filter(Boolean).join(' · ') || 'Contact'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedContact && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 34,
              padding: '0 10px',
              borderRadius: 999,
              background: 'rgba(0,61,165,0.08)',
              color: 'var(--color-brand)',
              fontSize: 12,
              fontWeight: 700,
            }}>
              {selectedContact.name}
              <button
                type="button"
                onClick={() => {
                  setSelectedContactId(null)
                  setContactQuery('')
                }}
                aria-label="Use all contacts"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      </div>

      <label style={{ display: 'grid', gap: 6, marginBottom: 18 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Select an object</span>
        <select
          value={objectType}
          onChange={event => setObjectType(event.target.value as PropertyObjectType)}
          style={{
            width: 'min(100%, 320px)',
            height: 40,
            borderRadius: 8,
            border: '1px solid var(--edge)',
            background: 'var(--surface-panel)',
            color: 'var(--color-text-primary)',
            fontSize: 13,
            fontFamily: 'inherit',
            padding: '0 10px',
          }}
        >
          {OBJECT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <h3 style={{
          fontSize: 13,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-tertiary)',
          margin: 0,
        }}>
          {currentLabel}
        </h3>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{rows.length} properties</span>
      </div>

      <PropertiesTable rows={rows} emptyLabel="No properties available for this object yet." />
    </section>
  )
}
