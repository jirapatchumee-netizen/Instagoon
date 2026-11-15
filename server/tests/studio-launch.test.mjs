import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.mjs';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';

// Studio launch: a draft saved in D1 becomes a live character that other players see and can DM through the
// normal pipeline, without letting a Studio user take over an existing creator id.
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1, 2, 3, 4]);
const LEVELS = ['สวัสดีค่ะ', 'จำได้นะ', 'คิดถึงจัง', 'เล่าให้ฟังนะ', 'อยู่ด้วยกันนะ'];

async function studio() {
  const f = await narrativeFixture();
  Object.assign(f.env, { COSPLAY_STUDIO_V1: 'true', STAGING_EMAILS: 'one@example.com', PRIMARY_AI_PROVIDER: 'workers-ai',
    AI: { async run() { return { response: JSON.stringify({ reply: 'ยินดีที่ได้รู้จักนะคะ', innerThought: 'เขินจัง', action: 'โบกมือ' }) }; } } });
  const cookie = {};
  for (const uid of ['one', 'two']) {
    const raw = crypto.randomUUID();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))), n => n.toString(16).padStart(2, '0')).join('');
    f.sql.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').run(hash, uid, Date.now() + 3600000);
    cookie[uid] = `frost_session=${raw}`;
  }
  const call = async (path, { uid = 'one', method = 'GET', json, raw } = {}) => {
    const res = await worker.fetch(new Request(f.env.PUBLIC_ORIGIN + path, { method, body: raw ?? (json ? JSON.stringify(json) : undefined),
      headers: { cookie: cookie[uid], ...(method === 'GET' ? {} : { origin: f.env.PUBLIC_ORIGIN, 'content-type': raw ? 'image/webp' : 'application/json' }) } }), f.env, { waitUntil() {} });
    return { status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : null };
  };
  const avatar = (await call('/api/media/upload', { method: 'POST', raw: WEBP })).body.mediaKey;
  const draft = { name: 'Yuki', handle: 'yuki.cosplay', concept: 'คอสเพลเยอร์สายน่ารัก', age: 24, avatar, voiceTone: 'ขี้อ้อน', pronouns: 'เค้า / ตัวเอง', levelStyles: LEVELS };
  return { f, call, draft };
}

test('draft is stored per account and launch refuses an incomplete or under-age character', async () => {
  const { call, draft } = await studio();
  const saved = await call('/api/studio/draft', { method: 'PUT', json: { ...draft, age: 17 } });
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.problems, ['age']);
  assert.equal((await call('/api/studio/draft')).body.draft.age, 17);
  assert.equal((await call('/api/studio/draft', { uid: 'two' })).status, 403, 'outside STAGING_EMAILS');
  const r = await call('/api/studio/launch', { method: 'POST', json: { ...draft, age: 17 } });
  assert.equal(r.status, 400);
  assert.deepEqual(r.body.problems, ['age']);
});

test('launch makes the character visible and chattable for another player, and unpublish hides it again', async () => {
  const { f, call, draft } = await studio();
  f.env.STAGING_EMAILS = 'one@example.com,two@example.com';
  const r = await call('/api/studio/launch', { method: 'POST', json: draft });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'live');
  assert.equal(r.body.creatorId, 'cos_yuki_cosplay');
  const list = (await call('/api/creators', { uid: 'two' })).body.creators;
  const yuki = list.find(c => c.id === 'cos_yuki_cosplay');
  assert.ok(yuki, 'listed for other players');
  assert.equal(yuki.creatorType, 'cosplay');
  assert.match(yuki.avatarKey, /^studio-live\/cos_yuki_cosplay\//);
  assert.equal((await call('/api/media/' + yuki.avatarKey, { uid: 'two' })).status, 200, 'live avatar is public');
  const dm = await call('/api/chats/cos_yuki_cosplay/message', { uid: 'two', method: 'POST', json: { message: 'สวัสดีครับ' } });
  assert.equal(dm.status, 200, JSON.stringify(dm.body));
  assert.match(JSON.stringify(dm.body), /ยินดีที่ได้รู้จักนะคะ/, 'reply comes from the model through the DM pipeline');
  const def = JSON.parse(f.sql.prepare('SELECT definition_json d FROM npc_definitions WHERE creator_id=?').get('cos_yuki_cosplay').d);
  assert.deepEqual(def.style.levelStyles, LEVELS);
  assert.ok(def.immutableFacts.includes('อายุ 24 ปี เป็นผู้ใหญ่'));

  assert.equal((await call('/api/studio/unpublish', { method: 'POST' })).status, 200);
  assert.ok(!(await call('/api/creators', { uid: 'two' })).body.creators.some(c => c.id === 'cos_yuki_cosplay'));
  assert.equal((await call('/api/chats/cos_yuki_cosplay/message', { uid: 'two', method: 'POST', json: { message: 'อยู่ไหม' } })).status, 404);
  assert.equal((await call('/api/studio/launch', { method: 'POST', json: draft })).body.status, 'live', 'relaunch');
});

test('launch cannot take an existing creator id or publish another account\'s media', async () => {
  const { f, call, draft } = await studio();
  f.sql.prepare("INSERT INTO creators(id,name,bio) VALUES('cos_milin','Milin','')").run();
  assert.equal((await call('/api/studio/launch', { method: 'POST', json: { ...draft, handle: 'milin' } })).status, 409);
  assert.equal((await call('/api/studio/launch', { method: 'POST', json: { ...draft, avatar: 'studio-drafts/two/x.webp' } })).status, 400);
  assert.equal((await call('/api/studio/launch', { method: 'POST', json: { ...draft, avatar: 'avatars/milin.png' } })).status, 400);
  assert.equal(f.sql.prepare("SELECT name FROM creators WHERE id='cos_milin'").get().name, 'Milin');
});
