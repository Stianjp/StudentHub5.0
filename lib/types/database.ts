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
          registration_form_url: string | null;
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
          registration_form_url?: string | null;
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
          registration_form_url?: string | null;
          starts_at?: string;
          ends_at?: string;
          is_active?: boolean;
          ticket_limit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_registration_campaigns: {
        Row: {
          id: string;
          event_id: string;
          slug: string;
          public_title: string;
          public_subtitle: string | null;
          public_description: string | null;
          floorplan_image_path: string | null;
          email_group_prefix: string | null;
          is_published: boolean;
          opens_at: string | null;
          closes_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          slug: string;
          public_title: string;
          public_subtitle?: string | null;
          public_description?: string | null;
          floorplan_image_path?: string | null;
          email_group_prefix?: string | null;
          is_published?: boolean;
          opens_at?: string | null;
          closes_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          slug?: string;
          public_title?: string;
          public_subtitle?: string | null;
          public_description?: string | null;
          floorplan_image_path?: string | null;
          email_group_prefix?: string | null;
          is_published?: boolean;
          opens_at?: string | null;
          closes_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_registration_packages: {
        Row: {
          id: string;
          campaign_id: string;
          package_key: string;
          public_name: string;
          description: string | null;
          mapped_package: "standard" | "silver" | "gold" | "platinum" | null;
          internal_capacity: number | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          package_key: string;
          public_name: string;
          description?: string | null;
          mapped_package?: "standard" | "silver" | "gold" | "platinum" | null;
          internal_capacity?: number | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          package_key?: string;
          public_name?: string;
          description?: string | null;
          mapped_package?: "standard" | "silver" | "gold" | "platinum" | null;
          internal_capacity?: number | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_registration_stands: {
        Row: {
          id: string;
          campaign_id: string;
          stand_code: string;
          display_label: string | null;
          package_tier: "standard" | "silver" | "gold" | "platinum";
          x: number;
          y: number;
          width: number;
          height: number;
          sort_order: number;
          status: "available" | "disabled" | "assigned";
          assigned_application_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          stand_code: string;
          display_label?: string | null;
          package_tier: "standard" | "silver" | "gold" | "platinum";
          x: number;
          y: number;
          width: number;
          height: number;
          sort_order?: number;
          status?: "available" | "disabled" | "assigned";
          assigned_application_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          stand_code?: string;
          display_label?: string | null;
          package_tier?: "standard" | "silver" | "gold" | "platinum";
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          sort_order?: number;
          status?: "available" | "disabled" | "assigned";
          assigned_application_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_registration_applications: {
        Row: {
          id: string;
          campaign_id: string;
          event_id: string;
          company_id: string | null;
          event_company_id: string | null;
          requested_package_id: string | null;
          approved_package_id: string | null;
          requested_stand_id: string | null;
          approved_stand_id: string | null;
          status: "pending" | "approved" | "rejected";
          contact_first_name: string;
          contact_last_name: string;
          contact_email: string;
          contact_phone: string;
          contact_job_title: string | null;
          company_name: string;
          org_number: string;
          country: string;
          address: string;
          city: string;
          postal_code: string;
          invoice_delivery_method: "ehf" | "email";
          invoice_email: string | null;
          invoice_reference: string | null;
          candidate_level: "bachelor" | "master" | "both";
          candidate_fields: string[];
          candidate_fields_other: string | null;
          stand_needs: string[];
          stand_needs_other: string | null;
          notes: string | null;
          logo_path: string | null;
          approved_at: string | null;
          approved_by: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          event_id: string;
          company_id?: string | null;
          event_company_id?: string | null;
          requested_package_id?: string | null;
          approved_package_id?: string | null;
          requested_stand_id?: string | null;
          approved_stand_id?: string | null;
          status?: "pending" | "approved" | "rejected";
          contact_first_name: string;
          contact_last_name: string;
          contact_email: string;
          contact_phone: string;
          contact_job_title?: string | null;
          company_name: string;
          org_number: string;
          country: string;
          address: string;
          city: string;
          postal_code: string;
          invoice_delivery_method: "ehf" | "email";
          invoice_email?: string | null;
          invoice_reference?: string | null;
          candidate_level: "bachelor" | "master" | "both";
          candidate_fields?: string[];
          candidate_fields_other?: string | null;
          stand_needs?: string[];
          stand_needs_other?: string | null;
          notes?: string | null;
          logo_path?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          event_id?: string;
          company_id?: string | null;
          event_company_id?: string | null;
          requested_package_id?: string | null;
          approved_package_id?: string | null;
          requested_stand_id?: string | null;
          approved_stand_id?: string | null;
          status?: "pending" | "approved" | "rejected";
          contact_first_name?: string;
          contact_last_name?: string;
          contact_email?: string;
          contact_phone?: string;
          contact_job_title?: string | null;
          company_name?: string;
          org_number?: string;
          country?: string;
          address?: string;
          city?: string;
          postal_code?: string;
          invoice_delivery_method?: "ehf" | "email";
          invoice_email?: string | null;
          invoice_reference?: string | null;
          candidate_level?: "bachelor" | "master" | "both";
          candidate_fields?: string[];
          candidate_fields_other?: string | null;
          stand_needs?: string[];
          stand_needs_other?: string | null;
          notes?: string | null;
          logo_path?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_registration_portal_emails: {
        Row: {
          id: string;
          application_id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      company_portal_invites: {
        Row: {
          id: string;
          company_id: string;
          application_id: string | null;
          email: string;
          role: string;
          status: "pending" | "invited" | "accepted" | "revoked";
          invited_at: string | null;
          accepted_at: string | null;
          user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          application_id?: string | null;
          email: string;
          role?: string;
          status?: "pending" | "invited" | "accepted" | "revoked";
          invited_at?: string | null;
          accepted_at?: string | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          application_id?: string | null;
          email?: string;
          role?: string;
          status?: "pending" | "invited" | "accepted" | "revoked";
          invited_at?: string | null;
          accepted_at?: string | null;
          user_id?: string | null;
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
          stand_code: string | null;
          goals: string[];
          kpis: string[];
          category_tags: string[];
          package: "standard" | "silver" | "gold" | "platinum";
          can_view_roi: boolean;
          can_view_leads: boolean;
          extra_attendee_tickets: number;
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
          stand_code?: string | null;
          goals?: string[];
          kpis?: string[];
          category_tags?: string[];
          package?: "standard" | "silver" | "gold" | "platinum";
          can_view_roi?: boolean;
          can_view_leads?: boolean;
          extra_attendee_tickets?: number;
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
          stand_code?: string | null;
          goals?: string[];
          kpis?: string[];
          category_tags?: string[];
          package?: "standard" | "silver" | "gold" | "platinum";
          can_view_roi?: boolean;
          can_view_leads?: boolean;
          extra_attendee_tickets?: number;
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
          batch_id: string | null;
          template_id: string | null;
        };
        Insert: {
          id?: string;
          to_email: string;
          type: string;
          subject?: string | null;
          payload?: Json;
          sent_at?: string;
          created_at?: string;
          batch_id?: string | null;
          template_id?: string | null;
        };
        Update: {
          id?: string;
          to_email?: string;
          type?: string;
          subject?: string | null;
          payload?: Json;
          sent_at?: string;
          created_at?: string;
          batch_id?: string | null;
          template_id?: string | null;
        };
        Relationships: [];
      };
      email_contact_companies: {
        Row: {
          id: string;
          linked_company_id: string | null;
          display_name: string;
          primary_domain: string;
          primary_email: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          linked_company_id?: string | null;
          display_name: string;
          primary_domain: string;
          primary_email?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          linked_company_id?: string | null;
          display_name?: string;
          primary_domain?: string;
          primary_email?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_contact_cases: {
        Row: {
          id: string;
          contact_company_id: string;
          event_id: string | null;
          case_number: string;
          title: string;
          status: "unsorted" | "open" | "closed" | "archived";
          contact_name: string | null;
          contact_email: string | null;
          latest_message_at: string | null;
          merged_into_case_id: string | null;
          archived_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contact_company_id: string;
          event_id?: string | null;
          case_number: string;
          title: string;
          status?: "unsorted" | "open" | "closed" | "archived";
          contact_name?: string | null;
          contact_email?: string | null;
          latest_message_at?: string | null;
          merged_into_case_id?: string | null;
          archived_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contact_company_id?: string;
          event_id?: string | null;
          case_number?: string;
          title?: string;
          status?: "unsorted" | "open" | "closed" | "archived";
          contact_name?: string | null;
          contact_email?: string | null;
          latest_message_at?: string | null;
          merged_into_case_id?: string | null;
          archived_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_contact_case_messages: {
        Row: {
          id: string;
          case_id: string;
          direction: "inbound" | "outbound" | "internal_note";
          source: string;
          gmail_message_id: string | null;
          gmail_thread_id: string | null;
          internet_message_id: string | null;
          in_reply_to_message_id: string | null;
          from_email: string;
          from_name: string | null;
          to_emails: string[];
          cc_emails: string[];
          subject: string;
          body_text: string | null;
          body_html: string | null;
          sent_at: string | null;
          received_at: string | null;
          raw_headers: Json;
          moved_from_case_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          direction: "inbound" | "outbound" | "internal_note";
          source?: string;
          gmail_message_id?: string | null;
          gmail_thread_id?: string | null;
          internet_message_id?: string | null;
          in_reply_to_message_id?: string | null;
          from_email?: string;
          from_name?: string | null;
          to_emails?: string[];
          cc_emails?: string[];
          subject?: string;
          body_text?: string | null;
          body_html?: string | null;
          sent_at?: string | null;
          received_at?: string | null;
          raw_headers?: Json;
          moved_from_case_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          direction?: "inbound" | "outbound" | "internal_note";
          source?: string;
          gmail_message_id?: string | null;
          gmail_thread_id?: string | null;
          internet_message_id?: string | null;
          in_reply_to_message_id?: string | null;
          from_email?: string;
          from_name?: string | null;
          to_emails?: string[];
          cc_emails?: string[];
          subject?: string;
          body_text?: string | null;
          body_html?: string | null;
          sent_at?: string | null;
          received_at?: string | null;
          raw_headers?: Json;
          moved_from_case_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_contact_case_checklist_items: {
        Row: {
          id: string;
          case_id: string;
          item_key: "logo" | "tables_chairs" | "reply" | "contract" | "payment";
          label: string;
          is_completed: boolean;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          item_key: "logo" | "tables_chairs" | "reply" | "contract" | "payment";
          label: string;
          is_completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          item_key?: "logo" | "tables_chairs" | "reply" | "contract" | "payment";
          label?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_contact_mailbox_sync_state: {
        Row: {
          mailbox_email: string;
          last_synced_at: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          mailbox_email: string;
          last_synced_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          mailbox_email?: string;
          last_synced_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      crm_pipeline_entries: {
        Row: {
          id: string;
          lead_id: string;
          company: string;
          contact_name: string;
          contact_email: string;
          subject: string;
          thread_id: string;
          source_message_id: string;
          sent_at: string | null;
          snooze_until: string | null;
          sequence_step: string;
          lead_status: string;
          stop_reason: string;
          company_status: "Kontaktet" | "Venter svar" | "Dialog" | "Tapt" | "Påmeldt" | "Venter kontrakt" | "Venter faktura" | "Betalt";
          event_name: string;
          temperature: string;
          pipeline_value: number;
          company_channel_name: string;
          company_channel_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          company: string;
          contact_name?: string;
          contact_email?: string;
          subject?: string;
          thread_id?: string;
          source_message_id?: string;
          sent_at?: string | null;
          snooze_until?: string | null;
          sequence_step?: string;
          lead_status?: string;
          stop_reason?: string;
          company_status?: "Kontaktet" | "Venter svar" | "Dialog" | "Tapt" | "Påmeldt" | "Venter kontrakt" | "Venter faktura" | "Betalt";
          event_name?: string;
          temperature?: string;
          pipeline_value?: number;
          company_channel_name?: string;
          company_channel_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          company?: string;
          contact_name?: string;
          contact_email?: string;
          subject?: string;
          thread_id?: string;
          source_message_id?: string;
          sent_at?: string | null;
          snooze_until?: string | null;
          sequence_step?: string;
          lead_status?: string;
          stop_reason?: string;
          company_status?: "Kontaktet" | "Venter svar" | "Dialog" | "Tapt" | "Påmeldt" | "Venter kontrakt" | "Venter faktura" | "Betalt";
          event_name?: string;
          temperature?: string;
          pipeline_value?: number;
          company_channel_name?: string;
          company_channel_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          member_type: "company" | "student";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          member_type: "company" | "student";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          member_type?: "company" | "student";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_group_members: {
        Row: {
          id: string;
          group_id: string;
          company_id: string | null;
          student_id: string | null;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          company_id?: string | null;
          student_id?: string | null;
          email: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          company_id?: string | null;
          student_id?: string | null;
          email?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      email_templates: {
        Row: {
          id: string;
          name: string;
          subject: string;
          html_body: string;
          variables: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject: string;
          html_body: string;
          variables?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subject?: string;
          html_body?: string;
          variables?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
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
      next_email_contact_case_number: {
        Args: Record<string, never>;
        Returns: string;
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
      crm_pipeline_stage: "Kontaktet" | "Venter svar" | "Dialog" | "Tapt" | "Påmeldt" | "Venter kontrakt" | "Venter faktura" | "Betalt";
      email_contact_case_status: "unsorted" | "open" | "closed" | "archived";
      email_contact_message_direction: "inbound" | "outbound" | "internal_note";
      email_contact_checklist_key: "logo" | "tables_chairs" | "reply" | "contract" | "payment";
      email_group_member_type: "company" | "student";
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
