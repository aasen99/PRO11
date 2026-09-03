import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import JsonLd from '@/components/JsonLd'
import {
  buildPageMetadata,
  sportsEventJsonLd,
  stripSeoDescription
} from '@/lib/seo'
import { absoluteUrl, getSiteUrl } from '@/lib/site'
import { fetchTournamentForSeo } from '@/lib/tournaments-server'
import { formatPrizePoolLabel } from '@/lib/prize-payout'

type Params = { id: string }

export async function generateMetadata({
  params
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { id } = await params
  const tournament = await fetchTournamentForSeo(id)

  if (!tournament) {
    return buildPageMetadata({
      path: `/tournaments/${id}`,
      titleNo: 'Turnering – PRO11',
      titleEn: 'Tournament – PRO11',
      descriptionNo: 'Pro Clubs-turnering på PRO11.',
      descriptionEn: 'Pro Clubs tournament on PRO11.'
    })
  }

  const descNo = stripSeoDescription(tournament.description)
  const descEn = stripSeoDescription(tournament.description_en) || descNo
  const prize =
    typeof tournament.prize_pool === 'number'
      ? formatPrizePoolLabel({ current: tournament.prize_pool })
      : null

  const descriptionNo = [
    `Live kamper og resultater for ${tournament.title}.`,
    prize ? `Premiepott: ${prize}.` : null,
    descNo || 'Pro Clubs-turnering arrangert av PRO11.'
  ]
    .filter(Boolean)
    .join(' ')

  const descriptionEn = [
    `Live matches and results for ${tournament.title}.`,
    prize ? `Prize pool: ${prize}.` : null,
    descEn || 'Pro Clubs tournament organized by PRO11.'
  ]
    .filter(Boolean)
    .join(' ')

  return buildPageMetadata({
    path: `/tournaments/${tournament.id}`,
    titleNo: `${tournament.title} – Pro Clubs-turnering`,
    titleEn: `${tournament.title} – Pro Clubs tournament`,
    descriptionNo: descriptionNo.slice(0, 160),
    descriptionEn: descriptionEn.slice(0, 160),
    noIndex: tournament.isDemo
  })
}

export default async function TournamentLayout({
  children,
  params
}: {
  children: ReactNode
  params: Promise<Params>
}) {
  const { id } = await params
  const tournament = await fetchTournamentForSeo(id)

  const jsonLd = tournament
    ? sportsEventJsonLd({
        id: tournament.id,
        name: tournament.title,
        description: tournament.description || tournament.description_en || undefined,
        startDate: tournament.start_date || undefined,
        endDate: tournament.end_date || undefined,
        prize:
          typeof tournament.prize_pool === 'number'
            ? formatPrizePoolLabel({ current: tournament.prize_pool })
            : undefined,
        status: tournament.status
      })
    : null

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      {/* Crawlable English summary for bilingual SEO */}
      {tournament && (
        <div className="sr-only" lang="en">
          <h2>{tournament.title} – EA FC Pro Clubs tournament on PRO11</h2>
          <p>
            {stripSeoDescription(tournament.description_en || tournament.description) ||
              'Register and follow live Pro Clubs tournament matches on PRO11.'}
          </p>
          <a href={absoluteUrl(`/tournaments/${tournament.id}?lang=en`)}>
            View tournament in English
          </a>
          <a href={getSiteUrl()}>PRO11 Pro Clubs tournaments</a>
        </div>
      )}
      {children}
    </>
  )
}
