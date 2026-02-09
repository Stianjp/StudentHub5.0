export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "student" | "company" | "admin";
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: "student" | "company" | "admin";
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: "student" | "company" | "admin";
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          org_number: string | null;
          industry: string | null;
          size: string | null;
          location: string | null;
          website: string | null;
          recruitment_roles: string[];
          recruitment_fields: string[];
          recruitment_levels: string[];
          recruitment_years_bachelor: number[];
          recruitment_years_master: number[];
          recruitment_job_types: string[];
          recruitment_timing: string[];
          branding_values: string[];
          branding_evp: string | null;
          branding_message: string | null;
          work_style: string | null;
          social_profile: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          org_number?: string | null;
          industry?: string | null;
          size?: string | null;
          location?: string | null;
          website?: string | null;
          recruitment_roles?: string[];
          recruitment_fields?: string[];
          recruitment_levels?: string[];
          recruitment_years_bachelor?: number[];
          recruitment_years_master?: number[];
          recruitment_job_types?: string[];
          recruitment_timing?: string[];
          branding_values?: string[];
          branding_evp?: string | null;
          branding_message?: string | null;
          work_style?: string | null;
          social_profile?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          org_number?: string | null;
          industry?: string | null;
          size?: string | null;
          location?: string | null;
          website?: string | null;
          recruitment_roles?: string[];
          recruitment_fields?: string[];
          recruitment_levels?: string[];
          recruitment_years_bachelor?: number[];
          recruitment_years_master?: number[];
          recruitment_job_types?: string[];
          recruitment_timing?: string[];
          branding_values?: string[];
          branding_evp?: string | null;
          branding_message?: string | null;
          work_style?: string | null;
          social_profile?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_domains: {
        Row: {
          id: string;
          company_id: string;
          domain: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          domain: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          domain?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      company_users: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          role: string;
          approved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          role?: string;
          approved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          user_id?: string;
          role?: string;
          approved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      company_user_requests: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          domain: string;
          company_id: string | null;
          org_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          domain: string;
          company_id?: string | null;
          org_number?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          domain?: string;
          company_id?: string | null;
          org_number?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          user_id: string | null;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          about: string | null;
          study_program: string | null;
          study_level: string | null;
          graduation_year: number | null;
          study_year: number | null;
          job_types: string[];
          interests: string[];
          values: string[];
          preferred_locations: string[];
          willing_to_relocate: boolean;
          liked_company_ids: string[];
          work_style: string | null;
          social_profile: string | null;
          team_size: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          about?: string | null;
          study_program?: string | null;
          study_level?: string | null;
          graduation_year?: number | null;
          study_year?: number | null;
          job_types?: string[];
          interests?: string[];
          values?: string[];
          preferred_locations?: string[];
          willing_to_relocate?: boolean;
          liked_company_ids?: string[];
          work_style?: string | null;
          social_profile?: string | null;
          team_size?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          about?: string | null;
          study_program?: string | null;
          study_level?: string | null;
          graduation_year?: number | null;
          study_year?: number | null;
          job_types?: string[];
          interests?: string[];
          values?: string[];
          preferred_locations?: string[];
          willing_to_relocate?: boolean;
          liked_company_ids?: string[];
          work_style?: string | null;
          social_profile?: string | null;
          team_size?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      student_public_profiles: {
        Row: {
          student_id: string;
          study_program: string | null;
          study_level: string | null;
          graduation_year: number | null;
          study_year: number | null;
          job_types: string[];
          interests: string[];
          values: string[];
          preferred_locations: string[];
          willing_to_relocate: boolean;
          liked_company_ids: string[];
          work_style: string | null;
          social_profile: string | null;
          team_size: string | null;
          updated_at: string;
        };
        Insert: {
          student_id: string;
          study_program?: string | null;
          study_level?: string | null;
          graduation_year?: number | null;
          study_year?: number | null;
          job_types?: string[];
          interests?: string[];
          values?: string[];
          preferred_locations?: string[];
          willing_to_relocate?: boolean;
          liked_company_ids?: string[];
          work_style?: string | null;
          social_profile?: string | null;
          team_size?: string | null;
          updated_at?: string;
        };
        Update: {
          student_id?: string;
          study_program?: string | null;
          study_level?: string | null;
          graduation_year?: number | null;
          study_year?: number | null;
          job_types?: string[];
          interests?: string[];
          values?: string[];
          preferred_locations?: string[];
          willing_to_relocate?: boolean;
          liked_company_ids?: string[];
          work_style?: string | null;
          social_profile?: string | null;
          team_size?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          location: string | null;
          starts_at: string;
          ends_at: string;
          is_active: boolean;
          ticket_limit: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          location?: string | null;
          starts_at: string;
          ends_at: string;
          is_active?: boolean;
          ticket_limit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          location?: string | null;
          starts_at?: string;
          ends_at?: string;
          is_active?: boolean;
          ticket_limit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_companies: {
        Row: {
          id: string;
          event_id: string;
          company_id: string;
          stand_type: string | null;
          goals: string[];
          kpis: string[];
          category_tags: string[];
          package: "standard" | "silver" | "gold" | "platinum";
          access_from: string | null;
          access_until: string | null;
          invited_email: string | null;
          invited_at: string | null;
          registered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          company_id: string;
          stand_type?: string | null;
          goals?: string[];
          kpis?: string[];
          category_tags?: string[];
          package?: "standard" | "silver" | "gold" | "platinum";
          access_from?: string | null;
          access_until?: string | null;
          invited_email?: string | null;
          invited_at?: string | null;
          registered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          company_id?: string;
          stand_type?: string | null;
          goals?: string[];
          kpis?: string[];
          category_tags?: string[];
          package?: "standard" | "silver" | "gold" | "platinum";
          access_from?: string | null;
          access_until?: string | null;
          invited_email?: string | null;
          invited_at?: string | null;
          registered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_tickets: {
        Row: {
          id: string;
          event_id: string;
          student_id: string | null;
          company_id: string | null;
          attendee_name: string | null;
          attendee_email: string | null;
          attendee_phone: string | null;
          ticket_number: string;
          status: string;
          checked_in_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          student_id?: string | null;
          company_id?: string | null;
          attendee_name?: string | null;
          attendee_email?: string | null;
          attendee_phone?: string | null;
          ticket_number: string;
          status?: string;
          checked_in_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          student_id?: string | null;
          company_id?: string | null;
          attendee_name?: string | null;
          attendee_email?: string | null;
          attendee_phone?: string | null;
          ticket_number?: string;
          status?: string;
          checked_in_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stand_visits: {
        Row: {
          id: string;
          event_id: string;
          company_id: string | null;
          student_id: string | null;
          source: "qr" | "kiosk";
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          company_id?: string | null;
          student_id?: string | null;
          source: "qr" | "kiosk";
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          company_id?: string | null;
          student_id?: string | null;
          source?: "qr" | "kiosk";
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      consents: {
        Row: {
          id: string;
          event_id: string | null;
          company_id: string;
          student_id: string;
          consent: boolean;
          scope: string;
          consented_at: string;
          created_at: string;
          updated_at: string | null;
          updated_by: string | null;
          source: "stand" | "student_portal" | "ticket";
          consent_text_version: string | null;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          event_id?: string | null;
          company_id: string;
          student_id: string;
          consent: boolean;
          scope?: string;
          consented_at?: string;
          created_at?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          source?: "stand" | "student_portal" | "ticket";
          consent_text_version?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          event_id?: string | null;
          company_id?: string;
          student_id?: string;
          consent?: boolean;
          scope?: string;
          consented_at?: string;
          created_at?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          source?: "stand" | "student_portal" | "ticket";
          consent_text_version?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          student_id: string;
          company_id: string;
          event_id: string | null;
          interests: string[];
          job_types: string[];
          study_level: string | null;
          study_year: number | null;
          field_of_study: string | null;
          source: "stand" | "student_portal" | "ticket";
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          company_id: string;
          event_id?: string | null;
          interests?: string[];
          job_types?: string[];
          study_level?: string | null;
          study_year?: number | null;
          field_of_study?: string | null;
          source?: "stand" | "student_portal" | "ticket";
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          company_id?: string;
          event_id?: string | null;
          interests?: string[];
          job_types?: string[];
          study_level?: string | null;
          study_year?: number | null;
          field_of_study?: string | null;
          source?: "stand" | "student_portal" | "ticket";
          created_at?: string;
        };
        Relationships: [];
      };
      survey_responses: {
        Row: {
          id: string;
          event_id: string;
          company_id: string | null;
          student_id: string | null;
          answers: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          company_id?: string | null;
          student_id?: string | null;
          answers: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          company_id?: string | null;
          student_id?: string | null;
          answers?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      match_scores: {
        Row: {
          id: string;
          event_id: string;
          company_id: string;
          student_id: string;
          score: number;
          reasons: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          company_id: string;
          student_id: string;
          score: number;
          reasons: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          company_id?: string;
          student_id?: string;
          score?: number;
          reasons?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_logs: {
        Row: {
          id: string;
          to_email: string;
          type: string;
          subject: string | null;
          payload: Json;
          sent_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          to_email: string;
          type: string;
          subject?: string | null;
          payload?: Json;
          sent_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          to_email?: string;
          type?: string;
          subject?: string | null;
          payload?: Json;
          sent_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: { uid: string };
        Returns: boolean;
      };
      has_platinum_access: {
        Args: { uid: string; event_uuid: string; company_uuid: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "student" | "company" | "admin";
      package_tier: "standard" | "silver" | "gold" | "platinum";
      visit_source: "qr" | "kiosk";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TableInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TableUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
