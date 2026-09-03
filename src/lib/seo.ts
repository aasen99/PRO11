import type { Metadata } from 'next'
import { absoluteUrl, getSiteUrl } from '@/lib/site'

const GEN_TAG_REGEX = /\[GEN:\s*(NEW GEN|OLD GEN|BOTH)\]/gi
const FORMAT_TAG_REGEX = /\[FORMAT\][\s\S]*?\[\/FORMAT\]/gi
const POT_PER_TEAM_TAG_REGEX = /\[POT_PER_TEAM:\d+\]/gi
const DEMO_TAG_REGEX = /\[DEMO\]/gi

export function stripSeoDescription(text?: string | null): string {
  if (!text?.trim()) return ''
  return text
    .replace(FORMAT_TAG_REGEX, '')
    .replace(GEN_TAG_REGEX, '')
    .replace(POT_PER_TEAM_TAG_REGEX, '')
    .replace(DEMO_TAG_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export const SITE_NAME = 'PRO11'

export const SEO_COPY = {
  no: {
    defaultTitle: 'PRO11 – Pro Clubs-turneringer i EA FC',
    defaultDescription:
      'Meld laget på Pro Clubs-turneringer i EA SPORTS FC. Live resultater, gruppespill, sluttspill, premiepotter og Hall of Fame – arrangert i Norge.',
    keywords: [
      'pro clubs turnering',
      'fc 26 pro clubs',
      'ea fc pro clubs',
      'pro clubs cup',
      'fifa pro clubs turnering',
      'pro clubs norway',
      'pro clubs norge',
      'e-sport turnering',
      'PRO11'
    ]
  },
  en: {
    defaultTitle: 'PRO11 – EA FC Pro Clubs Tournaments',
    defaultDescription:
      'Register your Pro Clubs team for EA SPORTS FC tournaments. Live results, group stage, knockout, prize pools and Hall of Fame — run from Norway.',
    keywords: [
      'pro clubs tournament',
      'fc 26 pro clubs',
      'ea fc pro clubs tournament',
      'pro clubs cup',
      'fifa pro clubs tournament',
      'pro clubs norway',
      'esports tournament',
      'PRO11'
    ]
  }
} as const

export function languageAlternates(path: string): Metadata['alternates'] {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const noUrl = absoluteUrl(cleanPath)
  const enUrl = `${noUrl}${cleanPath.includes('?') ? '&' : '?'}lang=en`

  return {
    canonical: noUrl,
    languages: {
      'nb-NO': noUrl,
      no: noUrl,
      en: enUrl,
      'en-GB': enUrl,
      'x-default': noUrl
    }
  }
}

export function buildPageMetadata(options: {
  path: string
  titleNo: string
  titleEn: string
  descriptionNo: string
  descriptionEn: string
  imagePath?: string
  noIndex?: boolean
}): Metadata {
  const title = options.titleNo
  const description = options.descriptionNo
  const url = absoluteUrl(options.path)
  const image = absoluteUrl(options.imagePath || '/icon.png')

  return {
    title,
    description,
    keywords: [...SEO_COPY.no.keywords, ...SEO_COPY.en.keywords],
    alternates: languageAlternates(options.path),
    robots: options.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'nb_NO',
      alternateLocale: ['en_US', 'en_GB'],
      type: 'website',
      images: [{ url: image, alt: SITE_NAME }]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image]
    },
    other: {
      'og:locale:alternate': 'en_US',
      'content-language': 'nb,en'
    }
  }
}

export function organizationJsonLd() {
  const url = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PRO11',
    legalName: 'E-spårt AS',
    url,
    logo: absoluteUrl('/icon.png'),
    description: SEO_COPY.no.defaultDescription,
    sameAs: ['https://discord.gg/Es8UAkax8H'],
    areaServed: ['NO', 'Worldwide'],
    knowsLanguage: ['nb', 'en']
  }
}

export function websiteJsonLd() {
  const url = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PRO11',
    url,
    inLanguage: ['nb-NO', 'en'],
    description: SEO_COPY.no.defaultDescription,
    publisher: {
      '@type': 'Organization',
      name: 'PRO11'
    }
  }
}

export function sportsEventJsonLd(input: {
  id: string
  name: string
  description?: string
  startDate?: string | null
  endDate?: string | null
  prize?: string | null
  status?: string | null
}) {
  const url = absoluteUrl(`/tournaments/${input.id}`)
  const eventStatus =
    input.status === 'active' || input.status === 'ongoing'
      ? 'https://schema.org/EventScheduled'
      : input.status === 'completed' || input.status === 'archived'
        ? 'https://schema.org/EventScheduled'
        : 'https://schema.org/EventScheduled'

  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: input.name,
    description: stripSeoDescription(input.description) || SEO_COPY.no.defaultDescription,
    url,
    image: absoluteUrl('/icon.png'),
    startDate: input.startDate || undefined,
    endDate: input.endDate || undefined,
    eventStatus,
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      url
    },
    organizer: {
      '@type': 'Organization',
      name: 'PRO11',
      url: getSiteUrl()
    },
    sport: 'EA SPORTS FC Pro Clubs',
    inLanguage: ['nb-NO', 'en']
  }
}
