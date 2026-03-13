export type InteractionType = 'call' | 'email' | 'text' | 'meeting' | 'intro' | 'note'
export type Owner = 'moj_mahdara' | 'kinship_ventures'

export interface List {
  id: string           // Airtable record ID
  name: string
  color: string | null
  owner: Owner | null
  is_priority: boolean
  created_at: string   // Airtable createdTime
}

export interface Category {
  id: string
  list_id: string      // single linked List record ID
  name: string
  color: string | null
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
  last_contacted_at: string | null
  list_ids: string[]      // linked List record IDs
  category_ids: string[]  // linked Category record IDs
  created_at: string
}

export interface Interaction {
  id: string
  contact_id: string   // single linked Contact record ID
  type: InteractionType
  date: string
  notes: string | null
  created_at: string
}

