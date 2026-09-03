import { getSupabaseAdmin } from '@/lib/supabase'
import { isDemoTournament } from '@/lib/demo-tournament'
import { transformTournament, type Tournament } from '@/lib/tournaments'
import {
  isTeamCountedAsRegistered
} from '@/lib/tournament-team-count'

export interface SitemapTournament {
  id: string
  title: string
  status: string
  start_date: string | null
  end_date: string | null
  updated_at: string | null
  description: string | null
  description_en: string | null
  prize_pool: number | null
  isDemo: boolean
}

export async function fetchTournamentsForSeo(): Promise<SitemapTournament[]> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('tournaments')
    .select('id, title, status, start_date, end_date, updated_at, description, description_en, prize_pool')
    .neq('status', 'archived')
    .order('start_date', { ascending: false })

  if (error || !data) {
    console.warn('SEO tournament fetch failed:', error?.message)
    return []
  }

  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date,
    updated_at: row.updated_at,
    description: row.description,
    description_en: row.description_en,
    prize_pool: row.prize_pool,
    isDemo: isDemoTournament(row)
  }))
}

/** Server-side tournament list with eligible team counts (for SSR / SEO). */
export async function fetchTournamentsForPage(): Promise<Tournament[]> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return []

  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('*')
    .neq('status', 'archived')
    .order('start_date', { ascending: false })

  if (error || !tournaments) {
    console.warn('SSR tournament fetch failed:', error?.message)
    return []
  }

  const ids = tournaments.map((t: any) => t.id)
  let eligibleByTournament: Record<string, number> = {}

  if (ids.length > 0) {
    const { data: teams } = await supabase
      .from('teams')
      .select('tournament_id, status, payment_status')
      .in('tournament_id', ids)

    eligibleByTournament = (teams || []).reduce((acc: Record<string, number>, team: any) => {
      if (!isTeamCountedAsRegistered(team)) return acc
      const tournamentId = team.tournament_id
      acc[tournamentId] = (acc[tournamentId] || 0) + 1
      return acc
    }, {})
  }

  return tournaments.map((t: any) =>
    transformTournament({
      ...t,
      eligible_teams: eligibleByTournament[t.id] || 0
    })
  )
}

export async function fetchTournamentForSeo(id: string): Promise<SitemapTournament | null> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('tournaments')
    .select('id, title, status, start_date, end_date, updated_at, description, description_en, prize_pool')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id as string,
    title: data.title as string,
    status: data.status as string,
    start_date: data.start_date as string | null,
    end_date: data.end_date as string | null,
    updated_at: data.updated_at as string | null,
    description: data.description as string | null,
    description_en: data.description_en as string | null,
    prize_pool: data.prize_pool as number | null,
    isDemo: isDemoTournament({
      title: data.title as string | null,
      description: data.description as string | null
    })
  }
}
