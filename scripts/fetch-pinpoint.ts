import axios from "axios";
import fs from "fs";
import path from "path";

interface PinpointData {
  date: string;
  answer: string;
  clues: string[];
  number?: number;
}

// 解析日期格式：从 "2025-10-29" 或 "January 25, 2026" 转换为 YYYY-MM-DD
function parseDate(dateStr: string): string {
  // 如果已经是 YYYY-MM-DD 格式
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // 尝试解析 "January 25, 2026" 格式
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return dateStr;
}

// 从主页抓取当天答案和历史答案列表
async function fetchPinpointData(): Promise<{
  today: PinpointData | null;
  archives: PinpointData[];
}> {
  try {
    const response = await axios.get("https://pinpointanswer.today/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const html = response.data;
    const results: {
      today: PinpointData | null;
      archives: PinpointData[];
    } = {
      today: null,
      archives: [],
    };

    // 提取当天答案的线索
    const cluesMatch = html.match(
      /LinkedIn Pinpoint \d+ Clues:[\s\S]*?#1\s*([^#]+)#2\s*([^#]+)#3\s*([^#]+)#4\s*([^#]+)#5\s*([^<]+)/
    );

    // 提取当天日期
    const dateMatch = html.match(/Today's Pinpoint Answer \(([^)]+)\)/);
    const todayDate = dateMatch ? parseDate(dateMatch[1]) : null;

    // 提取 Pinpoint 编号
    const numberMatch = html.match(/LinkedIn Pinpoint #(\d+)/);
    const number = numberMatch ? parseInt(numberMatch[1]) : undefined;

    // 提取历史答案列表
    const archiveMatches = html.matchAll(
      /LinkedIn Pinpoint (\d+) : ([^<]+)\s+(\d{4}-\d{2}-\d{2})/g
    );

    for (const match of archiveMatches) {
      const [, num, cluesText, date] = match;
      const clues = cluesText
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      results.archives.push({
        date: parseDate(date),
        answer: "", // 需要从详情页获取
        clues,
        number: parseInt(num),
      });
    }

    // 如果有线索，创建当天答案对象
    if (cluesMatch && todayDate) {
      const clues = [
        cluesMatch[1].trim(),
        cluesMatch[2].trim(),
        cluesMatch[3].trim(),
        cluesMatch[4].trim(),
        cluesMatch[5].trim(),
      ];

      results.today = {
        date: todayDate,
        answer: "", // 需要从详情页获取
        clues,
        number,
      };
    }

    return results;
  } catch (error) {
    console.error("Error fetching Pinpoint data:", error);
    throw error;
  }
}

// 从详情页获取答案
async function fetchAnswerFromDetailPage(
  number: number
): Promise<string | null> {
  try {
    const url = `https://pinpointanswer.today/linkedin-pinpoint-answer/pinpoint-${number}/`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const html = response.data;

    // 尝试多种方式提取答案
    // 方式1: 查找答案文本
    const answerMatch =
      html.match(/LinkedIn Pinpoint \d+ Answer:[\s\S]*?([A-Z][^<]+)/i) ||
      html.match(/Answer:[\s\S]*?([A-Z][^<]+)/i) ||
      html.match(/The answer is:?\s*([^<]+)/i);

    if (answerMatch) {
      return answerMatch[1].trim();
    }

    return null;
  } catch (error) {
    console.error(`Error fetching answer for Pinpoint #${number}:`, error);
    return null;
  }
}

// 主函数
async function main() {
  console.log("开始抓取 Pinpoint 数据...");

  try {
    const { today, archives } = await fetchPinpointData();

    console.log(`找到 ${archives.length} 个历史答案`);

    // 获取当天答案
    if (today && today.number) {
      console.log(`正在获取当天答案 (Pinpoint #${today.number})...`);
      const answer = await fetchAnswerFromDetailPage(today.number);
      if (answer) {
        today.answer = answer;
        console.log(`当天答案: ${answer}`);
      }
    }

    // 获取历史答案（限制前10个以避免过多请求）
    const limitedArchives = archives.slice(0, 10);
    for (const archive of limitedArchives) {
      if (archive.number) {
        console.log(`正在获取 Pinpoint #${archive.number} 的答案...`);
        const answer = await fetchAnswerFromDetailPage(archive.number);
        if (answer) {
          archive.answer = answer;
        }
      }
    }

    // 合并所有答案
    const allAnswers = today ? [today, ...limitedArchives] : limitedArchives;

    // 转换为 GameAnswer 格式
    const gameAnswers = allAnswers
      .filter((a) => a.answer && a.date)
      .map((a) => ({
        date: a.date,
        answer: a.answer,
        clues: a.clues,
      }))
      .sort((a, b) => b.date.localeCompare(a.date)); // 按日期降序排列

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

    console.log(`\n成功保存 ${gameAnswers.length} 个答案到 ${filePath}`);
    console.log("\n答案列表:");
    gameAnswers.forEach((answer) => {
      console.log(`  ${answer.date}: ${answer.answer}`);
    });
  } catch (error) {
    console.error("抓取失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { fetchPinpointData, fetchAnswerFromDetailPage };
