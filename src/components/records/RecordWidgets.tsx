import { useMemo } from 'react'
import type { Contact, Interaction, Pod } from '../../lib/types'
import type { FieldConfig } from '../../lib/fieldConfig'
import { DetailsWidget } from './DetailsWidget'
import { HealthWidget } from './HealthWidget'
import { AssociatedPeopleWidget } from './AssociatedPeopleWidget'
import { AssociatedCompanyWidget } from './AssociatedCompanyWidget'
import { PodFieldsWidget } from './PodFieldsWidget'
import { RelationshipWidget } from './RelationshipWidget'
import { PipelinesWidget } from './PipelinesWidget'
import { WIDGET_STYLE } from './shared'

function FundTagsWidget({ contact }: { contact: Contact }) {
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
        {contact.kv_fund_investor?.map(tag => (
          <span key={tag} style={{
            fontSize: 11, fontWeight: 500,
            padding: '3px 10px', borderRadius: 100,
            background: 'hsla(150, 60%, 40%, 0.08)',
            color: 'hsla(150, 60%, 30%, 0.80)',
          }}>
            KV: {tag}
          </span>
        ))}
        {contact.spv_investor?.map(tag => (
          <span key={tag} style={{
            fontSize: 11, fontWeight: 500,
            padding: '3px 10px', borderRadius: 100,
            background: 'hsla(210, 60%, 50%, 0.08)',
            color: 'hsla(210, 60%, 40%, 0.80)',
          }}>
            SPV: {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

interface RecordWidgetsProps {
  contact: Contact
  pods: Pod[]
  interactions: Interaction[]
  fieldConfigs: FieldConfig[]
  onUpdate: (data: Partial<Contact>) => void
  onFieldConfigsRefresh?: (configs: FieldConfig[]) => void
  upcomingBirthday?: { daysUntil: number; date: string } | null
  missingFieldCount?: number
}

export function RecordWidgets({ contact, pods, interactions, fieldConfigs, onUpdate, onFieldConfigsRefresh, upcomingBirthday, missingFieldCount }: RecordWidgetsProps) {
  const assignedPods = pods.filter(p => contact.list_ids.includes(p.id))

  const requiredFieldKeys = useMemo(() => {
    const keys = fieldConfigs
      .filter(fc => fc.required && (fc.scope_pod_id === null || contact.list_ids.includes(fc.scope_pod_id)))
      .map(fc => fc.name)
    return new Set(keys)
  }, [fieldConfigs, contact.list_ids])

  return (
    <div>
      {contact.type === 'Contact' ? (
        <RelationshipWidget contact={contact} interactions={interactions} pods={pods} onUpdate={onUpdate} />
      ) : (
        <HealthWidget contact={contact} interactions={interactions} pods={pods} upcomingBirthday={upcomingBirthday} missingFieldCount={missingFieldCount} />
      )}
      <DetailsWidget contact={contact} onUpdate={onUpdate} requiredFieldKeys={requiredFieldKeys} />
      {assignedPods.map(pod => (
        <PodFieldsWidget
          key={pod.id}
          pod={pod}
          contact={contact}
          fieldConfigs={fieldConfigs}
          onUpdate={onUpdate}
          onFieldConfigsRefresh={onFieldConfigsRefresh}
        />
      ))}
      {(contact.kv_fund_investor?.length || contact.spv_investor?.length) ? (
        <FundTagsWidget contact={contact} />
      ) : null}
      {contact.type === 'Contact' && contact.company_record_id && (
        <AssociatedCompanyWidget contact={contact} />
      )}
      {contact.type === 'Company' && (
        <AssociatedPeopleWidget contact={contact} />
      )}
      <PipelinesWidget contact={contact} />
      
    </div>
  )
}
