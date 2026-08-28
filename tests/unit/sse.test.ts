/**
 * OpenAI 兼容 SSE 增量解析单测（服务端流透传落库依赖它）。
 */

import { describe, expect, it } from "vitest";
import { extractSseDeltas } from "../../functions/_lib/sse";

function frame(content: string): string {
  return `data: ${JSON.stringify({
    choices: [{ delta: { content } }],
  })}\n\n`;
}

describe("extractSseDeltas", () => {
  it("extracts delta content from complete frames", () => {
    const { deltas, rest } = extractSseDeltas(frame("Hello") + frame(" world"));
    expect(deltas).toBe("Hello world");
    expect(rest).toBe("");
  });

  it("stops at [DONE] and ignores keep-alive comments", () => {
    const buffer = `: keep-alive\n\n${frame("hi")}\ndata: [DONE]\n\n`;
    const { deltas } = extractSseDeltas(buffer);
    expect(deltas).toBe("hi");
  });

  it("keeps a truncated trailing line as rest for the next chunk", () => {
    const partial = frame("ok") + 'data: {"choices":[{"delta":{"con';
    const { deltas, rest } = extractSseDeltas(partial);
    expect(deltas).toBe("ok");
    expect(rest).toBe('data: {"choices":[{"delta":{"con');

    // 下一个 chunk 补齐后应能继续解析
    const next = extractSseDeltas(rest + 'tent":"!"}}]}\n\n');
    expect(next.deltas).toBe("!");
    expect(next.rest).toBe("");
  });

  it("skips malformed data lines without throwing", () => {
    const buffer = `data: {not-json}\n${frame("fine")}\n`;
    expect(extractSseDeltas(buffer).deltas).toBe("fine");
  });

  it("ignores deltas whose content is not a string", () => {
    const buffer =
      `data: {"choices":[{"delta":{"content":42}}]}\n` + frame("text");
    expect(extractSseDeltas(buffer).deltas).toBe("text");
  });
});
