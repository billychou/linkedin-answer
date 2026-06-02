import { siteConfig } from '@/config/site'
import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'
export const revalidate = false

const siteUrl = siteConfig.url

export async function GET(): Promise<Response> {
  const robots: MetadataRoute.Robots = {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/_next/',
        '/cdn-cgi/',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`
  }

  const robotsTxt = `User-agent: *
Allow: /
Disallow: /_next/
Disallow: /cdn-cgi/

Sitemap: ${siteUrl}/sitemap.xml
`

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
