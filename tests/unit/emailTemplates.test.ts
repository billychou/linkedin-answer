/**
 * 邮件模板单测：金额格式化、HTML 转义、关键内容。
 */

import { describe, expect, it } from "vitest";
import { escapeHtml } from "../../functions/_lib/email";
import {
  formatAmount,
  paymentFailedEmail,
  paymentReceiptEmail,
  tenantInviteEmail,
} from "../../functions/_lib/emailTemplates";

describe("formatAmount", () => {
  it("USD/EUR/GBP 常规小数货币", () => {
    expect(formatAmount(599, "usd")).toBe("$5.99");
    expect(formatAmount(4990, "usd")).toBe("$49.90");
    expect(formatAmount(100, "eur")).toBe("€1.00");
    expect(formatAmount(250, "gbp")).toBe("£2.50");
  });

  it("JPY 零小数货币不除 100", () => {
    expect(formatAmount(1000, "jpy")).toBe("¥1000");
  });

  it("未知货币带代码后缀", () => {
    expect(formatAmount(100, "sek")).toBe("1.00 SEK");
  });
});

describe("escapeHtml", () => {
  it("转义注入字符", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
    expect(escapeHtml("a&b'c")).toBe("a&amp;b&#39;c");
  });
});

describe("tenantInviteEmail", () => {
  it("包含接受链接、过期说明，且租户名被转义", () => {
    const { subject, html, text } = tenantInviteEmail({
      tenantName: 'Team <img src=x onerror=alert(1)>',
      inviterName: "Alice",
      inviteUrl: "https://example.com/invites/accept?token=abc",
      expiresDays: 7,
    });
    expect(subject).toContain("Alice");
    expect(html).toContain("https://example.com/invites/accept?token=abc");
    expect(html).toContain("7 days");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
    expect(text).toContain("https://example.com/invites/accept?token=abc");
  });
});

describe("paymentReceiptEmail / paymentFailedEmail", () => {
  it("收据包含金额与发票链接", () => {
    const { html } = paymentReceiptEmail({
      userName: "Alice",
      amountLabel: "$5.99",
      planName: "Pro Monthly",
      invoiceUrl: "https://invoice.stripe.com/x",
      siteUrl: "https://example.com",
    });
    expect(html).toContain("$5.99");
    expect(html).toContain("https://invoice.stripe.com/x");
    expect(html).toContain("billing settings");
  });

  it("扣款失败邮件引导更新支付方式", () => {
    const { subject, html } = paymentFailedEmail({
      userName: "",
      amountLabel: "$5.99",
      planName: "Pro Monthly",
      siteUrl: "https://example.com",
    });
    expect(subject).toContain("failed");
    expect(html).toContain("https://example.com/settings?tab=subscription");
  });
});
