-- Migration 0006: 增长功能（P2）
-- - user_activity：每日活跃打卡（streak 留存）
-- - users.show_on_leaderboard：排行榜展示开关（隐私）
-- - users.onboarded_at：onboarding 完成时间

CREATE TABLE user_activity (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,   -- 用户时区下的 YYYY-MM-DD
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE users ADD COLUMN show_on_leaderboard INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN onboarded_at INTEGER;
