export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      _migration_id_map: {
        Row: {
          airtable_id: string
          created_at: string
          id: string
          supabase_uuid: string
          table_name: string
          user_id: string
        }
        Insert: {
          airtable_id: string
          created_at?: string
          id?: string
          supabase_uuid: string
          table_name: string
          user_id: string
        }
        Update: {
          airtable_id?: string
          created_at?: string
          id?: string
          supabase_uuid?: string
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["campaign_contact_status"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["campaign_contact_status"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["campaign_contact_status"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["campaign_status"]
          type: Database["public"]["Enums"]["campaign_type"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["campaign_status"]
          type: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          type?: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          pod_id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          pod_id: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          pod_id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          custom_fields: Json | null
          domain: string | null
          id: string
          industry: string | null
          location: string | null
          name: string
          notes: string | null
          stage: string | null
          ticker: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          custom_fields?: Json | null
          domain?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          name: string
          notes?: string | null
          stage?: string | null
          ticker?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          custom_fields?: Json | null
          domain?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          stage?: string | null
          ticker?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      contact_categories: {
        Row: {
          category_id: string
          contact_id: string
          created_at: string
          id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          category_id: string
          contact_id: string
          created_at?: string
          id?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          category_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_categories_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_pods: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          is_primary: boolean
          pod_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          pod_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          pod_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_pods_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_pods_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_pods_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          birthday: string | null
          cadence_override: Database["public"]["Enums"]["cadence"] | null
          communication_preferences: string | null
          company: string | null
          company_id: string | null
          contact_frequency:
            | Database["public"]["Enums"]["contact_frequency"]
            | null
          country: string | null
          created_at: string
          custom_fields: Json | null
          domain: string | null
          email: string | null
          email_2: string | null
          email_3: string | null
          first_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          global_region: Database["public"]["Enums"]["global_region"] | null
          id: string
          industry: string | null
          intel_notes: string | null
          interests: string | null
          introduced_by: string | null
          kv_fund_investor: string[] | null
          last_contacted_at: string | null
          last_name: string | null
          linkedin: string | null
          location: string | null
          milestones: string | null
          name: string
          needs_review: boolean
          next_action: string | null
          next_follow_up_date: string | null
          notes: string | null
          past_clients: string | null
          phone: string | null
          recommended_by: string | null
          relationship_context: string | null
          relationship_owner: string | null
          role: string | null
          specialization: string | null
          spv_investor: string[] | null
          stage: string | null
          status: Database["public"]["Enums"]["relationship_status"]
          ticker: string | null
          type: Database["public"]["Enums"]["relationship_type"]
          updated_at: string
          user_id: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          birthday?: string | null
          cadence_override?: Database["public"]["Enums"]["cadence"] | null
          communication_preferences?: string | null
          company?: string | null
          company_id?: string | null
          contact_frequency?:
            | Database["public"]["Enums"]["contact_frequency"]
            | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          domain?: string | null
          email?: string | null
          email_2?: string | null
          email_3?: string | null
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          global_region?: Database["public"]["Enums"]["global_region"] | null
          id?: string
          industry?: string | null
          intel_notes?: string | null
          interests?: string | null
          introduced_by?: string | null
          kv_fund_investor?: string[] | null
          last_contacted_at?: string | null
          last_name?: string | null
          linkedin?: string | null
          location?: string | null
          milestones?: string | null
          name: string
          needs_review?: boolean
          next_action?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          past_clients?: string | null
          phone?: string | null
          recommended_by?: string | null
          relationship_context?: string | null
          relationship_owner?: string | null
          role?: string | null
          specialization?: string | null
          spv_investor?: string[] | null
          stage?: string | null
          status?: Database["public"]["Enums"]["relationship_status"]
          ticker?: string | null
          type?: Database["public"]["Enums"]["relationship_type"]
          updated_at?: string
          user_id: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          birthday?: string | null
          cadence_override?: Database["public"]["Enums"]["cadence"] | null
          communication_preferences?: string | null
          company?: string | null
          company_id?: string | null
          contact_frequency?:
            | Database["public"]["Enums"]["contact_frequency"]
            | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          domain?: string | null
          email?: string | null
          email_2?: string | null
          email_3?: string | null
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          global_region?: Database["public"]["Enums"]["global_region"] | null
          id?: string
          industry?: string | null
          intel_notes?: string | null
          interests?: string | null
          introduced_by?: string | null
          kv_fund_investor?: string[] | null
          last_contacted_at?: string | null
          last_name?: string | null
          linkedin?: string | null
          location?: string | null
          milestones?: string | null
          name?: string
          needs_review?: boolean
          next_action?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          past_clients?: string | null
          phone?: string | null
          recommended_by?: string | null
          relationship_context?: string | null
          relationship_owner?: string | null
          role?: string | null
          specialization?: string | null
          spv_investor?: string[] | null
          stage?: string | null
          status?: Database["public"]["Enums"]["relationship_status"]
          ticker?: string | null
          type?: Database["public"]["Enums"]["relationship_type"]
          updated_at?: string
          user_id?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      field_config: {
        Row: {
          airtable_field_id: string | null
          created_at: string
          display_order: number
          field_type: string
          id: string
          name: string
          required: boolean
          scope_pod_id: string | null
          scope_type: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          airtable_field_id?: string | null
          created_at?: string
          display_order?: number
          field_type: string
          id?: string
          name: string
          required?: boolean
          scope_pod_id?: string | null
          scope_type: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          airtable_field_id?: string | null
          created_at?: string
          display_order?: number
          field_type?: string
          id?: string
          name?: string
          required?: boolean
          scope_pod_id?: string | null
          scope_type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_config_scope_pod_id_fkey"
            columns: ["scope_pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_sync_state: {
        Row: {
          created_at: string
          id: string
          last_history_id: string | null
          last_synced_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_history_id?: string | null
          last_synced_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_history_id?: string | null
          last_synced_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          actor: string | null
          contact_id: string
          created_at: string
          date: string
          email_link: string | null
          event_detail: string | null
          granola_link: string | null
          id: string
          notes: string | null
          source: Database["public"]["Enums"]["interaction_source"] | null
          summary: string | null
          type: Database["public"]["Enums"]["interaction_type"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          actor?: string | null
          contact_id: string
          created_at?: string
          date: string
          email_link?: string | null
          event_detail?: string | null
          granola_link?: string | null
          id?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["interaction_source"] | null
          summary?: string | null
          type: Database["public"]["Enums"]["interaction_type"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          actor?: string | null
          contact_id?: string
          created_at?: string
          date?: string
          email_link?: string | null
          event_detail?: string | null
          granola_link?: string | null
          id?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["interaction_source"] | null
          summary?: string | null
          type?: Database["public"]["Enums"]["interaction_type"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          priority: Database["public"]["Enums"]["opportunity_priority"] | null
          stage_id: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["opportunity_priority"] | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["opportunity_priority"] | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          opportunity_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          opportunity_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          opportunity_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_contacts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          order: number
          pipeline_id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          order: number
          pipeline_id: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          order?: number
          pipeline_id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["pipeline_status"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["pipeline_status"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["pipeline_status"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pods: {
        Row: {
          cadence: Database["public"]["Enums"]["cadence"] | null
          capacity: number | null
          color: string | null
          created_at: string
          description: string | null
          enrichment_opt_in: boolean
          id: string
          is_priority: boolean
          name: string
          owner: Database["public"]["Enums"]["owner_type"] | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          cadence?: Database["public"]["Enums"]["cadence"] | null
          capacity?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          enrichment_opt_in?: boolean
          id?: string
          is_priority?: boolean
          name: string
          owner?: Database["public"]["Enums"]["owner_type"] | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          cadence?: Database["public"]["Enums"]["cadence"] | null
          capacity?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          enrichment_opt_in?: boolean
          id?: string
          is_priority?: boolean
          name?: string
          owner?: Database["public"]["Enums"]["owner_type"] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pods_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          project_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          project_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_opportunities: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string
          project_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id: string
          project_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string
          project_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_opportunities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_opportunities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          notes: string | null
          owner: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          owner?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          created_at: string
          excluded_contact_ids: string[]
          expires_at: string
          id: string
          pin_hash: string | null
          pod_id: string
          revoked_at: string | null
          token: string
          updated_at: string
          user_id: string
          visible_columns: string[]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          excluded_contact_ids?: string[]
          expires_at: string
          id?: string
          pin_hash?: string | null
          pod_id: string
          revoked_at?: string | null
          token: string
          updated_at?: string
          user_id: string
          visible_columns?: string[]
          workspace_id: string
        }
        Update: {
          created_at?: string
          excluded_contact_ids?: string[]
          expires_at?: string
          id?: string
          pin_hash?: string | null
          pod_id?: string
          revoked_at?: string | null
          token?: string
          updated_at?: string
          user_id?: string
          visible_columns?: string[]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      cadence: "weekly" | "biweekly" | "monthly" | "quarterly"
      campaign_contact_status: "pending" | "reached" | "responded" | "confirmed"
      campaign_status: "active" | "completed"
      campaign_type: "event" | "investment" | "outreach" | "other"
      contact_frequency:
        | "Weekly"
        | "Monthly"
        | "Quarterly"
        | "Annual"
        | "As Needed"
      gender_type: "Male" | "Female" | "Non-binary" | "Other"
      global_region: "AMER" | "APAC" | "ME" | "LATAM" | "EU"
      interaction_source: "Gmail" | "Granola" | "Manual"
      interaction_type:
        | "call"
        | "email"
        | "text"
        | "meeting"
        | "intro"
        | "note"
        | "pod_change"
        | "field_update"
        | "categorization"
        | "pipeline_event"
        | "project_event"
        | "merge_event"
      opportunity_priority: "high" | "medium" | "low"
      opportunity_status: "open" | "won" | "lost" | "archived"
      owner_type: "moj_mahdara" | "kinship_ventures"
      pipeline_status: "active" | "hidden"
      relationship_status: "Active" | "Pending" | "Archived"
      relationship_type: "Contact" | "Company"
      workspace_role: "owner" | "admin" | "member" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      cadence: ["weekly", "biweekly", "monthly", "quarterly"],
      campaign_contact_status: ["pending", "reached", "responded", "confirmed"],
      campaign_status: ["active", "completed"],
      campaign_type: ["event", "investment", "outreach", "other"],
      contact_frequency: [
        "Weekly",
        "Monthly",
        "Quarterly",
        "Annual",
        "As Needed",
      ],
      gender_type: ["Male", "Female", "Non-binary", "Other"],
      global_region: ["AMER", "APAC", "ME", "LATAM", "EU"],
      interaction_source: ["Gmail", "Granola", "Manual"],
      interaction_type: [
        "call",
        "email",
        "text",
        "meeting",
        "intro",
        "note",
        "pod_change",
        "field_update",
        "categorization",
        "pipeline_event",
        "project_event",
        "merge_event",
      ],
      opportunity_priority: ["high", "medium", "low"],
      opportunity_status: ["open", "won", "lost", "archived"],
      owner_type: ["moj_mahdara", "kinship_ventures"],
      pipeline_status: ["active", "hidden"],
      relationship_status: ["Active", "Pending", "Archived"],
      relationship_type: ["Contact", "Company"],
      workspace_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
