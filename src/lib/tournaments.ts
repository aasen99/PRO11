export interface Tournament {
  id: string
  title: string
  date: string
  time: string
  prize: string
  entryFee: number
  registeredTeams: number
  maxTeams: number
  status: 'open' | 'ongoing' | 'closed' | 'completed'
  statusText: string
  description: string
  format: 'group_stage' | 'knockout' | 'mixed'
}

// Database tournament interface
interface DatabaseTournament {
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
  updated_at: string
}

// Helper function to format date
function formatDate(dateString: string): { date: string; time: string } {
  try {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleDateString('nb-NO', { month: 'long' })
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    return {
      date: `${day}. ${month} ${year}`,
      time: `${hours}:${minutes}`
    }
  } catch {
    return { date: '', time: '' }
  }
}

// Helper function to map database status to frontend status
function mapStatus(dbStatus: string): 'open' | 'ongoing' | 'closed' | 'completed' {
  switch (dbStatus) {
    case 'upcoming':
      return 'open'
    case 'active':
      return 'ongoing'
    case 'completed':
      return 'completed'
    case 'cancelled':
      return 'closed'
    default:
      return 'open'
  }
}

function getStatusText(status: 'open' | 'ongoing' | 'closed' | 'completed'): string {
  switch (status) {
    case 'open':
      return 'Åpen for påmelding'
    case 'ongoing':
      return 'Pågår'
    case 'closed':
      return 'Stengt'
    case 'completed':
      return 'Fullført'
    default:
      return 'Åpen for påmelding'
  }
}

// Transform database tournament to frontend format
function transformTournament(dbTournament: DatabaseTournament): Tournament {
  const { date, time } = formatDate(dbTournament.start_date)
  const status = mapStatus(dbTournament.status)
  
  return {
    id: dbTournament.id,
    title: dbTournament.title,
    date,
    time,
    prize: `${dbTournament.prize_pool.toLocaleString('nb-NO')} NOK`,
    entryFee: dbTournament.entry_fee,
    registeredTeams: dbTournament.current_teams,
    maxTeams: dbTournament.max_teams,
    status,
    statusText: getStatusText(status),
    description: dbTournament.description || '',
    format: 'mixed' // Default format, can be extended later
  }
}

// Fetch tournaments from API
export async function fetchTournaments(): Promise<Tournament[]> {
  try {
    const response = await fetch('/api/tournaments', {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch tournaments')
    }
    
    const data = await response.json()
    
    if (data.tournaments && Array.isArray(data.tournaments)) {
      return data.tournaments.map(transformTournament)
    }
    
    return []
  } catch (error) {
    console.error('Failed to fetch tournaments from API:', error)
    return []
  }
}

// Fetch single tournament by ID
export async function fetchTournamentById(id: string): Promise<Tournament | undefined> {
  try {
    const response = await fetch(`/api/tournaments?id=${id}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      return undefined
    }
    
    const data = await response.json()
    
    if (data.tournament) {
      return transformTournament(data.tournament)
    }
    
    return undefined
  } catch (error) {
    console.error('Failed to fetch tournament from API:', error)
    return undefined
  }
}

// Legacy exports for backward compatibility (empty array - use fetchTournaments instead)
export const tournaments: Tournament[] = []

export const getTournamentById = (id: string): Tournament | undefined => {
  return tournaments.find(tournament => tournament.id === id)
}

export const getNextTournament = (): Tournament | undefined => {
  return tournaments.find(tournament => tournament.status === 'open')
}
