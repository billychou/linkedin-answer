import GoogleAdsense from "@/app/GoogleAdsense";
import GoogleAnalytics from "@/app/GoogleAnalytics";
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

/**
 * 生成页面元数据，用于 SEO 优化
 * generateMetadata 函数是 Next.js 框架提供的，用于生成页面元数据
 * @returns {Promise<Metadata>} 返回包含页面标题、描述等信息的元数据对象
 */
export async function generateMetadata(): Promise<Metadata> {
  return constructMetadata({
    page: "Home",
    title: "LinkedIn Answer Today",
    description: "Find today's answers for Pinpoint, Crossclimb, ZIP, Mini Sudoku, Queens, Tango, and more.",
    path: `/`,
    canonicalUrl: `/`,
  });
}

/**
 * 设置页面视口，用于响应式设计
 * @type {Viewport}
 */
export const viewport: Viewport = {
  themeColor: siteConfig.themeColors,
};

/**
 * 根布局组件，包含页面的公共部分，如头部、底部和尾部
 * @param {React.ReactNode} children - 页面的子组件，即页面的主体内容
 * @returns {JSX.Element} 返回包含公共部分和子组件的根布局
 */
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
            <GoogleAnalytics />
            <GoogleAdsense />
          </>
        )}
      </body>
    </html>
  );
}
