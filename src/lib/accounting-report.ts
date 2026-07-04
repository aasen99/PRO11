import type { SupabaseClient } from '@supabase/supabase-js'

const POT_PER_TEAM_TAG_REGEX = /\[POT_PER_TEAM:(\d+)\]/i

export interface AccountingTeamRow {
  teamName: string
  captainName: string
  captainEmail: string
  teamStatus: string
  paymentStatus: string
  amountNok: number
  paymentMethod: string
  paymentDate: string | null
  registeredAt: string
}

export interface AccountingReportData {
  tournament: {
    id: string
    title: string
    startDate: string
    endDate: string
    entryFee: number
    prizePool: number
    status: string
  }
  generatedAt: string
  summary: {
    totalTeams: number
    paidTeams: number
    pendingPaymentTeams: number
    totalReceivedNok: number
    totalOutstandingNok: number
    expectedRevenueNok: number
  }
  teams: AccountingTeamRow[]
}

function getPerTeamPotFromDescription(description?: string | null): number | null {
  const match = description?.match(POT_PER_TEAM_TAG_REGEX)
  const value = match?.[1]
  return value ? Number(value) : null
}

function formatPaymentMethod(method: string | null | undefined): string {
  switch ((method || '').toLowerCase()) {
    case 'paypal':
      return 'PayPal'
    case 'free':
      return 'Gratis'
    case 'admin':
    case 'manual':
      return 'Manuell'
    default:
      return method || '-'
  }
}

function formatTeamStatus(status: string): string {
  switch (status) {
    case 'approved':
      return 'Godkjent'
    case 'pending':
      return 'Venter'
    case 'rejected':
      return 'Avvist'
    case 'paid':
      return 'Betalt'
    default:
      return status
  }
}

function formatPaymentStatus(status: string): string {
  switch (status) {
    case 'completed':
      return 'Betalt'
    case 'pending':
      return 'Venter'
    case 'failed':
      return 'Feilet'
    default:
      return status
  }
}

function isPaid(paymentStatus: string): boolean {
  return paymentStatus === 'completed'
}

export async function buildAccountingReportData(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<AccountingReportData | null> {
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('id, title, start_date, end_date, entry_fee, prize_pool, status, description')
    .eq('id', tournamentId)
    .maybeSingle()

  if (tournamentError || !tournament) return null

  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, team_name, captain_name, captain_email, status, payment_status, created_at')
    .eq('tournament_id', tournamentId)
    .order('team_name', { ascending: true })

  if (teamsError) throw new Error(teamsError.message)

  const teamRows = teams || []
  const teamIds = teamRows.map(team => team.id)

  let payments: Array<{
    team_id: string
    amount: number
    status: string
    payment_method: string
    created_at: string
    updated_at: string
  }> = []

  if (teamIds.length > 0) {
    const { data: paymentRows, error: paymentsError } = await supabase
      .from('payments')
      .select('team_id, amount, status, payment_method, created_at, updated_at')
      .in('team_id', teamIds)
      .order('created_at', { ascending: false })

    if (paymentsError) throw new Error(paymentsError.message)
    payments = paymentRows || []
  }

  const latestPaymentByTeam = new Map<string, (typeof payments)[number]>()
  for (const payment of payments) {
    if (!latestPaymentByTeam.has(payment.team_id)) {
      latestPaymentByTeam.set(payment.team_id, payment)
    }
  }

  const entryFee = Number(tournament.entry_fee) || 0
  const eligibleTeams = teamRows.filter(
    team => team.status === 'approved' || team.payment_status === 'completed'
  ).length
  const perTeamPot = getPerTeamPotFromDescription(tournament.description)
  const prizePool =
    perTeamPot !== null ? perTeamPot * eligibleTeams : Number(tournament.prize_pool) || 0

  const accountingTeams: AccountingTeamRow[] = teamRows.map(team => {
    const payment = latestPaymentByTeam.get(team.id)
    const paid = isPaid(team.payment_status)
    const amountNok = paid ? Number(payment?.amount ?? entryFee) : 0

    return {
      teamName: team.team_name,
      captainName: team.captain_name,
      captainEmail: team.captain_email,
      teamStatus: formatTeamStatus(team.status),
      paymentStatus: formatPaymentStatus(team.payment_status),
      amountNok,
      paymentMethod: paid
        ? formatPaymentMethod(payment?.payment_method || (entryFee === 0 ? 'free' : 'paypal'))
        : '-',
      paymentDate: paid ? payment?.updated_at || payment?.created_at || null : null,
      registeredAt: team.created_at
    }
  })

  const paidTeams = teamRows.filter(team => isPaid(team.payment_status)).length
  const totalReceivedNok = accountingTeams.reduce((sum, team) => sum + team.amountNok, 0)
  const pendingPaymentTeams = teamRows.filter(
    team => !isPaid(team.payment_status) && entryFee > 0
  ).length
  const totalOutstandingNok = pendingPaymentTeams * entryFee
  const expectedRevenueNok = entryFee * teamRows.length

  return {
    tournament: {
      id: String(tournament.id),
      title: tournament.title,
      startDate: tournament.start_date,
      endDate: tournament.end_date,
      entryFee,
      prizePool,
      status: tournament.status
    },
    generatedAt: new Date().toISOString(),
    summary: {
      totalTeams: teamRows.length,
      paidTeams,
      pendingPaymentTeams,
      totalReceivedNok,
      totalOutstandingNok,
      expectedRevenueNok
    },
    teams: accountingTeams
  }
}
