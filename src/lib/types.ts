// Semantic type aliases — not opaque, but documented and searchable
export type HexColor = `#${string}`  // hex color string, e.g. "#718096"
export type ISODate = string          // YYYY-MM-DD date string

export type InteractionType = 'call' | 'email' | 'text' | 'meeting' | 'intro' | 'note' | 'pod_change' | 'field_update' | 'categorization' | 'pipeline_event' | 'project_event' | 'merge_event'
type HumanInteractionType = 'call' | 'email' | 'text' | 'meeting' | 'intro' | 'note'
export type SystemEventType = 'pod_change' | 'field_update' | 'categorization' | 'pipeline_event' | 'project_event' | 'merge_event'
export const HUMAN_TYPES: HumanInteractionType[] = ['call', 'email', 'text', 'meeting', 'intro', 'note']
export const SYSTEM_TYPES: SystemEventType[] = ['pod_change', 'field_update', 'categorization', 'pipeline_event', 'project_event', 'merge_event']
export type Owner = 'moj_mahdara' | 'kinship_ventures'
export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
export type GlobalRegion = 'AMER' | 'APAC' | 'ME' | 'LATAM' | 'EU'
export type ContactFrequency = 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual' | 'As Needed'
export type Gender = 'Male' | 'Female' | 'Non-binary' | 'Other'
export type InteractionSource = 'Gmail' | 'Granola' | 'Otter' | 'Fireflies' | 'Fathom' | 'Manual'

export type RelationshipType = 'Contact' | 'Company'
export type RelationshipStatus = 'Active' | 'Pending' | 'Archived'
export type PipelineStatus = 'active' | 'hidden'
export type RelationshipRing = 'kinship' | 'trolley' | 'global_freedoms'
export const RELATIONSHIP_RINGS: RelationshipRing[] = ['kinship', 'trolley', 'global_freedoms']
export const RELATIONSHIP_RING_LABELS: Record<RelationshipRing, string> = {
  kinship: 'Kinship Ventures',
  trolley: 'Trolley AI',
  global_freedoms: 'Global Freedoms',
}

export interface Pod {
  id: string
  name: string
  color: HexColor | null
  owner: Owner | null
  is_priority: boolean
  cadence: Cadence | null  // null = default monthly
  description: string | null
  capacity: number | null  // null = unlimited
  enrichment_opt_in: boolean
  created_at: string
}

export interface Category {
  id: string
  list_id: string      // single linked Pod record ID
  name: string
  color: HexColor | null
  icon: string | null   // Lucide icon name, e.g. "Coffee", "Briefcase"
  created_at: string
}

export interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  role: string | null
  location: string | null
  website: string | null
  notes: string | null
  recommended_by: string | null
  specialization: string | null
  past_clients: string | null
  birthday: ISODate | null
  milestones: string | null
  interests: string | null
  relationship_context: string | null
  last_contacted_at: ISODate | null
  list_ids: string[]      // linked Pod record IDs
  category_ids: string[]  // linked Category record IDs
  primary_list_id: string | null  // primary pod (raw record ID, not linked)
  cadence_override: Cadence | null  // per-contact cadence override
  // V1 expanded fields
  first_name: string | null
  last_name: string | null
  linkedin: string | null
  country: string | null
  global_region: GlobalRegion | null
  gender: Gender | null
  introduced_by: string | null
  intel_notes: string | null
  relationship_owner: string | null
  contact_frequency: ContactFrequency | null
  communication_preferences: string | null
  next_follow_up_date: ISODate | null
  next_action: string | null
  kv_fund_investor: string[] | null
  spv_investor: string[] | null
  needs_review: boolean
  // v2 relationship fields
  type: RelationshipType
  status: RelationshipStatus
  ring_ids?: RelationshipRing[]
  company_record_id: string | null  // primary company (first in company_ids)
  company_ids: string[]              // all linked company IDs
  industry: string | null
  stage: string | null
  ticker: string | null
  domain: string | null
  email_2: string | null
  email_3: string | null
  photo_url: string | null
  custom_fields: Record<string, unknown>
  snoozed_until: string | null  // ISO timestamp; null = not snoozed
  created_at: string
}

export interface Company {
  id: string
  name: string
  website: string | null
  domain: string | null
  ticker: string | null
  location: string | null
  stage: string | null
  industry: string | null
  notes: string | null
  custom_fields: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Interaction {
  id: string
  contact_id: string   // single linked Contact record ID
  type: InteractionType
  date: ISODate
  notes: string | null
  // V1 expanded fields
  summary: string | null
  source: InteractionSource | null
  email_link: string | null
  granola_link: string | null
  meeting_link?: string | null   // generic meeting notes link (alias for granola_link)
  event_detail: string | null    // JSON string for system event metadata
  actor: string | null           // "You" for now, future multi-user
  created_at: string
}

// Social equity types
export type FocusReason = 'overdue' | 'birthday' | 'serendipity'

export interface FocusItem {
  contact: Contact
  pod: Pod | null
  reason: FocusReason
  score: number
}

// Campaign types - all campaigns are contact-centric with stages
export type CampaignType = 'event' | 'investment' | 'outreach' | 'deal_flow' | 'fundraise' | 'talent' | 'partnerships' | 'other'
export type CampaignContactStatus = 'pending' | 'reached' | 'responded' | 'confirmed'
export type CampaignStatus = 'active' | 'completed' | 'hidden'

export interface Campaign {
  id: string
  name: string
  type: CampaignType
  deadline: ISODate | null
  status: CampaignStatus
  notes: string | null
  description: string | null
  contact_ids: string[]      // linked Contact record IDs from junction
  created_at: string
}

export interface CampaignStage {
  id: string
  campaign_id: string
  name: string
  color: HexColor | null
  order: number
  created_at: string
}

// Outreach campaigns: contacts moving through stages
export interface CampaignContact {
  id: string                 // junction record ID
  campaign_id: string        // linked Campaign record ID
  contact_id: string         // linked Contact record ID
  status: CampaignContactStatus  // legacy -- will migrate to stage_id
  stage_id: string | null    // FK to campaign_stages
  notes: string | null
  owner: string | null
  next_step: string | null
  next_step_due: ISODate | null
  moved_at: string | null    // when contact last changed stage
  is_priority: boolean
  created_at: string
}


export type PipelineStage = CampaignStage & { pipeline_id: string }

export interface Project {
  id: string
  name: string
  description: string | null
  owner: string | null
  relationship_ids: string[]
  notes: string | null
  created_at: string
}

export interface ShareLink {
  id: string
  pod_id: string
  token: string
  excluded_contact_ids: string[]
  visible_columns: string[]
  expires_at: string
  pin_hash: string | null
  revoked_at: string | null
  created_at: string
}
