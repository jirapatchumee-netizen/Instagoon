-- Separate experiment history prevents old game memories, summaries and relationship state
-- from entering a character-only request. Source/model/run changes select a different key.
CREATE TABLE IF NOT EXISTS experiment_chat_threads (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  experiment_key TEXT NOT NULL, lock_token TEXT, lock_until INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id,creator_id,experiment_key)
);
CREATE TABLE IF NOT EXISTS experiment_chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  experiment_key TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS experiment_messages_thread
  ON experiment_chat_messages(user_id,creator_id,experiment_key,created_at);
