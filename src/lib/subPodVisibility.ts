import type { Category, Contact } from './types'

export function getContactSubPods(
  contact: Pick<Contact, 'category_ids'>,
  categories: Category[],
): Category[] {
  const byId = new Map(categories.map(category => [category.id, category]))
  return contact.category_ids
    .map(categoryId => byId.get(categoryId))
    .filter((category): category is Category => Boolean(category))
}

export function formatContactSubPods(
  contact: Pick<Contact, 'category_ids'>,
  categories: Category[],
): string {
  return getContactSubPods(contact, categories)
    .map(category => category.name)
    .join(', ')
}
