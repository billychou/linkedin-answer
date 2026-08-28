/**
 * 邮件订阅数据层单测（fake D1 提供真实 SQLite 语义）。
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  getSubscriptionByEmail,
  listActiveSubscriptions,
  markDigestSent,
  normalizeEmail,
  unsubscribeByToken,
  upsertSubscription,
} from "../../functions/_lib/newsletter";
import { createTestDb, type FakeD1 } from "./helpers/fakeD1";

let db: FakeD1;

beforeEach(async () => {
  db = await createTestDb();
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Alice@Example.com ")).toBe("alice@example.com");
  });
});

describe("upsertSubscription", () => {
  it("creates a new subscription with stable token on repeat calls", async () => {
    const first = await upsertSubscription(db, "alice@example.com", "footer");
    expect(first.created).toBe(true);
    expect(first.subscription.token).toMatch(/^[0-9a-f-]{36}$/);

    const second = await upsertSubscription(db, "alice@example.com", "footer");
    expect(second.created).toBe(false);
    expect(second.subscription.id).toBe(first.subscription.id);
    expect(second.subscription.token).toBe(first.subscription.token);
  });

  it("revives an unsubscribed email and keeps its token", async () => {
    const { subscription } = await upsertSubscription(db, "bob@example.com", "footer");
    await unsubscribeByToken(db, subscription.token);
    expect(await listActiveSubscriptions(db)).toHaveLength(0);

    const revived = await upsertSubscription(db, "bob@example.com", "footer");
    expect(revived.created).toBe(false);
    expect(revived.subscription.token).toBe(subscription.token);
    expect(await listActiveSubscriptions(db)).toHaveLength(1);
  });

  it("treats emails case-insensitively", async () => {
    await upsertSubscription(db, "alice@example.com", "footer");
    const same = await upsertSubscription(db, "ALICE@example.com", "footer");
    expect(same.created).toBe(false);
    expect(await listActiveSubscriptions(db)).toHaveLength(1);
  });
});

describe("unsubscribeByToken", () => {
  it("excludes unsubscribed readers from the active list", async () => {
    const a = await upsertSubscription(db, "a@example.com", "footer");
    const b = await upsertSubscription(db, "b@example.com", "footer");

    await unsubscribeByToken(db, a.subscription.token);

    const active = await listActiveSubscriptions(db);
    expect(active).toHaveLength(1);
    expect(active[0].email).toBe("b@example.com");
  });

  it("returns without error for unknown tokens", async () => {
    await expect(unsubscribeByToken(db, "nope")).resolves.not.toThrow();
    expect(await listActiveSubscriptions(db)).toHaveLength(0);
  });
});

describe("markDigestSent", () => {
  it("records the digest date per subscriber", async () => {
    const { subscription } = await upsertSubscription(db, "carol@example.com", "footer");
    await markDigestSent(db, subscription.id, "2026-08-27");

    const row = await getSubscriptionByEmail(db, "carol@example.com");
    expect(row?.last_digest_date).toBe("2026-08-27");
  });
});
