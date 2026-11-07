// Explicit, reviewed content reset requests only. Ordinary character removal preserves player data.
import { ensureNarrativeStorage } from './narrative.mjs';

export function creatorResetQueries(reset) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(reset?.id) || !/^[a-zA-Z0-9_-]{1,80}$/.test(reset?.creatorId)) throw new Error('invalid_creator_reset');
  const marker = `creator-reset:${reset.id}`;
  const guard = 'NOT EXISTS (SELECT 1 FROM content_meta WHERE key=?)';
  const direct = ['ai_chat_messages', 'player_memories', 'dm_threads', 'npc_scene_states', 'reward_unlocks', 'relationships', 'chat_active', 'ai_turn_metrics'];
  return [
    ...direct.map(table => ({ sql: `DELETE FROM ${table} WHERE creator_id=? AND ${guard}`, args: [reset.creatorId, marker] })),
    ...['chat_history', 'chat_states'].map(table => ({ sql: `DELETE FROM ${table} WHERE episode_id IN (SELECT id FROM episodes WHERE creator_id=?) AND ${guard}`, args: [reset.creatorId, marker] })),
    { sql: "INSERT OR IGNORE INTO content_meta(key,value) VALUES(?,'completed')", args: [marker] }
  ];
}

export async function applyCreatorResets(env, bundle) {
  if (!bundle.creatorResets?.length) return;
  try {
    for (const reset of bundle.creatorResets) {
      const queries = creatorResetQueries(reset);
      if (await env.DB.prepare('SELECT value FROM content_meta WHERE key=?').bind(`creator-reset:${reset.id}`).first()) continue;
      const active = bundle.creators.find(c => c.id === reset.creatorId);
      // This reset only clears legacy tables. A reviewed character-only rebuild stores its
      // conversations separately, so a still-pending legacy cleanup cannot erase the new run.
      if (active && !(reset.allowWithCharacterOnly === true && active.definition?.chatExperiment?.mode === 'character-only')) throw new Error('cannot_reset_published_creator');
      await ensureNarrativeStorage(env.DB);
      // Every delete checks the durable marker. Competing isolates cannot clear a later incarnation
      // after another transaction completes this reset. Marker and all deletes commit together.
      await env.DB.batch(queries.map(q => env.DB.prepare(q.sql).bind(...q.args)));
    }
  } catch (cause) {
    throw Object.assign(new Error('content_reset_pending', { cause }), { contentResetFailed: true });
  }
}
