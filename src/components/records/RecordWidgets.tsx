import { useMemo } from 'react'
import type { Category, Contact, Interaction, Pod } from '../../lib/types'
import type { FieldConfig } from '../../lib/fieldConfig'
import {
  DEFAULT_CONTACT_DISPLAY_SETTINGS,
  isSectionVisible,
  type ContactDisplaySectionId,
  type ContactDisplaySettings,
} from '../../lib/contactDisplaySettings'
import { DEFAULT_KINSHIP_INVESTMENTS } from '../../lib/kinshipInvestments'
import { planClearSubPodForPod, planMoveToSubPod } from '../../lib/subPodAssignment'
import { SubPodSelector } from '../subpods/SubPodSelector'
import { DetailsWidget } from './DetailsWidget'
import { HealthWidget } from './HealthWidget'
import { AssociatedPeopleWidget } from './AssociatedPeopleWidget'
import { AssociatedCompanyWidget } from './AssociatedCompanyWidget'
import { PodFieldsWidget } from './PodFieldsWidget'
import { RelationshipWidget } from './RelationshipWidget'
import { PipelinesWidget } from './PipelinesWidget'
import { WIDGET_STYLE } from './shared'

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))]
}

function FundTagsWidget({ contact, labels }: { contact: Contact; labels: string[] }) {
  const contactLabels = contact.kv_fund_investor ?? []

  return (
    <div style={WIDGET_STYLE}>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginBottom: 14,
      }}>
        Fund Activity
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {labels.map(tag => {
          const selected = contactLabels.includes(tag)
          return (
          <span key={tag} style={{
            fontSize: 11, fontWeight: 500,
            padding: '3px 10px', borderRadius: 100,
            border: selected ? 'none' : '1px dashed var(--edge)',
            background: selected ? 'hsla(150, 60%, 40%, 0.08)' : 'color-mix(in srgb, var(--surface-panel) 86%, var(--tint) 14%)',
            color: selected ? 'hsla(150, 60%, 30%, 0.80)' : 'var(--color-text-secondary)',
          }}>
            KV: {tag}
            {!selected && <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 5 }}>Available</span>}
          </span>
          )
        })}
      </div>
    </div>
  )
}

function SubPodsWidget({
  contact,
  categories,
  allCategories,
  pods,
  selectedPodIds,
  readOnlyCategoryIds,
  onUpdate,
}: {
  contact: Contact
  categories: Category[]
  allCategories: Category[]
  pods: Pod[]
  selectedPodIds: string[]
  readOnlyCategoryIds: string[]
  onUpdate: (data: Partial<Contact>) => void
}) {
  const hasAvailableSubPods = categories.some(category => selectedPodIds.includes(category.list_id))
  if (!hasAvailableSubPods) return null

  function selectSubPod(subPod: Category) {
    onUpdate(planMoveToSubPod(contact, subPod, allCategories))
  }

  function clearSubPod(podId: string) {
    onUpdate(planClearSubPodForPod(contact, podId, allCategories))
  }

  return (
    <div style={WIDGET_STYLE}>
      <SubPodSelector
        pods={pods}
        categories={categories}
        selectedPodIds={selectedPodIds}
        selectedCategoryIds={contact.category_ids}
        onSelect={selectSubPod}
        onClear={clearSubPod}
        readOnlyCategoryIds={readOnlyCategoryIds}
      />
    </div>
  )
}

interface RecordWidgetsProps {
  contact: Contact
  pods: Pod[]
  categories?: Category[]
  interactions: Interaction[]
  fieldConfigs: FieldConfig[]
  onUpdate: (data: Partial<Contact>) => void
  upcomingBirthday?: { daysUntil: number; date: string } | null
  missingFieldCount?: number
  displaySettings?: ContactDisplaySettings
}

export function RecordWidgets({
  contact,
  pods,
  categories = [],
  interactions,
  fieldConfigs,
  onUpdate,
  upcomingBirthday,
  missingFieldCount,
  displaySettings = DEFAULT_CONTACT_DISPLAY_SETTINGS,
}: RecordWidgetsProps) {
  const hiddenStandardFieldIds = useMemo(() => new Set(displaySettings.hiddenStandardFieldIds), [displaySettings.hiddenStandardFieldIds])
  const hiddenFieldConfigIds = useMemo(() => new Set(displaySettings.hiddenFieldConfigIds), [displaySettings.hiddenFieldConfigIds])
  const hiddenPodIds = useMemo(() => new Set(displaySettings.hiddenPodIds), [displaySettings.hiddenPodIds])
  const hiddenSubPodIds = useMemo(() => new Set(displaySettings.hiddenSubPodIds), [displaySettings.hiddenSubPodIds])

  const displayPodIds = useMemo(() => {
    return pods
      .filter(pod => !hiddenPodIds.has(pod.id))
      .map(pod => pod.id)
  }, [hiddenPodIds, pods])

  const subPodDisplayPodIds = useMemo(() => {
    return displayPodIds
  }, [displayPodIds])

  const displayPods = useMemo(() => pods.filter(p => displayPodIds.includes(p.id)), [pods, displayPodIds])
  const subPodDisplayPods = useMemo(() => pods.filter(p => subPodDisplayPodIds.includes(p.id)), [pods, subPodDisplayPodIds])
  const displayCategories = useMemo(() => {
    return categories.filter(category =>
      subPodDisplayPodIds.includes(category.list_id) &&
      !hiddenSubPodIds.has(category.id)
    )
  }, [categories, hiddenSubPodIds, subPodDisplayPodIds])
  const readOnlyCategoryIds = useMemo(() => {
    const assignedPodIds = new Set(contact.list_ids)
    return displayCategories
      .filter(category => !assignedPodIds.has(category.list_id))
      .map(category => category.id)
  }, [contact.list_ids, displayCategories])
  const visibleFundLabels = useMemo(() => {
    const hiddenLabels = new Set(displaySettings.hiddenFieldOptionValues.kv_fund_investor ?? [])
    return uniqueValues([
      ...DEFAULT_KINSHIP_INVESTMENTS,
      ...(contact.kv_fund_investor ?? []),
    ]).filter(label => !hiddenLabels.has(label))
  }, [contact.kv_fund_investor, displaySettings.hiddenFieldOptionValues])

  function sectionVisible(sectionId: ContactDisplaySectionId) {
    return isSectionVisible(displaySettings, sectionId)
  }

  const requiredFieldKeys = useMemo(() => {
    const keys = fieldConfigs
      .filter(fc => fc.required && (fc.scope_pod_id === null || contact.list_ids.includes(fc.scope_pod_id)))
      .map(fc => fc.name)
    return new Set(keys)
  }, [fieldConfigs, contact.list_ids])

  return (
    <div>
      {contact.type === 'Contact' ? (
        sectionVisible('relationship_overview') && (
          <RelationshipWidget
            contact={contact}
            interactions={interactions}
            pods={pods}
            onUpdate={onUpdate}
            hiddenFieldIds={hiddenStandardFieldIds}
          />
        )
      ) : (
        sectionVisible('health') && (
          <HealthWidget contact={contact} interactions={interactions} pods={pods} upcomingBirthday={upcomingBirthday} missingFieldCount={missingFieldCount} />
        )
      )}
      {sectionVisible('sub_pods') && (
        <SubPodsWidget
          contact={contact}
          categories={displayCategories}
          allCategories={categories}
          pods={subPodDisplayPods}
          selectedPodIds={subPodDisplayPodIds}
          readOnlyCategoryIds={readOnlyCategoryIds}
          onUpdate={onUpdate}
        />
      )}
      {sectionVisible('details') && (
        <DetailsWidget
          contact={contact}
          onUpdate={onUpdate}
          requiredFieldKeys={requiredFieldKeys}
          hiddenFieldIds={hiddenStandardFieldIds}
        />
      )}
      {sectionVisible('pod_fields') && displayPods.map(pod => (
        <PodFieldsWidget
          key={pod.id}
          pod={pod}
          contact={contact}
          fieldConfigs={fieldConfigs}
          onUpdate={onUpdate}
          hiddenFieldConfigIds={hiddenFieldConfigIds}
        />
      ))}
      {sectionVisible('fund_activity') && visibleFundLabels.length > 0 ? (
        <FundTagsWidget contact={contact} labels={visibleFundLabels} />
      ) : null}
      {sectionVisible('associated_company') && contact.type === 'Contact' && contact.company_record_id && (
        <AssociatedCompanyWidget contact={contact} />
      )}
      {sectionVisible('associated_people') && contact.type === 'Company' && (
        <AssociatedPeopleWidget contact={contact} />
      )}
      {sectionVisible('campaigns') && (
        <PipelinesWidget contact={contact} hiddenCampaignIds={displaySettings.hiddenCampaignIds} />
      )}
      
    </div>
  )
}
