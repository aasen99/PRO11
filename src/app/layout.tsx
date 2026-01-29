import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/components/LanguageProvider'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PRO11 - Pro Clubs Turneringer',
  description: 'PRO11 er en turneringsplattform for Pro Clubs i FC 26. Gruppespill, sluttspill og kamper som betyr noe.',
  icons: {
    icon: [
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-64.png', type: 'image/png', sizes: '64x64' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' }
    ],
    shortcut: '/favicon-64.png',
    apple: '/apple-icon.png'
  },
  openGraph: {
    title: 'PRO11 - Pro Clubs Turneringer',
    description: 'PRO11 er en turneringsplattform for Pro Clubs i FC 26. Gruppespill, sluttspill og kamper som betyr noe.',
    images: ['/icon.png'],
    type: 'website'
  },
  twitter: {
    card: 'summary',
    title: 'PRO11 - Pro Clubs Turneringer',
    description: 'PRO11 er en turneringsplattform for Pro Clubs i FC 26. Gruppespill, sluttspill og kamper som betyr noe.',
    images: ['/icon.png']
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no">
      <body className={`${inter.className} bg-slate-900 text-white min-h-screen`}>
        <LanguageProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </LanguageProvider>
      </body>
    </html>
  )
} 