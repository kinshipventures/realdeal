import { createInteraction } from './data'
import type { SystemEventType, Interaction, ISODate } from './types'

interface SystemEventData {
  contactId: string
  type: SystemEventType
  detail: Record<string, unknown>  // will be JSON.stringify'd into event_detail
  notes?: string                    // human-readable summary line
}

export async function logSystemEvent({ contactId, type, detail, notes }: SystemEventData): Promise<Interaction> {
  return createInteraction({
    contact_id: contactId,
    type,
    date: new Date().toISOString().split('T')[0] as ISODate,
    notes: notes ?? null,
    summary: null,
    source: null,
    email_link: null,
    granola_link: null,
    event_detail: JSON.stringify(detail),
    actor: 'You',
  })
}
