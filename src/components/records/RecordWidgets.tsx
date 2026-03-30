import type { Contact, Interaction, Pod } from '../../lib/types'
import type { FieldConfig } from '../../lib/fieldConfig'
import { DetailsWidget } from './DetailsWidget'
import { HealthWidget } from './HealthWidget'
import { AssociatedPeopleWidget } from './AssociatedPeopleWidget'
import { PodFieldsWidget } from './PodFieldsWidget'
import { PipelinesWidget } from './PipelinesWidget'
import { ProjectsWidget } from './ProjectsWidget'

interface RecordWidgetsProps {
  contact: Contact
  pods: Pod[]
  interactions: Interaction[]
  fieldConfigs: FieldConfig[]
  onUpdate: (data: Partial<Contact>) => void
  onFieldConfigsRefresh?: (configs: FieldConfig[]) => void
}

export function RecordWidgets({ contact, pods, interactions, fieldConfigs, onUpdate, onFieldConfigsRefresh }: RecordWidgetsProps) {
  const assignedPods = pods.filter(p => contact.list_ids.includes(p.id))

  return (
    <div>
      <DetailsWidget contact={contact} onUpdate={onUpdate} />
      <HealthWidget contact={contact} interactions={interactions} pods={pods} />
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
