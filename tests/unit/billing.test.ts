/**
 * 计费核心逻辑单测（fake D1 提供真实 SQLite 语义）。
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  claimWebhookEvent,
  getEntitlements,
  getUsableSubscription,
  parsePlanFeatures,
  syncSubscriptionFromStripe,
  type DbPlan,
} from "../../functions/_lib/billing";
import type { DbUser } from "../../functions/_lib/db";
import type { StripeSubscription } from "../../functions/_lib/stripe";
import { createTestDb, type FakeD1 } from "./helpers/fakeD1";

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

function makeUser(overrides?: Partial<DbUser>): DbUser {
  return {
    id: "user-1",
    email: "alice@example.com",
    name: "Alice",
    avatar_url: "",
    bio: "",
    locale: "en",
    timezone: "UTC",
    status: "active",
    role: "user",
    stripe_customer_id: "cus_1",
    created_at: NOW,
    updated_at: NOW,
    last_login_at: null,
    current_tenant_id: null,
    show_on_leaderboard: 1,
    onboarded_at: null,
    ...overrides,
  };
}

function stripeSub(overrides?: Partial<StripeSubscription>): StripeSubscription {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    current_period_start: Math.floor(NOW / 1000),
    current_period_end: Math.floor((NOW + 30 * DAY) / 1000),
    items: { data: [{ id: "si_1", price: { id: "price_test_pro_monthly" } }] },
    ...overrides,
  };
}

let db: FakeD1;
const user = makeUser();

beforeEach(async () => {
  db = await createTestDb();
  db.exec(
    `INSERT INTO users (id, email, name, created_at, updated_at)
     VALUES ('${user.id}', '${user.email}', '${user.name}', ${NOW}, ${NOW})`
  );
  // seed 里 stripe_price_id 为 NULL，测试里回填。
  db.exec(
    `UPDATE plans SET stripe_price_id = 'price_test_pro_monthly' WHERE id = 'pro_monthly'`
  );
});

describe("parsePlanFeatures", () => {
  const plan = (featuresJson: string): DbPlan => ({
    id: "p",
    name: "P",
    billing_interval: "month",
    price_cents: 599,
    currency: "usd",
    stripe_price_id: null,
    features_json: featuresJson,
    sort_order: 0,
    is_active: 1,
  });

  it("解析合法 features_json", () => {
    expect(parsePlanFeatures(plan('{"chatPerDay":42,"historyDays":9,"priority":true}'))).toEqual({
      chatPerDay: 42,
      historyDays: 9,
      priority: true,
    });
  });

  it("损坏 JSON 回退到免费套餐默认值", () => {
    expect(parsePlanFeatures(plan("not-json"))).toEqual({ chatPerDay: 5, historyDays: 7 });
  });

  it("缺失字段用默认值补齐", () => {
    expect(parsePlanFeatures(plan('{"chatPerDay":20}'))).toEqual({
      chatPerDay: 20,
      historyDays: 7,
      priority: false,
    });
  });

  it("null plan 回退默认", () => {
    expect(parsePlanFeatures(null)).toEqual({ chatPerDay: 5, historyDays: 7 });
  });
});

describe("getEntitlements", () => {
  it("无订阅 → free 套餐", async () => {
    const ent = await getEntitlements(db, user.id);
    expect(ent.planId).toBe("free");
    expect(ent.status).toBe("free");
    expect(ent.features.chatPerDay).toBe(5);
    expect(ent.currentPeriodEnd).toBeNull();
  });

  it("活跃订阅 → 对应付费套餐", async () => {
    await syncSubscriptionFromStripe(db, user, stripeSub());
    const ent = await getEntitlements(db, user.id);
    expect(ent.planId).toBe("pro_monthly");
    expect(ent.status).toBe("active");
    expect(ent.features.chatPerDay).toBe(100);
    expect(ent.currentPeriodEnd).toBeGreaterThan(NOW);
  });

  it("过期订阅不算可用", async () => {
    await syncSubscriptionFromStripe(
      db,
      user,
      stripeSub({
        current_period_start: Math.floor((NOW - 60 * DAY) / 1000),
        current_period_end: Math.floor((NOW - 30 * DAY) / 1000),
      })
    );
    const ent = await getEntitlements(db, user.id);
    expect(ent.planId).toBe("free");
  });

  it("canceled 订阅不算可用", async () => {
    await syncSubscriptionFromStripe(db, user, stripeSub({ status: "canceled" }));
    const ent = await getEntitlements(db, user.id);
    expect(ent.planId).toBe("free");
  });

  it("past_due 在期末前仍可用", async () => {
    await syncSubscriptionFromStripe(db, user, stripeSub({ status: "past_due" }));
    const ent = await getEntitlements(db, user.id);
    expect(ent.planId).toBe("pro_monthly");
    expect(ent.status).toBe("past_due");
  });
});

describe("syncSubscriptionFromStripe", () => {
  it("重复同步是 upsert（不产生重复行）", async () => {
    await syncSubscriptionFromStripe(db, user, stripeSub());
    await syncSubscriptionFromStripe(
      db,
      user,
      stripeSub({ cancel_at_period_end: true })
    );
    const { results } = await db
      .prepare(`SELECT COUNT(*) AS n FROM subscriptions`)
      .all<{ n: number }>();
    expect(results[0].n).toBe(1);
    const sub = await getUsableSubscription(db, user.id);
    expect(sub?.cancel_at_period_end).toBe(1);
  });

  it("price 未映射任何本地套餐时跳过（返回 null）", async () => {
    const result = await syncSubscriptionFromStripe(
      db,
      user,
      stripeSub({ items: { data: [{ id: "si", price: { id: "price_unknown" } }] } })
    );
    expect(result).toBeNull();
    const { results } = await db
      .prepare(`SELECT COUNT(*) AS n FROM subscriptions`)
      .all<{ n: number }>();
    expect(results[0].n).toBe(0);
  });
});

describe("claimWebhookEvent 幂等", () => {
  it("同一事件 ID 只处理一次", async () => {
    expect(await claimWebhookEvent(db, "evt_1", "invoice.paid", "{}")).toBe(true);
    expect(await claimWebhookEvent(db, "evt_1", "invoice.paid", "{}")).toBe(false);
  });

  it("不同事件 ID 互不影响", async () => {
    expect(await claimWebhookEvent(db, "evt_1", "invoice.paid", "{}")).toBe(true);
    expect(await claimWebhookEvent(db, "evt_2", "invoice.paid", "{}")).toBe(true);
  });
});
