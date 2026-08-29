import { SiteConfig } from "@/types/siteConfig";

export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://linkedinanswer.today";

const EMAIL_URL = 'zsc1528@gmail.com'
const GITHUB_URL = 'https://github.com/billychou'
const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL

export const siteConfig: SiteConfig = {
  name: "LinkedIn Answer Today",
  tagLine: 'LinkedIn Answer Today',
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
    github: GITHUB_URL,
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
