import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/register',
  titleNo: 'Meld på lag – Pro Clubs-turnering',
  titleEn: 'Register your team – Pro Clubs tournament',
  descriptionNo:
    'Registrer Pro Clubs-laget ditt til en PRO11-turnering. Lagleder, spillere, betaling og lagpassord på ett sted.',
  descriptionEn:
    'Register your Pro Clubs team for a PRO11 tournament. Captain, players, payment and team password in one place.'
})

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
