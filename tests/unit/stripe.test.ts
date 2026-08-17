/**
 * Stripe 边缘客户端单测：webhook 验签是资金安全的关键路径。
 */

import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  subscriptionPeriod,
  subscriptionPriceId,
  verifyStripeSignature,
  type StripeSubscription,
} from "../../functions/_lib/stripe";

const SECRET = "whsec_test_secret";

function sign(payload: string, timestamp: number, secret = SECRET): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
}

function header(payload: string, opts?: { timestamp?: number; secret?: string; extraV1?: string[] }): string {
  const t = opts?.timestamp ?? Math.floor(Date.now() / 1000);
  const parts = [`t=${t}`, `v1=${sign(payload, t, opts?.secret)}`];
  for (const extra of opts?.extraV1 ?? []) parts.push(`v1=${extra}`);
  return parts.join(",");
}

describe("verifyStripeSignature", () => {
  const payload = '{"id":"evt_1","type":"invoice.paid"}';

  it("接受合法签名", async () => {
    expect(
      await verifyStripeSignature(payload, header(payload), SECRET)
    ).toBe(true);
  });

  it("多个 v1 签名时只要有一个合法即通过", async () => {
    expect(
      await verifyStripeSignature(
        payload,
        header(payload, { extraV1: ["deadbeef"] }),
        SECRET
      )
    ).toBe(true);
  });

  it("拒绝被篡改的 payload", async () => {
    const sig = header(payload);
    expect(
      await verifyStripeSignature(payload + " ", sig, SECRET)
    ).toBe(false);
  });

  it("拒绝错误密钥签出的签名", async () => {
    expect(
      await verifyStripeSignature(payload, header(payload), "whsec_other")
    ).toBe(false);
  });

  it("拒绝超出时间容忍窗口(300s)的旧签名", async () => {
    const stale = Math.floor(Date.now() / 1000) - 600;
    expect(
      await verifyStripeSignature(payload, header(payload, { timestamp: stale }), SECRET)
    ).toBe(false);
  });

  it("接受容忍窗口内的时间偏移", async () => {
    const recent = Math.floor(Date.now() / 1000) - 100;
    expect(
      await verifyStripeSignature(payload, header(payload, { timestamp: recent }), SECRET)
    ).toBe(true);
  });

  it("拒绝缺少 t 或 v1 的头", async () => {
    expect(await verifyStripeSignature(payload, "v1=abc", SECRET)).toBe(false);
    expect(await verifyStripeSignature(payload, "t=123", SECRET)).toBe(false);
    expect(await verifyStripeSignature(payload, "", SECRET)).toBe(false);
    expect(await verifyStripeSignature(payload, null, SECRET)).toBe(false);
  });

  it("拒绝空密钥", async () => {
    expect(await verifyStripeSignature(payload, header(payload), "")).toBe(false);
  });
});

describe("subscriptionPeriod", () => {
  const now = Math.floor(Date.now() / 1000);

  it("优先订阅对象顶层字段", () => {
    const sub = {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      cancel_at_period_end: false,
      current_period_start: 1000,
      current_period_end: 2000,
      items: { data: [{ id: "si", price: { id: "price_x" }, current_period_start: 3000, current_period_end: 4000 }] },
    } as StripeSubscription;
    expect(subscriptionPeriod(sub)).toEqual({ start: 1000, end: 2000 });
  });

  it("回退到 items.data[0] 字段(basil 及以后版本)", () => {
    const sub = {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      cancel_at_period_end: false,
      items: { data: [{ id: "si", price: { id: "price_x" }, current_period_start: 3000, current_period_end: 4000 }] },
    } as StripeSubscription;
    expect(subscriptionPeriod(sub)).toEqual({ start: 3000, end: 4000 });
  });

  it("两者皆无时回退 [now, now+30d]", () => {
    const sub = {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      cancel_at_period_end: false,
    } as StripeSubscription;
    const { start, end } = subscriptionPeriod(sub);
    expect(Math.abs(start - now)).toBeLessThan(5);
    expect(end - start).toBe(30 * 86400);
  });
});

describe("subscriptionPriceId", () => {
  it("取主 price id", () => {
    const sub = {
      items: { data: [{ id: "si", price: { id: "price_abc" } }] },
    } as unknown as StripeSubscription;
    expect(subscriptionPriceId(sub)).toBe("price_abc");
  });

  it("缺失时为 null", () => {
    expect(subscriptionPriceId({} as StripeSubscription)).toBeNull();
    expect(
      subscriptionPriceId({ items: { data: [] } } as unknown as StripeSubscription)
    ).toBeNull();
  });
});
