import { siteConfig } from '@/config/site'

export const dynamic = 'force-static'
export const revalidate = false

const siteUrl = siteConfig.url

// AI assistants are a real traffic source for "today's answer" queries:
// their citations link back to us, so crawl access is granted explicitly.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
  'Amazonbot',
  'Applebot-Extended',
  'DuckAssistBot',
  'cohere-ai',
]

export async function GET(): Promise<Response> {
  const aiRules = AI_CRAWLERS.map(
    (agent) => `User-agent: ${agent}\nAllow: /`
  ).join('\n\n')

  const robotsTxt = `User-agent: *
Allow: /
Disallow: /_next/
Disallow: /cdn-cgi/
Disallow: /api/
Disallow: /chat
Disallow: /login
Disallow: /settings
Disallow: /admin

${aiRules}

Sitemap: ${siteUrl}/sitemap.xml
`

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
