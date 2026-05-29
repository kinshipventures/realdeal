export interface CampaignAddPlan {
  toAdd: string[]
  alreadyInCampaign: string[]
}

export function planCampaignContactAdd(
  selectedContactIds: Iterable<string>,
  campaignContactIds: Iterable<string>,
): CampaignAddPlan {
  const existing = new Set(campaignContactIds)
  const seen = new Set<string>()
  const toAdd: string[] = []
  const alreadyInCampaign: string[] = []

  for (const contactId of selectedContactIds) {
    if (seen.has(contactId)) continue
    seen.add(contactId)

    if (existing.has(contactId)) alreadyInCampaign.push(contactId)
    else toAdd.push(contactId)
  }

  return { toAdd, alreadyInCampaign }
}
