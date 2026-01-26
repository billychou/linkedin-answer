import { NextResponse } from "next/server";
import axios from "axios";

interface PinpointData {
  date: string;
  answer: string;
  clues: string[];
  number?: number;
}

// 解析日期格式
function parseDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return dateStr;
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
      timeout: 10000,
    });

    const html = response.data;

    // 尝试多种方式提取答案
    const patterns = [
      // 查找答案在按钮或显示区域中
      /Click to reveal the answer[\s\S]*?revealed[^>]*>([^<]+)</i,
      /Answer:[\s\S]*?<[^>]*class="[^"]*answer[^"]*"[^>]*>([^<]+)</i,
      /LinkedIn Pinpoint \d+ Answer:[\s\S]*?<strong[^>]*>([^<]+)<\/strong>/i,
      /Answer:[\s\S]*?<strong[^>]*>([^<]+)<\/strong>/i,
      /The answer is:?\s*<strong[^>]*>([^<]+)<\/strong>/i,
      // 查找标题中的答案提示
      /What connects[^?]+\?[\s\S]*?Answer:?\s*([A-Z][A-Za-z\s]+)/i,
      // 查找页面标题或描述中的答案
      /pinpoint[^:]*:\s*([A-Z][A-Za-z\s]+)/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let answer = match[1].trim();
        // 清理 HTML 实体和标签
        answer = answer.replace(/&[^;]+;/g, "").replace(/<[^>]+>/g, "");
        if (answer.length > 0 && answer.length < 100 && /^[A-Z]/.test(answer)) {
          return answer;
        }
      }
    }

    // 如果找不到，尝试从 URL 或页面结构推断
    // 某些页面可能在 JavaScript 中存储答案
    const scriptMatch = html.match(/answer["']?\s*[:=]\s*["']([^"']+)["']/i);
    if (scriptMatch) {
      return scriptMatch[1].trim();
    }

    return null;
  } catch (error) {
    console.error(`Error fetching answer for Pinpoint #${number}:`, error);
    return null;
  }
}

export async function GET() {
  try {
    console.log("开始抓取 Pinpoint 数据...");

    const response = await axios.get("https://pinpointanswer.today/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const html = response.data;
    const results: PinpointData[] = [];

    // 提取当天日期和编号
    const dateMatch = html.match(/Today's Pinpoint Answer \(([^)]+)\)/);
    const numberMatch = html.match(/LinkedIn Pinpoint #(\d+)/);
    const todayNumber = numberMatch ? parseInt(numberMatch[1]) : null;
    const todayDate = dateMatch ? parseDate(dateMatch[1]) : null;

    // 提取当天线索
    const cluesSection = html.match(
      /LinkedIn Pinpoint \d+ Clues:([\s\S]*?)LinkedIn Pinpoint \d+ Answer:/
    );

    if (todayNumber && todayDate) {
      // 获取当天答案
      const answer = await fetchAnswerFromDetailPage(todayNumber);
      const clues: string[] = [];

      if (cluesSection) {
        // 提取线索
        const clueMatches = cluesSection[1].matchAll(/#(\d+)\s*([^#<]+)/g);
        for (const match of clueMatches) {
          if (match[2]) {
            clues.push(match[2].trim());
          }
        }
      }

      if (answer) {
        results.push({
          date: todayDate,
          answer,
          clues: clues.length === 5 ? clues : [],
          number: todayNumber,
        });
      }
    }

    // 提取历史答案列表
    const archiveMatches = html.matchAll(
      /LinkedIn Pinpoint (\d+) : ([^<]+)\s+(\d{4}-\d{2}-\d{2})/g
    );

    const archivePromises: Promise<void>[] = [];
    let count = 0;
    const maxArchives = 10; // 限制抓取数量

    for (const match of archiveMatches) {
      if (count >= maxArchives) break;

      const [, num, cluesText, date] = match;
      const number = parseInt(num);
      const archiveDate = parseDate(date);

      // 跳过当天答案（已处理）
      if (number === todayNumber) continue;

      archivePromises.push(
        (async () => {
          const answer = await fetchAnswerFromDetailPage(number);
          if (answer) {
            const clues = cluesText
              .split(",")
              .map((c: string) => c.trim())
              .filter((c: string) => c.length > 0);

            results.push({
              date: archiveDate,
              answer,
              clues,
              number,
            });
          }
        })()
      );

      count++;
    }

    // 等待所有历史答案抓取完成
    await Promise.all(archivePromises);

    // 按日期排序
    results.sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error: any) {
    console.error("抓取失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "抓取失败",
      },
      { status: 500 }
    );
  }
}
