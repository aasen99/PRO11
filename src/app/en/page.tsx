import type { Metadata } from 'next'
import HomePage from '../page'
import { SEO_COPY } from '@/lib/seo'
import { absoluteUrl } from '@/lib/site'

const englishUrl = absoluteUrl('/en')
const norwegianUrl = absoluteUrl('/')

export const metadata: Metadata = {
  title: { absolute: SEO_COPY.en.defaultTitle },
  description: SEO_COPY.en.defaultDescription,
  keywords: [...SEO_COPY.en.keywords],
  alternates: {
    canonical: englishUrl,
    languages: {
      'nb-NO': norwegianUrl,
      en: englishUrl,
      'en-GB': englishUrl,
      'x-default': norwegianUrl
    }
  },
  openGraph: {
    title: SEO_COPY.en.defaultTitle,
    description: SEO_COPY.en.defaultDescription,
    url: englishUrl,
    siteName: 'PRO11',
    locale: 'en_GB',
    alternateLocale: ['nb_NO'],
    type: 'website',
    images: [{ url: absoluteUrl('/icon.png'), alt: 'PRO11' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_COPY.en.defaultTitle,
    description: SEO_COPY.en.defaultDescription,
    images: [absoluteUrl('/icon.png')]
  }
}

// Share the existing homepage design and tournament data with the Norwegian route.
// LanguageProvider renders English content immediately for /en, including SSR HTML.
export default function EnglishHomePage() {
  return <HomePage />
}
