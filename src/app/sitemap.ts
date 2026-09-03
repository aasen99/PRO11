import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'
import { fetchTournamentsForSeo } from '@/lib/tournaments-server'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1
    },
    {
      url: absoluteUrl('/tournaments'),
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.95
    },
    {
      url: absoluteUrl('/register'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: absoluteUrl('/hall-of-fame'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.75
    },
    {
      url: absoluteUrl('/rules'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6
    },
    {
      url: absoluteUrl('/faq'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6
    },
    {
      url: absoluteUrl('/kjopsvilkar'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3
    },
    {
      url: absoluteUrl('/personvern'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3
    }
  ]

  const tournaments = await fetchTournamentsForSeo()
  const tournamentRoutes: MetadataRoute.Sitemap = tournaments
    .filter(t => !t.isDemo)
    .map(t => ({
      url: absoluteUrl(`/tournaments/${t.id}`),
      lastModified: t.updated_at ? new Date(t.updated_at) : now,
      changeFrequency:
        t.status === 'active' || t.status === 'upcoming' ? 'hourly' : 'weekly',
      priority: t.status === 'active' || t.status === 'upcoming' ? 0.9 : 0.55
    }))

  return [...staticRoutes, ...tournamentRoutes]
}
