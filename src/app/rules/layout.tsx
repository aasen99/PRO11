import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/rules',
  titleNo: 'Turneringsregler for Pro Clubs',
  titleEn: 'Tournament rules for Pro Clubs',
  descriptionNo:
    'Offisielle PRO11-regler for Pro Clubs-turneringer: gruppespill, resultater, walkover, check-in og fair play.',
  descriptionEn:
    'Official PRO11 rules for Pro Clubs tournaments: group stage, results, walkover, check-in and fair play.'
})

export default function RulesLayout({ children }: { children: React.ReactNode }) {
  return children
}
