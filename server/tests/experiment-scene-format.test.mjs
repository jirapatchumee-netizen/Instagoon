import test from 'node:test';
import assert from 'node:assert/strict';
import { characterExperimentFixture } from './helpers/character-experiment-fixture.mjs';
import { characterOnlyIdentity } from '../src/character-only-chat.mjs';
import { SCENE_FORMAT_INSTRUCTION, decodeExperimentScene, serializeExperimentScene } from '../src/experiment-scene-format.mjs';
import { readSceneHeader, sceneHeaderLabels, splitNarrativeBody } from '../../client/player/message-format.ts';

const sceneReply = overrides => ({ location: 'โรงอาหารคณะวิศวกรรมศาสตร์', innerThought: 'ปากเก่งดีนี่ กูอยากฟังมึงต่อแล้ว', playerActions: [], beats: [
  { kind: 'action', text: 'เชียร์วางแก้วน้ำแล้วเท้าคางมอง' },
  { kind: 'dialogue', text: 'เอาดิ มึงอยากรู้เรื่องไหนของกู' }
], ...overrides });
const answer = value => Response.json({ model: 'deepseek-flash', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] });

test('presentation preserves model wording, guarantees marked player actions, and uses server Bangkok time', () => {
  const at = Date.UTC(2026, 10, 8, 16, 37);
  const result = decodeExperimentScene(JSON.stringify(sceneReply({ playerActions: ['*วางสมุดลงบนโต๊ะ*'] })), '*วางสมุดลงบนโต๊ะ* พี่ทำอะไรอยู่', at);
  assert.deepEqual(result.playerActions, ['วางสมุดลงบนโต๊ะ']);
  assert.match(result.beats[0].text, /^คุณ: วางสมุดลงบนโต๊ะ\nเชียร์วางแก้วน้ำ/);
  assert.equal(result.beats[1].text, sceneReply().beats[1].text);
  const stored = serializeExperimentScene(result), header = readSceneHeader(stored);
  assert.equal(header.scene.at, at);
  assert.equal(sceneHeaderLabels(header.scene).time, '23:37');
  assert.equal(header.scene.location, sceneReply().location);
  assert.match(header.body, /^\[thought:/);
  const action = splitNarrativeBody(header.body).find(p => p.kind === 'action');
  assert.ok(action.text.includes('คุณ: วางสมุดลงบนโต๊ะ'));
  const markedWithoutModelCopy = decodeExperimentScene(JSON.stringify(sceneReply()), '/me เลื่อนเก้าอี้\n[action: ยกแก้วน้ำ]', at);
  assert.deepEqual(markedWithoutModelCopy.playerActions, ['เลื่อนเก้าอี้', 'ยกแก้วน้ำ']);
  const ordinary = decodeExperimentScene(JSON.stringify(sceneReply({ beats: [{ kind: 'dialogue', text: 'คำพูดล้วน' }] })), 'ถ้าผมเดินไปจะเป็นยังไง', at);
  assert.equal(ordinary.beats.length, 1, 'no invented action or mandatory gesture');
  for (const hypothetical of ['ถ้า *เดินหนี* จะเป็นยังไง', 'คำว่า *เดินหนี* คืออะไร', '"*เดินหนี*"'])
    assert.deepEqual(decodeExperimentScene(JSON.stringify(sceneReply()), hypothetical, at).playerActions, [], 'quoted/hypothetical markers are not actual actions');
  assert.throws(() => decodeExperimentScene(JSON.stringify(sceneReply({ playerActions: ['ผู้เล่นยอมเป็นแฟน'] })), 'สวัสดี', at), /ungrounded/);
  assert.throws(() => decodeExperimentScene(JSON.stringify(sceneReply({ innerThought: '' })), 'สวัสดี', at), /invalid_scene/);
});

test('actual Worker adds only the presentation contract, saves display separately, and reuses original JSON history', async () => {
  const f = await characterExperimentFixture({ scene: true }), saved = globalThis.fetch, sent = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.deepseek.com/chat/completions'); sent.push(JSON.parse(init.body));
    return answer(sceneReply());
  };
  try {
    f.sql.exec('DROP TABLE experiment_chat_displays');
    assert.equal((await f.open()).payload.chat.aiMessages.length, 0);
    const result = await f.request('*วางสมุดลงบนโต๊ะ* สวัสดี');
    assert.equal(result.status, 200);
    assert.equal(result.payload.innerThought, sceneReply().innerThought);
    assert.equal(result.payload.reply, sceneReply().beats[1].text);
    const content = result.payload.messages.at(-1).content;
    assert.match(content, /^\[scene:/); assert.match(content, /\[thought:/); assert.match(content, /\[action:คุณ: วางสมุดลงบนโต๊ะ/);
    assert.equal(sent[0].messages[0].content, f.npc.biography);
    assert.ok(sent[0].messages[1].content.startsWith(SCENE_FORMAT_INSTRUCTION));
    assert.equal(sent[0].messages.length, 3);
    assert.equal(sent[0].model, 'deepseek-flash');
    assert.equal(sent[0].response_format.type, 'json_object');
    assert.ok(!sent[0].messages[1].content.includes('competitive'));
    const raw = f.sql.prepare("SELECT content FROM experiment_chat_messages WHERE role='assistant'").get().content;
    assert.deepEqual(JSON.parse(raw), sceneReply());
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM experiment_chat_displays').get().n, 1);
    await f.request('แล้วยังไงต่อ');
    assert.equal(sent.length, 2, 'one DeepSeek call per turn, no formatter model or fallback');
    assert.equal(sent[1].messages[3].content, raw, 'provider history uses original JSON, not UI labels');
    const reopened = await f.open();
    assert.equal(reopened.payload.chat.aiMessages[1].content, content, 'saved header and frames survive reload');
    await f.request('', { action: 'reset-chat' });
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM experiment_chat_displays').get().n, 0, 'reset cascades presentation rows');
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('format changes select a new run without changing the character source or using old plain history', async () => {
  const f = await characterExperimentFixture(), saved = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ choices: [{ message: { content: 'ข้อความจากรอบข้อความล้วน' } }] });
  try {
    await f.request('สวัสดี');
    const before = await characterOnlyIdentity(f.npc);
    f.npc.chatExperiment.presentation = 'scene-v1';
    f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(f.npc), f.npc.id);
    const after = await characterOnlyIdentity(f.npc);
    assert.equal(before.sourceHash, after.sourceHash);
    assert.notEqual(before.experimentKey, after.experimentKey);
    assert.deepEqual((await f.open()).payload.chat.aiMessages, []);
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('missing fields, invented player actions and failed display writes refund with no fallback or partial exchange', async () => {
  for (const failure of ['thought', 'location', 'action-evidence', 'storage']) {
    const f = await characterExperimentFixture({ scene: true }), saved = globalThis.fetch; let calls = 0;
    globalThis.fetch = async () => { calls++; return answer(sceneReply(failure === 'thought' ? { innerThought: null } : failure === 'location' ? { location: '' } : failure === 'action-evidence' ? { playerActions: ['ทำสิ่งที่ไม่ได้พิมพ์'] } : {})); };
    try {
      await f.open();
      if (failure === 'storage') f.sql.exec("CREATE TRIGGER fail_display BEFORE INSERT ON experiment_chat_displays BEGIN SELECT RAISE(ABORT,'fixture_display_failure'); END");
      const result = await f.request('สวัสดี');
      assert.equal(result.status, 503, failure);
      assert.equal(calls, 1);
      assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM experiment_chat_messages').get().n, 0);
      assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM experiment_chat_displays').get().n, 0);
      assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 100);
    } finally { globalThis.fetch = saved; f.sql.close(); }
  }
});
