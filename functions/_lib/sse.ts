/**
 * OpenAI 兼容 SSE 解析工具（服务端流透传时提取增量文本用于落库）。
 */

/**
 * 从一段可能包含多行 SSE 帧的缓冲中提取增量文字。
 *
 * 流式 chunk 可能在行中间截断：最后一个不完整行通过 `rest` 返回，
 * 调用方需在下一次拼接后再传入。识别 `data: {...}` 帧中的
 * `choices[0].delta.content`（OpenAI/DashScope 兼容格式），
 * 跳过 `data: [DONE]` 与畸形帧。
 */
export function extractSseDeltas(buffer: string): {
  deltas: string;
  rest: string;
} {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  let deltas = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const parsed = JSON.parse(data) as {
        choices?: { delta?: { content?: unknown } }[];
      };
      const content = parsed.choices?.[0]?.delta?.content;
      if (typeof content === "string") deltas += content;
    } catch {
      // 跳过畸形 data 行
    }
  }
  return { deltas, rest };
}
