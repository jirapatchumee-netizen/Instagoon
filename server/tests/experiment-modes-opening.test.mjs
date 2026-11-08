import test from 'node:test';
import assert from 'node:assert/strict';
import { characterExperimentFixture } from './helpers/character-experiment-fixture.mjs';
import { characterOnlyIdentity } from '../src/character-only-chat.mjs';

const options = { scene: true, opening: true };
const sample = { location: 'โรงอาหารคณะวิศวกรรมศาสตร์', innerThought: 'อยากคุยต่ออีกหน่อย', playerActions: [], beats: [{ kind: 'action', text: 'จูนเท้าคางมอง' }, { kind: 'dialogue', text: 'วันนี้มึงมีเรียนอะไร' }] };
const response = () => Response.json({ model: 'deepseek-flash', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(sample) } }] });

test('authored opening for Cheer and June is free, atomic, and Master Prompt Template is always active by default', async () => {
  const f = await characterExperimentFixture({ ...options, creator: 'june' }), saved = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('the authored opener must not call AI'); };
  f.env.FIFTY_SHADES_SECRET_PROMPT = 'MASTER_TEMPLATE_FIXTURE ${npcName}';
  try {
    const openJune = (uid = 'one') => f.request('', { uid, action: '', path: '/api/chats/june' });
    const opens = await Promise.all([openJune(), openJune(), openJune()]);
    for (const opened of opens) {
      assert.equal(opened.status, 200);
      assert.equal(opened.payload.chat.experiment.activeMode, 'master-template');
      assert.equal(opened.payload.chat.aiMessages.length, 1);
      assert.match(opened.payload.chat.aiMessages[0].content, /^\[scene:/);
      assert.match(opened.payload.chat.aiMessages[0].content, /\[thought:/);
      assert.match(opened.payload.chat.aiMessages[0].content, /กูจูน ปี 4/);
      assert.match(opened.payload.chat.aiMessages[0].content, /มาเป็นแฟนกูดิ/);
    }
    assert.equal(new Set(opens.map(r => r.payload.chat.aiMessages[0].id)).size, 1);
    assert.equal((await openJune('two')).payload.chat.aiMessages.length, 1);
    assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 100);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM token_ledger').get().n, 0);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM ai_turn_metrics').get().n, 0);
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('every message turn automatically injects the unified Master Prompt Template without any filter toggle', async () => {
  const f = await characterExperimentFixture({ ...options, creator: 'june' }), saved = globalThis.fetch, sent = [];
  f.env.FIFTY_SHADES_SECRET_PROMPT = 'MASTER_TEMPLATE_FIXTURE ${npcName}';
  globalThis.fetch = async (url, init) => { assert.equal(url, 'https://api.deepseek.com/chat/completions'); sent.push(JSON.parse(init.body)); return response(); };
  try {
    const turn = await f.request('ไม่แดก', { path: '/api/chats/june/message' });
    assert.equal(turn.status, 200);
    assert.equal(turn.payload.experiment.activeMode, 'master-template');
    assert.deepEqual(turn.payload.messages.map(m => m.role), ['assistant', 'user', 'assistant']);
    assert.equal(sent[0].messages[0].content, f.npc.biography);
    assert.equal(sent[0].messages[1].content, 'MASTER_TEMPLATE_FIXTURE จูน');
    assert.equal(JSON.parse(sent[0].messages[3].content).beats[0].text, f.npc.chatExperiment.opening.beats[0].text);
    assert.equal(sent[0].model, 'deepseek-flash');
    await f.request('', { action: 'reset-chat', path: '/api/chats/june/reset-chat' });
    assert.equal((await f.request('', { action: '', path: '/api/chats/june' })).payload.chat.aiMessages.length, 1);
    assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 99);
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('adult consent still gates chat and provider failures keep only the free opener with a refund', async () => {
  const f = await characterExperimentFixture(options), saved = globalThis.fetch; let calls = 0;
  f.env.FIFTY_SHADES_SECRET_PROMPT = 'MASTER_TEMPLATE_FIXTURE ${npcName}';
  globalThis.fetch = async () => { calls++; return new Response('fixture outage', { status: 503 }); };
  try {
    f.sql.prepare("UPDATE users SET age_verified_at=NULL WHERE id='one'").run();
    assert.equal((await f.open()).status, 403);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM experiment_chat_messages').get().n, 0);
    f.sql.prepare("UPDATE users SET age_verified_at=1 WHERE id='one'").run();
    const failed = await f.request('คุยเรื่องงานกลุ่ม');
    assert.equal(failed.status, 503);
    assert.equal(calls, 1);
    assert.equal((await f.open()).payload.chat.aiMessages.length, 1);
    assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 100);
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('failed opening display writes leave no partial greeting and retry restores it', async () => {
  const f = await characterExperimentFixture(options);
  try {
    f.sql.exec("CREATE TRIGGER fail_opening_display BEFORE INSERT ON experiment_chat_displays BEGIN SELECT RAISE(ABORT,'fixture_opening_failure'); END");
    assert.equal((await f.open()).status, 500);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM experiment_chat_messages').get().n, 0);
    f.sql.exec('DROP TRIGGER fail_opening_display');
    assert.equal((await f.open()).payload.chat.aiMessages.length, 1);
    const normal = await characterOnlyIdentity(f.npc);
    const changed = structuredClone(f.npc); changed.chatExperiment.opening.beats[0].text += ' แล้วพยักหน้า';
    assert.notEqual((await characterOnlyIdentity(changed)).experimentKey, normal.experimentKey);
    assert.notEqual((await characterOnlyIdentity(f.npc, { modePrompt: 'MODE_FIXTURE' })).experimentKey, normal.experimentKey);
  } finally { f.sql.close(); }
});
