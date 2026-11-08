CREATE TABLE IF NOT EXISTS follows (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, creator_id)
);

CREATE INDEX IF NOT EXISTS follows_user ON follows(user_id);
CREATE INDEX IF NOT EXISTS follows_creator ON follows(creator_id);

-- Backfill: players with active relationship (score > 0) keep following their creators
INSERT OR IGNORE INTO follows (user_id, creator_id, created_at)
SELECT user_id, creator_id, unixepoch() * 1000
FROM relationships
WHERE score > 0;
