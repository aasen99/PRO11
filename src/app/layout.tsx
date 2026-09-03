import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/components/LanguageProvider'
import Footer from '@/components/Footer'
import CookieConsentProvider from '@/components/CookieConsentProvider'
import JsonLd from '@/components/JsonLd'
import {
  buildPageMetadata,
  organizationJsonLd,
  SEO_COPY,
  websiteJsonLd
} from '@/lib/seo'
import { getSiteUrl } from '@/lib/site'

const inter = Inter({ subsets: ['latin'] })

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  ...buildPageMetadata({
    path: '/',
    titleNo: SEO_COPY.no.defaultTitle,
    titleEn: SEO_COPY.en.defaultTitle,
    descriptionNo: SEO_COPY.no.defaultDescription,
    descriptionEn: SEO_COPY.en.defaultDescription
  }),
  title: {
    default: SEO_COPY.no.defaultTitle,
    template: '%s | PRO11'
  },
  applicationName: 'PRO11',
  authors: [{ name: 'PRO11 / E-spårt AS' }],
  creator: 'PRO11',
  publisher: 'E-spårt AS',
  category: 'sports',
  icons: {
    icon: [
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-64.png', type: 'image/png', sizes: '64x64' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' }
    ],
    shortcut: '/favicon-64.png',
    apple: '/apple-icon.png'
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nb">
      <body className={`${inter.className} bg-slate-900 text-white min-h-screen`}>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <LanguageProvider>
          <CookieConsentProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
          </CookieConsentProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
