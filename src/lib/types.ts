// Semantic type aliases — not opaque, but documented and searchable
export type HexColor = `#${string}`  // hex color string, e.g. "#718096"
export type ISODate = string          // YYYY-MM-DD date string

export type InteractionType = 'call' | 'email' | 'text' | 'meeting' | 'intro' | 'note'
export type Owner = 'moj_mahdara' | 'kinship_ventures'
export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly'

export interface Pod {
  id: string           // Airtable record ID
  name: string
  color: HexColor | null
  owner: Owner | null
  is_priority: boolean
  cadence: Cadence | null  // null = default monthly
  created_at: string   // Airtable createdTime
}

export interface Category {
  id: string
  list_id: string      // single linked Pod record ID
  name: string
  color: HexColor | null
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
  created_at: string
}

export interface Interaction {
  id: string
  contact_id: string   // single linked Contact record ID
  type: InteractionType
  date: ISODate
  notes: string | null
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

// Campaign types
export type CampaignType = 'event' | 'investment' | 'outreach' | 'other'
export type CampaignContactStatus = 'pending' | 'reached' | 'responded' | 'confirmed'
export type CampaignStatus = 'active' | 'completed'

export interface Campaign {
  id: string
  name: string
  type: CampaignType
  deadline: ISODate | null
  status: CampaignStatus
  contact_ids: string[]      // linked Contact record IDs from junction
  created_at: string
}

export interface CampaignContact {
  id: string                 // junction record ID
  campaign_id: string        // linked Campaign record ID
  contact_id: string         // linked Contact record ID
  status: CampaignContactStatus
  notes: string | null
  created_at: string
}
