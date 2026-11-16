-- Migration 0034: the account is the identity, the address is one of its attributes.
-- Access decisions follow user_id so changing an email cannot escape a revoke, and a creator can move
-- to a new address only by proving it. Studio access tokens stop being permanent.

ALTER TABLE users ADD COLUMN access_status TEXT NOT NULL DEFAULT 'active' CHECK(access_status IN ('active','revoked'));

-- Every address this account has ever been seen with, including a Google address that has not been
-- promoted to the account email yet.
CREATE TABLE IF NOT EXISTS email_history (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, email)
);

-- One pending change per account; only the hash of the code is stored and a row is single-use.
CREATE TABLE IF NOT EXISTS email_changes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  new_email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_email_changes_expiry ON email_changes(expires_at);

-- An invite revoke has to survive the address it was written against, so it also gets an identity.
ALTER TABLE invites ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE studio_tokens ADD COLUMN expires_at INTEGER;
ALTER TABLE studio_tokens ADD COLUMN revoked_at INTEGER;
ALTER TABLE studio_tokens ADD COLUMN last_used_at INTEGER;
