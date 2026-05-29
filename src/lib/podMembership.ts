import type { Contact } from './types'

export function getAssignedPodIds(contact: Contact): string[] {
  const ids = new Set(contact.list_ids ?? [])
  if (contact.primary_list_id) ids.add(contact.primary_list_id)
  return [...ids]
}

export function isVisiblePodMember(contact: Contact, podId: string): boolean {
  if (contact.status === 'Archived') return false
  return getAssignedPodIds(contact).includes(podId)
}

export function groupVisibleContactsByPod(contacts: Contact[]): Map<string, Contact[]> {
  const byPod = new Map<string, Contact[]>()

  for (const contact of contacts) {
    if (contact.status === 'Archived') continue
    for (const podId of getAssignedPodIds(contact)) {
      const existing = byPod.get(podId)
      if (existing) existing.push(contact)
      else byPod.set(podId, [contact])
    }
  }

  return byPod
}
