export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type LeadStatus = "new" | "follow_up" | "closed" | "rejected";
export type LeadSource = "Website" | "WhatsApp" | "Facebook" | "Instagram" | "Google" | "Referral";
export type PlanStatus = "trial" | "active" | "expired" | "cancelled";
export type DomainStatus = "not_connected" | "pending" | "connected";
export type AgentEventType = "website_visit" | "lead_submission" | "whatsapp_click";

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          agent_name: string;
          phone: string;
          whatsapp_number: string;
          email: string;
          city: string;
          district: string;
          state: string;
          pincode: string;
          landmark: string | null;
          logo_url: string | null;
          slug: string;
          description: string | null;
          services_offered: string[];
          primary_color: string;
          hero_title: string | null;
          hero_subtitle: string | null;
          banner_image_url: string | null;
          trial_started_at: string;
          trial_ends_at: string;
          plan_status: PlanStatus;
          custom_domain: string | null;
          domain_status: DomainStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          agent_name: string;
          phone: string;
          whatsapp_number: string;
          email: string;
          city: string;
          district: string;
          state: string;
          pincode: string;
          landmark?: string | null;
          logo_url?: string | null;
          slug: string;
          description?: string | null;
          services_offered?: string[];
          primary_color?: string;
          hero_title?: string | null;
          hero_subtitle?: string | null;
          banner_image_url?: string | null;
          trial_started_at?: string;
          trial_ends_at?: string;
          plan_status?: PlanStatus;
          custom_domain?: string | null;
          domain_status?: DomainStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_name?: string;
          agent_name?: string;
          phone?: string;
          whatsapp_number?: string;
          email?: string;
          city?: string;
          district?: string;
          state?: string;
          pincode?: string;
          landmark?: string | null;
          logo_url?: string | null;
          slug?: string;
          description?: string | null;
          services_offered?: string[];
          primary_color?: string;
          hero_title?: string | null;
          hero_subtitle?: string | null;
          banner_image_url?: string | null;
          trial_started_at?: string;
          trial_ends_at?: string;
          plan_status?: PlanStatus;
          custom_domain?: string | null;
          domain_status?: DomainStatus;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      leads: {
        Row: {
          id: string;
          agent_id: string;
          name: string;
          phone: string;
          email: string | null;
          loan_type: string;
          required_amount: number;
          monthly_income: number | null;
          city: string;
          district: string | null;
          state: string | null;
          pincode: string | null;
          landmark: string | null;
          source: LeadSource;
          message: string | null;
          status: LeadStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          name: string;
          phone: string;
          email?: string | null;
          loan_type: string;
          required_amount: number;
          monthly_income?: number | null;
          city: string;
          district?: string | null;
          state?: string | null;
          pincode?: string | null;
          landmark?: string | null;
          source?: LeadSource;
          message?: string | null;
          status?: LeadStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          phone?: string;
          email?: string | null;
          loan_type?: string;
          required_amount?: number;
          monthly_income?: number | null;
          city?: string;
          district?: string | null;
          state?: string | null;
          pincode?: string | null;
          landmark?: string | null;
          source?: LeadSource;
          message?: string | null;
          status?: LeadStatus;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          }
        ];
      };
      lead_notes: {
        Row: {
          id: string;
          lead_id: string;
          agent_id: string;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          agent_id: string;
          note: string;
          created_at?: string;
        };
        Update: {
          note?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_notes_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };
      agent_events: {
        Row: {
          id: string;
          agent_id: string;
          lead_id: string | null;
          event_type: AgentEventType;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          lead_id?: string | null;
          event_type: AgentEventType;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          lead_id?: string | null;
          event_type?: AgentEventType;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "agent_events_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_events_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
