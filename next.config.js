/** @type {import('next').NextConfig} */
// Sjekk at ADMIN_PASSWORD er satt i produksjon (f.eks. Vercel) – ellers feiler build
if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD?.trim()) {
  throw new Error(
    'ADMIN_PASSWORD er ikke satt. Legg til Environment Variable i Vercel: Settings → Environment Variables → ADMIN_PASSWORD (Production), deretter Redeploy.'
  )
}

const nextConfig = {
  images: {
    domains: [],
  },
}

module.exports = nextConfig 