import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';
import { applyCreatorResets } from '../src/creator-resets.mjs';
import { ensureContent, resetContentCache } from '../src/content.mjs';

const direct = ['ai_chat_messages', 'player_memories', 'dm_threads', 'npc_scene_states', 'reward_unlocks', 'relationships', 'chat_active', 'ai_turn_metrics'];
function seed(sql, creator) {
  sql.prepare('INSERT OR IGNORE INTO creators(id,name) VALUES(?,?)').run(creator, creator);
  const episode = `${creator}-episode`, revision = `${creator}-revision`;
  sql.prepare('INSERT INTO episodes(id,creator_id,title) VALUES(?,?,?)').run(episode, creator, 'test');
  sql.prepare('INSERT INTO revisions(id,creator_id,episode_id,nodes,created_at) VALUES(?,?,?,?,0)').run(revision, creator, episode, '[]');
  for (const user of ['one', 'two']) {
    sql.prepare('INSERT INTO ai_chat_messages(id,user_id,creator_id,role,content,created_at) VALUES(?,?,?,?,?,0)').run(`${creator}-${user}`, user, creator, 'user', 'old');
    sql.prepare('INSERT INTO player_memories(user_id,creator_id,key,value,created_at) VALUES(?,?,?,?,0)').run(user, creator, 'old', 'old');
    sql.prepare('INSERT INTO dm_threads(user_id,creator_id,summary) VALUES(?,?,?)').run(user, creator, 'old');
    sql.prepare('INSERT INTO npc_scene_states(user_id,creator_id,state_json,updated_at) VALUES(?,?,?,0)').run(user, creator, '{}');
    sql.prepare('INSERT INTO relationships(user_id,creator_id,score) VALUES(?,?,30)').run(user, creator);
    sql.prepare('INSERT INTO reward_unlocks(user_id,creator_id,reward_key,unlocked_at) VALUES(?,?,?,0)').run(user, creator, 'old');
    sql.prepare('INSERT INTO chat_states(user_id,episode_id,revision_id,current_node_id) VALUES(?,?,?,?)').run(user, episode, revision, 'first');
    sql.prepare('INSERT INTO chat_active(user_id,creator_id,episode_id) VALUES(?,?,?)').run(user, creator, episode);
    sql.prepare("INSERT INTO ai_turn_metrics(id,user_id,creator_id,visit_id,created_at,outcome) VALUES(?,?,?,?,0,'ok')").run(`${creator}-${user}`, user, creator, 'old');
  }
}
function counts(sql, creator) {
  return [...direct.map(table => sql.prepare(`SELECT COUNT(*) n FROM ${table} WHERE creator_id=?`).get(creator).n),
    ...['chat_history', 'chat_states'].map(table => sql.prepare(`SELECT COUNT(*) n FROM ${table} WHERE episode_id IN (SELECT id FROM episodes WHERE creator_id=?)`).get(creator).n)];
}

test('explicit runtime reset clears every player for the target only and cannot clear a later incarnation', async () => {
  const f = await narrativeFixture();
  try {
    seed(f.sql, 'target'); seed(f.sql, 'kept');
    const reset = { id: 'test-reset', creatorId: 'target' }, bundle = { creators: [], creatorResets: [reset] };
    const energy = f.sql.prepare('SELECT * FROM energy ORDER BY user_id').all();
    await Promise.all([applyCreatorResets(f.env, bundle), applyCreatorResets(f.env, bundle)]);
    assert.deepEqual(counts(f.sql, 'target'), Array(10).fill(0));
    assert.deepEqual(counts(f.sql, 'kept'), Array(10).fill(2));
    assert.deepEqual(f.sql.prepare('SELECT * FROM energy ORDER BY user_id').all(), energy);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM users').get().n, 2);
    f.sql.prepare("INSERT INTO relationships(user_id,creator_id,score) VALUES('one','target',7)").run();
    await applyCreatorResets(f.env, bundle);
    assert.equal(f.sql.prepare("SELECT score FROM relationships WHERE creator_id='target'").get().score, 7);
  } finally { f.sql.close(); }
});

test('a failed reset rolls back its deletes and marker, and a later retry completes it', async () => {
  const f = await narrativeFixture();
  try {
    seed(f.sql, 'target');
    f.sql.exec("CREATE TRIGGER fail_reset BEFORE DELETE ON player_memories BEGIN SELECT RAISE(ABORT, 'fixture_reset_failure'); END");
    const bundle = { creators: [], creatorResets: [{ id: 'retry-reset', creatorId: 'target' }] };
    await assert.rejects(applyCreatorResets(f.env, bundle), error => error.contentResetFailed === true);
    assert.deepEqual(counts(f.sql, 'target'), Array(10).fill(2));
    assert.equal(f.sql.prepare("SELECT value FROM content_meta WHERE key='creator-reset:retry-reset'").get(), undefined);
    f.env.ASSETS = { async fetch() { return Response.json({ ...bundle, version: 'failed-reset', media: [] }); } };
    resetContentCache();
    assert.equal((await f.open()).status, 503, 'the API must not report success while an authorized reset is incomplete');
    f.sql.exec('DROP TRIGGER fail_reset');
    await applyCreatorResets(f.env, bundle);
    assert.deepEqual(counts(f.sql, 'target'), Array(10).fill(0));
  } finally { resetContentCache(); f.sql.close(); }
});

test('migration reconciliation clears only old Cheer state, once, preserving other creators and new progress', async () => {
  const f = await narrativeFixture();
  try {
    seed(f.sql, 'cheer'); seed(f.sql, 'kept');
    f.sql.prepare("DELETE FROM content_meta WHERE key='creator-reset:retire-cheer-20261108'").run();
    const sql = readFileSync(new URL('../migrations/0013_reset_retired_cheer.sql', import.meta.url), 'utf8');
    f.sql.exec(sql);
    assert.deepEqual(counts(f.sql, 'cheer'), Array(10).fill(0));
    assert.deepEqual(counts(f.sql, 'kept'), Array(10).fill(2));
    f.sql.prepare("INSERT INTO relationships(user_id,creator_id,score) VALUES('one','cheer',5)").run();
    f.sql.exec(sql);
    assert.equal(f.sql.prepare("SELECT score FROM relationships WHERE creator_id='cheer'").get().score, 5);
  } finally { f.sql.close(); }
});

test('content sync applies a pending reset even if its bundle version was already saved', async () => {
  const f = await narrativeFixture();
  try {
    seed(f.sql, 'target');
    const bundle = { version: 'saved-version', creators: [], media: [], creatorResets: [{ id: 'late-reset', creatorId: 'target' }] };
    f.sql.prepare("INSERT INTO content_meta(key,value) VALUES('version',?)").run(bundle.version);
    f.env.ASSETS = { async fetch() { return Response.json(bundle); } };
    resetContentCache();
    await ensureContent(f.env);
    assert.deepEqual(counts(f.sql, 'target'), Array(10).fill(0));
  } finally { resetContentCache(); f.sql.close(); }
});

test('content-sync failures before the reset also fail closed', async () => {
  const f = await narrativeFixture();
  try {
    const bundle = { version: 'blocked-sync', creators: [], media: [], creatorResets: [{ id: 'blocked', creatorId: 'target' }] };
    f.env.ASSETS = { async fetch() { return Response.json(bundle); } };
    f.sql.exec("CREATE TRIGGER fail_sync BEFORE INSERT ON content_meta BEGIN SELECT RAISE(ABORT, 'fixture_sync_failure'); END");
    resetContentCache();
    assert.equal((await f.open()).status, 503);
  } finally { resetContentCache(); f.sql.close(); }
});
