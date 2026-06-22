import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/pricing'],
      disallow: ['/interview', '/technical', '/profile', '/sign-in', '/sign-up', '/api/'],
    },
  }
}
