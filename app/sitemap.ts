import { siteConfig } from '@/config/site'
import { getGameSlugs } from '@/lib/games'
import { getPosts } from '@/lib/getBlogs'
import { MetadataRoute } from 'next'

export const dynamic = 'force-static'
export const revalidate = false

const siteUrl = siteConfig.url

type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' | undefined

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const pages = [
    '',
    '/blog',
    '/about',
    '/privacy-policy',
    '/terms-of-service',
  ].map(page => ({
    url: `${siteUrl}${page}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as ChangeFrequency,
    priority: page === '' ? 1.0 : 0.8,
  }))

  // Generate game pages
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
      priority: 0.8,
    },
    {
      url: `${siteUrl}/games/${slug}/how-to-play`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.7,
    },
  ])

  const { posts } = await getPosts('en')
  const blogPosts = posts.map(post => ({
    url: `${siteUrl}/blog${post.slug}`,
    lastModified: post.metadata.updatedAt || post.date,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  return [
    ...pages,
    ...gamePages,
    ...blogPosts,
  ]
}