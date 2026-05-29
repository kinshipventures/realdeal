import { describe, expect, it } from 'vitest'
import { getAssignedPodIds, groupVisibleContactsByPod, isVisiblePodMember } from './podMembership'
import type { Contact } from './types'

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'c-1',
    name: 'Test Person',
    email: null,
    phone: null,
    company: null,
    role: null,
    location: null,
    website: null,
    notes: null,
    recommended_by: null,
    specialization: null,
    past_clients: null,
    birthday: null,
    milestones: null,
    interests: null,
    relationship_context: null,
    last_contacted_at: null,
    list_ids: [],
    category_ids: [],
    primary_list_id: null,
    cadence_override: null,
    first_name: null,
    last_name: null,
    linkedin: null,
    country: null,
    global_region: null,
    gender: null,
    introduced_by: null,
    intel_notes: null,
    relationship_owner: null,
    contact_frequency: null,
    communication_preferences: null,
    next_follow_up_date: null,
    next_action: null,
    kv_fund_investor: null,
    spv_investor: null,
    needs_review: false,
    type: 'Contact',
    status: 'Pending',
    ring_ids: [],
    company_record_id: null,
    company_ids: [],
    industry: null,
    stage: null,
    ticker: null,
    domain: null,
    email_2: null,
    email_3: null,
    photo_url: null,
    custom_fields: {},
    snoozed_until: null,
    created_at: '2026-05-29T00:00:00.000Z',
    ...overrides,
  }
}

describe('pod membership helpers', () => {
  it('shows pending contacts when they are assigned to a pod', () => {
    const contact = makeContact({ list_ids: ['pod-lps'], status: 'Pending' })

    expect(isVisiblePodMember(contact, 'pod-lps')).toBe(true)
  })

  it('includes primary pod as a fallback assignment without duplicating it', () => {
    const contact = makeContact({ list_ids: ['pod-lps'], primary_list_id: 'pod-lps' })

    expect(getAssignedPodIds(contact)).toEqual(['pod-lps'])
  })

  it('excludes archived contacts from pod member groups', () => {
    const active = makeContact({ id: 'active', list_ids: ['pod-lps'], status: 'Active' })
    const archived = makeContact({ id: 'archived', list_ids: ['pod-lps'], status: 'Archived' })

    expect(groupVisibleContactsByPod([active, archived]).get('pod-lps')?.map(c => c.id)).toEqual(['active'])
  })
})
