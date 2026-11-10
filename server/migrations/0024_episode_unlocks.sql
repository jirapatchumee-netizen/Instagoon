-- Migration 0024: Episode unlocks for Story Mode cliffhanger progression
-- EP 1 is free; EP 2+ requires 25 energy to unlock permanently.

CREATE TABLE episode_unlocks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, episode_id)
);

CREATE INDEX episode_unlocks_user ON episode_unlocks(user_id);
