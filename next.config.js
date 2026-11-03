/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  serverExternalPackages: ['pdfkit'],
  async redirects() {
    return [
      {
        source: '/',
        has: [{ type: 'query', key: 'lang', value: 'en' }],
        destination: '/en',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
