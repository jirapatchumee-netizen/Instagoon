import test from 'node:test';
import assert from 'node:assert/strict';
import { narrativeFixture, modelReply } from './helpers/narrative-fixture.mjs';
import { ensureNarrativeOpening } from '../src/narrative.mjs';
import { NpcSchema } from '../../packages/contracts/npc/schema.ts';

test('opening a new chat creates a free real NPC greeting once, with time/place and no secret spoiler', async () => {
  const f = await narrativeFixture();
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('An authored opening must not call a model'); };
  try {
    const opened = await Promise.all([f.open(), f.open(), f.open()]);
    for (const result of opened) {
      assert.equal(result.status, 200);
      assert.equal(result.payload.chat.aiMessages.length, 1);
    }
    const greeting = opened[0].payload.chat.aiMessages[0];
    assert.equal(greeting.role, 'assistant');
    assert.match(greeting.content, /^\[scene:/);
    assert.match(greeting.content, /\[thought:/);
    assert.match(greeting.content, /พี่ชื่อเชียร์/);
    assert.ok(!/แพ้พนัน|หนึ่งภาคการศึกษา|ต้องจีบ|เดิมพัน/.test(greeting.content));
    assert.equal(greeting.affectionDelta, 0);
    assert.equal(f.state().turn, 0);
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM ai_chat_messages WHERE user_id='one' AND role='user'").get().n, 0);
    assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 100);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM token_ledger').get().n, 0);
    const reopened = await f.open();
    assert.equal(reopened.payload.chat.aiMessages[0].id, greeting.id);
    await f.open('two');
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM ai_chat_messages').get().n, 2, 'each player has their own greeting');
  } finally { globalThis.fetch = savedFetch; f.sql.close(); }
});

test('the first player response inherits the NPC invitation even when POST arrives before GET', async () => {
  const f = await narrativeFixture();
  const savedFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (_url, init) => {
    sent = JSON.parse(init.body);
    return modelReply({ beats: [{ kind: 'action', text: 'เชียร์พยักหน้าแล้วหยุดแซว' }, { kind: 'dialogue', text: 'เออ ได้ ไม่ตื๊อ อยากคุยเรื่องอื่นก็บอก' }], sceneUpdate: { move: 'stay', mood: 'รักษาฟอร์ม', goal: 'คุยตามความสะดวกของรุ่นน้อง', activity: 'นั่งคุยที่โรงอาหาร' } });
  };
  try {
    const result = await f.request('ไม่เอาอะ');
    assert.equal(result.status, 200);
    assert.equal(result.payload.messages.length, 3);
    assert.deepEqual(result.payload.messages.map(m => m.role), ['assistant', 'user', 'assistant']);
    const data = JSON.parse(sent.contents[0].parts[0].text);
    assert.ok(data.recentHistory.includes('ให้พี่ชวนกินข้าวสักมื้อไหม'));
    assert.ok(sent.systemInstruction.parts[0].text.includes(f.npc.userRole));
    assert.equal((await f.open()).payload.chat.aiMessages.length, 3, 'reopening does not introduce a second opening');
    assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 99, 'only the actual reply costs energy');
    await f.request('', { action: 'reset-chat' });
    assert.equal((await f.open()).payload.chat.aiMessages.length, 1, 'an explicit chat reset starts a new opening');
  } finally { globalThis.fetch = savedFetch; f.sql.close(); }
});

test('existing histories and scene states are not overwritten, and the opening batch is atomic', async () => {
  const f = await narrativeFixture();
  try {
    f.sql.prepare('INSERT INTO ai_chat_messages(id,user_id,creator_id,role,content,created_at) VALUES(?,?,?,?,?,?)').run('existing', 'one', 'cheer', 'user', 'คุยกันไปแล้ว', Date.now());
    assert.equal((await f.open()).payload.chat.aiMessages.length, 1);
    assert.equal(f.state(), null, 'an old conversation is not reset to the opening scene');
    f.sql.exec("CREATE TRIGGER fail_initial_scene BEFORE INSERT ON npc_scene_states BEGIN SELECT RAISE(ABORT, 'fixture_scene_failure'); END;");
    assert.equal((await f.open('two')).status, 500);
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM ai_chat_messages WHERE user_id='two'").get().n, 0, 'a failed scene write does not leave a partial greeting');
    f.sql.exec('DROP TRIGGER fail_initial_scene');
    assert.equal((await f.open('two')).payload.chat.aiMessages.length, 1);
    const id = f.sql.prepare("SELECT id FROM ai_chat_messages WHERE user_id='two'").get().id;
    f.sql.prepare('DELETE FROM ai_chat_messages WHERE id=?').run(id);
    assert.equal(await ensureNarrativeOpening(f.env.DB, 'two', f.npc, Date.now()), false, 'retained scene state prevents replay after history pruning');
    const malformed = structuredClone(f.npc);
    malformed.narrative.opening.beats = [{ kind: 'action', text: 'เธอยิ้ม' }];
    assert.equal(NpcSchema.safeParse(malformed).success, false, 'an opening needs actual spoken dialogue');
  } finally { f.sql.close(); }
});
