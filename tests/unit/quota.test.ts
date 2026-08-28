/**
 * 配额计量共享逻辑单测（fake D1 提供真实 SQLite 语义）。
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { Entitlements } from "../../functions/_lib/billing";
import type { DbUser } from "../../functions/_lib/db";
import {
  consumeChatQuota,
  getUsage,
  localDateString,
} from "../../functions/_lib/quota";
import { createTestDb, type FakeD1 } from "./helpers/fakeD1";

const NOW = Date.now();

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
    stripe_customer_id: null,
    created_at: NOW,
    updated_at: NOW,
    last_login_at: null,
    current_tenant_id: null,
    show_on_leaderboard: 1,
    onboarded_at: null,
    ...overrides,
  };
}

function entitlements(chatPerDay: number): Entitlements {
  return {
    planId: chatPerDay > 5 ? "pro_monthly" : "free",
    planName: chatPerDay > 5 ? "Pro Monthly" : "Free",
    status: chatPerDay > 5 ? "active" : "free",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    features: { chatPerDay, historyDays: 7 },
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
});

describe("localDateString", () => {
  it("formats UTC date as YYYY-MM-DD", () => {
    const expected = new Date().toISOString().slice(0, 10);
    expect(localDateString("UTC")).toBe(expected);
  });

  it("falls back to UTC on invalid timezone", () => {
    const expected = new Date().toISOString().slice(0, 10);
    expect(localDateString("Not/AZone")).toBe(expected);
  });
});

describe("consumeChatQuota", () => {
  it("increments usage and returns the updated snapshot", async () => {
    const result = await consumeChatQuota(db, user, entitlements(5));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quota).toMatchObject({
      plan: "free",
      metric: "chat",
      limit: 5,
      used_today: 1,
      remaining: 4,
    });

    const date = localDateString(user.timezone);
    expect(await getUsage(db, user.id, date, "chat")).toBe(1);
  });

  it("rejects once the daily limit is reached and does not count further", async () => {
    const ent = entitlements(2);
    const first = await consumeChatQuota(db, user, ent);
    const second = await consumeChatQuota(db, user, ent);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    const denied = await consumeChatQuota(db, user, ent);
    expect(denied).toMatchObject({
      ok: false,
      reason: "limit",
      quota: { limit: 2, used_today: 2, remaining: 0 },
    });

    const date = localDateString(user.timezone);
    expect(await getUsage(db, user.id, date, "chat")).toBe(2);
  });

  it("counts users independently", async () => {
    const other = makeUser({ id: "user-2", email: "bob@example.com" });
    db.exec(
      `INSERT INTO users (id, email, name, created_at, updated_at)
       VALUES ('${other.id}', '${other.email}', 'Bob', ${NOW}, ${NOW})`
    );

    await consumeChatQuota(db, user, entitlements(5));
    await consumeChatQuota(db, user, entitlements(5));
    const result = await consumeChatQuota(db, other, entitlements(5));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quota.used_today).toBe(1);
  });
});
