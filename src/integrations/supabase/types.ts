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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcement_acknowledgments: {
        Row: {
          acknowledged_at: string
          announcement_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          announcement_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          announcement_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_acknowledgments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          is_pinned: boolean
          target_departments: string[] | null
          target_roles: string[] | null
          target_type: string
          target_users: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          target_departments?: string[] | null
          target_roles?: string[] | null
          target_type?: string
          target_users?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          target_departments?: string[] | null
          target_roles?: string[] | null
          target_type?: string
          target_users?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          lunch_end: string | null
          lunch_start: string | null
          status: string | null
          total_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          lunch_end?: string | null
          lunch_start?: string | null
          status?: string | null
          total_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          lunch_end?: string | null
          lunch_start?: string | null
          status?: string | null
          total_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      eod_reports: {
        Row: {
          attachments: Json | null
          attendance_id: string
          client_updates: string | null
          content_liked: string | null
          created_at: string
          id: string
          issues: string | null
          notes: string | null
          submitted_at: string
          tasks_completed: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          attendance_id: string
          client_updates?: string | null
          content_liked?: string | null
          created_at?: string
          id?: string
          issues?: string | null
          notes?: string | null
          submitted_at?: string
          tasks_completed: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          attendance_id?: string
          client_updates?: string | null
          content_liked?: string | null
          created_at?: string
          id?: string
          issues?: string | null
          notes?: string | null
          submitted_at?: string
          tasks_completed?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eod_reports_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
        ]
      }
      memo_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          memo_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          memo_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          memo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memo_replies_memo_id_fkey"
            columns: ["memo_id"]
            isOneToOne: false
            referencedRelation: "memos"
            referencedColumns: ["id"]
          },
        ]
      }
      memos: {
        Row: {
          content: string
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string
          title: string
          type: Database["public"]["Enums"]["memo_type"]
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id: string
          title: string
          type?: Database["public"]["Enums"]["memo_type"]
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
          title?: string
          type?: Database["public"]["Enums"]["memo_type"]
          updated_at?: string
        }
        Relationships: []
      }
      org_chart: {
        Row: {
          created_at: string
          hierarchy_level: number
          id: string
          parent_id: string | null
          position_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hierarchy_level?: number
          id?: string
          parent_id?: string | null
          position_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hierarchy_level?: number
          id?: string
          parent_id?: string | null
          position_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_chart_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_chart"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll: {
        Row: {
          allowances: number | null
          created_at: string
          deductions: number | null
          gross_amount: number
          hourly_rate: number | null
          id: string
          monthly_salary: number | null
          net_amount: number
          payment_date: string | null
          payslip_url: string | null
          period_end: string
          period_start: string
          status: string | null
          total_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allowances?: number | null
          created_at?: string
          deductions?: number | null
          gross_amount: number
          hourly_rate?: number | null
          id?: string
          monthly_salary?: number | null
          net_amount: number
          payment_date?: string | null
          payslip_url?: string | null
          period_end: string
          period_start: string
          status?: string | null
          total_hours: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allowances?: number | null
          created_at?: string
          deductions?: number | null
          gross_amount?: number
          hourly_rate?: number | null
          id?: string
          monthly_salary?: number | null
          net_amount?: number
          payment_date?: string | null
          payslip_url?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          total_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          bank_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          department: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          monthly_salary: number | null
          payment_method: string | null
          photo_url: string | null
          position: string | null
          routing_number: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          department?: string | null
          full_name: string
          hourly_rate?: number | null
          id: string
          monthly_salary?: number | null
          payment_method?: string | null
          photo_url?: string | null
          position?: string | null
          routing_number?: string | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          department?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          monthly_salary?: number | null
          payment_method?: string | null
          photo_url?: string | null
          position?: string | null
          routing_number?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          shift_date: string
          shift_end: string
          shift_start: string
          shift_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          shift_date: string
          shift_end: string
          shift_start: string
          shift_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          shift_date?: string
          shift_end?: string
          shift_start?: string
          shift_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_user_see_announcement: {
        Args: { announcement_id: string; user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee"
      memo_type: "memo" | "reminder" | "warning"
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
      app_role: ["admin", "manager", "employee"],
      memo_type: ["memo", "reminder", "warning"],
    },
  },
} as const
