-- Card Wish (Genshin-style banners): pity is per user and banner; every pull is logged with its banner, rarity and pity position.
CREATE TABLE IF NOT EXISTS gacha_banner_state (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  banner_id TEXT NOT NULL,
  pity5 INTEGER NOT NULL DEFAULT 0,
  pity4 INTEGER NOT NULL DEFAULT 0,
  guaranteed INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, banner_id)
);
ALTER TABLE gacha_pulls ADD COLUMN banner_id TEXT;
ALTER TABLE gacha_pulls ADD COLUMN rarity TEXT;
ALTER TABLE gacha_pulls ADD COLUMN pity_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_gacha_pulls_user_banner_time ON gacha_pulls(user_id, banner_id, created_at);
