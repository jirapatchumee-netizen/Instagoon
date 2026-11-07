import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';
import { characterOnlyIdentity } from '../src/character-only-chat.mjs';
import { NpcSchema } from '../../packages/contracts/npc/schema.ts';
import { applyCreatorResets } from '../src/creator-resets.mjs';
const sourceNpc = JSON.parse(readFileSync(new URL('../../content/creators/cheer/character.json', import.meta.url), 'utf8'));
async function fixture() {
  const f = await narrativeFixture();
  for (const k of Object.keys(f.npc)) delete f.npc[k];
  Object.assign(f.npc, structuredClone(sourceNpc));
  f.sql.prepare('INSERT INTO creators(id,name,bio) VALUES(?,?,?)').run(f.npc.id, f.npc.name, f.npc.tagline);
  f.sql.prepare('INSERT INTO npc_definitions(creator_id,definition_json,updated_at) VALUES(?,?,0)').run(f.npc.id, JSON.stringify(f.npc));
  f.env.DEEPSEEK_API_KEY = 'fixture-placeholder';
  f.env.PRIMARY_AI_PROVIDER = 'workers-ai'; // The character pins its own provider regardless.
  f.env.AI = { async run() { throw new Error('experiment must never use Workers AI'); } };
  return f;
}
const answer = text => Response.json({ model: 'deepseek-flash', choices: [{ finish_reason: 'stop', message: { content: text } }], usage: { prompt_tokens: 100, completion_tokens: 30 } });
const count = f => f.sql.prepare('SELECT COUNT(*) n FROM experiment_chat_messages').get().n;

test('source-only requests use exactly the new file, no legacy state, no JSON schema or central prompt', async () => {
  const f = await fixture(), saved = globalThis.fetch, sent = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.deepseek.com/chat/completions');
    sent.push(JSON.parse(init.body)); return answer('เชียร์เท้าคางมอง\n"แล้วมึงมีอะไรอยากถามกูไหม"');
  };
  try {
    assert.equal(NpcSchema.safeParse(f.npc).success, true);
    assert.equal(NpcSchema.safeParse({ ...f.npc, narrative: { enabled: true } }).success, false);
    f.sql.prepare("INSERT INTO ai_chat_messages(id,user_id,creator_id,role,content,created_at) VALUES('old','one','cheer','assistant','OLD_STYLE_EXAMPLE',0)").run();
    f.sql.prepare("INSERT INTO player_memories(user_id,creator_id,key,value,created_at) VALUES('one','cheer','player.old','OLD_PLAYER_MEMORY',0)").run();
    f.sql.prepare("INSERT INTO dm_threads(user_id,creator_id,summary) VALUES('one','cheer','OLD_SUMMARY')").run();
    f.sql.prepare("INSERT INTO relationships(user_id,creator_id,score,romance) VALUES('one','cheer',95,95)").run();
    const opened = await f.open();
    assert.equal(opened.status, 200);
    assert.deepEqual(opened.payload.chat.aiMessages, []);
    assert.equal(opened.payload.chat.score, 0);
    assert.deepEqual(opened.payload.chat.nodes, [], 'no authored opening or canned greeting');
    const result = await f.request('ไม่แดก', { data: { message: 'ไม่แดก', fiftyShades: true } });
    assert.equal(result.status, 200);
    assert.equal(result.payload.reply, 'เชียร์เท้าคางมอง\n"แล้วมึงมีอะไรอยากถามกูไหม"');
    assert.deepEqual(sent[0].messages, [{ role: 'system', content: f.npc.biography }, { role: 'user', content: 'ไม่แดก' }]);
    assert.equal(sent[0].model, 'deepseek-flash');
    assert.equal(sent[0].reasoning_effort, 'none');
    assert.equal(sent[0].response_format, undefined);
    assert.equal(sent[0].tools, undefined);
    assert.equal(sent[0].messages[0].content, sourceNpc.biography);
    assert.equal(sent.length, 1);
    assert.equal(f.deferred.length, 0, 'no background summarizer');
    assert.equal(f.sql.prepare("SELECT romance FROM relationships WHERE creator_id='cheer'").get().romance, 95, 'experiment does not score or use old relationships');
    assert.equal(f.sql.prepare("SELECT fallback_count FROM ai_turn_metrics WHERE outcome='ok'").get().fallback_count, 0);
    await f.request('ยังไง');
    assert.deepEqual(sent[1].messages.slice(1).map(m => m.role), ['user', 'assistant', 'user']);
    assert.equal(sent[1].messages[1].content, 'ไม่แดก');
    assert.ok(!JSON.stringify(sent).includes('OLD_'));
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('failures return visibly without any fallback or paid/partial history', async () => {
  for (const failure of ['503', '429', 'empty', 'truncated', 'other-model', 'network', 'missing-key']) {
    const f = await fixture(), saved = globalThis.fetch; let calls = 0;
    globalThis.fetch = async url => {
      assert.equal(url, 'https://api.deepseek.com/chat/completions'); calls++;
      if (failure === 'network') throw new Error('fixture outage');
      if (['503', '429'].includes(failure)) return new Response('fixture unavailable', { status: Number(failure) });
      return Response.json({ model: failure === 'other-model' ? 'deepseek-v4-pro' : 'deepseek-flash', choices: [{ finish_reason: failure === 'truncated' ? 'length' : 'stop', message: { content: failure === 'empty' ? '' : 'ข้อความ' } }] });
    };
    if (failure === 'missing-key') delete f.env.DEEPSEEK_API_KEY;
    try {
      const result = await f.request('สวัสดี');
      assert.equal(result.status, failure === '429' ? 429 : 503, failure);
      assert.equal(calls, failure === 'missing-key' ? 0 : 1);
      assert.equal(count(f), 0);
      assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 100);
      assert.equal((await f.open()).payload.chat.aiMessages.length, 0);
    } finally { globalThis.fetch = saved; f.sql.close(); }
  }
});

test('new source/run selects empty history, and reset is scoped to this experiment and player', async () => {
  const f = await fixture(), saved = globalThis.fetch;
  globalThis.fetch = async () => answer('คำตอบใหม่');
  try {
    await f.request('หนึ่ง'); await f.request('สอง', { uid: 'two' });
    await f.request('', { action: 'reset-chat' });
    assert.equal((await f.open()).payload.chat.aiMessages.length, 0);
    assert.equal((await f.open('two')).payload.chat.aiMessages.length, 2);
    const before = await characterOnlyIdentity(f.npc);
    f.npc.biography += '\nรายละเอียดใหม่';
    f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(f.npc), 'cheer');
    assert.notEqual((await characterOnlyIdentity(f.npc)).experimentKey, before.experimentKey);
    assert.equal((await f.open('two')).payload.chat.aiMessages.length, 0);
    f.npc.chatExperiment.runId += '-repeat';
    assert.notEqual((await characterOnlyIdentity(f.npc)).experimentKey, before.experimentKey);
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('assistant write failure rolls the pair back and refunds; a single-flight lock prevents double submissions', async () => {
  const f = await fixture(), saved = globalThis.fetch;
  globalThis.fetch = async () => answer('ตอบ');
  try {
    await f.open();
    f.sql.exec("CREATE TRIGGER fail_experiment BEFORE INSERT ON experiment_chat_messages WHEN NEW.role='assistant' BEGIN SELECT RAISE(ABORT,'fixture_write_failure'); END");
    assert.equal((await f.request('ลอง')).status, 503);
    assert.equal(count(f), 0);
    assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 100);
    f.sql.exec('DROP TRIGGER fail_experiment');
    let enter, finish;
    const entered = new Promise(resolve => { enter = resolve; });
    const gate = new Promise(resolve => { finish = resolve; });
    globalThis.fetch = async () => { enter(); await gate; return answer('ตอบ'); };
    const first = f.request('ลองอีกครั้ง'); await entered;
    assert.equal((await f.request('ส่งซ้ำ')).status, 409);
    finish(); assert.equal((await first).status, 200);
    assert.equal(count(f), 2);
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('pending authorized legacy cleanup cannot erase new experimental messages', async () => {
  const f = await fixture(), saved = globalThis.fetch;
  globalThis.fetch = async () => answer('รอบใหม่');
  try {
    await f.request('ข้อความใหม่');
    f.sql.prepare("DELETE FROM content_meta WHERE key='creator-reset:retire-cheer-20261108'").run();
    f.sql.prepare("INSERT INTO ai_chat_messages(id,user_id,creator_id,role,content,created_at) VALUES('legacy','one','cheer','user','เก่า',0)").run();
    await applyCreatorResets(f.env, { creators: [{ id: 'cheer', definition: f.npc }], creatorResets: [{ id: 'retire-cheer-20261108', creatorId: 'cheer', allowWithCharacterOnly: true }] });
    assert.equal(count(f), 2);
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM ai_chat_messages WHERE creator_id='cheer'").get().n, 0);
    assert.equal((await f.open()).payload.chat.aiMessages.length, 2);
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('runtime boots a database that has not applied migration 0014 and experiment rows cascade on account deletion', async () => {
  const f = await fixture(), saved = globalThis.fetch;
  globalThis.fetch = async () => answer('ข้อความใหม่');
  try {
    f.sql.exec('DROP TABLE experiment_chat_messages; DROP TABLE experiment_chat_threads;');
    assert.equal((await f.open()).status, 200);
    assert.equal((await f.request('เริ่มรอบใหม่')).status, 200);
    assert.equal(count(f), 2);
    f.sql.prepare("DELETE FROM users WHERE id='one'").run();
    assert.equal(count(f), 0);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM experiment_chat_threads').get().n, 0);
  } finally { globalThis.fetch = saved; f.sql.close(); }
});
