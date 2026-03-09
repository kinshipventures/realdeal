// ── Database types ──────────────────────────────────────────────────────────

export type InteractionType = 'call' | 'email' | 'meeting' | 'intro' | 'event' | 'note'
export type NodeType = 'list' | 'category'
export type Owner = 'moj_mahdara' | 'kinship_ventures'

export interface List {
  id: string
  name: string
  color: string | null
  owner: Owner | null
  is_priority: boolean
  created_at: string
}

export interface Category {
  id: string
  list_id: string
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
  created_at: string
  updated_at: string
}

export interface ListMembership {
  id: string
  contact_id: string
  list_id: string
  category_id: string | null
  added_at: string
}

export interface Interaction {
  id: string
  contact_id: string
  type: InteractionType
  date: string
  notes: string | null
  created_at: string
}

export interface NodePosition {
  id: string
  node_id: string
  node_type: NodeType
  x: number
  y: number
  updated_at: string
}

// ── Supabase Database schema ─────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      lists: {
        Row: List
        Insert: Omit<List, 'id' | 'created_at'>
        Update: Partial<Omit<List, 'id' | 'created_at'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'>
        Update: Partial<Omit<Category, 'id' | 'created_at'>>
      }
      contacts: {
        Row: Contact
        Insert: Omit<Contact, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>
      }
      list_memberships: {
        Row: ListMembership
        Insert: Omit<ListMembership, 'id' | 'added_at'>
        Update: Partial<Omit<ListMembership, 'id' | 'added_at'>>
      }
      interactions: {
        Row: Interaction
        Insert: Omit<Interaction, 'id' | 'created_at'>
        Update: Partial<Omit<Interaction, 'id' | 'created_at'>>
      }
      node_positions: {
        Row: NodePosition
        Insert: Omit<NodePosition, 'id' | 'updated_at'>
        Update: Partial<Omit<NodePosition, 'id' | 'updated_at'>>
      }
    }
  }
}
