import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/hall-of-fame',
  titleNo: 'Hall of Fame – Pro Clubs-vinnere',
  titleEn: 'Hall of Fame – Pro Clubs champions',
  descriptionNo:
    'Se vinnere, finalister og historikk fra PRO11 Pro Clubs-turneringer. Premiepotter og lag som bygde resultater over tid.',
  descriptionEn:
    'See champions, finalists and history from PRO11 Pro Clubs tournaments. Prize pools and teams that built lasting results.'
})

export default function HallOfFameLayout({ children }: { children: React.ReactNode }) {
  return children
}
