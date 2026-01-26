/**
 * 更新 Pinpoint 数据脚本
 * 
 * 使用方法:
 * 1. 访问 http://localhost:3000/api/fetch-pinpoint 获取数据
 * 2. 或者运行: npx tsx scripts/update-pinpoint-data.ts
 */

import fs from "fs";
import path from "path";

interface PinpointData {
  date: string;
  answer: string;
  clues: string[];
  number?: number;
}

// 从 API 获取数据并更新文件
async function updatePinpointData() {
  try {
    // 如果作为脚本运行，需要调用 API
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/fetch-pinpoint`);

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "抓取失败");
    }

    const data: PinpointData[] = result.data;

    // 转换为 GameAnswer 格式
    const gameAnswers = data.map((item) => ({
      date: item.date,
      answer: item.answer,
      clues: item.clues.length > 0 ? item.clues : undefined,
    }));

    // 保存到文件
    const filePath = path.join(
      process.cwd(),
      "data/answers/pinpoint.ts"
    );

    const fileContent = `import { GameAnswer } from "@/types/game";

export const pinpointAnswers: GameAnswer[] = ${JSON.stringify(
      gameAnswers,
      null,
      2
    ).replace(/"/g, '"')};
`;

    fs.writeFileSync(filePath, fileContent, "utf-8");

    console.log(`\n✅ 成功更新 ${gameAnswers.length} 个答案到 ${filePath}`);
    console.log("\n答案列表:");
    gameAnswers.forEach((answer) => {
      console.log(`  ${answer.date}: ${answer.answer}`);
      if (answer.clues) {
        console.log(`    线索: ${answer.clues.join(", ")}`);
      }
    });
  } catch (error: any) {
    console.error("❌ 更新失败:", error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  updatePinpointData();
}

export { updatePinpointData };
