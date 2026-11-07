-- Store presentation separately from the provider's original JSON used as experiment history.
CREATE TABLE IF NOT EXISTS experiment_chat_displays (
  message_id TEXT PRIMARY KEY REFERENCES experiment_chat_messages(id) ON DELETE CASCADE,
  presentation_json TEXT NOT NULL
);
