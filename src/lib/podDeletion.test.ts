import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deletePod } from './supabase-data'
import { DEMO_CATEGORIES, DEMO_CONTACTS, DEMO_PODS, setDemoMode } from './sampleData'
import type { Category, Contact, Pod } from './types'

const TEST_POD_ID = 'demo-pod-delete-contract'
const TEST_CATEGORY_ID = 'demo-cat-delete-contract'
const TEST_CONTACT_ID = 'demo-contact-delete-contract'

function cleanupTestRecords() {
  for (let index = DEMO_PODS.length - 1; index >= 0; index -= 1) {
    if (DEMO_PODS[index].id === TEST_POD_ID) DEMO_PODS.splice(index, 1)
  }
  for (let index = DEMO_CATEGORIES.length - 1; index >= 0; index -= 1) {
    if (DEMO_CATEGORIES[index].id === TEST_CATEGORY_ID) DEMO_CATEGORIES.splice(index, 1)
  }
  for (let index = DEMO_CONTACTS.length - 1; index >= 0; index -= 1) {
    if (DEMO_CONTACTS[index].id === TEST_CONTACT_ID) DEMO_CONTACTS.splice(index, 1)
  }
}

beforeEach(() => {
  setDemoMode(true)
  cleanupTestRecords()
})

afterEach(() => {
  cleanupTestRecords()
})

describe('pod deletion', () => {
  it('removes the pod and sub-pods while preserving contacts and their other pod assignments', async () => {
    const keepPodId = DEMO_PODS[0].id
    const pod: Pod = {
      ...DEMO_PODS[0],
      id: TEST_POD_ID,
      name: 'Delete Contract Pod',
    }
    const category: Category = {
      ...DEMO_CATEGORIES[0],
      id: TEST_CATEGORY_ID,
      list_id: TEST_POD_ID,
      name: 'Delete Contract Sub-pod',
    }
    const contact: Contact = {
      ...DEMO_CONTACTS[0],
      id: TEST_CONTACT_ID,
      name: 'Delete Contract Contact',
      list_ids: [keepPodId, TEST_POD_ID],
      primary_list_id: TEST_POD_ID,
      category_ids: [TEST_CATEGORY_ID],
    }

    DEMO_PODS.push(pod)
    DEMO_CATEGORIES.push(category)
    DEMO_CONTACTS.push(contact)

    await deletePod(TEST_POD_ID)

    const preservedContact = DEMO_CONTACTS.find(item => item.id === TEST_CONTACT_ID)
    expect(DEMO_PODS.some(item => item.id === TEST_POD_ID)).toBe(false)
    expect(DEMO_CATEGORIES.some(item => item.id === TEST_CATEGORY_ID)).toBe(false)
    expect(preservedContact).toBeTruthy()
    expect(preservedContact?.list_ids).toEqual([keepPodId])
    expect(preservedContact?.primary_list_id).toBe(keepPodId)
    expect(preservedContact?.category_ids).not.toContain(TEST_CATEGORY_ID)
  })
})
