import { siteConfig } from '@/config/site'
import { Metadata } from 'next'

type MetadataProps = {
  page?: string
  title?: string
  description?: string
  keywords?: string[]
  images?: string[]
  noIndex?: boolean
  path?: string
  canonicalUrl?: string
}

const defaultKeywords: Record<string, string[]> = {
  Home: [
    'LinkedIn Pinpoint answer',
    'Crossclimb solution',
    'LinkedIn game answers today',
    'Zip puzzle answer',
    'Tango puzzle answer',
    'Queens game answer',
    'Patches puzzle answer',
    'LinkedIn games daily',
  ],
}

export function constructMetadata({
  page = 'Home',
  title = 'LinkedIn Answer Today',
  description = "Find today's answers for LinkedIn games — Pinpoint, Crossclimb, Zip, Tango, Queens, and Patches. Updated daily with solutions and explanations.",
  keywords,
  images = [],
  noIndex = false,
  path,
  canonicalUrl,
}: MetadataProps): Metadata {
  // build full title
  const finalTitle = page === 'Home'
    ? `${title} - Daily Game Solutions`
    : `${title} | LinkedIn Answer Today`

  // build image URLs
  const imageUrls = images.length > 0
    ? images.map(img => ({
      url: img.startsWith('http') ? img : `${siteConfig.url}/${img}`,
      alt: title,
    }))
    : [{
      url: `${siteConfig.url}/og.png`,
      alt: title,
    }]

  // Open Graph Site
  const pageURL = path ? `${siteConfig.url}${path}` : siteConfig.url

  return {
    title: finalTitle,
    description: description,
    keywords: keywords ?? defaultKeywords[page] ?? [],
    applicationName: 'LinkedIn Answer Today',
    authors: siteConfig.authors,
    creator: siteConfig.creator,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: canonicalUrl ? `${siteConfig.url}${canonicalUrl === '/' ? '' : canonicalUrl}` : undefined,
    },
    openGraph: {
      type: 'website',
      title: finalTitle,
      description: description,
      url: pageURL,
      siteName: 'LinkedIn Answer Today',
      locale: 'en',
      images: imageUrls,
    },
    twitter: {
      card: 'summary_large_image',
      title: finalTitle,
      description: description,
      site: `${siteConfig.url}${pageURL === '/' ? '' : pageURL}`,
      images: imageUrls,
      creator: siteConfig.creator,
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
      },
    },
  }
}