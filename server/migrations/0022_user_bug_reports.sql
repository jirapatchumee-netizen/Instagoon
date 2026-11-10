-- Migration 0022: store user bug reports and feedback submitted from the client app.
CREATE TABLE IF NOT EXISTS user_bug_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  creator_id TEXT REFERENCES creators(id) ON DELETE SET NULL,
  error_code TEXT,
  user_message TEXT,
  client_context_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_bug_reports_time ON user_bug_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_user_bug_reports_user ON user_bug_reports(user_id, created_at);
