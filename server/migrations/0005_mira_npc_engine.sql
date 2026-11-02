-- Migration 0005: Full NPC Definition and 3D Cognitive Engine
ALTER TABLE relationships ADD COLUMN closeness INTEGER DEFAULT 0;
ALTER TABLE relationships ADD COLUMN trust INTEGER DEFAULT 0;
ALTER TABLE relationships ADD COLUMN romance INTEGER DEFAULT 0;
ALTER TABLE relationships ADD COLUMN turns INTEGER DEFAULT 0;
ALTER TABLE relationships ADD COLUMN events_json TEXT DEFAULT '{}';
ALTER TABLE relationships ADD COLUMN rule_uses_json TEXT DEFAULT '{}';

CREATE TABLE IF NOT EXISTS npc_definitions (
  creator_id TEXT PRIMARY KEY REFERENCES creators(id) ON DELETE CASCADE,
  definition_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
