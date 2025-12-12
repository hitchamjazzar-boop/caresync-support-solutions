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
      achievement_types: {
        Row: {
          category: string
          color: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          points: number
        }
        Insert: {
          category?: string
          color: string
          created_at?: string
          description: string
          icon: string
          id?: string
          is_active?: boolean
          name: string
          points?: number
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          points?: number
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          permission_type: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_type: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      announcement_comments: {
        Row: {
          announcement_id: string
          comment: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          comment: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          comment?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reactions: {
        Row: {
          announcement_id: string
          created_at: string | null
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string | null
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string | null
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reactions_announcement_id_fkey"
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
          featured_user_id: string | null
          featured_user_ids: string[] | null
          id: string
          image_url: string | null
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
          featured_user_id?: string | null
          featured_user_ids?: string[] | null
          id?: string
          image_url?: string | null
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
          featured_user_id?: string | null
          featured_user_ids?: string[] | null
          id?: string
          image_url?: string | null
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
      award_categories: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      calendar_event_responses: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          responded_at: string | null
          response_status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          responded_at?: string | null
          response_status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          responded_at?: string | null
          response_status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          color: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_time: string
          event_type: string
          id: string
          is_public: boolean | null
          is_recurring: boolean | null
          location: string | null
          meeting_link: string | null
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          reminder_enabled: boolean | null
          reminder_minutes_before: number | null
          start_time: string
          target_departments: string[] | null
          target_users: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_time: string
          event_type: string
          id?: string
          is_public?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          meeting_link?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          start_time: string
          target_departments?: string[] | null
          target_users?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_time?: string
          event_type?: string
          id?: string
          is_public?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          meeting_link?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          start_time?: string
          target_departments?: string[] | null
          target_users?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      default_tasks: {
        Row: {
          assigned_departments: string[] | null
          assigned_to: string[] | null
          assignment_type: string | null
          category: string
          client_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          instructions: string | null
          is_active: boolean
          is_daily: boolean | null
          order_position: number
          priority: Database["public"]["Enums"]["task_priority"]
          time_estimate: number | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_departments?: string[] | null
          assigned_to?: string[] | null
          assignment_type?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          is_daily?: boolean | null
          order_position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          time_estimate?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_departments?: string[] | null
          assigned_to?: string[] | null
          assignment_type?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          is_daily?: boolean | null
          order_position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          time_estimate?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "default_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_achievements: {
        Row: {
          achievement_type_id: string
          awarded_at: string
          awarded_by: string
          awarded_date: string
          created_at: string
          expires_at: string | null
          id: string
          is_visible: boolean
          notes: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          achievement_type_id: string
          awarded_at?: string
          awarded_by: string
          awarded_date?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_visible?: boolean
          notes?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          achievement_type_id?: string
          awarded_at?: string
          awarded_by?: string
          awarded_date?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_visible?: boolean
          notes?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_achievements_achievement_type_id_fkey"
            columns: ["achievement_type_id"]
            isOneToOne: false
            referencedRelation: "achievement_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_achievements_achievement_type_id"
            columns: ["achievement_type_id"]
            isOneToOne: false
            referencedRelation: "achievement_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_achievements_awarded_by"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_achievements_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_daily_tasks: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string
          default_task_id: string | null
          description: string | null
          due_date: string | null
          id: string
          instructions: string | null
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          task_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          default_task_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          task_date?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          default_task_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          task_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_daily_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_daily_tasks_default_task_id_fkey"
            columns: ["default_task_id"]
            isOneToOne: false
            referencedRelation: "default_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_feedback: {
        Row: {
          admin_response: string | null
          created_at: string | null
          id: string
          message: string
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string | null
          id?: string
          message: string
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string | null
          id?: string
          message?: string
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      employee_invoices: {
        Row: {
          absent_days: number | null
          absent_deduction: number | null
          additional_items: Json | null
          balance_due: number
          base_salary: number
          created_at: string
          created_by: string
          deduction_notes: string | null
          deductions: number | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          pay_period_end: string
          pay_period_start: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          absent_days?: number | null
          absent_deduction?: number | null
          additional_items?: Json | null
          balance_due: number
          base_salary: number
          created_at?: string
          created_by: string
          deduction_notes?: string | null
          deductions?: number | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          pay_period_end: string
          pay_period_start: string
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          absent_days?: number | null
          absent_deduction?: number | null
          additional_items?: Json | null
          balance_due?: number
          base_salary?: number
          created_at?: string
          created_by?: string
          deduction_notes?: string | null
          deductions?: number | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          pay_period_end?: string
          pay_period_start?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_nominations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          comment: string | null
          created_at: string
          id: string
          is_approved: boolean | null
          nominated_user_id: string
          nominator_user_id: string
          voting_period_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean | null
          nominated_user_id: string
          nominator_user_id: string
          voting_period_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean | null
          nominated_user_id?: string
          nominator_user_id?: string
          voting_period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_nominations_voting_period_id_fkey"
            columns: ["voting_period_id"]
            isOneToOne: false
            referencedRelation: "voting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_votes: {
        Row: {
          created_at: string
          id: string
          is_admin_vote: boolean | null
          nominated_user_id: string
          reason: string | null
          voter_user_id: string
          voting_period_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_vote?: boolean | null
          nominated_user_id: string
          reason?: string | null
          voter_user_id: string
          voting_period_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_vote?: boolean | null
          nominated_user_id?: string
          reason?: string | null
          voter_user_id?: string
          voting_period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_votes_voting_period_id_fkey"
            columns: ["voting_period_id"]
            isOneToOne: false
            referencedRelation: "voting_periods"
            referencedColumns: ["id"]
          },
        ]
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
      feedback_requests: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string | null
          id: string
          message: string | null
          recipient_id: string
          status: string
          target_user_id: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          recipient_id: string
          status?: string
          target_user_id?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          recipient_id?: string
          status?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          escalate_after_hours: number | null
          escalated: boolean | null
          escalated_at: string | null
          escalation_memo_id: string | null
          expires_at: string | null
          id: string
          is_read: boolean
          recipient_id: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          sender_id: string
          title: string
          type: Database["public"]["Enums"]["memo_type"]
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          escalate_after_hours?: number | null
          escalated?: boolean | null
          escalated_at?: string | null
          escalation_memo_id?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          recipient_id: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          sender_id: string
          title: string
          type?: Database["public"]["Enums"]["memo_type"]
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          escalate_after_hours?: number | null
          escalated?: boolean | null
          escalated_at?: string | null
          escalation_memo_id?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          recipient_id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          sender_id?: string
          title?: string
          type?: Database["public"]["Enums"]["memo_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memos_escalation_memo_id_fkey"
            columns: ["escalation_memo_id"]
            isOneToOne: false
            referencedRelation: "memos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memos_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          id: string
          notification_id: string
          notification_type: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          id?: string
          notification_id: string
          notification_type: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          id?: string
          notification_id?: string
          notification_type?: string
          user_id?: string
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
          address: string | null
          bank_name: string | null
          birthday: string | null
          calendar_color: string | null
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
          zodiac_sign: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          birthday?: string | null
          calendar_color?: string | null
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
          zodiac_sign?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          birthday?: string | null
          calendar_color?: string | null
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
          zodiac_sign?: string | null
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
      secret_santa_assignments: {
        Row: {
          assigned_at: string
          event_id: string
          giver_id: string
          id: string
          receiver_id: string
        }
        Insert: {
          assigned_at?: string
          event_id: string
          giver_id: string
          id?: string
          receiver_id: string
        }
        Update: {
          assigned_at?: string
          event_id?: string
          giver_id?: string
          id?: string
          receiver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secret_santa_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "secret_santa_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_santa_assignments_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_santa_assignments_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_santa_events: {
        Row: {
          budget_limit: number | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          name: string
          reveal_enabled: boolean
          start_date: string
          status: Database["public"]["Enums"]["secret_santa_status"]
        }
        Insert: {
          budget_limit?: number | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          reveal_enabled?: boolean
          start_date: string
          status?: Database["public"]["Enums"]["secret_santa_status"]
        }
        Update: {
          budget_limit?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          reveal_enabled?: boolean
          start_date?: string
          status?: Database["public"]["Enums"]["secret_santa_status"]
        }
        Relationships: [
          {
            foreignKeyName: "secret_santa_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_santa_participants: {
        Row: {
          event_id: string
          id: string
          is_active: boolean
          joined_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          is_active?: boolean
          joined_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secret_santa_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "secret_santa_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_santa_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_santa_wishlists: {
        Row: {
          created_at: string
          event_id: string
          id: string
          item_description: string | null
          item_title: string
          item_url: string | null
          priority: Database["public"]["Enums"]["wishlist_priority"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          item_description?: string | null
          item_title: string
          item_url?: string | null
          priority?: Database["public"]["Enums"]["wishlist_priority"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          item_description?: string | null
          item_title?: string
          item_url?: string | null
          priority?: Database["public"]["Enums"]["wishlist_priority"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secret_santa_wishlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "secret_santa_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_santa_wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shoutout_requests: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string | null
          id: string
          message: string | null
          recipient_id: string
          status: string
          target_user_id: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          recipient_id: string
          status?: string
          target_user_id?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          recipient_id?: string
          status?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shoutout_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shoutouts: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          is_published: boolean
          message: string
          request_id: string | null
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          is_published?: boolean
          message: string
          request_id?: string | null
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          is_published?: boolean
          message?: string
          request_id?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shoutouts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "shoutout_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
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
      voting_periods: {
        Row: {
          announcement_message: string | null
          category_id: string | null
          closed_at: string | null
          created_at: string
          id: string
          is_published: boolean
          month: number
          published_at: string | null
          requires_nomination: boolean
          status: string
          winner_id: string | null
          year: number
        }
        Insert: {
          announcement_message?: string | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          month: number
          published_at?: string | null
          requires_nomination?: boolean
          status?: string
          winner_id?: string | null
          year: number
        }
        Update: {
          announcement_message?: string | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          month?: number
          published_at?: string | null
          requires_nomination?: boolean
          status?: string
          winner_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "voting_periods_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "award_categories"
            referencedColumns: ["id"]
          },
        ]
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
      has_admin_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_event_participant: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee"
      memo_type: "memo" | "reminder" | "warning"
      secret_santa_status: "draft" | "open" | "assigned" | "completed"
      task_priority: "low" | "medium" | "high"
      task_status: "pending" | "in_progress" | "completed" | "skipped"
      wishlist_priority: "high" | "medium" | "low"
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
      secret_santa_status: ["draft", "open", "assigned", "completed"],
      task_priority: ["low", "medium", "high"],
      task_status: ["pending", "in_progress", "completed", "skipped"],
      wishlist_priority: ["high", "medium", "low"],
    },
  },
} as const
