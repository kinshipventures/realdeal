import type { Campaign, CampaignContact, Contact } from './types'
import type { CollaborationFieldScope } from './collaboration'

export type CampaignAccessArea = 'Investments / Fundraising' | 'Partnerships'

export interface CampaignContactSnapshot {
  contact_id: string
  campaign_contact_id: string | null
  name: string
  company: string | null
  role: string | null
  industry: string | null
  location: string | null
  country: string | null
  linkedin: string | null
  website: string | null
  pod_ids: string[]
  sub_pod_ids: string[]
  email?: string | null
  phone?: string | null
  campaign_status?: string | null
  stage?: string | null
  owner?: string | null
  next_step?: string | null
  notes?: string | null
  relationship_context?: string | null
  last_contacted_at?: string | null
  investment_summary?: string | null
}

export const FIELD_SCOPE_DETAILS: Array<{
  value: CollaborationFieldScope
  label: string
  summary: string
  externalDefault: boolean
}> = [
  {
    value: 'public_profile',
    label: 'Public profile',
    summary: 'Name, company, role, city, country, LinkedIn, website, and list context.',
    externalDefault: true,
  },
  {
    value: 'private_contact',
    label: 'Private contact',
    summary: 'Email, alternate emails, phone, address, and direct contact channels.',
    externalDefault: false,
  },
  {
    value: 'relationship_private',
    label: 'Relationship private',
    summary: 'Private notes, relationship context, communication preferences, activity, and history.',
    externalDefault: false,
  },
  {
    value: 'investment_private',
    label: 'Investment private',
    summary: 'LP, fund, SPV, commitment, and other investment-specific information.',
    externalDefault: false,
  },
  {
    value: 'campaign_private',
    label: 'Campaign private',
    summary: 'Campaign notes, status, approval comments, outreach progress, and campaign-only updates.',
    externalDefault: false,
  },
]

export function normalizeFieldScopes(scopes: CollaborationFieldScope[]): CollaborationFieldScope[] {
  const next = new Set<CollaborationFieldScope>(scopes)
  next.add('public_profile')
  return Array.from(next)
}

export function hasFieldScope(scopes: CollaborationFieldScope[], scope: CollaborationFieldScope): boolean {
  return normalizeFieldScopes(scopes).includes(scope)
}

export function getCampaignAccessArea(campaign: Pick<Campaign, 'type'>): CampaignAccessArea {
  if (campaign.type === 'investment' || campaign.type === 'fundraise' || campaign.type === 'deal_flow') {
    return 'Investments / Fundraising'
  }
  return 'Partnerships'
}

export function buildCampaignContactSnapshot({
  contact,
  campaignContact,
  stageName,
  fieldScopes,
}: {
  contact: Contact
  campaignContact?: CampaignContact | null
  stageName?: string | null
  fieldScopes: CollaborationFieldScope[]
}): CampaignContactSnapshot {
  const scopes = normalizeFieldScopes(fieldScopes)
  const snapshot: CampaignContactSnapshot = {
    contact_id: contact.id,
    campaign_contact_id: campaignContact?.id ?? null,
    name: contact.name,
    company: contact.company,
    role: contact.role,
    industry: contact.industry,
    location: contact.location,
    country: contact.country,
    linkedin: contact.linkedin,
    website: contact.website,
    pod_ids: contact.list_ids,
    sub_pod_ids: contact.category_ids,
  }

  if (hasFieldScope(scopes, 'private_contact')) {
    snapshot.email = contact.email
    snapshot.phone = contact.phone
  }

  if (hasFieldScope(scopes, 'campaign_private') && campaignContact) {
    snapshot.campaign_status = campaignContact.status
    snapshot.stage = stageName ?? null
    snapshot.owner = campaignContact.owner
    snapshot.next_step = campaignContact.next_step
    snapshot.notes = campaignContact.notes
  }

  if (hasFieldScope(scopes, 'relationship_private')) {
    snapshot.relationship_context = contact.relationship_context ?? contact.intel_notes
    snapshot.last_contacted_at = contact.last_contacted_at
  }

  if (hasFieldScope(scopes, 'investment_private')) {
    const investments = [
      ...(contact.kv_fund_investor ?? []),
      ...(contact.spv_investor ?? []),
    ].filter(Boolean)
    snapshot.investment_summary = investments.length > 0 ? investments.join(', ') : null
  }

  return snapshot
}

export function publicCampaignPath(token: string): string {
  return `/public/campaign/${token}`
}
