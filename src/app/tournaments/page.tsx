import TournamentsClient from './TournamentsClient'
import { fetchTournamentsForPage } from '@/lib/tournaments-server'

export default async function TournamentsPage() {
  const initialTournaments = await fetchTournamentsForPage()
  return <TournamentsClient initialTournaments={initialTournaments} />
}
