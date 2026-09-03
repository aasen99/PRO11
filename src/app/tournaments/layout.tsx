import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/tournaments',
  titleNo: 'Pro Clubs-turneringer – påmelding og resultater',
  titleEn: 'Pro Clubs tournaments – registration and results',
  descriptionNo:
    'Se alle PRO11 Pro Clubs-turneringer i EA FC. Påmelding, live resultater, gruppespill, sluttspill og premiepotter.',
  descriptionEn:
    'Browse all PRO11 Pro Clubs tournaments for EA FC. Registration, live results, group stage, knockout and prize pools.'
})

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return children
}
