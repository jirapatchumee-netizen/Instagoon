-- Non-secret provenance for successful experimental replies; resets/account deletion cascade.
CREATE TABLE IF NOT EXISTS experiment_chat_traces (
  message_id TEXT PRIMARY KEY REFERENCES experiment_chat_messages(id) ON DELETE CASCADE,
  metadata_json TEXT NOT NULL
);
