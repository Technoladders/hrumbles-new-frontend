export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: number;
          name: string;
          website: string | null;
          logo_url: string | null;
          status: string | null;
          domain: string | null;
          about: string | null;
          start_date: string | null;
          employee_count: number | null;
          address: string | null;
          linkedin: string | null;
          industry: string | null;
          stage: string | null;
          location: string | null;
          account_owner: string | null;
          created_at: string;
          revenue: string | null;
          cashflow: number | null;
          founded_as: string | null;
          employee_count_date: string | null;
          competitors: string[] | null;
          products: string[] | null;
          services: string[] | null;
          key_people: { name: string; title: string }[] | null;
          updated_at: string;
        };
        Insert: {
          id?: never;
          name: string;
          website?: string | null;
          logo_url?: string | null;
          status?: string | null;
          domain?: string | null;
          about?: string | null;
          start_date?: string | null;
          employee_count?: number | null;
          address?: string | null;
          linkedin?: string | null;
          industry?: string | null;
          stage?: string | null;
          location?: string | null;
          account_owner?: string | null;
          created_at?: string;
          revenue?: string | null;
          cashflow?: number | null;
          founded_as?: string | null;
          employee_count_date?: string | null;
          competitors?: string[] | null;
          products?: string[] | null;
          services?: string[] | null;
          key_people?: { name: string; title: string }[] | null;
          updated_at?: string;
        };
        Update: {
          id?: never;
          name?: string;
          website?: string | null;
          logo_url?: string | null;
          status?: string | null;
          domain?: string | null;
          about?: string | null;
          start_date?: string | null;
          employee_count?: number | null;
          address?: string | null;
          linkedin?: string | null;
          industry?: string | null;
          stage?: string | null;
          location?: string | null;
          account_owner?: string | null;
          created_at?: string;
          revenue?: string | null;
          cashflow?: number | null;
          founded_as?: string | null;
          employee_count_date?: string | null;
          competitors?: string[] | null;
          products?: string[] | null;
          services?: string[] | null;
          key_people?: { name: string; title: string }[] | null;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}