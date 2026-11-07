-- Per-player narrative continuity. Never shared between players or characters.
CREATE TABLE IF NOT EXISTS npc_scene_states (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  state_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, creator_id)
);
