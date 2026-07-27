import GoogleAdsense from "@/app/GoogleAdsense";
import GoogleAnalytics from "@/app/GoogleAnalytics";
import Footer from "@/components/footer/Footer";
import Header from "@/components/header/Header";
import { TailwindIndicator } from "@/components/TailwindIndicator";
import { Toaster } from "@/components/ui/toaster";
import { siteConfig } from "@/config/site";
import { getAllGames } from "@/lib/games";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";
import "@/styles/loading.css";
import { Analytics } from "@vercel/analytics/react";
import { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";

/**
 * 生成页面元数据，用于 SEO 优化
 */
export async function generateMetadata(): Promise<Metadata> {
  return constructMetadata({
    page: "Home",
    title: "LinkedIn Answer Today",
    description: "Find today's answers for Pinpoint, Crossclimb, ZIP, Queens, Tango, and more. Updated daily with solutions and explanations.",
    path: `/`,
    canonicalUrl: `/`,
  });
}

export const viewport: Viewport = {
  themeColor: siteConfig.themeColors,
};

async function generateSiteJsonLd() {
  const games = getAllGames();
  const navElements = games.map((game) => ({
    "@type": "SiteNavigationElement",
    name: game.name,
    url: `${siteConfig.url}/games/${game.slug}`,
    description: game.description,
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "LinkedIn Answer Today",
        url: siteConfig.url,
        description: siteConfig.description,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteConfig.url}/games/{search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        name: "LinkedIn Answer Today",
        url: siteConfig.url,
        sameAs: [
          siteConfig.socialLinks?.github,
          siteConfig.socialLinks?.twitter,
          siteConfig.socialLinks?.bluesky,
        ].filter(Boolean),
      },
      ...navElements,
    ],
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteJsonLd = await generateSiteJsonLd();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href={siteConfig.icons.icon} sizes="any" />
        <link rel="apple-touch-icon" href={siteConfig.icons.apple} />
        <link rel="shortcut icon" href={siteConfig.icons.shortcut} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3410962713385660" crossOrigin="anonymous">
        </script>
      </head>
      <body
        className={cn(
          "min-h-screen bg-background flex flex-col font-sans antialiased"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme={siteConfig.defaultNextTheme}
          enableSystem
        >
          <Header />
          <main className="flex-1 flex flex-col items-center">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
        <Toaster />
        <TailwindIndicator />
        {process.env.NODE_ENV === "development" ? (
          <></>
        ) : (
          <>
            <Analytics />
            <GoogleAnalytics />
            <GoogleAdsense />
          </>
        )}
      </body>
    </html>
  );
}
