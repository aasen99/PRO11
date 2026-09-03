import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/faq',
  titleNo: 'FAQ – Pro Clubs-turneringer',
  titleEn: 'FAQ – Pro Clubs tournaments',
  descriptionNo:
    'Svar på vanlige spørsmål om PRO11: påmelding, betaling, format, resultater, Discord og lagleder.',
  descriptionEn:
    'Answers to common questions about PRO11: registration, payment, format, results, Discord and team captains.'
})

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children
}
