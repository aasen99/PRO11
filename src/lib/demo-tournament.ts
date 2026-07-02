export const DEMO_TAG = '[DEMO]'
export const DEMO_PASSWORD = 'DemoPRO11!'
export const DEMO_EMAIL_DOMAIN = 'pro11.no'

export const DEMO_TEAM_NAMES = [
  'Night Ravens',
  'Iron County FC',
  'Neon Strikers',
  'Arctic Wolves',
  'Thunder United',
  'Shadow FC',
  'Velocity XI',
  'Storm Breakers',
  'Blaze Rangers',
  'Cyber Kings',
  'Phantom FC',
  'Metro Legends',
  'Crystal Palace XI',
  'Nova Athletic',
  'Rogue Eleven',
  'Solaris FC',
  'Volt City',
  'Midnight Owls',
  'Steel Legion',
  'Turbo Tigers',
  'Pulse FC',
  'Apex United',
  'Frost Giants',
  'Ember City'
]

export function isDemoTournament(tournament?: {
  title?: string | null
  description?: string | null
} | null): boolean {
  if (!tournament) return false
  const title = (tournament.title || '').trim().toUpperCase()
  const description = tournament.description || ''
  return title.startsWith('DEMO') || description.includes(DEMO_TAG)
}

export function buildDemoDescription(extra?: string): string {
  const base =
    'Intern demo-turnering for testing av PRO11. Påmelding er stengt for publikum.'
  return [base, extra?.trim(), DEMO_TAG].filter(Boolean).join(' ')
}

export function buildDemoDescriptionEn(extra?: string): string {
  const base =
    'Internal demo tournament for testing PRO11. Public registration is closed.'
  return [base, extra?.trim(), DEMO_TAG].filter(Boolean).join(' ')
}

export function getDemoCaptainEmail(index: number): string {
  return `demo${index + 1}@${DEMO_EMAIL_DOMAIN}`
}

export function pickDemoTeamNames(count: number): string[] {
  const pool = [...DEMO_TEAM_NAMES]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  if (count > pool.length) {
    return Array.from({ length: count }, (_, i) => `${pool[i % pool.length]} ${Math.floor(i / pool.length) + 1}`)
  }
  return pool.slice(0, count)
}
