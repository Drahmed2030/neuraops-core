import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

const PUBLIC_ROUTES = ['/', '/about', '/privacy', '/terms', '/security', '/responsible-ai', '/contact']

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteUrl().toString().replace(/\/$/, '')

  return PUBLIC_ROUTES.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.6,
  }))
}
