-- ============================================================================
-- Migration 0040: Academy Feed Interactions (Anti-Cheat & Reaction Tracking)
-- Target: Cloudflare D1 (SQLite) — Instagoon Fullstack Architecture
-- ============================================================================

CREATE TABLE IF NOT EXISTS academy_feed_interactions (
    interaction_uid TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    post_instance_id TEXT NOT NULL,
    reply_id TEXT NOT NULL,
    affection_target TEXT NOT NULL,
    affection_delta INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, post_instance_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_feed_interactions_player ON academy_feed_interactions(player_id);
