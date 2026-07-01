import type { Campaign, CampaignContact } from './types'

export function visibleAssignedIds(visibleIds: string[], assignedIds: readonly string[] | null | undefined): string[] {
  const assigned = new Set(assignedIds ?? [])
  return visibleIds.filter(id => assigned.has(id))
}

export function selectedContactCardValues(values: readonly unknown[] | null | undefined, hiddenValues: Iterable<string> = []): string[] {
  const hidden = new Set(hiddenValues)
  return [...new Set(
    (values ?? [])
      .map(value => String(value).trim())
      .filter(value => value && !hidden.has(value)),
  )]
}

export function linkedContactCardCampaigns(
  campaigns: Campaign[],
  links: CampaignContact[],
  hiddenCampaignIds: Iterable<string> = [],
): Campaign[] {
  const linkedIds = new Set(links.map(link => link.campaign_id))
  const hiddenIds = new Set(hiddenCampaignIds)

  return campaigns.filter(campaign =>
    linkedIds.has(campaign.id) &&
    !hiddenIds.has(campaign.id) &&
    campaign.status !== 'hidden'
  )
}
