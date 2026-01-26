import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // 确保 middleware 使用 Edge Runtime
  // OpenNext 会自动检测并处理 Edge Middleware
});