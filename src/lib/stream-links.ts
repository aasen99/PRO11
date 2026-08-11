export type StreamService = 'twitch' | 'youtube' | 'kick'

export const STREAM_SERVICES: StreamService[] = ['twitch', 'youtube', 'kick']

export const MAX_STREAMS_PER_TEAM = 10

export interface ParsedStreamLink {
  service: StreamService
  normalizedUrl: string
  canonicalUrl: string
}

const SERVICE_HOSTS: Record<StreamService, string[]> = {
  twitch: ['twitch.tv', 'www.twitch.tv', 'm.twitch.tv'],
  youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
  kick: ['kick.com', 'www.kick.com']
}

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, '')
}

function parseHostname(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) return null
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    return new URL(withProtocol)
  } catch {
    return null
  }
}

function hostMatches(hostname: string, allowed: string[]) {
  const host = hostname.toLowerCase()
  return allowed.some(entry => host === entry || host.endsWith(`.${entry}`))
}

function parseTwitch(url: URL): ParsedStreamLink | null {
  const host = url.hostname.toLowerCase()
  if (!hostMatches(host, SERVICE_HOSTS.twitch)) return null

  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  const blocked = new Set(['directory', 'videos', 'clip', 'clips', 'settings', 'downloads'])
  if (blocked.has(segments[0].toLowerCase())) return null

  const channel = segments[0].toLowerCase()
  if (!/^[a-z0-9_]{2,25}$/i.test(channel)) return null

  const canonicalUrl = `https://www.twitch.tv/${channel}`
  return {
    service: 'twitch',
    normalizedUrl: canonicalUrl.toLowerCase(),
    canonicalUrl
  }
}

function parseYouTube(url: URL): ParsedStreamLink | null {
  const host = url.hostname.toLowerCase()
  if (!hostMatches(host, SERVICE_HOSTS.youtube)) return null

  let videoId: string | null = null

  if (host === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] || null
  } else {
    videoId = url.searchParams.get('v')
    if (!videoId) {
      const segments = url.pathname.split('/').filter(Boolean)
      const liveIndex = segments.findIndex(part => part.toLowerCase() === 'live')
      if (liveIndex >= 0 && segments[liveIndex + 1]) {
        videoId = segments[liveIndex + 1]
      }
    }
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) return null

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`
  return {
    service: 'youtube',
    normalizedUrl: canonicalUrl.toLowerCase(),
    canonicalUrl
  }
}

function parseKick(url: URL): ParsedStreamLink | null {
  const host = url.hostname.toLowerCase()
  if (!hostMatches(host, SERVICE_HOSTS.kick)) return null

  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  const blocked = new Set(['video', 'videos', 'categories', 'browse'])
  if (blocked.has(segments[0].toLowerCase())) return null

  const channel = segments[0].toLowerCase()
  if (!/^[a-z0-9_-]{2,30}$/i.test(channel)) return null

  const canonicalUrl = `https://kick.com/${channel}`
  return {
    service: 'kick',
    normalizedUrl: stripTrailingSlash(canonicalUrl.toLowerCase()),
    canonicalUrl: stripTrailingSlash(canonicalUrl)
  }
}

export function parseStreamLink(rawUrl: string, expectedService: StreamService): ParsedStreamLink | null {
  const url = parseHostname(rawUrl)
  if (!url) return null

  const parsers: Record<StreamService, (u: URL) => ParsedStreamLink | null> = {
    twitch: parseTwitch,
    youtube: parseYouTube,
    kick: parseKick
  }

  const parsed = parsers[expectedService](url)
  if (!parsed || parsed.service !== expectedService) return null
  return parsed
}

export function getStreamServiceLabel(service: StreamService, isEnglish: boolean) {
  if (service === 'twitch') return 'Twitch'
  if (service === 'youtube') return 'YouTube'
  return 'Kick'
}
