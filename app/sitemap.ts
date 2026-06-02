import { siteConfig } from '@/config/site'
import { getGameSlugs } from '@/lib/games'
import { getPosts } from '@/lib/getBlogs'
import { getAllAnswers } from '@/lib/answers'
import { MetadataRoute } from 'next'

export const dynamic = 'force-static'
export const revalidate = false

const siteUrl = siteConfig.url

type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' | undefined

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const pages = [
    { path: '', changeFrequency: 'daily' as ChangeFrequency, priority: 1.0 },
    { path: '/blog', changeFrequency: 'daily' as ChangeFrequency, priority: 0.8 },
    { path: '/about', changeFrequency: 'monthly' as ChangeFrequency, priority: 0.5 },
    { path: '/privacy-policy', changeFrequency: 'monthly' as ChangeFrequency, priority: 0.3 },
    { path: '/terms-of-service', changeFrequency: 'monthly' as ChangeFrequency, priority: 0.3 },
  ].map(page => ({
    url: `${siteUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  // Generate game hub pages
  const gameSlugs = getGameSlugs()
  const gamePages = gameSlugs.flatMap(slug => [
    {
      url: `${siteUrl}/games/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as ChangeFrequency,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/games/${slug}/archives`,
      lastModified: new Date(),
      changeFrequency: 'daily' as ChangeFrequency,
      priority: 0.7,
    },
    {
      url: `${siteUrl}/games/${slug}/how-to-play`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    },
  ])

  // Generate individual game date pages with actual dates
  const gameDatePages = gameSlugs.flatMap(slug => {
    const answers = getAllAnswers(slug as any)
    return answers.map(answer => ({
      url: `${siteUrl}/games/${slug}/${answer.date}`,
      lastModified: new Date(answer.date),
      changeFrequency: 'never' as ChangeFrequency,
      priority: 0.8,
    }))
  })

  const { posts } = await getPosts('en')
  const blogPosts = posts.map(post => ({
    url: `${siteUrl}/blog${post.slug}`,
    lastModified: post.metadata.updatedAt || post.date,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [
    ...pages,
    ...gamePages,
    ...gameDatePages,
    ...blogPosts,
  ]
}