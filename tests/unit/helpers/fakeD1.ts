/**
 * 测试用 D1 替身：基于 sql.js（WASM SQLite）实现与 D1 相同的
 * prepare/bind/first/all/run/batch 接口，提供真实 SQLite 语义
 * （UNIQUE 冲突、ON CONFLICT UPSERT、部分索引等）。
 *
 * 仅用于 vitest 单测，不进入生产构建。
 */

import { readFileSync } from "node:fs";
import initSqlJs, { type Database } from "sql.js";

export interface FakeStatement {
  bind(...values: unknown[]): FakeStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: unknown }>;
  run(): Promise<{ success: boolean; meta: { changes: number } }>;
}

export interface FakeD1 {
  prepare(sql: string): FakeStatement;
  batch(statements: FakeStatement[]): Promise<unknown[]>;
  /** 测试断言用:直接执行 SQL。 */
  exec(sql: string): void;
}

/** 按顺序应用 migrations/ 下的全部 SQL。 */
export async function createTestDb(): Promise<FakeD1> {
  const SQL = await initSqlJs();
  const db: Database = new SQL.Database();

  const migrations = [
    "../../../migrations/0001_users.sql",
    "../../../migrations/0002_tenants.sql",
    "../../../migrations/0003_billing.sql",
    "../../../migrations/0004_tenant_invites.sql",
    "../../../migrations/0007_subscriptions.sql",
  ];
  for (const rel of migrations) {
    const sql = readFileSync(new URL(rel, import.meta.url), "utf-8");
    db.run(sql);
  }

  function makeStatement(sql: string): FakeStatement {
    let params: unknown[] = [];
    const statement: FakeStatement = {
      bind(...values: unknown[]) {
        params = values;
        return statement;
      },
      async first<T>() {
        const stmt = db.prepare(sql);
        try {
          stmt.bind(params as never[]);
          if (stmt.step()) {
            return stmt.getAsObject() as T;
          }
          return null;
        } finally {
          stmt.free();
        }
      },
      async all<T>() {
        const stmt = db.prepare(sql);
        try {
          stmt.bind(params as never[]);
          const results: T[] = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject() as T);
          }
          return { results, success: true, meta: {} };
        } finally {
          stmt.free();
        }
      },
      async run() {
        db.run(sql, params as never[]);
        return { success: true, meta: { changes: db.getRowsModified() } };
      },
    };
    return statement;
  }

  return {
    prepare: makeStatement,
    async batch(statements) {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      return results;
    },
    exec(sql: string) {
      db.run(sql);
    },
  };
}
