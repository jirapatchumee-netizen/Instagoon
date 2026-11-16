-- Migration 0035: Multi-tier access tokens, Closed Beta gating, and 1,000,000 default diamonds
-- Additive migration: safe for live databases, zero data loss.

-- 1. Beta access flag on users table (0 = requires beta invite token, 1 = allowed to play)
ALTER TABLE users ADD COLUMN beta_access INTEGER NOT NULL DEFAULT 0;

-- 2. Multi-tier tokens supporting 'admin', 'creator', and 'player' (default 'creator' for backwards compatibility)
ALTER TABLE studio_tokens ADD COLUMN role TEXT NOT NULL DEFAULT 'creator' CHECK(role IN ('admin', 'creator', 'player'));
ALTER TABLE studio_tokens ADD COLUMN grants_json TEXT;

-- 3. Ensure all existing accounts receive 1,000,000 diamonds grant
INSERT OR IGNORE INTO energy (user_id, free, purchased, diamonds)
  SELECT id, 30, 0, 1000000 FROM users;

UPDATE energy SET diamonds = MAX(COALESCE(diamonds, 0), 1000000);
