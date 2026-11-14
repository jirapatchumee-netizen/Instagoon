import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker from '../src/index.mjs';

// Same harness shape as api.mjs: in-memory D1 schema + signed session cookie.
const raw = 'a'.repeat(64);
const sid = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)))).map(n => n.toString(16).padStart(2, '0')).join('');

function setup() {
  const sql = new DatabaseSync(':memory:');
  const dir = new URL('../migrations/', import.meta.url);
  for (const f of readdirSync(dir).sort()) if (f.endsWith('.sql')) sql.exec(readFileSync(new URL(f, dir), 'utf8'));
  const statement = (query, args = []) => ({
    bind: (...next) => statement(query, next),
    first: async () => sql.prepare(query).get(...args) ?? null,
    all: async () => ({ results: sql.prepare(query).all(...args) }),
    run: async () => ({ meta: { changes: sql.prepare(query).run(...args).changes } })
  });
  const DB = { prepare: statement, async batch(list) { sql.exec('BEGIN'); try { for (const s of list) await s.run(); sql.exec('COMMIT'); } catch (e) { sql.exec('ROLLBACK'); throw e; } } };
  const objects = new Map();
  const MEDIA = { async list() { return { objects: [] }; }, async get(k) { return objects.get(k) || null; }, async head(k) { return objects.get(k) || null; }, async put(k, v) { if (objects.has(k)) return null; objects.set(k, { body: v }); return null; } };
  const now = Date.now();
  sql.prepare("INSERT INTO invites(email) VALUES('u@example.com')").run();
  sql.prepare("INSERT INTO users(id,email,google_id,age_verified_at,consent_version,created_at) VALUES('u','u@example.com','g',?,'v1',?)").run(now, now);
  sql.prepare("INSERT INTO users(id,email,google_id,age_verified_at,consent_version,created_at) VALUES('u2','u2@example.com','g2',?,'v1',?)").run(now, now);
  sql.prepare("INSERT INTO energy(user_id) VALUES('u')").run();
  sql.prepare("INSERT INTO sessions(id,user_id,expires_at) VALUES(?,'u',?)").run(sid, now + 100000);
  sql.prepare("INSERT INTO creators(id,name,bio,avatar_key) VALUES('milin','Milin','bio','avatars/milin.png'),('noey','Noey','bio',NULL)").run();
  sql.prepare('INSERT INTO npc_definitions(creator_id,definition_json,updated_at) VALUES(?,?,?),(?,?,?)').run(
    'milin', JSON.stringify({ handle: 'milin.x', tagline: 'สาวหวานขี้อาย', color: '#b18bf4', tags: ['สายอ้อน', 'ขี้เหงา'] }), now,
    'noey', '{"broken":', now // deliberately invalid JSON: the endpoint must fall back, not crash
  );
  sql.prepare("INSERT INTO ai_chat_messages(id,user_id,creator_id,role,content,created_at) VALUES('m1','u','milin','user','hi',?),('m2','u','milin','assistant','yo',?),('m3','u2','milin','user','sup',?)").run(now, now, now);
  return { sql, env: { DB, MEDIA, PUBLIC_ORIGIN: 'https://frost.test', ADMIN_EMAIL: 'admin@example.com' } };
}

async function get(env, path) {
  const res = await worker.fetch(new Request(env.PUBLIC_ORIGIN + path, { headers: { cookie: `frost_session=${raw}` } }), env);
  return { status: res.status, payload: await res.json() };
}

test('GET /api/creators carries Home Hub discovery fields without a migration', async () => {
  const { env } = setup();
  const { status, payload } = await get(env, '/api/creators');
  assert.equal(status, 200);
  const byId = Object.fromEntries(payload.creators.map(c => [c.id, c]));
  assert.deepEqual(byId.milin.tags, ['สายอ้อน', 'ขี้เหงา']);
  assert.equal(byId.milin.tagline, 'สาวหวานขี้อาย');
  assert.equal(byId.milin.handle, 'milin.x');
  assert.equal(byId.milin.color, '#b18bf4');
  assert.equal(byId.milin.chatCount, 2, 'counts distinct players, not messages');
  assert.equal(byId.milin.artState, 'real');
  assert.equal(byId.noey.artState, 'pending', 'no avatar_key means the card renders the placeholder tile');
  assert.equal(byId.noey.chatCount, 0);
  assert.deepEqual(byId.noey.tags, [], 'a corrupt definition_json degrades to defaults instead of throwing');
  assert.equal(byId.noey.handle, 'noey', 'falls back to the creator id');
});

test('GET /api/me exposes the home hub feature flag from env only', async () => {
  const { env } = setup();
  assert.deepEqual((await get(env, '/api/me')).payload.uiFlags, { homeHubV1: false }, 'off unless the Worker says otherwise');
  const res = await get({ ...env, HOME_HUB_V1: 'true' }, '/api/me');
  assert.deepEqual(res.payload.uiFlags, { homeHubV1: true });
});
