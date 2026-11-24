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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      claims: {
        Row: {
          assessment: string | null
          claim_text: string
          claim_type: string
          confidence_level: string | null
          context: string | null
          created_at: string
          dates: Json
          entities: Json
          evidence_strength: string | null
          explanation: string | null
          id: string
          investigation_id: string
          is_verifiable: boolean
          locations: Json
          original_text: string | null
          position: number
          search_queries: Json
          unresolved: Json
          user_edited: boolean
        }
        Insert: {
          assessment?: string | null
          claim_text: string
          claim_type?: string
          confidence_level?: string | null
          context?: string | null
          created_at?: string
          dates?: Json
          entities?: Json
          evidence_strength?: string | null
          explanation?: string | null
          id?: string
          investigation_id: string
          is_verifiable?: boolean
          locations?: Json
          original_text?: string | null
          position?: number
          search_queries?: Json
          unresolved?: Json
          user_edited?: boolean
        }
        Update: {
          assessment?: string | null
          claim_text?: string
          claim_type?: string
          confidence_level?: string | null
          context?: string | null
          created_at?: string
          dates?: Json
          entities?: Json
          evidence_strength?: string | null
          explanation?: string | null
          id?: string
          investigation_id?: string
          is_verifiable?: boolean
          locations?: Json
          original_text?: string | null
          position?: number
          search_queries?: Json
          unresolved?: Json
          user_edited?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "claims_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          claim_id: string
          created_at: string
          id: string
          investigation_id: string
          is_outdated: boolean
          limitations: string | null
          relationship_type: string
          relevance: string | null
          source_id: string
          summary: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          id?: string
          investigation_id: string
          is_outdated?: boolean
          limitations?: string | null
          relationship_type: string
          relevance?: string | null
          source_id: string
          summary: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          id?: string
          investigation_id?: string
          is_outdated?: boolean
          limitations?: string | null
          relationship_type?: string
          relevance?: string | null
          source_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      investigation_events: {
        Row: {
          created_at: string
          description: string
          event_type: string
          id: string
          investigation_id: string
          metadata: Json
          stage: string
        }
        Insert: {
          created_at?: string
          description: string
          event_type: string
          id?: string
          investigation_id: string
          metadata?: Json
          stage?: string
        }
        Update: {
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          investigation_id?: string
          metadata?: Json
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "investigation_events_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      investigations: {
        Row: {
          confidence_level: string | null
          created_at: string
          error_message: string | null
          extracted_text: string | null
          failed_stage: string | null
          id: string
          input_type: string
          is_saved: boolean
          limitations: string | null
          lock_until: string | null
          original_content: string | null
          overall_assessment: string | null
          research_mode: string
          source_url: string | null
          stage_cursor: number
          status: string
          summary: string | null
          title: string
          updated_at: string
          uploaded_file_path: string | null
          user_id: string
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string
          error_message?: string | null
          extracted_text?: string | null
          failed_stage?: string | null
          id?: string
          input_type: string
          is_saved?: boolean
          limitations?: string | null
          lock_until?: string | null
          original_content?: string | null
          overall_assessment?: string | null
          research_mode?: string
          source_url?: string | null
          stage_cursor?: number
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          uploaded_file_path?: string | null
          user_id?: string
        }
        Update: {
          confidence_level?: string | null
          created_at?: string
          error_message?: string | null
          extracted_text?: string | null
          failed_stage?: string | null
          id?: string
          input_type?: string
          is_saved?: boolean
          limitations?: string | null
          lock_until?: string | null
          original_content?: string | null
          overall_assessment?: string | null
          research_mode?: string
          source_url?: string | null
          stage_cursor?: number
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          uploaded_file_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          onboarded_at: string | null
          preferred_theme: string
          role_focus: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          onboarded_at?: string | null
          preferred_theme?: string
          role_focus?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarded_at?: string | null
          preferred_theme?: string
          role_focus?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          investigation_id: string
          is_public: boolean
          public_token: string | null
          published_at: string | null
          report_content: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          investigation_id: string
          is_public?: boolean
          public_token?: string | null
          published_at?: string | null
          report_content?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          investigation_id?: string
          is_public?: boolean
          public_token?: string | null
          published_at?: string | null
          report_content?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: true
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string
          discovered_for_claim_id: string | null
          excerpt: string | null
          id: string
          investigation_id: string
          publication_date: string | null
          publisher: string | null
          retrieval_status: string
          search_query: string | null
          source_type: string
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          discovered_for_claim_id?: string | null
          excerpt?: string | null
          id?: string
          investigation_id: string
          publication_date?: string | null
          publisher?: string | null
          retrieval_status?: string
          search_query?: string | null
          source_type?: string
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          discovered_for_claim_id?: string | null
          excerpt?: string | null
          id?: string
          investigation_id?: string
          publication_date?: string | null
          publisher?: string | null
          retrieval_status?: string
          search_query?: string | null
          source_type?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_discovered_for_claim_id_fkey"
            columns: ["discovered_for_claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sources_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_report: { Args: { _token: string }; Returns: Json }
      owns_investigation: {
        Args: { _investigation_id: string }
        Returns: boolean
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
