import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PRO11 - Pro Clubs Turneringer',
  description: 'Offisielle Pro Clubs-turneringer for FC 26. Meld på laget ditt og konkurrer mot de beste!',
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
            <p>© 2026 PRO11. En del av E-spårt AS.</p>
            <p>PRO11 er en uavhengig turneringsarrangør og har ingen tilknytning til Electronic Arts Inc.</p>
          </footer>
        </div>
      </body>
    </html>
  )
} 