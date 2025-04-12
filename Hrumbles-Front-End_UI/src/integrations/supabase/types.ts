export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      hr_assigned_goals: {
        Row: {
          assigned_at: string
          current_value: number
          employee_id: string
          goal_id: string
          goal_type: string
          id: string
          notes: string | null
          progress: number
          status: string
          target_value: number | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          current_value?: number
          employee_id: string
          goal_id: string
          goal_type?: string
          id?: string
          notes?: string | null
          progress?: number
          status?: string
          target_value?: number | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          current_value?: number
          employee_id?: string
          goal_id?: string
          goal_type?: string
          id?: string
          notes?: string | null
          progress?: number
          status?: string
          target_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_assigned_goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_assigned_goals_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "hr_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_candidate_timeline: {
        Row: {
          candidate_id: string | null
          created_at: string | null
          created_by: string | null
          event_data: Json | null
          event_type: Database["public"]["Enums"]["hr_candidate_event_type"]
          id: string
          new_state: Json | null
          previous_state: Json | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_data?: Json | null
          event_type: Database["public"]["Enums"]["hr_candidate_event_type"]
          id?: string
          new_state?: Json | null
          previous_state?: Json | null
        }
        Update: {
          candidate_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_data?: Json | null
          event_type?: Database["public"]["Enums"]["hr_candidate_event_type"]
          id?: string
          new_state?: Json | null
          previous_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_candidate_timeline_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "hr_job_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_candidates: {
        Row: {
          created_at: string
          email: string
          github_url: string | null
          id: string
          linkedin_url: string | null
          name: string
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hr_client_contacts: {
        Row: {
          client_id: string
          created_at: string | null
          designation: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "hr_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_clients: {
        Row: {
          active_employees: number | null
          address: string | null
          billing_address: Json | null
          city: string | null
          client_name: string
          commission_type: string | null
          commission_value: number | null
          completed_projects: number | null
          country: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          display_name: string
          end_client: string | null
          id: string
          internal_contact: string | null
          ongoing_projects: number | null
          organization_id: string | null
          payment_terms: number | null
          payment_terms_custom: number | null
          postal_code: string | null
          profit: number | null
          revenue: number | null
          service_type: string[] | null
          shipping_address: Json | null
          state: string | null
          status: string | null
          total_projects: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active_employees?: number | null
          address?: string | null
          billing_address?: Json | null
          city?: string | null
          client_name: string
          commission_type?: string | null
          commission_value?: number | null
          completed_projects?: number | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          display_name: string
          end_client?: string | null
          id?: string
          internal_contact?: string | null
          ongoing_projects?: number | null
          organization_id?: string | null
          payment_terms?: number | null
          payment_terms_custom?: number | null
          postal_code?: string | null
          profit?: number | null
          revenue?: number | null
          service_type?: string[] | null
          shipping_address?: Json | null
          state?: string | null
          status?: string | null
          total_projects?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active_employees?: number | null
          address?: string | null
          billing_address?: Json | null
          city?: string | null
          client_name?: string
          commission_type?: string | null
          commission_value?: number | null
          completed_projects?: number | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          display_name?: string
          end_client?: string | null
          id?: string
          internal_contact?: string | null
          ongoing_projects?: number | null
          organization_id?: string | null
          payment_terms?: number | null
          payment_terms_custom?: number | null
          postal_code?: string | null
          profit?: number | null
          revenue?: number | null
          service_type?: string[] | null
          shipping_address?: Json | null
          state?: string | null
          status?: string | null
          total_projects?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_clients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_departments: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_designations: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_designations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employee_addresses: {
        Row: {
          address_line1: string
          city: string
          country: string
          created_at: string | null
          employee_id: string | null
          id: string
          organization_id: string
          state: string
          type: string
          zip_code: string
        }
        Insert: {
          address_line1: string
          city: string
          country: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          organization_id: string
          state: string
          type: string
          zip_code: string
        }
        Update: {
          address_line1?: string
          city?: string
          country?: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          organization_id?: string
          state?: string
          type?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_employee_addresses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employee_addresses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employee_bank_details: {
        Row: {
          account_holder_name: string
          account_number: string
          account_type: string
          bank_name: string
          bank_phone: string | null
          branch_address: string | null
          branch_name: string
          city: string | null
          country: string | null
          created_at: string | null
          document_url: string | null
          employee_id: string | null
          id: string
          ifsc_code: string
          organization_id: string
          state: string | null
          zip_code: string | null
        }
        Insert: {
          account_holder_name: string
          account_number: string
          account_type: string
          bank_name: string
          bank_phone?: string | null
          branch_address?: string | null
          branch_name: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          document_url?: string | null
          employee_id?: string | null
          id?: string
          ifsc_code: string
          organization_id: string
          state?: string | null
          zip_code?: string | null
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          account_type?: string
          bank_name?: string
          bank_phone?: string | null
          branch_address?: string | null
          branch_name?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          document_url?: string | null
          employee_id?: string | null
          id?: string
          ifsc_code?: string
          organization_id?: string
          state?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employee_bank_details_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employee_bank_details_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employee_documents: {
        Row: {
          category: string
          created_at: string | null
          document_type: string
          employee_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          status: string | null
          updated_at: string | null
          upload_date: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          document_type: string
          employee_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          status?: string | null
          updated_at?: string | null
          upload_date?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          document_type?: string
          employee_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          status?: string | null
          updated_at?: string | null
          upload_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employee_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employee_education: {
        Row: {
          created_at: string | null
          document_url: string | null
          employee_id: string | null
          id: string
          institute: string | null
          organization_id: string
          type: string
          year_completed: string | null
        }
        Insert: {
          created_at?: string | null
          document_url?: string | null
          employee_id?: string | null
          id?: string
          institute?: string | null
          organization_id: string
          type: string
          year_completed?: string | null
        }
        Update: {
          created_at?: string | null
          document_url?: string | null
          employee_id?: string | null
          id?: string
          institute?: string | null
          organization_id?: string
          type?: string
          year_completed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employee_education_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employee_education_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employee_emergency_contacts: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          name: string
          organization_id: string
          phone: string
          relationship: string
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          name: string
          organization_id: string
          phone: string
          relationship: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          name?: string
          organization_id?: string
          phone?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_employee_emergency_contacts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employee_emergency_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employee_experiences: {
        Row: {
          company: string
          created_at: string | null
          document_type: string | null
          document_url: string | null
          employee_id: string | null
          employment_type: string | null
          end_date: string | null
          hike_letter_url: string | null
          id: string
          job_title: string
          job_type: string | null
          location: string | null
          no_payslip_reason: string | null
          no_separation_letter_reason: string | null
          offer_letter_url: string | null
          organization_id: string
          payslip_1_url: string | null
          payslip_2_url: string | null
          payslip_3_url: string | null
          payslips: string[] | null
          separation_letter_url: string | null
          start_date: string
          status: string | null
          upload_date: string | null
        }
        Insert: {
          company: string
          created_at?: string | null
          document_type?: string | null
          document_url?: string | null
          employee_id?: string | null
          employment_type?: string | null
          end_date?: string | null
          hike_letter_url?: string | null
          id?: string
          job_title: string
          job_type?: string | null
          location?: string | null
          no_payslip_reason?: string | null
          no_separation_letter_reason?: string | null
          offer_letter_url?: string | null
          organization_id: string
          payslip_1_url?: string | null
          payslip_2_url?: string | null
          payslip_3_url?: string | null
          payslips?: string[] | null
          separation_letter_url?: string | null
          start_date: string
          status?: string | null
          upload_date?: string | null
        }
        Update: {
          company?: string
          created_at?: string | null
          document_type?: string | null
          document_url?: string | null
          employee_id?: string | null
          employment_type?: string | null
          end_date?: string | null
          hike_letter_url?: string | null
          id?: string
          job_title?: string
          job_type?: string | null
          location?: string | null
          no_payslip_reason?: string | null
          no_separation_letter_reason?: string | null
          offer_letter_url?: string | null
          organization_id?: string
          payslip_1_url?: string | null
          payslip_2_url?: string | null
          payslip_3_url?: string | null
          payslips?: string[] | null
          separation_letter_url?: string | null
          start_date?: string
          status?: string | null
          upload_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employee_experiences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employee_experiences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employee_family_details: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          name: string
          occupation: string
          organization_id: string
          phone: string
          relationship: string
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          name: string
          occupation: string
          organization_id: string
          phone: string
          relationship: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          name?: string
          occupation?: string
          organization_id?: string
          phone?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_employee_family_details_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employee_family_details_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employee_work_times: {
        Row: {
          auto_stopped: boolean | null
          created_at: string | null
          date: string
          duration_minutes: number | null
          employee_id: string
          end_time: string | null
          excess_break_minutes: number | null
          expected_coffee_duration_minutes: number | null
          expected_lunch_duration_minutes: number | null
          expected_work_hours: number | null
          id: string
          missed_breaks: string[] | null
          overtime_minutes: number | null
          pause_end_time: string | null
          pause_reason: string | null
          pause_start_time: string | null
          regular_hours_completed: boolean | null
          start_time: string
          status: string
          total_pause_duration_minutes: number | null
        }
        Insert: {
          auto_stopped?: boolean | null
          created_at?: string | null
          date: string
          duration_minutes?: number | null
          employee_id: string
          end_time?: string | null
          excess_break_minutes?: number | null
          expected_coffee_duration_minutes?: number | null
          expected_lunch_duration_minutes?: number | null
          expected_work_hours?: number | null
          id?: string
          missed_breaks?: string[] | null
          overtime_minutes?: number | null
          pause_end_time?: string | null
          pause_reason?: string | null
          pause_start_time?: string | null
          regular_hours_completed?: boolean | null
          start_time: string
          status: string
          total_pause_duration_minutes?: number | null
        }
        Update: {
          auto_stopped?: boolean | null
          created_at?: string | null
          date?: string
          duration_minutes?: number | null
          employee_id?: string
          end_time?: string | null
          excess_break_minutes?: number | null
          expected_coffee_duration_minutes?: number | null
          expected_lunch_duration_minutes?: number | null
          expected_work_hours?: number | null
          id?: string
          missed_breaks?: string[] | null
          overtime_minutes?: number | null
          pause_end_time?: string | null
          pause_reason?: string | null
          pause_start_time?: string | null
          regular_hours_completed?: boolean | null
          start_time?: string
          status?: string
          total_pause_duration_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employee_work_times_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employees: {
        Row: {
          aadhar_number: string | null
          aadhar_url: string | null
          blood_group: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          department_id: string | null
          designation_id: string | null
          email: string
          emergency_contacts: Json[] | null
          employee_id: string | null
          employment_start_date: string | null
          employment_status: string | null
          esic_number: string | null
          esic_url: string | null
          family_details: Json[] | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          marital_status: string | null
          organization_id: string
          pan_number: string | null
          pan_url: string | null
          permanent_address: Json | null
          phone: string | null
          position: string | null
          present_address: Json | null
          profile_picture_url: string | null
          role_id: string | null
          uan_number: string | null
          uan_url: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          aadhar_number?: string | null
          aadhar_url?: string | null
          blood_group?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          designation_id?: string | null
          email: string
          emergency_contacts?: Json[] | null
          employee_id?: string | null
          employment_start_date?: string | null
          employment_status?: string | null
          esic_number?: string | null
          esic_url?: string | null
          family_details?: Json[] | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          marital_status?: string | null
          organization_id: string
          pan_number?: string | null
          pan_url?: string | null
          permanent_address?: Json | null
          phone?: string | null
          position?: string | null
          present_address?: Json | null
          profile_picture_url?: string | null
          role_id?: string | null
          uan_number?: string | null
          uan_url?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          aadhar_number?: string | null
          aadhar_url?: string | null
          blood_group?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          designation_id?: string | null
          email?: string
          emergency_contacts?: Json[] | null
          employee_id?: string | null
          employment_start_date?: string | null
          employment_status?: string | null
          esic_number?: string | null
          esic_url?: string | null
          family_details?: Json[] | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          marital_status?: string | null
          organization_id?: string
          pan_number?: string | null
          pan_url?: string | null
          permanent_address?: Json | null
          phone?: string | null
          position?: string | null
          present_address?: Json | null
          profile_picture_url?: string | null
          role_id?: string | null
          uan_number?: string | null
          uan_url?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "hr_designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "hr_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_goals: {
        Row: {
          created_at: string
          description: string
          end_date: string
          id: string
          metric_type: string
          metric_unit: string
          name: string
          sector: string
          start_date: string
          target_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          end_date: string
          id?: string
          metric_type: string
          metric_unit: string
          name: string
          sector: string
          start_date: string
          target_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          metric_type?: string
          metric_unit?: string
          name?: string
          sector?: string
          start_date?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      hr_job_applications: {
        Row: {
          candidate_id: string | null
          created_at: string | null
          hr_organization_id: string
          id: string
          job_id: string | null
          resume_analysis: Json | null
          resume_score: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string | null
          hr_organization_id: string
          id?: string
          job_id?: string | null
          resume_analysis?: Json | null
          resume_score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string | null
          created_at?: string | null
          hr_organization_id?: string
          id?: string
          job_id?: string | null
          resume_analysis?: Json | null
          resume_score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_job_applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "hr_job_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hr_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_job_candidates: {
        Row: {
          applied_date: string
          applied_from: string | null
          availability: string | null
          candidate_id: string | null
          career_experience: Json | null
          cover_letter: string | null
          created_at: string
          created_by: string | null
          current_salary: number | null
          education: Json | null
          education_enhancement_tips: string | null
          education_score: number | null
          education_summary: string | null
          email: string | null
          expected_salary: number | null
          experience: string | null
          github: string | null
          has_validated_resume: boolean | null
          id: string
          job_id: string
          linkedin: string | null
          location: string | null
          main_status_id: string | null
          match_score: number | null
          metadata: Json | null
          name: string
          notice_period: string | null
          organization_id: string | null
          overall_score: number | null
          overall_summary: string | null
          phone: string | null
          preferred_location: string | null
          projects_enhancement_tips: string | null
          projects_score: number | null
          projects_summary: string | null
          report_url: string | null
          resume_filename: string | null
          resume_size: number | null
          resume_upload_date: string | null
          resume_url: string | null
          skill_ratings: Json | null
          skills: string[] | null
          skills_enhancement_tips: string | null
          skills_score: number | null
          skills_summary: string | null
          status: string | null
          sub_status_id: string | null
          updated_at: string
          updated_by: string | null
          work_experience_enhancement_tips: string | null
          work_experience_score: number | null
          work_experience_summary: string | null
        }
        Insert: {
          applied_date?: string
          applied_from?: string | null
          availability?: string | null
          candidate_id?: string | null
          career_experience?: Json | null
          cover_letter?: string | null
          created_at?: string
          created_by?: string | null
          current_salary?: number | null
          education?: Json | null
          education_enhancement_tips?: string | null
          education_score?: number | null
          education_summary?: string | null
          email?: string | null
          expected_salary?: number | null
          experience?: string | null
          github?: string | null
          has_validated_resume?: boolean | null
          id?: string
          job_id: string
          linkedin?: string | null
          location?: string | null
          main_status_id?: string | null
          match_score?: number | null
          metadata?: Json | null
          name: string
          notice_period?: string | null
          organization_id?: string | null
          overall_score?: number | null
          overall_summary?: string | null
          phone?: string | null
          preferred_location?: string | null
          projects_enhancement_tips?: string | null
          projects_score?: number | null
          projects_summary?: string | null
          report_url?: string | null
          resume_filename?: string | null
          resume_size?: number | null
          resume_upload_date?: string | null
          resume_url?: string | null
          skill_ratings?: Json | null
          skills?: string[] | null
          skills_enhancement_tips?: string | null
          skills_score?: number | null
          skills_summary?: string | null
          status?: string | null
          sub_status_id?: string | null
          updated_at?: string
          updated_by?: string | null
          work_experience_enhancement_tips?: string | null
          work_experience_score?: number | null
          work_experience_summary?: string | null
        }
        Update: {
          applied_date?: string
          applied_from?: string | null
          availability?: string | null
          candidate_id?: string | null
          career_experience?: Json | null
          cover_letter?: string | null
          created_at?: string
          created_by?: string | null
          current_salary?: number | null
          education?: Json | null
          education_enhancement_tips?: string | null
          education_score?: number | null
          education_summary?: string | null
          email?: string | null
          expected_salary?: number | null
          experience?: string | null
          github?: string | null
          has_validated_resume?: boolean | null
          id?: string
          job_id?: string
          linkedin?: string | null
          location?: string | null
          main_status_id?: string | null
          match_score?: number | null
          metadata?: Json | null
          name?: string
          notice_period?: string | null
          organization_id?: string | null
          overall_score?: number | null
          overall_summary?: string | null
          phone?: string | null
          preferred_location?: string | null
          projects_enhancement_tips?: string | null
          projects_score?: number | null
          projects_summary?: string | null
          report_url?: string | null
          resume_filename?: string | null
          resume_size?: number | null
          resume_upload_date?: string | null
          resume_url?: string | null
          skill_ratings?: Json | null
          skills?: string[] | null
          skills_enhancement_tips?: string | null
          skills_score?: number | null
          skills_summary?: string | null
          status?: string | null
          sub_status_id?: string | null
          updated_at?: string
          updated_by?: string | null
          work_experience_enhancement_tips?: string | null
          work_experience_score?: number | null
          work_experience_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_job_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "hr_job_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_job_candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_job_candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hr_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_job_candidates_main_status_id_fkey"
            columns: ["main_status_id"]
            isOneToOne: false
            referencedRelation: "job_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_job_candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_job_candidates_sub_status_id_fkey"
            columns: ["sub_status_id"]
            isOneToOne: false
            referencedRelation: "job_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_job_candidates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_jobs: {
        Row: {
          applications: number | null
          assigned_to: Json | null
          budget: number | null
          budget_type: string | null
          client_details: Json | null
          client_owner: string | null
          client_project_id: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string | null
          description_bullets: string[] | null
          due_date: string | null
          experience: Json | null
          hiring_mode: string | null
          id: string
          job_id: string
          job_type: string | null
          job_type_category: string | null
          location: string[]
          notice_period: string | null
          number_of_candidates: number | null
          organization_id: string | null
          posted_date: string | null
          service_type: string | null
          skills: string[] | null
          status: string | null
          submission_type: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          applications?: number | null
          assigned_to?: Json | null
          budget?: number | null
          budget_type?: string | null
          client_details?: Json | null
          client_owner?: string | null
          client_project_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          description_bullets?: string[] | null
          due_date?: string | null
          experience?: Json | null
          hiring_mode?: string | null
          id?: string
          job_id: string
          job_type?: string | null
          job_type_category?: string | null
          location?: string[]
          notice_period?: string | null
          number_of_candidates?: number | null
          organization_id?: string | null
          posted_date?: string | null
          service_type?: string | null
          skills?: string[] | null
          status?: string | null
          submission_type?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          applications?: number | null
          assigned_to?: Json | null
          budget?: number | null
          budget_type?: string | null
          client_details?: Json | null
          client_owner?: string | null
          client_project_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          description_bullets?: string[] | null
          due_date?: string | null
          experience?: Json | null
          hiring_mode?: string | null
          id?: string
          job_id?: string
          job_type?: string | null
          job_type_category?: string | null
          location?: string[]
          notice_period?: string | null
          number_of_candidates?: number | null
          organization_id?: string | null
          posted_date?: string | null
          service_type?: string | null
          skills?: string[] | null
          status?: string | null
          submission_type?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_jobs_client_project_id_fkey"
            columns: ["client_project_id"]
            isOneToOne: false
            referencedRelation: "hr_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_jobs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_kpis: {
        Row: {
          created_at: string
          current_value: number
          goal_id: string
          id: string
          metric_type: string
          metric_unit: string
          name: string
          target_value: number
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          current_value: number
          goal_id: string
          id?: string
          metric_type: string
          metric_unit: string
          name: string
          target_value: number
          updated_at?: string
          weight: number
        }
        Update: {
          created_at?: string
          current_value?: number
          goal_id?: string
          id?: string
          metric_type?: string
          metric_unit?: string
          name?: string
          target_value?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_kpis_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "hr_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_organizations: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      hr_permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      hr_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department_id: string | null
          designation_id: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          organization_id: string | null
          phone: number | null
          role_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          designation_id?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          organization_id?: string | null
          phone?: number | null
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          designation_id?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          phone?: number | null
          role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_profiles_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "hr_designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "hr_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_project_employees: {
        Row: {
          assign_employee: string | null
          client_billing: number | null
          client_id: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          organization_id: string | null
          project_id: string | null
          salary: number | null
          sow: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          assign_employee?: string | null
          client_billing?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          organization_id?: string | null
          project_id?: string | null
          salary?: number | null
          sow?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          assign_employee?: string | null
          client_billing?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          organization_id?: string | null
          project_id?: string | null
          salary?: number | null
          sow?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_project_employees_assign_employee_fkey"
            columns: ["assign_employee"]
            isOneToOne: false
            referencedRelation: "hr_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_project_employees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "hr_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_project_employees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_project_employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_project_employees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "hr_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_project_employees_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "hr_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_projects: {
        Row: {
          attachment: string | null
          client_id: string
          created_at: string | null
          created_by: string | null
          duration: number | null
          employees_assigned: number | null
          employees_needed: number | null
          end_date: string | null
          id: string
          name: string
          organization_id: string | null
          profit: number | null
          revenue: number | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          attachment?: string | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          duration?: number | null
          employees_assigned?: number | null
          employees_needed?: number | null
          end_date?: string | null
          id?: string
          name: string
          organization_id?: string | null
          profit?: number | null
          revenue?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          attachment?: string | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          duration?: number | null
          employees_assigned?: number | null
          employees_needed?: number | null
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          profit?: number | null
          revenue?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "hr_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string | null
          role_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id?: string | null
          role_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string | null
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "hr_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "hr_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_roles: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shared_jobs: {
        Row: {
          id: string
          job_id: string | null
          shared_at: string | null
        }
        Insert: {
          id?: string
          job_id?: string | null
          shared_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string | null
          shared_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hr_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      tlscheduler_candidates: {
        Row: {
          availability: string
          created_at: string | null
          id: string
          meeting_link: string | null
          name: string
          role: string
          whatsapp_number: string
        }
        Insert: {
          availability: string
          created_at?: string | null
          id?: string
          meeting_link?: string | null
          name: string
          role: string
          whatsapp_number: string
        }
        Update: {
          availability?: string
          created_at?: string | null
          id?: string
          meeting_link?: string | null
          name?: string
          role?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      tracking_records: {
        Row: {
          assigned_goal_id: string
          created_at: string
          id: string
          notes: string | null
          record_date: string
          value: number
        }
        Insert: {
          assigned_goal_id: string
          created_at?: string
          id?: string
          notes?: string | null
          record_date: string
          value?: number
        }
        Update: {
          assigned_goal_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          record_date?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "tracking_records_assigned_goal_id_fkey"
            columns: ["assigned_goal_id"]
            isOneToOne: false
            referencedRelation: "hr_assigned_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_companies: {
        Row: {
          candidate_id: string
          company_id: number
          designation: string | null
          job_id: string
          years: string | null
        }
        Insert: {
          candidate_id: string
          company_id: number
          designation?: string | null
          job_id: string
          years?: string | null
        }
        Update: {
          candidate_id?: string
          company_id?: number
          designation?: string | null
          job_id?: string
          years?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      hr_availability_date_specific: {
        Row: {
          created_at: string
          end_time: string
          id: string
          specific_date: string
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          specific_date: string
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          specific_date?: string
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hr_availability_time_slots: {
        Row: {
          availability_id: string
          created_at: string
          end_time: string
          id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          availability_id: string
          created_at?: string
          end_time: string
          id?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          availability_id?: string
          created_at?: string
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_availability_time_slots_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "hr_availability_weekly"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_availability_weekly: {
        Row: {
          created_at: string
          day_of_week: string
          id: string
          is_available: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          id?: string
          is_available?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          id?: string
          is_available?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hr_candidate_interviews: {
        Row: {
          candidate_id: string
          created_at: string | null
          created_by: string | null
          feedback: Json | null
          id: string
          interview_date: string
          interview_round: string | null
          interview_time: string | null
          interview_type: string
          interviewers: Json | null
          location: string | null
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          created_by?: string | null
          feedback?: Json | null
          id?: string
          interview_date: string
          interview_round?: string | null
          interview_time?: string | null
          interview_type: string
          interviewers?: Json | null
          location?: string | null
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          created_by?: string | null
          feedback?: Json | null
          id?: string
          interview_date?: string
          interview_round?: string | null
          interview_time?: string | null
          interview_type?: string
          interviewers?: Json | null
          location?: string | null
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_candidate_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "hr_job_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_candidate_joining_details: {
        Row: {
          candidate_id: string
          created_at: string | null
          created_by: string | null
          documents_submitted: Json | null
          final_salary: number | null
          id: string
          joining_date: string | null
          onboarding_status: string | null
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          created_by?: string | null
          documents_submitted?: Json | null
          final_salary?: number | null
          id?: string
          joining_date?: string | null
          onboarding_status?: string | null
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          created_by?: string | null
          documents_submitted?: Json | null
          final_salary?: number | null
          id?: string
          joining_date?: string | null
          onboarding_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_candidate_joining_details_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "hr_job_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_candidate_offers: {
        Row: {
          candidate_id: string
          created_at: string | null
          created_by: string | null
          expected_joining_date: string | null
          id: string
          negotiation_notes: string | null
          offer_letter_url: string | null
          offer_status: string | null
          offer_valid_until: string | null
          offered_salary: number
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          created_by?: string | null
          expected_joining_date?: string | null
          id?: string
          negotiation_notes?: string | null
          offer_letter_url?: string | null
          offer_status?: string | null
          offer_valid_until?: string | null
          offered_salary: number
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          created_by?: string | null
          expected_joining_date?: string | null
          id?: string
          negotiation_notes?: string | null
          offer_letter_url?: string | null
          offer_status?: string | null
          offer_valid_until?: string | null
          offered_salary?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_candidate_offers_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "hr_job_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_status_change_counts: {
        Row: {
          candidate_id: string
          count: number
          created_at: string | null
          employee_id: string
          id: string
          job_id: string
          main_status_id: string
          sub_status_id: string
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          count?: number
          created_at?: string | null
          employee_id: string
          id?: string
          job_id: string
          main_status_id: string
          sub_status_id: string
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          count?: number
          created_at?: string | null
          employee_id?: string
          id?: string
          job_id?: string
          main_status_id?: string
          sub_status_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_status_change_counts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_status_change_counts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hr_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_user_settings: {
        Row: {
          created_at: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_statuses: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          name: string
          organization_id: string | null
          parent_id: string | null
          type: Database["public"]["Enums"]["status_type"]
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          organization_id?: string | null
          parent_id?: string | null
          type: Database["public"]["Enums"]["status_type"]
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          organization_id?: string | null
          parent_id?: string | null
          type?: Database["public"]["Enums"]["status_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_statuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hr_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_statuses_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "job_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_analysis: {
        Row: {
          additional_certifications: string[] | null
          candidate_id: string
          candidate_name: string | null
          development_gaps: string[] | null
          email: string | null
          github: string | null
          job_id: string
          linkedin: string | null
          matched_skills: Json | null
          missing_or_weak_areas: string[] | null
          overall_score: number | null
          resume_text: string | null
          section_wise_scoring: Json | null
          summary: string | null
          top_skills: string[] | null
          updated_at: string | null
        }
        Insert: {
          additional_certifications?: string[] | null
          candidate_id: string
          candidate_name?: string | null
          development_gaps?: string[] | null
          email?: string | null
          github?: string | null
          job_id: string
          linkedin?: string | null
          matched_skills?: Json | null
          missing_or_weak_areas?: string[] | null
          overall_score?: number | null
          resume_text?: string | null
          section_wise_scoring?: Json | null
          summary?: string | null
          top_skills?: string[] | null
          updated_at?: string | null
        }
        Update: {
          additional_certifications?: string[] | null
          candidate_id?: string
          candidate_name?: string | null
          development_gaps?: string[] | null
          email?: string | null
          github?: string | null
          job_id?: string
          linkedin?: string | null
          matched_skills?: Json | null
          missing_or_weak_areas?: string[] | null
          overall_score?: number | null
          resume_text?: string | null
          section_wise_scoring?: Json | null
          summary?: string | null
          top_skills?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      search_params: {
        Row: {
          boolean_search: string
          created_at: string | null
          id: number
          job_id: string
          keywords: string[]
        }
        Insert: {
          boolean_search: string
          created_at?: string | null
          id?: number
          job_id: string
          keywords: string[]
        }
        Update: {
          boolean_search?: string
          created_at?: string | null
          id?: number
          job_id?: string
          keywords?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "fk_search_params_job"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hr_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      search_params_backup: {
        Row: {
          boolean_search: string | null
          created_at: string | null
          id: number | null
          job_id: string | null
          keywords: string[] | null
          skills: string[] | null
        }
        Insert: {
          boolean_search?: string | null
          created_at?: string | null
          id?: number | null
          job_id?: string | null
          keywords?: string[] | null
          skills?: string[] | null
        }
        Update: {
          boolean_search?: string | null
          created_at?: string | null
          id?: number | null
          job_id?: string | null
          keywords?: string[] | null
          skills?: string[] | null
        }
        Relationships: []
      }
      search_params_skills: {
        Row: {
          search_params_id: number
          skill_id: number
        }
        Insert: {
          search_params_id: number
          skill_id: number
        }
        Update: {
          search_params_id?: number
          skill_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_search_params"
            columns: ["search_params_id"]
            isOneToOne: false
            referencedRelation: "search_params"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_skills"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string | null
          customer_name: string | null
          id: string
          message_response: Json | null
          message_sent: boolean | null
          phone_number: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          id?: string
          message_response?: Json | null
          message_sent?: boolean | null
          phone_number: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          id?: string
          message_response?: Json | null
          message_sent?: boolean | null
          phone_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      create_organization_with_superadmin: {
        Args: {
          org_name: string
          user_id: string
        }
        Returns: string
      }
      get_employee_details: {
        Args: {
          p_employee_id: string
        }
        Returns: Json
      }
      is_first_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_jobs_with_candidate_count: {
        Args: Record<PropertyKey, never>
        Returns: {
          job: Json
          candidate_count: number
        }[]
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { uri: string }
          | { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { uri: string } | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { uri: string; content: string; content_type: string }
          | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      urlencode: {
        Args: { string: string } | { string: string } | { data: Json }
        Returns: string
      }
    }
    Enums: {
      hr_candidate_event_type:
        | "status_change"
        | "progress_update"
        | "resume_upload"
        | "resume_validation"
        | "candidate_edit"
        | "candidate_create"
      status_type: "main" | "sub"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
