import test from 'node:test';
import assert from 'node:assert/strict';
import { characterExperimentFixture } from './helpers/character-experiment-fixture.mjs';
import { characterOnlyIdentity } from '../src/character-only-chat.mjs';

const options = { scene: true, opening: true, allowFiftyShades: true };
const sample = { location: 'โรงอาหารคณะวิศวกรรมศาสตร์', innerThought: 'อยากคุยต่ออีกหน่อย', playerActions: [], beats: [{ kind: 'action', text: 'เชียร์เท้าคางมอง' }, { kind: 'dialogue', text: 'วันนี้มึงมีเรียนอะไร' }] };
const response = () => Response.json({ model: 'deepseek-flash', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(sample) } }] });
const openMode = f => f.request('', { action: '', path: '/api/chats/cheer?fiftyShades=1' });

test('the restored authored opening is free, atomic and unique per player and mode', async () => {
  const f = await characterExperimentFixture(options), saved = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('the authored opener must not call AI'); };
  // Generic fixture text exercises mode wiring without producing adult content or printing a prompt.
  f.env.FIFTY_SHADES_SECRET_PROMPT = 'OPTIONAL_MODE_FIXTURE ${npcName}';
  try {
    const opens = await Promise.all([f.open(), f.open(), f.open()]);
    for (const opened of opens) {
      assert.equal(opened.status, 200);
      assert.equal(opened.payload.chat.aiMessages.length, 1);
      assert.match(opened.payload.chat.aiMessages[0].content, /^\[scene:/);
      assert.match(opened.payload.chat.aiMessages[0].content, /\[thought:/);
      assert.match(opened.payload.chat.aiMessages[0].content, /กูเชียร์ ปี 4/);
      assert.match(opened.payload.chat.aiMessages[0].content, /มาเป็นแฟนกูดิ/);
    }
    assert.equal(new Set(opens.map(r => r.payload.chat.aiMessages[0].id)).size, 1);
    const enabled = await openMode(f);
    assert.equal(enabled.payload.chat.experiment.activeMode, 'fifty-shades');
    assert.equal(enabled.payload.chat.aiMessages.length, 1);
    assert.notEqual(enabled.payload.chat.aiMessages[0].id, opens[0].payload.chat.aiMessages[0].id);
    assert.equal((await f.open('two')).payload.chat.aiMessages.length, 1);
    assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 100);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM token_ledger').get().n, 0);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM ai_turn_metrics').get().n, 0);
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('mode-on and mode-off use one DeepSeek call and isolated histories; reset only clears the selected mode', async () => {
  const f = await characterExperimentFixture(options), saved = globalThis.fetch, sent = [];
  f.env.FIFTY_SHADES_SECRET_PROMPT = 'OPTIONAL_MODE_FIXTURE ${npcName}';
  globalThis.fetch = async (url, init) => { assert.equal(url, 'https://api.deepseek.com/chat/completions'); sent.push(JSON.parse(init.body)); return response(); };
  try {
    // Direct POST before GET still carries the opening in model history.
    const normal = await f.request('NORMAL_RUN_MESSAGE');
    assert.equal(normal.status, 200);
    assert.deepEqual(normal.payload.messages.map(m => m.role), ['assistant', 'user', 'assistant']);
    assert.equal(sent[0].messages.filter(m => m.role === 'system').length, 2);
    assert.ok(!JSON.stringify(sent[0]).includes('OPTIONAL_MODE_FIXTURE'));
    assert.equal(JSON.parse(sent[0].messages[2].content).beats[0].text, f.npc.chatExperiment.opening.beats[0].text);
    const enabled = await f.request('MODE_RUN_MESSAGE', { data: { message: 'MODE_RUN_MESSAGE', fiftyShades: true } });
    assert.equal(enabled.status, 200);
    assert.equal(enabled.payload.experiment.activeMode, 'fifty-shades');
    assert.equal(sent[1].messages[1].content, 'OPTIONAL_MODE_FIXTURE เชียร์');
    assert.ok(!JSON.stringify(sent[1]).includes('NORMAL_RUN_MESSAGE'));
    assert.equal(sent[1].messages[0].content, f.npc.biography);
    assert.equal(sent[1].model, 'deepseek-flash');
    assert.equal(sent.length, 2);
    const normalAgain = await f.open();
    assert.equal(normalAgain.payload.chat.aiMessages.length, 3);
    assert.ok(!JSON.stringify(normalAgain.payload.chat).includes('MODE_RUN_MESSAGE'));
    await f.request('', { action: 'reset-chat', data: { fiftyShades: true } });
    assert.equal((await openMode(f)).payload.chat.aiMessages.length, 1);
    assert.equal((await f.open()).payload.chat.aiMessages.length, 3);
    assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 98);
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('adult consent still gates the mode and provider failures keep only the free opener with a refund', async () => {
  const f = await characterExperimentFixture(options), saved = globalThis.fetch; let calls = 0;
  f.env.FIFTY_SHADES_SECRET_PROMPT = 'OPTIONAL_MODE_FIXTURE ${npcName}';
  globalThis.fetch = async () => { calls++; return new Response('fixture outage', { status: 503 }); };
  try {
    f.sql.prepare("UPDATE users SET age_verified_at=NULL WHERE id='one'").run();
    assert.equal((await openMode(f)).status, 403);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM experiment_chat_messages').get().n, 0);
    f.sql.prepare("UPDATE users SET age_verified_at=1 WHERE id='one'").run();
    const failed = await f.request('คุยเรื่องงานกลุ่ม', { data: { message: 'คุยเรื่องงานกลุ่ม', fiftyShades: true } });
    assert.equal(failed.status, 503);
    assert.equal(calls, 1);
    assert.equal((await openMode(f)).payload.chat.aiMessages.length, 1);
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
