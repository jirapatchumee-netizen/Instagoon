-- Migration: 0027_gacha_and_reward_meta.sql
-- Records diamond gacha pulls and energy fallback history

CREATE TABLE IF NOT EXISTS gacha_pulls (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  diamonds_spent INTEGER NOT NULL,
  reward_key TEXT,
  energy_awarded INTEGER NOT NULL DEFAULT 0,
  is_duplicate INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gacha_pulls_user_creator ON gacha_pulls(user_id, creator_id);
