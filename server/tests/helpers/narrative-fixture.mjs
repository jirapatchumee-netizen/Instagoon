import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker from '../../src/index.mjs';
import { ALLOWED_GEMINI_MODELS } from '../../src/ai/protected/gemini-config.mjs';

export async function narrativeFixture({ apiKey = 'test-placeholder', model = ALLOWED_GEMINI_MODELS[0] } = {}) {
  const sql = new DatabaseSync(':memory:');
  const migrations = new URL('../../migrations/', import.meta.url);
  for (const name of readdirSync(migrations).sort()) if (name.endsWith('.sql')) sql.exec(readFileSync(new URL(name, migrations), 'utf8'));
  const statement = (query, args = []) => ({ query, args, bind: (...values) => statement(query, values),
    async first() { return sql.prepare(query).get(...args) ?? null; },
    async all() { return { results: sql.prepare(query).all(...args) }; },
    async run() { return { meta: { changes: sql.prepare(query).run(...args).changes } }; } });
  const DB = { prepare: statement, async batch(statements) {
    sql.exec('BEGIN');
    try {
      const results = statements.map(s => {
        if (/^\s*(SELECT|WITH|PRAGMA)/i.test(s.query)) return { results: sql.prepare(s.query).all(...s.args) };
        return { results: [], meta: { changes: sql.prepare(s.query).run(...s.args).changes } };
      });
      sql.exec('COMMIT'); return results;
    } catch (e) { sql.exec('ROLLBACK'); throw e; }
  } };
  const npc = JSON.parse(readFileSync(new URL('../../../content/creators/cheer/character.json', import.meta.url), 'utf8'));
  sql.prepare('INSERT INTO creators(id,name,bio) VALUES(?,?,?)').run(npc.id, npc.name, npc.tagline);
  sql.prepare('INSERT INTO npc_definitions(creator_id,definition_json,updated_at) VALUES(?,?,?)').run(npc.id, JSON.stringify(npc), Date.now());
  const sessions = {};
  for (const uid of ['one', 'two']) {
    const raw = crypto.randomUUID();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))), n => n.toString(16).padStart(2, '0')).join('');
    sql.prepare('INSERT INTO users(id,email,google_id,age_verified_at,consent_version,created_at) VALUES(?,?,?,?,?,?)').run(uid, `${uid}@example.com`, uid, Date.now(), 'v1', Date.now());
    sql.prepare('INSERT INTO energy(user_id,free) VALUES(?,?)').run(uid, 100);
    sql.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').run(hash, uid, Date.now() + 3600000);
    sessions[uid] = raw;
  }
  const env = { DB, PUBLIC_ORIGIN: 'https://narrative.test', GEMINI_API_KEY: apiKey, ...(model ? { EVAL_MODEL: model } : {}) };
  // Keep summaries deterministic/off the critical path in tests and evals. Full recent context is
  // exercised directly. No background model call should contaminate a pinned-model comparison.
  const deferred = [];
  return { sql, npc, env, deferred,
    async request(message, { uid = 'one', action = 'message' } = {}) {
      const response = await worker.fetch(new Request(`${env.PUBLIC_ORIGIN}/api/chats/cheer${action ? '/' + action : ''}`, {
        method: action ? 'POST' : 'GET', headers: { cookie: `frost_session=${sessions[uid]}`, origin: env.PUBLIC_ORIGIN, 'content-type': 'application/json' },
        ...(action ? { body: JSON.stringify(action === 'message' ? { message } : {}) } : {})
      }), env, { waitUntil: promise => deferred.push(promise) });
      return { status: response.status, payload: await response.json() };
    },
    async open(uid = 'one') { return this.request('', { uid, action: '' }); },
    state(uid = 'one') { const row = sql.prepare('SELECT state_json FROM npc_scene_states WHERE user_id=? AND creator_id=?').get(uid, 'cheer'); return row ? JSON.parse(row.state_json) : null; }
  };
}

export function modelReply(payload) {
  return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(payload) }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 100 } });
}
