/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用静态导出，输出到 out 目录
  output: "export",
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

export default nextConfig;
