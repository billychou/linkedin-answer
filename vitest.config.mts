import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // 关键路径单测跑在 Node 上；Workers 专有能力（D1 绑定等）由
    // tests/unit/helpers/fakeD1.ts 用 sql.js 提供真实 SQLite 语义。
  },
});
