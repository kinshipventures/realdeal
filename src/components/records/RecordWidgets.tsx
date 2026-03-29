import type { Contact, Interaction, Pod } from '../../lib/types'
import type { FieldConfig } from '../../lib/fieldConfig'
import { DetailsWidget } from './DetailsWidget'
import { HealthWidget } from './HealthWidget'

interface RecordWidgetsProps {
  contact: Contact
  pods: Pod[]
  interactions: Interaction[]
  fieldConfigs: FieldConfig[]
  onUpdate: (data: Partial<Contact>) => void
}

export function RecordWidgets({ contact, pods, interactions, onUpdate }: RecordWidgetsProps) {
  return (
    <div>
      <DetailsWidget contact={contact} onUpdate={onUpdate} />
      <HealthWidget contact={contact} interactions={interactions} pods={pods} />
      {/* PodFieldsWidget — added in Plan 03 */}
      {/* AssociatedPeopleWidget (Company type) — added in Plan 02 */}
    </div>
  )
}
