import type { Category, Contact } from './types'

export interface SubPodAssignmentUpdate {
  list_ids: string[]
  primary_list_id: string | null
  category_ids: string[]
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

export function planMoveToSubPod(
  contact: Pick<Contact, 'list_ids' | 'primary_list_id' | 'category_ids'>,
  targetSubPod: Pick<Category, 'id' | 'list_id'>,
  allSubPods: Array<Pick<Category, 'id' | 'list_id'>>,
): SubPodAssignmentUpdate {
  const siblingSubPodIds = new Set(
    allSubPods
      .filter(subPod => subPod.list_id === targetSubPod.list_id)
      .map(subPod => subPod.id),
  )
  const categoryIds = unique([
    ...contact.category_ids.filter(categoryId => !siblingSubPodIds.has(categoryId)),
    targetSubPod.id,
  ])
  const listIds = unique([
    ...contact.list_ids,
    targetSubPod.list_id,
  ])

  return {
    list_ids: listIds,
    primary_list_id: contact.primary_list_id ?? targetSubPod.list_id,
    category_ids: categoryIds,
  }
}
