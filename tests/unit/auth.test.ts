/**
 * 认证辅助函数单测：next 重定向白名单（防开放重定向）。
 */

import { describe, expect, it } from "vitest";
import { safeNextPath } from "../../functions/_lib/auth";

describe("safeNextPath", () => {
  it("接受站内相对路径", () => {
    expect(safeNextPath("/chat")).toBe("/chat");
    expect(safeNextPath("/settings")).toBe("/settings");
  });

  it("保留 query（邀请 token 跨登录往返）", () => {
    expect(safeNextPath("/invites/accept?token=abc")).toBe(
      "/invites/accept?token=abc"
    );
  });

  it("拒绝绝对 URL 与协议相对 URL", () => {
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("http://evil.com/x")).toBeNull();
  });

  it("拒绝反斜杠绕过", () => {
    expect(safeNextPath("/\\evil.com")).toBeNull();
    expect(safeNextPath("\\evil")).toBeNull();
  });

  it("拒绝空值", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });
});
