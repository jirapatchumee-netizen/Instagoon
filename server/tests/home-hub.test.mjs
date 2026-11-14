import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker, { resetHomeCache } from '../src/index.mjs';

// Same harness shape as api.mjs: in-memory D1 schema + signed session cookie.
const raw = 'a'.repeat(64);
const sid = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)))).map(n => n.toString(16).padStart(2, '0')).join('');

function setup() {
  resetHomeCache();
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

test('GET /api/creators returns publishedAt and caches public catalog while keeping per-user state fresh', async () => {
  const { sql, env } = setup();
  const now = Date.now();
  sql.prepare("INSERT INTO posts(id,creator_id,caption,media_key,published_at,status) VALUES('p1','milin','hi','m1',?,'published')").run(now - 5000);
  sql.prepare("INSERT INTO stories(id,creator_id,type,media_key,published_at,status) VALUES('s1','milin','broadcast','s1',?,'published')").run(now - 1000);

  const first = await get(env, '/api/creators');
  assert.equal(first.status, 200);
  const milin1 = first.payload.creators.find(c => c.id === 'milin');
  const noey1 = first.payload.creators.find(c => c.id === 'noey');
  assert.equal(milin1.publishedAt, now - 1000);
  assert.equal(noey1.publishedAt, null);
  assert.equal(milin1.following, false);

  // Mutate both public catalog (ai_chat_messages) and per-user state (follows).
  sql.prepare("INSERT INTO ai_chat_messages(id,user_id,creator_id,role,content,created_at) VALUES('m4','u','noey','user','hey',?)").run(now);
  sql.prepare("INSERT INTO follows(user_id,creator_id,created_at) VALUES('u','milin',?)").run(now);

  const second = await get(env, '/api/creators');
  const milin2 = second.payload.creators.find(c => c.id === 'milin');
  const noey2 = second.payload.creators.find(c => c.id === 'noey');
  assert.equal(noey2.chatCount, 0, 'public catalog remains cached for 5 minutes');
  assert.equal(milin2.following, true, 'per-user follow state is never cached');
});

test('GET /api/home returns period-scoped ranking, sections, genres, and real-state missions', async () => {
  const { sql, env } = setup();
  const now = Date.now();
  const DAY = 86_400_000;
  // Add an older chat for noey 5 days ago (included in 7d/30d, excluded in 1d) and a story + follow + relationship.
  sql.prepare("INSERT INTO ai_chat_messages(id,user_id,creator_id,role,content,created_at) VALUES('m_old1','u2','noey','user','hi',?)").run(now - 5 * DAY);
  sql.prepare("INSERT INTO experiment_chat_messages(id,user_id,creator_id,experiment_key,role,content,created_at) VALUES('e_old1','u','noey','exp1','user','yo',?)").run(now - 10 * DAY);
  sql.prepare("INSERT INTO follows(user_id,creator_id,created_at) VALUES('u','milin',?)").run(now);
  sql.prepare("INSERT INTO relationships(user_id,creator_id,score) VALUES('u','milin',2)").run();
  sql.prepare("INSERT INTO posts(id,creator_id,caption,media_key,published_at,status) VALUES('p1','noey','c','k',?,'published')").run(now - 100);
  sql.prepare("INSERT INTO stories(id,creator_id,type,media_key,published_at,status) VALUES('s1','milin','broadcast','sk',?,'published')").run(now - 200);
  sql.prepare("INSERT INTO story_views(user_id,story_id,first_viewed_at) VALUES('u','s1',?)").run(now);

  const res1d = await get(env, '/api/home?period=1d');
  assert.equal(res1d.status, 200);
  assert.equal(res1d.payload.period, '1d');
  assert.deepEqual(res1d.payload.ranking, [{ creatorId: 'milin', chatCount: 2 }]);
  assert.deepEqual(res1d.payload.genres, ['สายอ้อน', 'ขี้เหงา']);

  const sections = Object.fromEntries(res1d.payload.sections.map(s => [s.id, s.creatorIds]));
  assert.deepEqual(sections.continue, ['milin', 'noey']);
  assert.deepEqual(sections.trending, ['milin']);
  assert.deepEqual(sections.recommended, ['noey']);
  assert.deepEqual(sections.new, ['noey', 'milin']);

  const missions = Object.fromEntries(res1d.payload.missions.map(m => [m.id, m]));
  assert.equal(missions.follow_creator.done, true);
  assert.equal(missions.first_chat.done, true);
  assert.equal(missions.view_story.done, true);
  assert.equal(missions.reach_level.done, true);

  const res7d = await get(env, '/api/home?period=7d');
  assert.deepEqual(res7d.payload.ranking, [
    { creatorId: 'milin', chatCount: 2 },
    { creatorId: 'noey', chatCount: 1 }
  ]);

  const res30d = await get(env, '/api/home?period=30d');
  assert.deepEqual(res30d.payload.ranking, [
    { creatorId: 'milin', chatCount: 2 },
    { creatorId: 'noey', chatCount: 2 }
  ]);
});

test('GET /api/feed paginates cleanly with limit and cursor', async () => {
  const { sql, env } = setup();
  const now = Date.now();
  sql.prepare("INSERT INTO follows(user_id,creator_id,created_at) VALUES('u','milin',?)").run(now);
  sql.prepare("INSERT INTO posts(id,creator_id,caption,media_key,published_at,status) VALUES('p1','milin','first','m1',?,'published'),('p2','milin','second','m2',?,'published'),('p3','milin','third','m3',?,'published')")
    .run(now - 3000, now - 2000, now - 1000);

  const page1 = await get(env, '/api/feed?limit=1');
  assert.equal(page1.status, 200);
  assert.deepEqual(page1.payload.posts.map(p => p.id), ['p3']);
  assert.equal(page1.payload.nextCursor, now - 1000);

  const page2 = await get(env, `/api/feed?limit=1&cursor=${page1.payload.nextCursor}`);
  assert.deepEqual(page2.payload.posts.map(p => p.id), ['p2']);
  assert.equal(page2.payload.nextCursor, now - 2000);

  const page3 = await get(env, `/api/feed?limit=2&cursor=${page2.payload.nextCursor}`);
  assert.deepEqual(page3.payload.posts.map(p => p.id), ['p1']);
  assert.equal(page3.payload.nextCursor, null);
});
