-- 0038_living_reality_engine.sql: Living Reality World & Narrative Roleplay Engine
ALTER TABLE relationships ADD COLUMN current_episode INTEGER NOT NULL DEFAULT 1;
ALTER TABLE relationships ADD COLUMN emotional_milestones TEXT NOT NULL DEFAULT '[]';
ALTER TABLE relationships ADD COLUMN stress_level INTEGER NOT NULL DEFAULT 20;
ALTER TABLE relationships ADD COLUMN affection_level INTEGER NOT NULL DEFAULT 10;
ALTER TABLE relationships ADD COLUMN clout_level INTEGER NOT NULL DEFAULT 50;
ALTER TABLE relationships ADD COLUMN is_close_friend INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS world_season_events (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT 'season_1',
  event_kind TEXT NOT NULL DEFAULT 'moderator' CHECK (event_kind IN ('moderator', 'spotted', 'ripple')),
  headline TEXT NOT NULL,
  content TEXT NOT NULL,
  prompt_directive TEXT NOT NULL DEFAULT '',
  source_creator_id TEXT,
  active_from INTEGER NOT NULL,
  active_until INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_world_season_active ON world_season_events(active_from, active_until);
