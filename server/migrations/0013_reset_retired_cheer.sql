-- Owner requested a complete Cheer restart, 8 Nov 2026. Scope: this creator only.
-- Durable marker makes migration reconciliation safe after the runtime reset has completed.
CREATE TABLE IF NOT EXISTS content_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
DELETE FROM ai_chat_messages WHERE creator_id='cheer' AND NOT EXISTS (SELECT 1 FROM content_meta WHERE key='creator-reset:retire-cheer-20261108');
DELETE FROM player_memories WHERE creator_id='cheer' AND NOT EXISTS (SELECT 1 FROM content_meta WHERE key='creator-reset:retire-cheer-20261108');
DELETE FROM dm_threads WHERE creator_id='cheer' AND NOT EXISTS (SELECT 1 FROM content_meta WHERE key='creator-reset:retire-cheer-20261108');
DELETE FROM npc_scene_states WHERE creator_id='cheer' AND NOT EXISTS (SELECT 1 FROM content_meta WHERE key='creator-reset:retire-cheer-20261108');
DELETE FROM reward_unlocks WHERE creator_id='cheer' AND NOT EXISTS (SELECT 1 FROM content_meta WHERE key='creator-reset:retire-cheer-20261108');
DELETE FROM relationships WHERE creator_id='cheer' AND NOT EXISTS (SELECT 1 FROM content_meta WHERE key='creator-reset:retire-cheer-20261108');
DELETE FROM chat_active WHERE creator_id='cheer' AND NOT EXISTS (SELECT 1 FROM content_meta WHERE key='creator-reset:retire-cheer-20261108');
DELETE FROM ai_turn_metrics WHERE creator_id='cheer' AND NOT EXISTS (SELECT 1 FROM content_meta WHERE key='creator-reset:retire-cheer-20261108');
DELETE FROM chat_history WHERE episode_id IN (SELECT id FROM episodes WHERE creator_id='cheer') AND NOT EXISTS (SELECT 1 FROM content_meta WHERE key='creator-reset:retire-cheer-20261108');
DELETE FROM chat_states WHERE episode_id IN (SELECT id FROM episodes WHERE creator_id='cheer') AND NOT EXISTS (SELECT 1 FROM content_meta WHERE key='creator-reset:retire-cheer-20261108');
INSERT OR IGNORE INTO content_meta(key,value) VALUES('creator-reset:retire-cheer-20261108','completed');
