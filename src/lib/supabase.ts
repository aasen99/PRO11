import { createClient } from '@supabase/supabase-js'

let supabase: ReturnType<typeof createClient> | null = null
let supabaseAdmin: ReturnType<typeof createClient> | null = null

export const getSupabase = () => {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Missing Supabase environment variables - using mock data')
      // Return a more complete mock client for development
      const mockQuery = {
        eq: () => mockQuery,
        limit: () => mockQuery,
        order: () => mockQuery,
        single: async () => ({ data: null, error: { message: 'Mock: No Supabase connection' } }),
        then: async (callback: any) => callback({ data: [], error: null })
      }
      
      return {
        from: () => ({
          select: () => mockQuery,
          insert: () => ({
            select: () => ({
              single: async () => ({ 
                data: { id: 'mock-' + Date.now() }, 
                error: null 
              })
            })
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({ data: null, error: null })
              })
            })
          })
        }),
        rpc: async () => ({ data: null, error: { message: 'Mock: RPC not available' } })
      } as any
    }
    
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      }
    })
  }
  
  return supabase
}

// Get Supabase client with service role key (bypasses RLS)
export const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    // Try both possible names for the service role key
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    
    console.log('getSupabaseAdmin called:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasServiceKeyAlt: !!process.env.SUPABASE_SERVICE_KEY,
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseServiceKey?.length || 0,
      url: supabaseUrl,
      serviceKeyPrefix: supabaseServiceKey?.substring(0, 20) || 'NOT SET',
      allSupabaseEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('CRITICAL: Missing Supabase service role key or URL!', {
        url: supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        hasServiceKeyAlt: !!process.env.SUPABASE_SERVICE_KEY,
        envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
        nodeEnv: process.env.NODE_ENV
      })
      // Don't throw - return null so API can handle it gracefully
      console.error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations. Please set it in your environment variables.')
      return null
    }
    
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
    
    console.log('Supabase admin client created successfully with service role key')
  }
  
  return supabaseAdmin
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