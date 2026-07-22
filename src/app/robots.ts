import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '') ?? 'https://cremona.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/onboarding/', '/api/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
