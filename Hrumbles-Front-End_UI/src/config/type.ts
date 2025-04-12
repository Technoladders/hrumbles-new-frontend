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
      hr_clients: {
        Row: {
          active_employees: number | null
          address: string | null
          city: string | null
          client_name: string
          completed_projects: number | null
          contact_person_first_name: string
          contact_person_last_name: string
          country: string | null
          created_at: string | null
          currency: string | null
          display_name: string
          email: string
          id: string
          ongoing_projects: number | null
          phone_number: string
          postal_code: string | null
          profit: number | null
          revenue: number | null
          state: string | null
          status: string | null
          total_projects: number | null
          updated_at: string | null
          organization_id: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          active_employees?: number | null
          address?: string | null
          city?: string | null
          client_name: string
          completed_projects?: number | null
          contact_person_first_name: string
          contact_person_last_name: string
          country?: string | null
          created_at?: string | null
          currency?: string | null
          display_name: string
          email: string
          id?: string
          ongoing_projects?: number | null
          phone_number: string
          postal_code?: string | null
          profit?: number | null
          revenue?: number | null
          state?: string | null
          status?: string | null
          total_projects?: number | null
          updated_at?: string | null
          organization_id: string | null
          created_by: string | null
          updated_by: string | null
        }
        Update: {
          active_employees?: number | null
          address?: string | null
          city?: string | null
          client_name?: string
          completed_projects?: number | null
          contact_person_first_name?: string
          contact_person_last_name?: string
          country?: string | null
          created_at?: string | null
          currency?: string | null
          display_name?: string
          email?: string
          id?: string
          ongoing_projects?: number | null
          phone_number?: string
          postal_code?: string | null
          profit?: number | null
          revenue?: number | null
          state?: string | null
          status?: string | null
          total_projects?: number | null
          updated_at?: string | null
          organization_id: string | null
          created_by: string | null
          updated_by: string | null
        }
        Relationships: []
      }
      hr_projects: {
        Row: {
          client_id: string
          created_at: string | null
          duration: number | null
          employees_assigned: number | null
          employees_needed: number | null
          end_date: string | null
          id: string
          name: string
          profit: number | null
          revenue: number | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          organization_id: string | null
          created_by: string | null
          updated_by: string | null
          attachment: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          duration?: number | null
          employees_assigned?: number | null
          employees_needed?: number | null
          end_date?: string | null
          id?: string
          name: string
          profit?: number | null
          revenue?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          organization_id: string | null
          created_by: string | null
          updated_by: string | null
          attachment: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          duration?: number | null
          employees_assigned?: number | null
          employees_needed?: number | null
          end_date?: string | null
          id?: string
          name?: string
          profit?: number | null
          revenue?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          organization_id: string | null
          created_by: string | null
          updated_by: string | null
          attachment: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "hr_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_project_employees: {
        Row: {
            project_id: string
          client_id: string
          created_at: string | null
          
          end_date: string | null
          id: string
          assign_employee: string | null
          salary: number | null
          client_billing: number | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          organization_id: string | null
          created_by: string | null
          updated_by: string | null
          sow: string | null

          ///join hr_employees
          hr_employees?: {
            first_name: string;
            last_name: string;
          } | null;
        }
        Insert: {
            project_id: string
            client_id: string
            created_at: string | null
            
            end_date: string | null
            id: string
            assign_employee: string | null
            salary: number | null
            client_billing: number | null
            start_date: string | null
            status: string | null
            updated_at: string | null
            organization_id: string | null
            created_by: string | null
            updated_by: string | null
            sow: string | null
        }
        Update: {
            project_id: string
            client_id: string
            created_at: string | null
           
            end_date: string | null
            id: string
            assign_employee: string | null
            salary: number | null
            client_billing: number | null
            start_date: string | null
            status: string | null
            updated_at: string | null
            organization_id: string | null
            created_by: string | null
            updated_by: string | null
            sow: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "hr_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employees: {  // ✅ ADD THIS TABLE
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          organization_id: string;
          role_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email: string;
          organization_id: string;
          role_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          organization_id?: string;
          role_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
            {
              foreignKeyName: "hr_project_employees_project_id_fkey",
              columns: ["project_id"],
              isOneToOne: false,
              referencedRelation: "hr_projects",
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "hr_project_employees_client_id_fkey",
              columns: ["client_id"],
              isOneToOne: false,
              referencedRelation: "hr_clients",
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "hr_project_employees_assign_employee_fkey", // ✅ Fix reference for assigned employee
              columns: ["assign_employee"],
              isOneToOne: false,
              referencedRelation: "hr_employees",
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "hr_project_employees_organization_id_fkey",
              columns: ["organization_id"],
              isOneToOne: false,
              referencedRelation: "hr_organizations",
              referencedColumns: ["id"]
            },
          ]
          
      };

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
