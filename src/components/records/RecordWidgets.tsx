import { useMemo } from 'react'
import type { Contact, Interaction, Pod } from '../../lib/types'
import type { FieldConfig } from '../../lib/fieldConfig'
import { DetailsWidget } from './DetailsWidget'
import { HealthWidget } from './HealthWidget'
import { AssociatedPeopleWidget } from './AssociatedPeopleWidget'
import { PodFieldsWidget } from './PodFieldsWidget'
import { RelationshipWidget } from './RelationshipWidget'
import { PipelinesWidget } from './PipelinesWidget'
import { ProjectsWidget } from './ProjectsWidget'

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
      {/* Health first - the answer to "how's this relationship?" */}
      <HealthWidget contact={contact} interactions={interactions} pods={pods} upcomingBirthday={upcomingBirthday} missingFieldCount={missingFieldCount} />
      {contact.type === 'Contact' && (
        <RelationshipWidget contact={contact} onUpdate={onUpdate} />
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
      {contact.type === 'Company' && (
        <AssociatedPeopleWidget contact={contact} />
      )}
      <PipelinesWidget contact={contact} />
      <ProjectsWidget contact={contact} />
    </div>
  )
}
