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
      profiles: {
        Row: {
          id: string
          full_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          manager_id: string
          name: string
          phone: string | null
          payment_method: 'boleto' | 'pix'
          payment_frequency: 'weekly' | 'biweekly' | 'monthly'
          daily_budget: number
          current_balance: number
          alert_threshold: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          manager_id: string
          name: string
          phone?: string | null
          payment_method?: 'boleto' | 'pix'
          payment_frequency?: 'weekly' | 'biweekly' | 'monthly'
          daily_budget: number
          current_balance?: number
          alert_threshold?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          manager_id?: string
          name?: string
          phone?: string | null
          payment_method?: 'boleto' | 'pix'
          payment_frequency?: 'weekly' | 'biweekly' | 'monthly'
          daily_budget?: number
          current_balance?: number
          alert_threshold?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          client_id: string
          transaction_type: 'credit_added' | 'daily_consumption'
          amount: number
          balance_after: number
          description: string | null
          transaction_date: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          client_id: string
          transaction_type: 'credit_added' | 'daily_consumption'
          amount: number
          balance_after: number
          description?: string | null
          transaction_date?: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          transaction_type?: 'credit_added' | 'daily_consumption'
          amount?: number
          balance_after?: number
          description?: string | null
          transaction_date?: string
          created_at?: string
          created_by?: string | null
        }
      }
      daily_consumption_log: {
        Row: {
          id: string
          client_id: string
          consumption_date: string
          amount: number
          balance_before: number
          balance_after: number
          processed_at: string
        }
        Insert: {
          id?: string
          client_id: string
          consumption_date: string
          amount: number
          balance_before: number
          balance_after: number
          processed_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          consumption_date?: string
          amount?: number
          balance_before?: number
          balance_after?: number
          processed_at?: string
        }
      }
    }
    Functions: {
      calculate_days_until_depleted: {
        Args: {
          p_current_balance: number
          p_daily_budget: number
        }
        Returns: number
      }
      process_daily_consumption: {
        Args: Record<string, never>
        Returns: void
      }
    }
  }
}
