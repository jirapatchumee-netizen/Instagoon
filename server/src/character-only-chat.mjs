// Isolated character-only roleplay powered by DeepSeek and the unified Master Prompt Template.
import { SCENE_FORMAT_VERSION, SCENE_FORMAT_INSTRUCTION, decodeExperimentScene, serializeExperimentScene } from './experiment-scene-format.mjs';
import { fiftyShadesPrompt } from './ai/protected/fifty-shades.mjs';
export const characterOnlyEnabled = npc => npc?.chatExperiment?.mode === 'character-only';
import { EXPERIMENT_GENERATION, buildExperimentRequest } from './experiment-request.mjs';
export { EXPERIMENT_GENERATION } from './experiment-request.mjs';
const ready = new WeakMap();
export async function ensureExperimentStorage(db) {
  if (!ready.has(db)) {
    const promise = db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS experiment_chat_threads (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
        experiment_key TEXT NOT NULL, lock_token TEXT, lock_until INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(user_id,creator_id,experiment_key))`),
      db.prepare(`CREATE TABLE IF NOT EXISTS experiment_chat_messages (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
        experiment_key TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('user','assistant')),
        content TEXT NOT NULL, created_at INTEGER NOT NULL)`),
      db.prepare('CREATE INDEX IF NOT EXISTS experiment_messages_thread ON experiment_chat_messages(user_id,creator_id,experiment_key,created_at)'),
      db.prepare(`CREATE TABLE IF NOT EXISTS experiment_chat_displays (
        message_id TEXT PRIMARY KEY REFERENCES experiment_chat_messages(id) ON DELETE CASCADE,
        presentation_json TEXT NOT NULL)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS experiment_chat_traces (
        message_id TEXT PRIMARY KEY REFERENCES experiment_chat_messages(id) ON DELETE CASCADE,
        metadata_json TEXT NOT NULL)`)
    ]);
    ready.set(db, promise); promise.catch(() => ready.delete(db));
  }
  await ready.get(db);
}
const hash = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), n => n.toString(16).padStart(2, '0')).join('');
export async function characterOnlyIdentity(npc, { modePrompt = '' } = {}) {
  const profile = npc.biography;
  const model = npc.chatExperiment?.model;
  if (typeof profile !== 'string' || !profile.trim() || model !== 'deepseek-flash') throw new Error('invalid_character_experiment');
  const sourceHash = await hash(profile);
  const presentation = npc.chatExperiment.presentation;
  const formatIdentity = presentation === SCENE_FORMAT_VERSION ? { presentation, formatHash: await hash(SCENE_FORMAT_INSTRUCTION) } : {};
  const openingIdentity = npc.chatExperiment.opening ? { openingHash: await hash(JSON.stringify(npc.chatExperiment.opening)) } : {};
  const modeIdentity = modePrompt ? { optionalMode: 'fifty-shades', modeHash: await hash(modePrompt) } : {};
  const experimentKey = await hash(JSON.stringify({ sourceHash, model, generation: EXPERIMENT_GENERATION, runId: npc.chatExperiment.runId, ...formatIdentity, ...openingIdentity, ...modeIdentity }));
  return { sourceHash, experimentKey, model, presentation };
}

async function ensureExperimentOpening(db, npc, scope, now) {
  const opening = npc.chatExperiment.opening;
  if (!opening) return;
  const raw = JSON.stringify({ location: opening.location, innerThought: opening.innerThought, playerActions: [], beats: opening.beats });
  const at = now - 1, scene = decodeExperimentScene(raw, '', at);
  const id = 'experiment_opening_' + await hash(JSON.stringify(scope));
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO experiment_chat_messages(id,user_id,creator_id,experiment_key,role,content,created_at)
      SELECT ?,?,?,?,'assistant',?,? WHERE NOT EXISTS (
        SELECT 1 FROM experiment_chat_messages WHERE user_id=? AND creator_id=? AND experiment_key=?)`).bind(id, ...scope, raw, at, ...scope),
    db.prepare(`INSERT OR IGNORE INTO experiment_chat_displays(message_id,presentation_json)
      SELECT ?,? WHERE EXISTS (SELECT 1 FROM experiment_chat_messages WHERE id=? AND created_at=?)`).bind(id, JSON.stringify(scene), id, at)
  ]);
}

export async function characterOnlyChat(req, env, user, npc, action, now, services) {
  const { json, takeEnergy, refundEnergy, energy, recordTurn } = services;
  await ensureExperimentStorage(env.DB);
  let body = {};
  if (req.method === 'POST' && ['message', 'reset-chat'].includes(action)) {
    try { const raw = await req.text(); body = raw ? JSON.parse(raw) : {}; } catch { return json({ error: 'invalid_json' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'invalid_json' }, 400);
  }
  const modeEnabled = Boolean(env.FIFTY_SHADES_SECRET_PROMPT);
  const modePrompt = modeEnabled ? fiftyShadesPrompt({ enabled: true, npcName: npc.name, env }) : '';
  const identity = await characterOnlyIdentity(npc, { modePrompt });
  const scope = [user.id, npc.id, identity.experimentKey];
  const sceneMode = identity.presentation === SCENE_FORMAT_VERSION;
  const experiment = { mode: 'character-only', provider: 'deepseek', model: identity.model, sourceHash: identity.sourceHash, runId: npc.chatExperiment.runId, activeMode: modeEnabled ? 'master-template' : 'normal', ...(sceneMode ? { presentation: identity.presentation } : {}) };
  const rows = async () => (await env.DB.prepare('SELECT m.id,m.role,m.content,m.created_at createdAt,d.presentation_json displayJson,t.metadata_json traceJson FROM experiment_chat_messages m LEFT JOIN experiment_chat_displays d ON d.message_id=m.id LEFT JOIN experiment_chat_traces t ON t.message_id=m.id WHERE m.user_id=? AND m.creator_id=? AND m.experiment_key=? ORDER BY m.created_at,m.id').bind(...scope).all()).results;
  const list = async () => (await rows()).map(({ displayJson, traceJson, ...m }) => ({ ...m, content: displayJson ? serializeExperimentScene(JSON.parse(displayJson)) : m.content, ...(traceJson ? { trace: JSON.parse(traceJson) } : {}), mediaKey: null, affectionDelta: 0 }));
  const blank = { memories: [], unlockedRewards: [], closeness: 0, trust: 0, romance: 0, score: 0 };
  if (req.method === 'GET' && !action) {
    await ensureExperimentOpening(env.DB, npc, scope, now);
    return json({ chat: { ...blank, experiment, episodeId: 'free_ai_chat', revisionId: identity.experimentKey, currentNodeId: 'start', nodes: [], history: [], episodes: [], aiMessages: await list() } });
  }
  if (req.method === 'GET' && action === 'memories') return json({ memories: [] });
  if (req.method !== 'POST' || !['message', 'reset-chat'].includes(action)) return json({ error: 'not_found' }, 404);
  let userText;
  if (action === 'message') {
    userText = typeof body.message === 'string' ? body.message.trim() : '';
    if (!userText || userText.length > 1000) return json({ error: 'invalid_message' }, 400);
    if (!env.DEEPSEEK_API_KEY) return json({ error: 'deepseek_not_configured' }, 503);
  }
  if (action === 'message') await ensureExperimentOpening(env.DB, npc, scope, now);
  await env.DB.prepare('INSERT OR IGNORE INTO experiment_chat_threads(user_id,creator_id,experiment_key) VALUES(?,?,?)').bind(...scope).run();
  const lock = crypto.randomUUID();
  const acquired = await env.DB.prepare('UPDATE experiment_chat_threads SET lock_token=?,lock_until=? WHERE user_id=? AND creator_id=? AND experiment_key=? AND lock_until<=?').bind(lock, now + 90000, ...scope, now).run();
  if (!acquired.meta.changes) return json({ error: 'thread_busy' }, 409);
  let charged = null;
  const started = Date.now();
  let usage = {}, outcome = 'error';
  try {
    if (action === 'reset-chat') {
      await env.DB.prepare('DELETE FROM experiment_chat_messages WHERE user_id=? AND creator_id=? AND experiment_key=?').bind(...scope).run();
      return json({ ok: true, experiment });
    }
    const history = await rows();
    // Never silently trim or summarize a controlled experiment.
    if (history.length + 2 > 200) return json({ error: 'experiment_history_full' }, 409);
    charged = await takeEnergy(env, user.id, now);
    if (!charged) return json({ error: 'energy_empty' }, 402);
    const providerStarted = Date.now();
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify(buildExperimentRequest(npc, { history, userText, now, modePrompt })),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      outcome = response.status === 429 ? 'rate_limit' : 'error';
      throw new Error(outcome === 'rate_limit' ? 'rate_limit' : 'deepseek_unavailable');
    }
    const result = await response.json(); usage = result.usage || {};
    const providerLatencyMs = Date.now() - providerStarted;
    if (result.model && !/^deepseek-(?:flash|v4(?:\.\d+)?-flash)(?:[-\w.]*)$/.test(result.model)) throw new Error('deepseek_model_mismatch');
    if (result.choices?.[0]?.finish_reason === 'length') throw new Error('experiment_output_truncated');
    const reply = result.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) throw new Error('deepseek_empty_reply');
    if (reply.length > 16000) throw new Error('deepseek_invalid_reply');
    experiment.resolvedModel = result.model || identity.model;
    const replyAt = Math.max(Date.now(), now + 1);
    const scene = sceneMode ? decodeExperimentScene(reply, userText, replyAt) : null;
    const assistantId = crypto.randomUUID();
    const trace = { experimentKey: identity.experimentKey, activeMode: experiment.activeMode,
      sourceHash: identity.sourceHash, configuredModel: identity.model, resolvedModel: result.model || null,
      generation: EXPERIMENT_GENERATION, createdAt: replyAt, providerLatencyMs,
      tokensIn: Number.isFinite(usage.prompt_tokens) ? usage.prompt_tokens : null, tokensOut: Number.isFinite(usage.completion_tokens) ? usage.completion_tokens : null };
    // Commit the pair atomically. Failed turns never become context for the next attempt.
    await env.DB.batch([
      env.DB.prepare('INSERT INTO experiment_chat_messages(id,user_id,creator_id,experiment_key,role,content,created_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(), ...scope, 'user', userText, now),
      env.DB.prepare('INSERT INTO experiment_chat_messages(id,user_id,creator_id,experiment_key,role,content,created_at) VALUES(?,?,?,?,?,?,?)').bind(assistantId, ...scope, 'assistant', reply, replyAt),
      env.DB.prepare('INSERT INTO experiment_chat_traces(message_id,metadata_json) VALUES(?,?)').bind(assistantId, JSON.stringify(trace)),
      ...(scene ? [env.DB.prepare('INSERT INTO experiment_chat_displays(message_id,presentation_json) VALUES(?,?)').bind(assistantId, JSON.stringify(scene))] : [])
    ]);
    const bucket = charged; charged = null;
    await recordTurn(env, { userId: user.id, creatorId: npc.id, visitId: identity.experimentKey, now, outcome: 'ok', model: identity.model, latencyMs: Date.now() - started, fallbackCount: 0, energyBucket: bucket, tokensIn: usage.prompt_tokens, tokensOut: usage.completion_tokens }).catch(() => {});
    return json({ ok: true, reply: scene ? scene.beats.filter(beat => beat.kind === 'dialogue').map(beat => beat.text).join('\n') : reply, innerThought: scene?.innerThought || null, action: null, ...(scene ? { scene: { at: scene.at, location: scene.location }, beats: scene.beats } : {}), suggestedReplies: [], mediaKey: null, messages: await list(), relationship: 0, closeness: 0, trust: 0, romance: 0, level: 1, unlockedRewards: [], experiment, energy: await energy(env, user.id, now) });
  } catch (error) {
    if (charged) { await refundEnergy(env, user.id, charged, now); charged = null; }
    await recordTurn(env, { userId: user.id, creatorId: npc.id, visitId: identity.experimentKey, now, outcome, model: identity.model, latencyMs: Date.now() - started, fallbackCount: 0, tokensIn: usage.prompt_tokens, tokensOut: usage.completion_tokens }).catch(() => {});
    const code = ['rate_limit', 'deepseek_unavailable', 'deepseek_empty_reply', 'deepseek_model_mismatch', 'experiment_output_truncated', 'deepseek_invalid_reply', 'experiment_invalid_scene', 'experiment_ungrounded_player_action'].includes(error.message) ? error.message : 'deepseek_unavailable';
    return json({ error: code, experiment }, code === 'rate_limit' ? 429 : 503);
  } finally {
    await env.DB.prepare('UPDATE experiment_chat_threads SET lock_token=NULL,lock_until=0 WHERE user_id=? AND creator_id=? AND experiment_key=? AND lock_token=?').bind(...scope, lock).run();
  }
}
