-- 0037_episodic_memories.sql: Smart, Fast, and Lean Long-term Memory (Episodic RAG)
CREATE TABLE IF NOT EXISTS episodic_memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('event', 'promise', 'preference', 'emotion')),
  fact_text TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  source_turn INTEGER NOT NULL DEFAULT 0,
  last_recalled_at INTEGER,
  created_at INTEGER NOT NULL,
  embedding BLOB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_episodic_user_creator ON episodic_memories(user_id, creator_id, created_at);
