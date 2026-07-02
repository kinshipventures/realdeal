import { describe, expect, it } from 'vitest'
import {
  decodeSharedContactVisibleFieldIdsFromScopes,
  DEFAULT_SHARED_CONTACT_VISIBLE_FIELD_IDS,
  deriveSharedContactFieldScopes,
  encodeSharedContactFieldScopes,
  normalizeSharedContactFieldScopes,
  normalizeSharedContactVisibleFieldIds,
  SHARED_CONTACT_VISIBLE_FIELD_GROUPS,
} from './sharedContactVisibleFields'

describe('shared contact visible field options', () => {
  it('keeps public profile fields optional while preserving the baseline scope', () => {
    expect(DEFAULT_SHARED_CONTACT_VISIBLE_FIELD_IDS).toEqual([])
    expect(deriveSharedContactFieldScopes([])).toEqual(['public_profile'])
    expect(deriveSharedContactFieldScopes(['name'])).toEqual(['public_profile'])
    expect(deriveSharedContactFieldScopes(['phone'])).toEqual(['public_profile', 'private_contact'])
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

  it('stores exact visible fields as visual tokens while preserving approved scopes', () => {
    const encoded = encodeSharedContactFieldScopes(['email', 'phone'])

    expect(encoded).toEqual([
      'public_profile',
      'private_contact',
      'visible:email',
      'visible:phone',
    ])
    expect(normalizeSharedContactFieldScopes(encoded)).toEqual(['public_profile', 'private_contact'])
    expect(decodeSharedContactVisibleFieldIdsFromScopes(encoded)).toEqual([
      'email',
      'phone',
    ])
  })

  it('falls back to legacy broad scopes when no exact visual tokens exist', () => {
    expect(normalizeSharedContactVisibleFieldIds(['phone'], ['public_profile', 'private_contact'])).toEqual([
      'phone',
    ])

    expect(decodeSharedContactVisibleFieldIdsFromScopes(['public_profile', 'private_contact'])).toEqual([
      'name',
      'company',
      'job_title',
      'city',
      'country',
      'linkedin',
      'pods',
      'sub_pods',
      'email',
      'email_2',
      'email_3',
      'phone',
      'address',
      'assistant_info',
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
    expect(SHARED_CONTACT_VISIBLE_FIELD_GROUPS.some(group => group.required)).toBe(false)
  })
})

