import type { Contact } from '../../lib/types'
import { InteractionSection } from '../contacts/InteractionSection'

interface RecordTimelineProps {
  contact: Contact
  onContactUpdated: (contact: Contact) => void
}

export function RecordTimeline({ contact, onContactUpdated }: RecordTimelineProps) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: 'rgba(0,0,0,0.82)',
        marginBottom: 16,
      }}>
        Timeline
      </div>
      <InteractionSection contact={contact} onContactUpdated={onContactUpdated} />
    </div>
  )
}
