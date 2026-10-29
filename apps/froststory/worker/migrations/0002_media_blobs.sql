CREATE TABLE IF NOT EXISTS media_blobs (
  key TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  bytes BLOB NOT NULL,
  size INTEGER NOT NULL,
  uploaded_at INTEGER NOT NULL
);
