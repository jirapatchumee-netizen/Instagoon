-- Cosplay Creator access tokens. creator_uid is minted with the token and never changes; creator_id is
-- filled at the first launch and never moves. Only the SHA-256 of the token is stored.
CREATE TABLE IF NOT EXISTS studio_tokens (
  id TEXT PRIMARY KEY,
  creator_uid TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL UNIQUE,
  issued_email TEXT NOT NULL,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  redeemed_at INTEGER,
  creator_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS studio_token_emails (
  token_id TEXT NOT NULL REFERENCES studio_tokens(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  PRIMARY KEY (token_id, email)
);
