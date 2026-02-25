# Pinpoint 数据抓取脚本

## 功能说明

这些脚本用于从 https://pinpointanswer.today/ 抓取 LinkedIn Pinpoint 游戏的当天答案和历史答案数据。

## 使用方法

### 方法 1: 使用 Python 脚本直接更新（推荐）

1. 安装 Python 依赖：
   ```bash
   pip3 install --break-system-packages requests beautifulsoup4 icecream json5
   ```

2. （可选）配置 AI API 以生成更智能的提示：
   ```bash
   # 方式 1: 使用 DeepSeek API（推荐，更便宜）
   export DEEPSEEK_API_KEY="your-deepseek-api-key"
   
   # 方式 2: 使用 OpenAI API
   export OPENAI_API_KEY="your-openai-api-key"
   ```
   
   **注意**：如果不配置 API key，脚本会使用简单的 fallback 生成提示（功能正常但提示较简单）。

3. 运行 Python 脚本：
   ```bash
   python3 data/update/update_pinpoint.py
   ```

4. 脚本会自动：
   - 抓取今日 Pinpoint 答案和线索
   - 使用 AI 生成有意义的提示文本（如果配置了 API）
   - 更新 `data/answers/pinpoint.ts` 文件
   - 显示更新结果

### 方法 2: 通过 API 路由

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

### 方法 3: 使用更新脚本

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

## AI 提示生成配置

脚本支持使用 AI 自动生成更有意义的 clueHint，解释每个线索与答案的关系。

### 支持的 AI 服务

1. **DeepSeek API**（推荐，成本更低）
   - 获取 API Key: https://platform.deepseek.com/
   - 设置环境变量: `export DEEPSEEK_API_KEY="your-key"`
   - 使用模型: `deepseek-chat`

2. **OpenAI API**
   - 获取 API Key: https://platform.openai.com/
   - 设置环境变量: `export OPENAI_API_KEY="your-key"`
   - 使用模型: `gpt-4o-mini`

### Fallback 模式

如果没有配置 API key，脚本会自动使用 fallback 模式，生成简单的提示文本。功能完全正常，只是提示内容会比较基础。

## 示例输出

### 使用 AI 生成的 clueHint 示例：

```html
<p>Here is how each clue relates to that word:<br>
<strong>Tailfin:</strong> The tailfin is the rear stabilizing fin that controls direction and keeps the airship steady during flight.<br>
<strong>Gondola:</strong> The gondola is the passenger compartment suspended beneath the blimp's envelope, where crew and passengers ride.<br>
<strong>Propeller:</strong> Propellers provide forward thrust and directional control, allowing the blimp to navigate through the air.<br>
<strong>Ballonets (inflatable bags):</strong> Ballonets are internal air-filled bags that help maintain the blimp's shape and control altitude by adjusting internal pressure.<br>
<strong>Helium gas envelope:</strong> The helium gas envelope is the massive outer shell containing lighter-than-air gas that provides lift to the entire structure.</p>
```

### Fallback 模式生成的简单 clueHint：

```html
<p>Here is how each clue relates to that word:<br>
<strong>Tailfin:</strong> Tailfin is one of the clues.<br>
<strong>Gondola:</strong> Gondola is one of the clues.<br>
<strong>Propeller:</strong> Propeller is one of the clues.<br>
<strong>Ballonets (inflatable bags):</strong> Ballonets (inflatable bags) is one of the clues.<br>
<strong>Helium gas envelope:</strong> Helium gas envelope is one of the clues.</p>
```

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
