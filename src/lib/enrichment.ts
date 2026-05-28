import { supabase } from '@/integrations/supabase/client'
import { updateContact } from './data'
import { logSystemEvent } from './timeline'
import type { Contact, Pod } from './types'

// Fields the enrichment engine can fill
export const ENRICHABLE_FIELDS: (keyof Contact)[] = [
  'company', 'role', 'linkedin', 'website', 'location', 'specialization',
]

interface EnrichmentResult {
  ok: boolean
  data?: Record<string, string | null>
  error?: string
}

// Allowed if at least one of the contact's pods has enrichment_opt_in === true
export function isEnrichmentAllowed(contact: Contact, pods: Pod[]): boolean {
  return contact.list_ids.some(id => pods.find(p => p.id === id)?.enrichment_opt_in === true)
}

// Call the edge function
export async function callEnrichFunction(contact: Contact): Promise<EnrichmentResult> {
  const { data, error } = await supabase.functions.invoke('enrich-contact', {
    body: { name: contact.name, email: contact.email, company: contact.company },
  })
  if (error) return { ok: false, error: error.message }
  return data as EnrichmentResult
}

// Returns: { autoFill: fields currently empty, suggestedUpdates: fields with different existing values }
export function computeFieldDiffs(contact: Contact, enrichmentData: Record<string, string | null>) {
  const autoFill: Record<string, string> = {}
  const suggestedUpdates: Record<string, { current: string; suggested: string }> = {}

  for (const field of ENRICHABLE_FIELDS) {
    const enrichedValue = enrichmentData[field as string]
    if (!enrichedValue) continue

    const currentValue = contact[field] as string | null
    if (!currentValue) {
      autoFill[field as string] = enrichedValue
    } else if (currentValue !== enrichedValue) {
      suggestedUpdates[field as string] = { current: currentValue, suggested: enrichedValue }
    }
  }

  return { autoFill, suggestedUpdates }
}

// Apply enrichment: save fields, log to timeline
export async function applyEnrichment(
  contactId: string,
  fieldsToApply: Record<string, string>,
  originalValues: Record<string, string | null>,
): Promise<Contact> {
  const fieldChanges: Record<string, { before: string | null; after: string }> = {}
  for (const [key, value] of Object.entries(fieldsToApply)) {
    fieldChanges[key] = { before: originalValues[key] ?? null, after: value }
  }

  const fieldNames = Object.keys(fieldsToApply).join(', ')
  await logSystemEvent({
    contactId,
    type: 'field_update',
    detail: { source: 'enrichment', fields: fieldChanges },
    notes: `Enriched: ${fieldNames}`,
  })

  const updated = await updateContact(contactId, fieldsToApply)
  return updated
}
