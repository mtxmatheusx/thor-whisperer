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
      business_prospects: {
        Row: {
          address: string | null
          business_name: string
          city: string | null
          client_profile_id: string | null
          confidence: string | null
          created_at: string
          email: string | null
          google_maps_url: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          notes: string | null
          owner_name: string | null
          phone: string | null
          rating: number | null
          review_count: number | null
          segment: string
          source: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          city?: string | null
          client_profile_id?: string | null
          confidence?: string | null
          created_at?: string
          email?: string | null
          google_maps_url?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          notes?: string | null
          owner_name?: string | null
          phone?: string | null
          rating?: number | null
          review_count?: number | null
          segment?: string
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          city?: string | null
          client_profile_id?: string | null
          confidence?: string | null
          created_at?: string
          email?: string | null
          google_maps_url?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          notes?: string | null
          owner_name?: string | null
          phone?: string | null
          rating?: number | null
          review_count?: number | null
          segment?: string
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_prospects_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          active: boolean
          created_at: string
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          segment: string
          service_description: string | null
          target_audience: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          segment?: string
          service_description?: string | null
          target_audience?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          segment?: string
          service_description?: string | null
          target_audience?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      discovery_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_log: string | null
          events_found: number | null
          events_qualified: number | null
          id: string
          platforms: string[]
          search_params: Json
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_log?: string | null
          events_found?: number | null
          events_qualified?: number | null
          id?: string
          platforms?: string[]
          search_params?: Json
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_log?: string | null
          events_found?: number | null
          events_qualified?: number | null
          id?: string
          platforms?: string[]
          search_params?: Json
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      event_contacts: {
        Row: {
          confidence: string | null
          created_at: string
          email: string | null
          event_id: string
          id: string
          instagram: string | null
          linkedin: string | null
          name: string | null
          phone: string | null
          role: string | null
          source: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          instagram?: string | null
          linkedin?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          source?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          confidence?: string | null
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          instagram?: string | null
          linkedin?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          source?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_contacts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_outreach_log: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          event_contact_id: string | null
          event_id: string
          external_message_id: string | null
          id: string
          opened_at: string | null
          outreach_type: string
          replied_at: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_used: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string
          event_contact_id?: string | null
          event_id: string
          external_message_id?: string | null
          id?: string
          opened_at?: string | null
          outreach_type: string
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_used?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          event_contact_id?: string | null
          event_id?: string
          external_message_id?: string | null
          id?: string
          opened_at?: string | null
          outreach_type?: string
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_used?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_outreach_log_event_contact_id_fkey"
            columns: ["event_contact_id"]
            isOneToOne: false
            referencedRelation: "event_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_outreach_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          audience_type: string | null
          category: string | null
          client_profile_id: string | null
          converted_lead_id: string | null
          created_at: string
          description: string | null
          discard_reason: string | null
          discovery_run_id: string | null
          estimated_audience: number | null
          event_date: string | null
          event_end_date: string | null
          fingerprint: string | null
          id: string
          is_online: boolean | null
          location_city: string | null
          location_state: string | null
          location_venue: string | null
          name: string
          pipeline_status: string
          platform: string
          platform_id: string | null
          platform_url: string | null
          qualification_notes: string | null
          qualification_score: number | null
          themes: string[] | null
          ticket_price_range: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audience_type?: string | null
          category?: string | null
          client_profile_id?: string | null
          converted_lead_id?: string | null
          created_at?: string
          description?: string | null
          discard_reason?: string | null
          discovery_run_id?: string | null
          estimated_audience?: number | null
          event_date?: string | null
          event_end_date?: string | null
          fingerprint?: string | null
          id?: string
          is_online?: boolean | null
          location_city?: string | null
          location_state?: string | null
          location_venue?: string | null
          name: string
          pipeline_status?: string
          platform: string
          platform_id?: string | null
          platform_url?: string | null
          qualification_notes?: string | null
          qualification_score?: number | null
          themes?: string[] | null
          ticket_price_range?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audience_type?: string | null
          category?: string | null
          client_profile_id?: string | null
          converted_lead_id?: string | null
          created_at?: string
          description?: string | null
          discard_reason?: string | null
          discovery_run_id?: string | null
          estimated_audience?: number | null
          event_date?: string | null
          event_end_date?: string | null
          fingerprint?: string | null
          id?: string
          is_online?: boolean | null
          location_city?: string | null
          location_state?: string | null
          location_venue?: string | null
          name?: string
          pipeline_status?: string
          platform?: string
          platform_id?: string | null
          platform_url?: string | null
          qualification_notes?: string | null
          qualification_score?: number | null
          themes?: string[] | null
          ticket_price_range?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_discovery_run_id_fkey"
            columns: ["discovery_run_id"]
            isOneToOne: false
            referencedRelation: "discovery_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          content: string | null
          created_at: string
          id: string
          lead_id: string
          metadata: Json | null
          platform: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          lead_id: string
          metadata?: Json | null
          platform?: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
          platform?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          client_profile_id: string | null
          company: string
          company_size: string | null
          created_at: string
          email: string | null
          id: string
          industry: string
          last_contact: string | null
          linkedin: string | null
          location: string | null
          name: string
          next_follow_up: string | null
          notes: string | null
          phone: string | null
          position: string
          score: number
          source: string
          status: string
          tags: string[] | null
          thor_analysis: Json | null
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          client_profile_id?: string | null
          company: string
          company_size?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string
          last_contact?: string | null
          linkedin?: string | null
          location?: string | null
          name: string
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          position?: string
          score?: number
          source?: string
          status?: string
          tags?: string[] | null
          thor_analysis?: Json | null
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          client_profile_id?: string | null
          company?: string
          company_size?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string
          last_contact?: string | null
          linkedin?: string | null
          location?: string | null
          name?: string
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          position?: string
          score?: number
          source?: string
          status?: string
          tags?: string[] | null
          thor_analysis?: Json | null
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
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
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
