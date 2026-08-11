import type { Metadata } from 'next'
import type { ReactNode } from 'react'

type Params = { id: string }

export async function generateMetadata({
  params
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://www.pro11.no'
  const resolvedParams = await params
  const id = resolvedParams.id

  try {
    const res = await fetch(`${baseUrl}/api/tournaments?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
    if (!res.ok) return { title: `PRO11 – Tournament` }
    const data = await res.json()
    const tournament = data?.tournament
    if (!tournament) return { title: `PRO11 – Tournament` }

    const title = `${tournament.title} – PRO11`
    const description = `Kamper og resultater for ${tournament.title}. Premie: ${tournament.prize}.`

    const url = `${baseUrl}/tournaments/${encodeURIComponent(id)}`
    const imageUrl = `${baseUrl}/icon.png`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        images: [{ url: imageUrl }]
      }
    }
  } catch {
    return { title: `PRO11 – Tournament` }
  }
}

export default function TournamentLayout({ children }: { children: ReactNode }) {
  return children
}

