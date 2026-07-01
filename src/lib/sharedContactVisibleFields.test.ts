import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHARED_CONTACT_VISIBLE_FIELD_IDS,
  deriveSharedContactFieldScopes,
  SHARED_CONTACT_VISIBLE_FIELD_GROUPS,
} from './sharedContactVisibleFields'

describe('shared contact visible field options', () => {
  it('keeps public profile as the required baseline scope', () => {
    expect(DEFAULT_SHARED_CONTACT_VISIBLE_FIELD_IDS).toEqual([
      'name',
      'company',
      'job_title',
      'city',
      'country',
      'linkedin',
      'pods',
      'sub_pods',
    ])
    expect(deriveSharedContactFieldScopes([])).toEqual(['public_profile'])
  })

  it('maps detailed contact-card fields back to the approved collaboration field scopes', () => {
    expect(deriveSharedContactFieldScopes([
      'email',
      'notables',
      'kinship_investments',
      'campaign_status',
    ])).toEqual([
      'public_profile',
      'private_contact',
      'relationship_private',
      'investment_private',
      'campaign_private',
    ])
  })

  it('exposes contact-card sections for the Share contacts modal without adding new grant scopes', () => {
    expect(SHARED_CONTACT_VISIBLE_FIELD_GROUPS.map(group => group.label)).toEqual([
      'Public profile',
      'Ways to contact',
      'Relationship context',
      'Investor profile',
      'Campaigns',
    ])
    expect(SHARED_CONTACT_VISIBLE_FIELD_GROUPS.map(group => group.scope)).toEqual([
      'public_profile',
      'private_contact',
      'relationship_private',
      'investment_private',
      'campaign_private',
    ])
  })
})

