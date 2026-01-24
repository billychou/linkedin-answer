import { SiteConfig } from "@/types/siteConfig";

export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nextjsstarter.io";

export const SOURCE_CODE_URL = "https://github.com/weijunext/nextjs-starter";
export const PRO_VERSION = "https://nexty.dev";

const TWITTER_URL = 'https://x.com/weijunext'
const BSKY_URL = 'https://bsky.app/profile/judewei.bsky.social'
const EMAIL_URL = 'zsc1528@gmail.com'
const GITHUB_URL = 'https://github.com/billychou'
const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL

export const siteConfig: SiteConfig = {
  name: "LinkedIn Game Answers Today",
  tagLine: 'Daily LinkedIn Ansers Puzzles',
  description:
    "Find today's answers for Pinpoint, Crossclimb, ZIP, Queens, Tango, and more. Enjoy puzzles every day!",
  url: BASE_URL,
  authors: [
    {
      name: "zsc1528",
      url: "https://github.com/billychou",
    }
  ],
  creator: '@zsc1528',
  socialLinks: {
    discord: DISCORD_URL,
    twitter: TWITTER_URL,
    github: GITHUB_URL,
    bluesky: BSKY_URL,
    email: EMAIL_URL
  },
  themeColors: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  defaultNextTheme: 'system', // next-theme option: system | dark | light
  icons: {
    icon: "/favicon.ico",
    shortcut: "/logo.png",
    apple: "/logo.png", // apple-touch-icon.png
  },
}
