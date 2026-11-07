import test from 'node:test';
import assert from 'node:assert/strict';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';

test('a retired creator cannot be opened or messaged through saved URLs and does not spend energy', async () => {
  const f = await narrativeFixture();
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('retired creators must not call AI'); };
  try {
    await f.open();
    const before = f.sql.prepare('SELECT COUNT(*) n FROM ai_chat_messages').get().n;
    f.sql.exec('CREATE TABLE IF NOT EXISTS content_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    f.sql.prepare('INSERT OR REPLACE INTO content_meta(key,value) VALUES(?,?)').run('removed_creators', JSON.stringify([f.npc.id]));
    assert.equal((await f.open()).status, 404);
    assert.equal((await f.request('ทักทาย')).status, 404);
    assert.equal((await f.request('', { action: '', path: `/api/creators/${f.npc.id}/profile` })).status, 404);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM ai_chat_messages').get().n, before);
    assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 100);
  } finally { globalThis.fetch = savedFetch; f.sql.close(); }
});
