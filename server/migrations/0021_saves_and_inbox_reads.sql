-- Migration 0021: saved posts live on the server (they were lost on reload), and the inbox remembers
-- when the player last read each creator's thread so the unread dot means something.
CREATE TABLE IF NOT EXISTS saves (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES posts(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS inbox_reads (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  read_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, creator_id)
);
