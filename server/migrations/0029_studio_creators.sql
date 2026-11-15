-- Cosplay Creator Studio: one character per account (user_id and creator_id are both unique).
-- draft_json holds the Studio form; status 'live' means creators + npc_definitions rows were written for it.
CREATE TABLE IF NOT EXISTS studio_creators (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT UNIQUE,
  draft_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','live')),
  launched_at INTEGER,
  updated_at INTEGER NOT NULL
);
