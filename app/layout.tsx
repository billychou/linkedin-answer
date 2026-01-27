import BaiDuAnalytics from "@/app/BaiDuAnalytics";
import GoogleAdsense from "@/app/GoogleAdsense";
import GoogleAnalytics from "@/app/GoogleAnalytics";
import PlausibleAnalytics from "@/app/PlausibleAnalytics";
import Footer from "@/components/footer/Footer";
import Header from "@/components/header/Header";
import { TailwindIndicator } from "@/components/TailwindIndicator";
import { Toaster } from "@/components/ui/toaster";
import { siteConfig } from "@/config/site";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";
import "@/styles/loading.css";
import { Analytics } from "@vercel/analytics/react";
import { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";

export async function generateMetadata(): Promise<Metadata> {
  return constructMetadata({
    page: "Home",
    title: "LinkedIn Answer Today",
    description: "Download our app and enjoy new puzzles every day! Find today's answers for Pinpoint, Crossclimb, ZIP, Mini Sudoku, Queens, Tango, and more.",
    path: `/`,
    canonicalUrl: `/`,
  });
}

export const viewport: Viewport = {
  themeColor: siteConfig.themeColors,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
            <BaiDuAnalytics />
            <GoogleAnalytics />
            <GoogleAdsense />
            <PlausibleAnalytics />
          </>
        )}
      </body>
    </html>
  );
}
