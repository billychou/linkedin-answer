/**
 * ESLint flat config（ESLint 9 / Next 16）。
 * 旧版 `next lint` 已在 Next 16 移除，改用 `eslint .` + eslint-config-next
 * 提供的 flat config（等价于原 `.eslintrc.json` 的 next/core-web-vitals）。
 */
import nextConfig from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      // react-hooks v6 新增规则:对"mount 标记""挂载后拉数据"等成熟模式
      // (含 Next.js 官方文档示例)误报较多,本项目降级为警告。
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // 构建产物与运行时状态目录不参与 lint。
    ignores: [
      "out/**",
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      ".venv/**",
      "node_modules/**",
    ],
  },
];

export default eslintConfig;
