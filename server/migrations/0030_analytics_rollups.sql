-- Migration 0030: hourly analytics rollups.
-- The dashboard must not run SUM()/COUNT() over the tables players write to, so a cron collapses
-- each hour once and every dashboard read becomes a small indexed lookup. One narrow table instead
-- of one table per metric: adding a metric is a row, not a schema change.
CREATE TABLE IF NOT EXISTS analytics_rollup (
  bucket TEXT NOT NULL,                     -- 'YYYY-MM-DDTHH:00Z' for a window, 'lifetime' for totals
  metric TEXT NOT NULL,                     -- 'players.active', 'ai.turns', 'creator.tokens_out', ...
  subject TEXT NOT NULL DEFAULT '',         -- '' = whole site, otherwise the creator/model/kind it belongs to
  value REAL NOT NULL,
  computed_at INTEGER NOT NULL,
  PRIMARY KEY (bucket, metric, subject)
);

CREATE INDEX IF NOT EXISTS idx_analytics_rollup_lookup ON analytics_rollup(metric, bucket);

-- A bucket is only worth recomputing when it failed, so a retried cron cannot double-count and a
-- finished hour is skipped without touching any source table.
CREATE TABLE IF NOT EXISTS analytics_rollup_runs (
  bucket TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  rows_written INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'failed')),
  error TEXT
);
