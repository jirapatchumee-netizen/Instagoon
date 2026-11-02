// Scripted DM episodes: git validation, content sync and the Worker rules that hang off them (ADR 0008).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newNpc } from '../../lib/npc/schema.ts';
import { buildContent } from '../../scripts/build-content.mjs';
import { ensureContent, resetContentCache } from '../src/content.mjs';
import worker from '../src/index.mjs';

const nodes = () => [
  { id: 'n1', text: 'หนึ่ง', end: false, choices: [
    { id: 'a', text: 'เอ', nextNodeId: 'n2', effects: { closeness: 20, trust: 20, romance: 20 } },
    { id: 'b', text: 'บี', nextNodeId: 'n2', effects: { closeness: 0, trust: 0, romance: 0 } },
  ] },
  { id: 'n2', text: 'สอง', end: false, choices: [{ id: 'c', text: 'ซี', nextNodeId: 'end', memory: { key: 'k.story', value: 'ผู้เล่นเลือกทางซี' } }] },
  { id: 'end', text: 'จบ', end: true, choices: [] },
];
const episode = (over = {}) => ({ id: 'ep_t', title: 'ตอนทดสอบ', relationshipRequired: 0, position: 1, nodes: nodes(), ...over });

function contentFixture(ep) {
  const root = mkdtempSync(join(tmpdir(), 'ep-'));
  const content = join(root, 'content'), dist = join(root, 'dist');
  mkdirSync(join(content, 'creators', 'tester'), { recursive: true });
  mkdirSync(join(content, 'media', 'avatars'), { recursive: true });
  writeFileSync(join(content, 'media', 'avatars', 'tester.webp'), 'RIFFxxxxWEBP');
  writeFileSync(join(content, 'creators', 'tester', 'character.json'), JSON.stringify({ ...newNpc('tester'), avatar: 'avatars/tester.webp' }));
  if (ep !== null) writeFileSync(join(content, 'creators', 'tester', 'episodes.json'), JSON.stringify([ep]));
  return { content, dist };
}

const throwsWith = (ep, re) => {
  const { content, dist } = contentFixture(ep);
  assert.throws(() => buildContent(content, dist), re);
};

test('episode: every branch must be worth walking, and the best one must reach Lv2', () => {
  throwsWith(episode({ nodes: [
    { id: 'n1', text: 'หนึ่ง', end: false, choices: [
      { id: 'a', text: 'เอ', nextNodeId: 'n2', effects: { closeness: 10, trust: 10, romance: 10 } },
      { id: 'b', text: 'บี', nextNodeId: 'n2' },
    ] },
    { id: 'n2', text: 'สอง', end: false, choices: [{ id: 'c', text: 'ซี', nextNodeId: 'end' }] },
    { id: 'end', text: 'จบ', end: true, choices: [] },
  ] }), /weighted score gain is 10/);
  throwsWith(episode({ nodes: nodes().map(n => ({ ...n, choices: n.choices.map(c => ({ ...c, effects: { closeness: 40, trust: 0, romance: 0 } })) })) }), /within ±30/);
  throwsWith(episode({ nodes: [...nodes().slice(0, 2), { id: 'orphan', text: 'ไม่มีใครถึง', end: true, choices: [] }] }), /unreachable/);
  throwsWith(episode({ nodes: [...nodes(), { id: 'n4', text: 'มี choice ทั้งที่จบ', end: true, choices: [{ id: 'x', text: 'x', nextNodeId: 'end' }] }] }), /end node must have no choices/);
  throwsWith(episode({ nodes: [{ ...nodes()[0], choices: [{ id: 'a', text: 'เอ', nextNodeId: 'nope' }] }] }), /unknown nextNodeId/);
});

test('episode: the revision id is a hash of the nodes, so a republish is idempotent', () => {
  const a = contentFixture(episode()), b = contentFixture(episode());
  const first = buildContent(a.content, a.dist);
  assert.equal(first.creators[0].episodes[0].revisionId, buildContent(b.content, b.dist).creators[0].episodes[0].revisionId);
  const edited = contentFixture(episode({ nodes: nodes().map(n => ({ ...n, text: `${n.text} ` })) }));
  assert.notEqual(buildContent(edited.content, edited.dist).creators[0].episodes[0].revisionId, first.creators[0].episodes[0].revisionId);
  const file = readFileSync(join(a.dist, '_content', 'episode-progress-reset.sql'), 'utf8');
  assert.match(file, new RegExp(`episode_id = 'ep_t' AND revision_id <> '${first.creators[0].episodes[0].revisionId}'`));
  assert.match(file, /DELETE FROM chat_states/);
});

// --- Worker behaviour ---------------------------------------------------------------

const now = Date.now(), raw = 'b'.repeat(64);
const sid = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))), n => n.toString(16).padStart(2, '0')).join('');
const statement = (sql, query, args = []) => ({
  query, args,
  bind: (...next) => statement(sql, query, next),
  first: async () => sql.prepare(query).get(...args) ?? null,
  all: async () => ({ results: sql.prepare(query).all(...args) }),
  run: async () => ({ meta: { changes: sql.prepare(query).run(...args).changes } }),
});
const isRead = q => /^\s*(SELECT|WITH|PRAGMA|VALUES)\b/i.test(q);
// Mirrors D1 batch(): one response per statement, in order, reads as {results} and writes as {meta}.
const d1 = sql => ({ prepare: q => statement(sql, q), async batch(list) { sql.exec('BEGIN'); try { const out = []; for (const s of list) out.push(isRead(s.query) ? { results: sql.prepare(s.query).all(...s.args) } : { meta: { changes: sql.prepare(s.query).run(...s.args).changes } }); sql.exec('COMMIT'); return out; } catch (e) { sql.exec('ROLLBACK'); throw e; } } });
function dbOf() {
  const sql = new DatabaseSync(':memory:');
  const dir = new URL('../migrations/', import.meta.url);
  for (const f of readdirSync(dir).sort()) if (f.endsWith('.sql')) sql.exec(readFileSync(new URL(f, dir), 'utf8'));
  sql.prepare("INSERT INTO invites(email) VALUES('u@example.com')").run();
  sql.prepare('INSERT INTO users(id,email,google_id,age_verified_at,consent_version,created_at) VALUES(?,?,?,?,?,?)').run('u', 'u@example.com', 'g', now, 'v1', now);
  sql.prepare('INSERT INTO energy(user_id,free) VALUES(?,3)').run('u');
  sql.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').run(sid, 'u', now + 100000);
  sql.prepare("INSERT INTO creators(id,name,bio) VALUES('tester','Tester','bio')").run();
  sql.prepare("INSERT INTO npc_definitions(creator_id,definition_json,updated_at) VALUES('tester',?,?)").run(JSON.stringify({ ...newNpc('t'), rules: [], rewards: [] }), now);
  return sql;
}
const envOf = sql => ({ DB: d1(sql), PUBLIC_ORIGIN: 'https://frost.test', ADMIN_EMAIL: 'admin@example.com' });
const assetsOf = dist => ({ async fetch(url) { const f = join(dist, decodeURIComponent(new URL(url).pathname)); return existsSync(f) ? new Response(readFileSync(f), { headers: { 'content-type': f.endsWith('.json') ? 'application/json' : 'image/webp' } }) : new Response('x', { status: 404 }); } });
const headers = { cookie: `frost_session=${raw}`, origin: 'https://frost.test' };
const call = (sql, method, path, body) => worker.fetch(new Request(`https://frost.test${path}`, { method, headers: body ? { ...headers, 'content-type': 'application/json' } : headers, body: body ? JSON.stringify(body) : undefined }), envOf(sql), {});
const post = (sql, path, body) => call(sql, 'POST', path, body);
const get = (sql, path) => call(sql, 'GET', path);

// Builds the bundle from a temp content dir and lets the Worker sync it into D1, the way a deploy does.
async function synced() {
  resetContentCache();
  const sql = dbOf();
  const { content, dist } = contentFixture(episode());
  buildContent(content, dist);
  await ensureContent({ ...envOf(sql), ASSETS: assetsOf(dist) });
  return { sql, dist };
}

test('sync: a script enters D1 as a published revision, and editing it never rewrites the old one', async () => {
  const { sql, dist } = await synced();
  const rev = sql.prepare('SELECT * FROM revisions WHERE episode_id=?').get('ep_t');
  assert.equal(rev.status, 'published');
  assert.ok(sql.prepare('SELECT id FROM episodes WHERE id=?').get('ep_t'));
  const first = rev.id, firstNodes = rev.nodes;
  const edited = contentFixture(episode({ nodes: nodes().map(n => ({ ...n, text: `${n.text}!` })) }));
  buildContent(edited.content, edited.dist);
  resetContentCache();
  await ensureContent({ ...envOf(sql), ASSETS: assetsOf(edited.dist) });
  assert.equal(sql.prepare('SELECT nodes FROM revisions WHERE id=?').get(first).nodes, firstNodes, 'a published revision is immutable');
  assert.equal(sql.prepare('SELECT status FROM revisions WHERE id=?').get(first).status, 'suspended');
  assert.equal(sql.prepare("SELECT count(*) n FROM revisions WHERE status='published'").get().n, 1);
  assert.equal(sql.prepare('SELECT count(*) n FROM chat_states').get().n, 0, 'a content deploy never wipes player progress');
  assert.ok(existsSync(join(dist, '_content', 'content.json')));
});

test('gate: a scripted creator blocks free chat until a playthrough reaches an end node, and costs no energy', async () => {
  const { sql } = await synced();
  const blocked = await post(sql, '/api/chats/tester/message', { message: 'หวัดดีครับ' });
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).error, 'story_required');
  assert.equal(sql.prepare('SELECT free FROM energy WHERE user_id=?').get('u').free, 3, 'a locked turn is not charged');
  await get(sql, '/api/chats/tester');
  assert.ok(sql.prepare('SELECT * FROM chat_states').get(), 'the first accessible episode auto-starts');
  await post(sql, '/api/chats/tester/choose', { choiceId: 'b' });
  const mid = await post(sql, '/api/chats/tester/message', { message: 'ยังไม่จบบท' });
  assert.equal(mid.status, 403, 'a half-walked script does not unlock chat');
  sql.prepare("UPDATE chat_states SET current_node_id='end' WHERE user_id='u'").run();
  const free = await post(sql, '/api/chats/tester/message', { message: 'เล่นจบแล้ว' });
  assert.notEqual(free.status, 403);
});

test('gate: a creator without a published script keeps free chat', async () => {
  resetContentCache();
  const sql = dbOf();
  sql.prepare("INSERT INTO creators(id,name) VALUES('m','No Script')").run();
  sql.prepare("INSERT INTO npc_definitions(creator_id,definition_json,updated_at) VALUES('m',?,?)").run(JSON.stringify({ ...newNpc('m'), rules: [], rewards: [] }), now);
  const res = await post(sql, '/api/chats/m/message', { message: 'hi' });
  assert.notEqual(res.status, 403);
});

test('choose: effects, memory and chat history land once per pinned revision', async () => {
  const { sql } = await synced();
  await get(sql, '/api/chats/tester');
  const rel = () => sql.prepare('SELECT * FROM relationships WHERE user_id=? AND creator_id=?').get('u', 'tester');
  const chosen = await post(sql, '/api/chats/tester/choose', { choiceId: 'a' });
  assert.equal(chosen.status, 200, JSON.stringify(await chosen.json()));
  assert.equal(rel().closeness, 20);
  assert.equal(rel().trust, 20);
  assert.equal(rel().score, 20, 'score is the weighted sum, not the raw axis total');
  sql.prepare("UPDATE chat_states SET current_node_id='n1' WHERE user_id='u'").run(); // replay the same choice
  await post(sql, '/api/chats/tester/choose', { choiceId: 'a' });
  assert.equal(rel().closeness, 20, 'a choice pays out once per revision');
  await post(sql, '/api/chats/tester/choose', { choiceId: 'c' });
  assert.equal(sql.prepare("SELECT value FROM player_memories WHERE key='k.story'").get().value, 'ผู้เล่นเลือกทางซี');
  const history = sql.prepare('SELECT * FROM chat_history ORDER BY position').all();
  assert.deepEqual(history.map(h => h.position), history.map((_, i) => i), 'the chat_start/chat_advance triggers record every step with no gap');
  assert.ok(history.length >= 5, 'the walk and the replay are both recorded');
  assert.equal(history[0].choice_id, 'a');
});
