import { describe, expect, it } from 'vitest'
import type { SharedContactAccessSnapshot } from './collaboration'
import type { Campaign, CampaignStage, Contact } from './types'
import {
  isProjectedSharedCampaignContact,
  isProjectedSharedCampaign,
  mergeContactsWithProjectedSharedContacts,
  organizeSharedContactsForWorkspace,
  projectedSharedCampaignStages,
  projectedSharedCampaignContacts,
  projectSharedContactsToWorkspace,
  projectSharedWorkspaceResources,
  sharedContactSnapshotKey,
} from './sharedContactProjection'

const baseContact: Contact = {
  id: 'owner-contact-1',
  name: 'Shared Person',
  email: 'shared@example.com',
  phone: null,
  company: 'Kinship Ventures',
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
  list_ids: ['owner-pod-maps'],
  category_ids: ['owner-cat-music'],
  primary_list_id: 'owner-pod-maps',
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
  status: 'Active',
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
  created_at: '2026-07-02T00:00:00.000Z',
}

function snapshot(overrides: Partial<SharedContactAccessSnapshot> = {}): SharedContactAccessSnapshot {
  return {
    grant_id: 'grant-1',
    owner_workspace_id: 'owner-workspace',
    subject_label: 'Receiver',
    created_by: 'owner-user',
    created_by_label: 'Owner User',
    created_by_email: 'owner@example.com',
    resource_type: 'pod',
    resource_id: 'owner-pod-maps',
    resource_label: 'MAPS',
    permission_level: 'view',
    field_scopes: ['public_profile'],
    visible_field_ids: [],
    expires_at: null,
    created_at: '2026-07-02T00:00:00.000Z',
    contact: baseContact,
    ...overrides,
  }
}

describe('shared contact projection', () => {
  it('projects a shared pod contact onto the receiver pod with the same name', () => {
    const projected = projectSharedContactsToWorkspace([snapshot()], {
      pods: [{ id: 'local-pod-maps', name: 'MAPS', color: null, owner: null, is_priority: false, cadence: null, description: null, capacity: null, enrichment_opt_in: false, created_at: '' }],
      categories: [],
      contacts: [],
    })

    expect(projected).toHaveLength(1)
    expect(projected[0].list_ids).toEqual(['local-pod-maps'])
    expect(projected[0].primary_list_id).toBe('local-pod-maps')
  })

  it('projects a shared sub-pod contact onto the matching receiver sub-pod and parent pod', () => {
    const projected = projectSharedContactsToWorkspace([
      snapshot({ resource_id: 'owner-cat-music', resource_label: 'Sub-pod: Music', resource_type: 'pod' }),
    ], {
      pods: [{ id: 'local-pod-maps', name: 'MAPS', color: null, owner: null, is_priority: false, cadence: null, description: null, capacity: null, enrichment_opt_in: false, created_at: '' }],
      categories: [{ id: 'local-cat-music', list_id: 'local-pod-maps', name: 'Music', color: null, icon: null, created_at: '' }],
      contacts: [],
    })

    expect(projected[0].list_ids).toEqual(['local-pod-maps'])
    expect(projected[0].category_ids).toEqual(['local-cat-music'])
  })

  it('creates read-only campaign rows for a matching shared campaign', () => {
    const campaign: Campaign = {
      id: 'local-campaign',
      name: 'Fund III Launch Dinner',
      type: 'event',
      deadline: null,
      status: 'active',
      notes: null,
      description: null,
      custom_fields: {},
      contact_ids: [],
      created_at: '',
    }
    const stages: CampaignStage[] = [
      { id: 'stage-1', campaign_id: campaign.id, name: 'Prospects', color: null, order: 0, created_at: '' },
    ]

    const rows = projectedSharedCampaignContacts([
      snapshot({ resource_type: 'campaign', resource_id: 'owner-campaign', resource_label: 'Fund III Launch Dinner' }),
    ], campaign, stages)

    expect(rows).toHaveLength(1)
    expect(rows[0].campaign_id).toBe('local-campaign')
    expect(rows[0].stage_id).toBe('stage-1')
    expect(isProjectedSharedCampaignContact(rows[0])).toBe(true)
  })

  it('organizes a new shared contact into receiver relationships and pods', () => {
    const organized = organizeSharedContactsForWorkspace([snapshot()], {
      pods: [{ id: 'local-pod-maps', name: 'MAPS', color: null, owner: null, is_priority: false, cadence: null, description: null, capacity: null, enrichment_opt_in: false, created_at: '' }],
      categories: [],
      contacts: [],
    })

    expect(organized.allContacts).toHaveLength(1)
    expect(organized.sharedContacts).toHaveLength(1)
    expect(organized.sharedContacts[0].id).toBe('owner-contact-1')
    expect(organized.sharedContacts[0].list_ids).toEqual(['local-pod-maps'])
    expect(organized.contactIdsByGrantId.get('grant-1')).toEqual(['owner-contact-1'])
  })

  it('organizes an existing local shared contact without duplicating it', () => {
    const local = {
      ...baseContact,
      id: 'local-contact',
      list_ids: [],
      category_ids: [],
      primary_list_id: null,
    }
    const contactSnapshot = snapshot()
    const organized = organizeSharedContactsForWorkspace([contactSnapshot], {
      pods: [{ id: 'local-pod-maps', name: 'MAPS', color: null, owner: null, is_priority: false, cadence: null, description: null, capacity: null, enrichment_opt_in: false, created_at: '' }],
      categories: [],
      contacts: [local],
    })

    expect(organized.allContacts).toHaveLength(1)
    expect(organized.allContacts[0].id).toBe('local-contact')
    expect(organized.allContacts[0].list_ids).toEqual(['local-pod-maps'])
    expect(organized.sharedContacts).toHaveLength(1)
    expect(organized.sharedContacts[0].id).toBe('local-contact')
    expect(organized.contactIdsByGrantId.get('grant-1')).toEqual(['local-contact'])
    expect(organized.contactIdBySnapshotKey.get(sharedContactSnapshotKey(contactSnapshot))).toBe('local-contact')
  })

  it('uses the resolved receiver contact id for shared campaign rows', () => {
    const campaign: Campaign = {
      id: 'local-campaign',
      name: 'Fund III Launch Dinner',
      type: 'event',
      deadline: null,
      status: 'active',
      notes: null,
      description: null,
      custom_fields: {},
      contact_ids: [],
      created_at: '',
    }
    const stages: CampaignStage[] = [
      { id: 'stage-1', campaign_id: campaign.id, name: 'Prospects', color: null, order: 0, created_at: '' },
    ]

    const contactSnapshot = snapshot({ resource_type: 'campaign', resource_id: 'owner-campaign', resource_label: 'Fund III Launch Dinner' })
    const rows = projectedSharedCampaignContacts(
      [contactSnapshot],
      campaign,
      stages,
      () => 'local-contact',
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].contact_id).toBe('local-contact')
  })

  it('does not add visual duplicates when a local contact already matches a shared contact email', () => {
    const local = { ...baseContact, id: 'local-contact', list_ids: ['local-pod-maps'], primary_list_id: 'local-pod-maps' }
    const projected = { ...baseContact, id: 'owner-contact-1', list_ids: ['local-pod-maps'], primary_list_id: 'local-pod-maps' }

    expect(mergeContactsWithProjectedSharedContacts([local], [projected])).toHaveLength(1)
  })

  it('creates a virtual shared campaign when the receiver does not have a matching campaign', () => {
    const projection = projectSharedWorkspaceResources([
      snapshot({ resource_type: 'campaign', resource_id: 'owner-campaign', resource_label: 'Kinship Ventures Fund I' }),
    ], {
      pods: [],
      categories: [],
      campaigns: [],
      contacts: [],
    })

    expect(projection.campaigns).toHaveLength(1)
    expect(projection.campaigns[0].name).toBe('Kinship Ventures Fund I')
    expect(projection.campaigns[0].contact_ids).toEqual(['owner-contact-1'])
    expect(isProjectedSharedCampaign(projection.campaigns[0])).toBe(true)
    expect(projectedSharedCampaignStages(projection.campaigns[0])[0].name).toBe('Shared')
  })

  it('matches an existing receiver campaign by name instead of adding a duplicate', () => {
    const campaign: Campaign = {
      id: 'local-campaign',
      name: 'Kinship Ventures Fund I',
      type: 'fundraise',
      deadline: null,
      status: 'active',
      notes: null,
      description: null,
      custom_fields: {},
      contact_ids: [],
      created_at: '',
    }

    const projection = projectSharedWorkspaceResources([
      snapshot({ resource_type: 'campaign', resource_id: 'owner-campaign', resource_label: 'Kinship Ventures Fund I' }),
    ], {
      pods: [],
      categories: [],
      campaigns: [campaign],
      contacts: [],
    })

    expect(projection.campaigns).toHaveLength(1)
    expect(projection.campaigns[0].id).toBe('local-campaign')
    expect(projection.campaigns[0].type).toBe('fundraise')
    expect(projection.campaigns[0].contact_ids).toEqual(['owner-contact-1'])
  })

  it('creates shared pod, sub-pod, and company projections when the receiver is missing those resources', () => {
    const projection = projectSharedWorkspaceResources([
      snapshot({ resource_type: 'pod', resource_label: 'LPs' }),
      snapshot({ grant_id: 'grant-2', resource_type: 'pod', resource_label: 'Sub-pod: Inner Circle' }),
    ], {
      pods: [],
      categories: [],
      campaigns: [],
      contacts: [],
    })

    expect(projection.pods.map(pod => pod.name)).toEqual(['LPs', 'Shared sub-pods'])
    expect(projection.categories.map(category => category.name)).toEqual(['Inner Circle'])
    expect(projection.contacts.some(contact => contact.type === 'Company' && contact.name === 'Kinship Ventures')).toBe(true)
    expect(projection.sharedContacts[0].list_ids).toContain(projection.pods[0].id)
  })
})
