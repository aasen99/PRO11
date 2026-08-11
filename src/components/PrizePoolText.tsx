'use client'

import { formatPrizePoolLabel } from '@/lib/prize-payout'

type PrizePoolSource = {
  prize?: string
  prizeAmount?: number
  maxPrizeAmount?: number | null
  isDynamicPrize?: boolean
}

export function formatTournamentPrize(
  tournament: PrizePoolSource | null | undefined,
  isEnglish: boolean
): string {
  if (!tournament) return '—'
  if (typeof tournament.prizeAmount === 'number') {
    return formatPrizePoolLabel({
      current: tournament.prizeAmount,
      max: tournament.isDynamicPrize ? tournament.maxPrizeAmount : null,
      locale: isEnglish ? 'en-US' : 'nb-NO',
      separator: isEnglish ? 'of' : 'av'
    })
  }
  return tournament.prize || '—'
}

export function PrizePoolText({
  tournament,
  isEnglish,
  className,
  showLiveHint = true,
  label
}: {
  tournament: PrizePoolSource | null | undefined
  isEnglish: boolean
  className?: string
  showLiveHint?: boolean
  /** Override default "Premie" / "Prize" label. Pass empty string to hide. */
  label?: string
}) {
  const prizeLabel =
    label !== undefined
      ? label
      : isEnglish
        ? 'Prize pool'
        : 'Premiepott'
  const value = formatTournamentPrize(tournament, isEnglish)
  const isDynamic = Boolean(tournament?.isDynamicPrize)

  return (
    <span className={className}>
      <span className="break-words">
        {prizeLabel ? `${prizeLabel}: ${value}` : value}
      </span>
      {showLiveHint && isDynamic && (
        <span className="block text-xs text-slate-400 mt-0.5">
          {isEnglish
            ? 'Live — grows with registered teams (current of max)'
            : 'Live — øker med antall lag (nåværende av maks)'}
        </span>
      )}
    </span>
  )
}
