import { describe, expect, it } from 'vitest'
import { planCampaignContactAdd } from './campaignMembership'

describe('campaign membership helpers', () => {
  it('separates selected contacts that need to be added from existing campaign members', () => {
    expect(planCampaignContactAdd(['c-1', 'c-2', 'c-3'], ['c-2'])).toEqual({
      toAdd: ['c-1', 'c-3'],
      alreadyInCampaign: ['c-2'],
    })
  })

  it('deduplicates selected contacts before planning the add', () => {
    expect(planCampaignContactAdd(['c-1', 'c-1', 'c-2'], [])).toEqual({
      toAdd: ['c-1', 'c-2'],
      alreadyInCampaign: [],
    })
  })

  it('keeps all selected contacts out of the insert list when they already belong to the campaign', () => {
    expect(planCampaignContactAdd(['c-1', 'c-2'], ['c-1', 'c-2', 'c-3'])).toEqual({
      toAdd: [],
      alreadyInCampaign: ['c-1', 'c-2'],
    })
  })
})
