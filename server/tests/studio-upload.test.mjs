import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker from '../src/index.mjs';

// Cosplay Creator Studio phase 0: the prototype must stay behind a flag and its uploads must stay private.
const sessionHash = async raw => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)))).map(n => n.toString(16).padStart(2, '0')).join('');
const RAW_U = 'a'.repeat(64), RAW_U2 = 'b'.repeat(64);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1, 2, 3, 4]);

async function setup(extraEnv = {}) {
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
  const MEDIA = { async list() { return { objects: [] }; }, async get(k) { return objects.get(k) || null; }, async head(k) { return objects.get(k) || null; }, async put(k, v, o) { objects.set(k, { body: v, httpMetadata: o?.httpMetadata }); return null; } };
  const now = Date.now();
  for (const [id, email, raw] of [['u', 'u@example.com', RAW_U], ['u2', 'u2@example.com', RAW_U2]]) {
    sql.prepare('INSERT INTO invites(email) VALUES(?)').run(email);
    sql.prepare("INSERT INTO users(id,email,google_id,age_verified_at,consent_version,created_at) VALUES(?,?,?,?,'v1',?)").run(id, email, 'g' + id, now, now);
    sql.prepare('INSERT INTO energy(user_id) VALUES(?)').run(id);
    sql.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').run(await sessionHash(raw), id, now + 100000);
  }
  sql.prepare('INSERT INTO studio_tokens(id,creator_uid,token_hash,issued_email,created_at,user_id,redeemed_at) VALUES(?,?,?,?,?,?,?)').run('tok_u', 'ccu_u', 'hash_u', 'u@example.com', now, 'u', now);
  return { sql, objects, env: { DB, MEDIA, PUBLIC_ORIGIN: 'https://frost.test', ADMIN_EMAIL: 'admin@example.com', ...extraEnv } };
}

const call = (env, path, { raw = RAW_U, method = 'GET', body } = {}) => worker.fetch(new Request(env.PUBLIC_ORIGIN + path, {
  method, body, headers: { cookie: `frost_session=${raw}`, ...(method === 'GET' ? {} : { origin: env.PUBLIC_ORIGIN, 'content-type': 'image/webp' }) }
}), env);
const upload = (env, opts = {}) => call(env, '/api/media/upload', { method: 'POST', body: WEBP, ...opts });

test('studio is hidden and upload refused while COSPLAY_STUDIO_V1 is off', async () => {
  const { env } = await setup();
  const me = await (await call(env, '/api/me')).json();
  assert.equal(me.uiFlags.cosplayStudioV1, false);
  assert.equal((await upload(env)).status, 403);
});

test('flag on still refuses players without a token', async () => {
  const { env } = await setup({ COSPLAY_STUDIO_V1: 'true' });
  const me = await (await call(env, '/api/me', { raw: RAW_U2 })).json();
  assert.equal(me.uiFlags.cosplayStudioV1, false);
  assert.equal((await upload(env, { raw: RAW_U2 })).status, 403);
});

test('allowed upload lands in a private studio-drafts/<uid>/ key readable only by its owner', async () => {
  const { env } = await setup({ COSPLAY_STUDIO_V1: 'true' });
  assert.equal((await (await call(env, '/api/me')).json()).uiFlags.cosplayStudioV1, true);
  const res = await upload(env);
  assert.equal(res.status, 200);
  const { mediaKey, url } = await res.json();
  assert.match(mediaKey, /^studio-drafts\/u\/\d+_[0-9a-f]{8}\.webp$/);
  assert.equal((await call(env, url)).status, 200, 'owner can read the draft');
  assert.equal((await call(env, url, { raw: RAW_U2 })).status, 404, 'another player cannot');
});

test('upload rejects non-WebP, oversize and over-quota requests', async () => {
  const { env, sql } = await setup({ COSPLAY_STUDIO_V1: 'true' });
  assert.equal((await upload(env, { body: new Uint8Array(16) })).status, 400);
  const big = new Uint8Array(2000001); big.set(WEBP);
  assert.equal((await upload(env, { body: big })).status, 400);
  const now = Date.now();
  for (let i = 0; i < 30; i++) sql.prepare("INSERT INTO activity(user_id,kind,created_at) VALUES('u','studio_upload',?)").run(now - i);
  assert.equal((await upload(env)).status, 429);
});
