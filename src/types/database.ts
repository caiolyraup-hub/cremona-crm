export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string | null
          whatsapp_phone_number_id: string | null
          whatsapp_business_account_id: string | null
          whatsapp_provider: 'meta_cloud' | 'twilio'
          twilio_whatsapp_from: string | null
          twilio_content_sid_new_lead: string | null
          whatsapp_phone: string | null
          whatsapp_token: string | null
          plan: string
          trial_ends_at: string | null
          created_at: string
          onboarding_completed: boolean
          business_name: string | null
          business_type: string | null
          logo_url: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          subscription_status: string | null
          subscription_ends_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_provider?: 'meta_cloud' | 'twilio'
          twilio_whatsapp_from?: string | null
          twilio_content_sid_new_lead?: string | null
          whatsapp_phone?: string | null
          whatsapp_token?: string | null
          plan?: string
          trial_ends_at?: string | null
          created_at?: string
          onboarding_completed?: boolean
          business_name?: string | null
          business_type?: string | null
          logo_url?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          subscription_status?: string | null
          subscription_ends_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_provider?: 'meta_cloud' | 'twilio'
          twilio_whatsapp_from?: string | null
          twilio_content_sid_new_lead?: string | null
          whatsapp_phone?: string | null
          whatsapp_token?: string | null
          plan?: string
          trial_ends_at?: string | null
          created_at?: string
          onboarding_completed?: boolean
          business_name?: string | null
          business_type?: string | null
          logo_url?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          subscription_status?: string | null
          subscription_ends_at?: string | null
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          workspace_id: string
          name: string
          phone: string | null
          email: string | null
          company: string | null
          position: string | null
          notes: string | null
          custom_fields: Json
          tags: string[]
          pipeline_stage_id: string | null
          source: string | null
          external_lead_id: string | null
          whatsapp_opt_in: boolean
          whatsapp_opt_in_at: string | null
          whatsapp_opt_in_source: string | null
          whatsapp_opt_in_text: string | null
          last_lead_submission_at: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          phone?: string | null
          email?: string | null
          company?: string | null
          position?: string | null
          notes?: string | null
          custom_fields?: Json
          tags?: string[]
          pipeline_stage_id?: string | null
          source?: string | null
          external_lead_id?: string | null
          whatsapp_opt_in?: boolean
          whatsapp_opt_in_at?: string | null
          whatsapp_opt_in_source?: string | null
          whatsapp_opt_in_text?: string | null
          last_lead_submission_at?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          phone?: string | null
          email?: string | null
          company?: string | null
          position?: string | null
          notes?: string | null
          custom_fields?: Json
          tags?: string[]
          pipeline_stage_id?: string | null
          source?: string | null
          external_lead_id?: string | null
          whatsapp_opt_in?: boolean
          whatsapp_opt_in_at?: string | null
          whatsapp_opt_in_source?: string | null
          whatsapp_opt_in_text?: string | null
          last_lead_submission_at?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lead_sources: {
        Row: {
          id: string
          workspace_id: string
          name: string
          slug: string
          key_hash: string
          active: boolean
          default_tags: string[]
          default_pipeline_stage_id: string | null
          allowed_origins: string[]
          rate_limit_per_minute: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          slug: string
          key_hash: string
          active?: boolean
          default_tags?: string[]
          default_pipeline_stage_id?: string | null
          allowed_origins?: string[]
          rate_limit_per_minute?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          slug?: string
          key_hash?: string
          active?: boolean
          default_tags?: string[]
          default_pipeline_stage_id?: string | null
          allowed_origins?: string[]
          rate_limit_per_minute?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lead_submissions: {
        Row: {
          id: string
          workspace_id: string
          lead_source_id: string
          contact_id: string | null
          external_lead_id: string | null
          idempotency_key: string | null
          payload_hash: string
          status: 'received' | 'processed' | 'duplicate' | 'rejected' | 'failed'
          name: string | null
          phone: string | null
          email: string | null
          source: string | null
          whatsapp_opt_in: boolean
          whatsapp_opt_in_at: string | null
          whatsapp_opt_in_source: string | null
          whatsapp_opt_in_text: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_term: string | null
          error_message: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          lead_source_id: string
          contact_id?: string | null
          external_lead_id?: string | null
          idempotency_key?: string | null
          payload_hash: string
          status?: 'received' | 'processed' | 'duplicate' | 'rejected' | 'failed'
          name?: string | null
          phone?: string | null
          email?: string | null
          source?: string | null
          whatsapp_opt_in?: boolean
          whatsapp_opt_in_at?: string | null
          whatsapp_opt_in_source?: string | null
          whatsapp_opt_in_text?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_term?: string | null
          error_message?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          lead_source_id?: string
          contact_id?: string | null
          external_lead_id?: string | null
          idempotency_key?: string | null
          payload_hash?: string
          status?: 'received' | 'processed' | 'duplicate' | 'rejected' | 'failed'
          name?: string | null
          phone?: string | null
          email?: string | null
          source?: string | null
          whatsapp_opt_in?: boolean
          whatsapp_opt_in_at?: string | null
          whatsapp_opt_in_source?: string | null
          whatsapp_opt_in_text?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_term?: string | null
          error_message?: string | null
          created_at?: string
          processed_at?: string | null
        }
      }
      lead_rate_limit_events: {
        Row: {
          id: string
          lead_source_id: string
          request_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          lead_source_id: string
          request_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          lead_source_id?: string
          request_hash?: string
          created_at?: string
        }
      }
      pipelines: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          color: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          color?: string
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          color?: string
          position?: number
          created_at?: string
        }
      }
      pipeline_stages: {
        Row: {
          id: string
          workspace_id: string
          pipeline_id: string | null
          name: string
          color: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          pipeline_id?: string | null
          name: string
          color?: string
          position: number
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          pipeline_id?: string | null
          name?: string
          color?: string
          position?: number
          created_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          workspace_id: string
          contact_id: string
          title: string
          value: number | null
          stage_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          contact_id: string
          title: string
          value?: number | null
          stage_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          contact_id?: string
          title?: string
          value?: number | null
          stage_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          workspace_id: string
          contact_id: string | null
          product_name: string
          value: number
          payment_method: string | null
          status: string
          sale_date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          contact_id?: string | null
          product_name: string
          value: number
          payment_method?: string | null
          status?: string
          sale_date?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          contact_id?: string | null
          product_name?: string
          value?: number
          payment_method?: string | null
          status?: string
          sale_date?: string
          notes?: string | null
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          workspace_id: string
          contact_id: string | null
          assigned_to: string | null
          title: string
          description: string | null
          priority: string
          due_date: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          contact_id?: string | null
          assigned_to?: string | null
          title: string
          description?: string | null
          priority?: string
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          contact_id?: string | null
          assigned_to?: string | null
          title?: string
          description?: string | null
          priority?: string
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          workspace_id: string
          contact_id: string | null
          whatsapp_message_id: string | null
          provider: 'meta_cloud' | 'twilio'
          direction: string
          sender_type: 'contact' | 'human' | 'automation' | 'system' | 'unknown'
          automated_by: string | null
          content: string | null
          media_url: string | null
          media_type: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          contact_id?: string | null
          whatsapp_message_id?: string | null
          provider?: 'meta_cloud' | 'twilio'
          direction: string
          sender_type?: 'contact' | 'human' | 'automation' | 'system' | 'unknown'
          automated_by?: string | null
          content?: string | null
          media_url?: string | null
          media_type?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          contact_id?: string | null
          whatsapp_message_id?: string | null
          provider?: 'meta_cloud' | 'twilio'
          direction?: string
          sender_type?: 'contact' | 'human' | 'automation' | 'system' | 'unknown'
          automated_by?: string | null
          content?: string | null
          media_url?: string | null
          media_type?: string | null
          status?: string
          created_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          workspace_id: string
          contact_id: string | null
          user_id: string | null
          type: string
          content: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          contact_id?: string | null
          user_id?: string | null
          type: string
          content?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          contact_id?: string | null
          user_id?: string | null
          type?: string
          content?: string | null
          created_at?: string
        }
      }
      whatsapp_templates: {
        Row: {
          id: string
          workspace_id: string
          name: string
          display_name: string
          language: string
          category: string
          body_text: string
          variables: Array<{ index: number; label: string; default: string }>
          status: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          display_name: string
          language?: string
          category?: string
          body_text: string
          variables?: Array<{ index: number; label: string; default: string }>
          status?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          display_name?: string
          language?: string
          category?: string
          body_text?: string
          variables?: Array<{ index: number; label: string; default: string }>
          status?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      automations: {
        Row: {
          id: string
          workspace_id: string
          name: string
          trigger_type: string
          trigger_config: Record<string, string>
          action_type: 'send_whatsapp_text' | 'send_whatsapp_template' | 'send_whatsapp_media' | 'create_task'
          action_config: Record<string, string>
          active: boolean
          delay_minutes: number
          run_count: number
          last_run_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          trigger_type: string
          trigger_config?: Record<string, string>
          action_type: 'send_whatsapp_text' | 'send_whatsapp_template' | 'send_whatsapp_media' | 'create_task'
          action_config?: Record<string, string>
          active?: boolean
          delay_minutes?: number
          run_count?: number
          last_run_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          trigger_type?: string
          trigger_config?: Record<string, string>
          action_type?: 'send_whatsapp_text' | 'send_whatsapp_template' | 'send_whatsapp_media' | 'create_task'
          action_config?: Record<string, string>
          active?: boolean
          delay_minutes?: number
          run_count?: number
          last_run_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      automation_logs: {
        Row: {
          id: string
          workspace_id: string
          automation_id: string
          contact_id: string | null
          status: string
          error_message: string | null
          executed_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          automation_id: string
          contact_id?: string | null
          status: string
          error_message?: string | null
          executed_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          automation_id?: string
          contact_id?: string | null
          status?: string
          error_message?: string | null
          executed_at?: string
        }
      }
      automation_queue: {
        Row: {
          id: string
          workspace_id: string
          automation_id: string
          contact_id: string
          scheduled_for: string
          status: 'pending' | 'processing' | 'done' | 'failed' | 'cancelled'
          attempts: number
          max_attempts: number
          error_message: string | null
          event_key: string | null
          locked_at: string | null
          locked_by: string | null
          last_attempt_at: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          automation_id: string
          contact_id: string
          scheduled_for: string
          status?: 'pending' | 'processing' | 'done' | 'failed' | 'cancelled'
          attempts?: number
          max_attempts?: number
          error_message?: string | null
          event_key?: string | null
          locked_at?: string | null
          locked_by?: string | null
          last_attempt_at?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          automation_id?: string
          contact_id?: string
          scheduled_for?: string
          status?: 'pending' | 'processing' | 'done' | 'failed' | 'cancelled'
          attempts?: number
          max_attempts?: number
          error_message?: string | null
          event_key?: string | null
          locked_at?: string | null
          locked_by?: string | null
          last_attempt_at?: string | null
          created_at?: string
          processed_at?: string | null
        }
      }
      whatsapp_dispatches: {
        Row: {
          id: string
          workspace_id: string
          automation_queue_id: string | null
          event_key: string
          contact_id: string | null
          provider: 'meta_cloud' | 'twilio'
          operation: string
          status: 'prepared' | 'sending' | 'accepted' | 'failed' | 'delivery_unknown'
          provider_message_id: string | null
          request_fingerprint: string
          attempts: number
          locked_at: string | null
          locked_by: string | null
          last_error: string | null
          created_at: string
          updated_at: string
          accepted_at: string | null
          delivery_unknown_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          automation_queue_id?: string | null
          event_key: string
          contact_id?: string | null
          provider: 'meta_cloud' | 'twilio'
          operation: string
          status?: 'prepared' | 'sending' | 'accepted' | 'failed' | 'delivery_unknown'
          provider_message_id?: string | null
          request_fingerprint: string
          attempts?: number
          locked_at?: string | null
          locked_by?: string | null
          last_error?: string | null
          created_at?: string
          updated_at?: string
          accepted_at?: string | null
          delivery_unknown_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          automation_queue_id?: string | null
          event_key?: string
          contact_id?: string | null
          provider?: 'meta_cloud' | 'twilio'
          operation?: string
          status?: 'prepared' | 'sending' | 'accepted' | 'failed' | 'delivery_unknown'
          provider_message_id?: string | null
          request_fingerprint?: string
          attempts?: number
          locked_at?: string | null
          locked_by?: string | null
          last_error?: string | null
          created_at?: string
          updated_at?: string
          accepted_at?: string | null
          delivery_unknown_at?: string | null
        }
      }
      whatsapp_message_events: {
        Row: {
          id: string
          workspace_id: string
          message_id: string | null
          provider: 'meta_cloud' | 'twilio'
          provider_message_id: string
          status: string
          error_code: string | null
          error_message: string | null
          occurred_at: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          message_id?: string | null
          provider: 'meta_cloud' | 'twilio'
          provider_message_id: string
          status: string
          error_code?: string | null
          error_message?: string | null
          occurred_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          message_id?: string | null
          provider?: 'meta_cloud' | 'twilio'
          provider_message_id?: string
          status?: string
          error_code?: string | null
          error_message?: string | null
          occurred_at?: string
          created_at?: string
        }
      }
      lucca_qualifications: {
        Row: {
          id: string
          workspace_id: string
          contact_id: string
          first_message_id: string | null
          last_processed_message_id: string | null
          status: 'active' | 'qualified' | 'awaiting_human' | 'human_owned' | 'opted_out' | 'paused' | 'failed'
          current_step: number
          first_message_text: string | null
          initial_received_at: string
          reception_sent_at: string | null
          completed_at: string | null
          paused_at: string | null
          pause_reason: string | null
          human_taken_over_at: string | null
          human_taken_over_by: string | null
          resumed_at: string | null
          resumed_by: string | null
          city: string | null
          digital_experience: string | null
          team_size_text: string | null
          team_size_number: number | null
          business_type: string | null
          raw_responses: Array<Record<string, unknown>>
          summary: string | null
          origin: Record<string, unknown>
          origin_evidence: 'twilio_referral' | 'lead_submission' | 'unidentified'
          attribution_submission_id: string | null
          notification_status: 'pending' | 'accepted' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped'
          notification_message_sid: string | null
          notification_error: string | null
          notified_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          openai_model: string | null
          openai_response_id: string | null
          response_sla_ms: number | null
          response_sla_breached: boolean
          version: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['lucca_qualifications']['Row']> & {
          workspace_id: string
          contact_id: string
          initial_received_at: string
        }
        Update: Partial<Database['public']['Tables']['lucca_qualifications']['Row']>
      }
      lucca_jobs: {
        Row: {
          id: string
          workspace_id: string
          contact_id: string
          qualification_id: string
          message_id: string | null
          job_type: 'conversation' | 'notification'
          event_key: string
          status: 'pending' | 'processing' | 'done' | 'failed' | 'cancelled'
          scheduled_for: string
          attempts: number
          max_attempts: number
          locked_at: string | null
          locked_by: string | null
          last_attempt_at: string | null
          last_error: string | null
          output: Record<string, unknown>
          created_at: string
          processed_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['lucca_jobs']['Row']> & {
          workspace_id: string
          contact_id: string
          qualification_id: string
          job_type: 'conversation' | 'notification'
          event_key: string
        }
        Update: Partial<Database['public']['Tables']['lucca_jobs']['Row']>
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
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Insert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type Update<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
