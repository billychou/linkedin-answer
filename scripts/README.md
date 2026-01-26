# Pinpoint 数据抓取脚本

## 功能说明

这些脚本用于从 https://pinpointanswer.today/ 抓取 LinkedIn Pinpoint 游戏的当天答案和历史答案数据。

## 使用方法

### 方法 1: 通过 API 路由（推荐）

1. 启动开发服务器：
   ```bash
   pnpm dev
   ```

2. 访问 API 端点获取数据：
   ```
   http://localhost:3000/api/fetch-pinpoint
   ```

3. API 会返回 JSON 格式的数据，包含：
   - 当天答案（包括线索和答案）
   - 历史答案列表（最多10个）

### 方法 2: 使用更新脚本

1. 确保开发服务器正在运行

2. 运行更新脚本：
   ```bash
   npx tsx scripts/update-pinpoint-data.ts
   ```

   或者如果已安装 tsx：
   ```bash
   tsx scripts/update-pinpoint-data.ts
   ```

3. 脚本会自动：
   - 调用 API 获取数据
   - 更新 `data/answers/pinpoint.ts` 文件
   - 显示更新结果

## 数据结构

抓取的数据会转换为以下格式：

```typescript
{
  date: "2025-01-25",  // YYYY-MM-DD 格式
  answer: "Water",      // 答案
  clues: [              // 5个线索（可选）
    "Hot",
    "Spring",
    "Fresh",
    "Sparkling",
    "Distilled"
  ]
}
```

## 注意事项

1. **抓取限制**：为了避免过多请求，脚本默认只抓取最近10个历史答案
2. **答案提取**：由于网站可能需要点击才能显示答案，某些答案可能无法自动提取
3. **频率限制**：建议不要过于频繁地调用 API，以免对目标网站造成压力
4. **错误处理**：如果某个答案无法获取，会跳过并继续处理其他答案

## 手动更新

如果自动抓取失败，可以手动编辑 `data/answers/pinpoint.ts` 文件来添加或更新答案数据。

## 示例

API 返回格式：

```json
{
  "success": true,
  "count": 11,
  "data": [
    {
      "date": "2025-01-25",
      "answer": "Water",
      "clues": ["Hot", "Spring", "Fresh", "Sparkling", "Distilled"],
      "number": 547
    },
    ...
  ]
}
```
