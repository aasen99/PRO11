import type { Metadata } from 'next'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PRO11 - Pro Clubs Turneringer',
  description: 'PRO11 er en turneringsplattform for Pro Clubs i FC 26. Gruppespill, sluttspill og kamper som betyr noe.',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' }
    ],
    shortcut: '/favicon.png',
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
          <main className="flex-1">
          {children}
          </main>
          <footer className="py-8 text-center text-xs text-slate-500">
            <div className="flex flex-wrap items-center justify-center gap-4 mb-3">
              <Link href="/faq" className="hover:text-slate-300 transition-colors">FAQ</Link>
              <Link href="/rules" className="hover:text-slate-300 transition-colors">Regler</Link>
              <Link href="/kjopsvilkar" className="hover:text-slate-300 transition-colors">Kjøpsvilkår</Link>
              <Link href="/personvern" className="hover:text-slate-300 transition-colors">Personvern</Link>
            </div>
            <p>© 2026 PRO11. En del av E-spårt AS.</p>
            <p>PRO11 er en uavhengig turneringsarrangør og har ingen tilknytning til Electronic Arts Inc.</p>
          </footer>
        </div>
      </body>
    </html>
  )
} 