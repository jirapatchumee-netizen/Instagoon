-- Migration 0006: DM Thread single-flight lock, Chat Visit, Thread Summary and per-turn analytics
CREATE TABLE IF NOT EXISTS dm_threads (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  lock_token TEXT,
  lock_until INTEGER NOT NULL DEFAULT 0,
  last_message_at INTEGER,
  current_visit_id TEXT,
  summary TEXT NOT NULL DEFAULT '',
  summarized_through INTEGER NOT NULL DEFAULT 0,
  messages_since_summary INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, creator_id)
);

ALTER TABLE player_memories ADD COLUMN source_message_id TEXT;
ALTER TABLE player_memories ADD COLUMN updated_at INTEGER;

CREATE TABLE IF NOT EXISTS ai_turn_metrics (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  creator_id TEXT NOT NULL,
  visit_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('ok','firewall','thread_busy','rate_limit','error')),
  model TEXT,
  latency_ms INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  fallback_count INTEGER NOT NULL DEFAULT 0,
  energy_bucket TEXT CHECK (energy_bucket IN ('free','purchased')),
  d_closeness INTEGER NOT NULL DEFAULT 0,
  d_trust INTEGER NOT NULL DEFAULT 0,
  d_romance INTEGER NOT NULL DEFAULT 0,
  level_after INTEGER,
  matched_rule_ids TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS ai_turn_metrics_time ON ai_turn_metrics(created_at);
CREATE INDEX IF NOT EXISTS ai_turn_metrics_creator_time ON ai_turn_metrics(creator_id, created_at);
CREATE INDEX IF NOT EXISTS ai_turn_metrics_user_time ON ai_turn_metrics(user_id, created_at);
CREATE INDEX IF NOT EXISTS ai_chat_messages_time ON ai_chat_messages(created_at);
