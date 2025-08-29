import { createClient } from '@supabase/supabase-js'

let supabase: ReturnType<typeof createClient> | null = null

export const getSupabase = () => {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  
  return supabase
}

// Export the getter function instead of the instance

// Database types
export interface Tournament {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string
  max_teams: number
  current_teams: number
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
  prize_pool: number
  entry_fee: number
  created_at: string
}

export interface Team {
  id: string
  tournament_id: string
  team_name: string
  captain_name: string
  captain_email: string
  captain_phone: string
  expected_players: number
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  payment_status: 'pending' | 'completed' | 'failed'
  generated_password: string
  created_at: string
}

export interface Player {
  id: string
  team_id: string
  name: string
  psn_id: string
  ea_id: string
  position: string
  created_at: string
}

export interface Payment {
  id: string
  team_id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  payment_method: string
  stripe_payment_intent_id?: string
  created_at: string
} 