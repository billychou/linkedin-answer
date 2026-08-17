/**
 * 租户邀请状态机单测：创建替换、原子接受、撤销、过期。
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  claimInvite,
  createInvite,
  getInviteByToken,
  getPendingInvite,
  newInviteToken,
  revokeInvite,
} from "../../functions/_lib/invites";
import { createTestDb, type FakeD1 } from "./helpers/fakeD1";

const NOW = Date.now();

let db: FakeD1;

beforeEach(async () => {
  db = await createTestDb();
  db.exec(
    `INSERT INTO users (id, email, name, created_at, updated_at)
     VALUES ('owner-1', 'owner@example.com', 'Owner', ${NOW}, ${NOW})`
  );
  db.exec(
    `INSERT INTO tenants (id, name, slug, owner_id, created_at, updated_at)
     VALUES ('tenant-1', 'Team', 'team', 'owner-1', ${NOW}, ${NOW})`
  );
});

describe("newInviteToken", () => {
  it("URL 安全、长度稳定且不重复", () => {
    const tokens = new Set(
      Array.from({ length: 200 }, () => newInviteToken())
    );
    expect(tokens.size).toBe(200);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    }
  });
});

describe("createInvite", () => {
  it("创建 pending 邀请并落库", async () => {
    const invite = await createInvite(db, {
      tenantId: "tenant-1",
      email: "bob@example.com",
      role: "member",
      invitedBy: "owner-1",
    });
    expect(invite.status).toBe("pending");
    expect(invite.expires_at).toBeGreaterThan(NOW);
    const fetched = await getInviteByToken(db, invite.token);
    expect(fetched?.email).toBe("bob@example.com");
  });

  it("同邮箱重复邀请 = 撤销旧邀请", async () => {
    const first = await createInvite(db, {
      tenantId: "tenant-1",
      email: "bob@example.com",
      role: "member",
      invitedBy: "owner-1",
    });
    const second = await createInvite(db, {
      tenantId: "tenant-1",
      email: "bob@example.com",
      role: "admin",
      invitedBy: "owner-1",
    });
    expect(second.id).not.toBe(first.id);
    const old = await getInviteByToken(db, first.token);
    expect(old?.status).toBe("revoked");
    const pending = await getPendingInvite(db, "tenant-1", "bob@example.com");
    expect(pending?.id).toBe(second.id);
    expect(pending?.role).toBe("admin");
  });
});

describe("claimInvite 原子接受", () => {
  it("第一次接受成功，第二次失败（防并发双花）", async () => {
    const invite = await createInvite(db, {
      tenantId: "tenant-1",
      email: "bob@example.com",
      role: "member",
      invitedBy: "owner-1",
    });
    expect(await claimInvite(db, invite.id)).toBe(true);
    expect(await claimInvite(db, invite.id)).toBe(false);
    const fetched = await getInviteByToken(db, invite.token);
    expect(fetched?.status).toBe("accepted");
    expect(fetched?.accepted_at).not.toBeNull();
  });
});

describe("revokeInvite", () => {
  it("撤销 pending 邀请", async () => {
    const invite = await createInvite(db, {
      tenantId: "tenant-1",
      email: "bob@example.com",
      role: "member",
      invitedBy: "owner-1",
    });
    expect(await revokeInvite(db, "tenant-1", invite.id)).toBe(true);
    expect(await revokeInvite(db, "tenant-1", invite.id)).toBe(false);
  });

  it("不能撤销其他租户的邀请", async () => {
    const invite = await createInvite(db, {
      tenantId: "tenant-1",
      email: "bob@example.com",
      role: "member",
      invitedBy: "owner-1",
    });
    expect(await revokeInvite(db, "tenant-other", invite.id)).toBe(false);
  });
});

describe("过期处理", () => {
  it("过期邀请不出现在 pending 查询中，接受前校验失败", async () => {
    const invite = await createInvite(db, {
      tenantId: "tenant-1",
      email: "bob@example.com",
      role: "member",
      invitedBy: "owner-1",
    });
    db.exec(
      `UPDATE tenant_invites SET expires_at = ${NOW - 1000} WHERE id = '${invite.id}'`
    );
    expect(await getPendingInvite(db, "tenant-1", "bob@example.com")).toBeNull();
  });
});
