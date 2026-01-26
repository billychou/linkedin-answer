import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ⚠️ 重要提示：启用静态导出后，API Routes (app/api/*) 将无法工作
  // 如果需要 API Routes，请移除 output: "export" 并使用 Cloudflare Pages Functions
  output: "export", // 启用静态导出，输出到 out 目录
  images: {
    unoptimized: true, // 静态导出需要禁用图片优化
    remotePatterns: [
      ...(process.env.R2_PUBLIC_URL
        ? [
            {
              hostname: process.env.R2_PUBLIC_URL.replace("https://", ""),
            },
          ]
        : []),
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error"],
          }
        : false,
  },
};

export default withNextIntl(nextConfig);
