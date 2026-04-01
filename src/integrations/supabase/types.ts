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
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          pod_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          pod_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          pod_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
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
        }
        Insert: {
          category_id: string
          contact_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          user_id?: string
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
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          pod_id: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          pod_id?: string
          user_id?: string
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
        ]
      }
      contacts: {
        Row: {
          birthday: string | null
          cadence_override: Database["public"]["Enums"]["cadence"] | null
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
        }
        Insert: {
          birthday?: string | null
          cadence_override?: Database["public"]["Enums"]["cadence"] | null
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
        }
        Update: {
          birthday?: string | null
          cadence_override?: Database["public"]["Enums"]["cadence"] | null
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
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
        }
        Relationships: [
          {
            foreignKeyName: "interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    },
  },
} as const
