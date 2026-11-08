import test from 'node:test';
import assert from 'node:assert/strict';
import { characterExperimentFixture } from './helpers/character-experiment-fixture.mjs';
import { decodeExperimentScene } from '../src/experiment-scene-format.mjs';
import { PLAYER_ACTION_POLICY } from '../src/experiment-player-actions.mjs';
import { EXPERIMENT_GENERATION } from '../src/experiment-request.mjs';

const options = { scene: true, opening: true, allowFiftyShades: true, responseContract: true };
const policy = { playerActionPolicy: PLAYER_ACTION_POLICY };
const scene = actions => ({ location: 'โรงอาหารคณะวิศวกรรมศาสตร์', innerThought: 'ลองเปลี่ยนข้อเสนอ', playerActions: actions, beats: [{ kind: 'action', text: 'เชียร์วางแก้วลง' }, { kind: 'dialogue', text: 'งั้นลองดูโจทย์นี้ด้วยกัน' }] });
const open = (f, v = 'contract') => f.request('', { action: '', path: `/api/chats/cheer?responseVariant=${v}` });

test('v2 filters speech, questions, future and hypothetical excerpts without changing dialogue', () => {
  for (const [input, excerpt] of [
    ['ไม่แดก', 'ไม่แดก'], ['เอาอะไร', 'เอาอะไร'], ['พี่เก่งนักเหรอ', 'พี่เก่งนักเหรอ'],
    ['ผมจะเดินออกไป', 'ผมจะเดินออกไป'], ['ถ้าผมเดินออกไปจะเป็นยังไง', 'ผมเดินออกไป'],
    ['“ผมวางสมุดลง” เป็นคำพูดในหนัง', 'ผมวางสมุดลง'], ['ผมเดินไปดีไหม', 'ผมเดินไปดีไหม'],
  ]) {
    const result = decodeExperimentScene(JSON.stringify(scene([excerpt])), input, 1, policy);
    assert.deepEqual(result.playerActions, [], input);
    assert.equal(result.beats[0].text, scene([]).beats[0].text);
    assert.equal(result.beats[1].text, scene([]).beats[1].text);
  }
  const legacy = decodeExperimentScene(JSON.stringify(scene(['ไม่แดก'])), 'ไม่แดก', 1);
  assert.deepEqual(legacy.playerActions, ['ไม่แดก'], 'control rendering is preserved');
});

test('v2 retains marked and clear completed actions, labels requests without asserting completion', () => {
  const marked = decodeExperimentScene(JSON.stringify(scene([])), '*เลื่อนเก้าอี้* สวัสดี', 1, policy);
  assert.deepEqual(marked.playerActions, ['เลื่อนเก้าอี้']);
  const action = 'ผมวางสมุดลงบนโต๊ะ';
  assert.deepEqual(decodeExperimentScene(JSON.stringify(scene([action])), action, 1, policy).playerActions, [action]);
  const request = 'พี่ช่วยหยิบปากกาให้หน่อย';
  const result = decodeExperimentScene(JSON.stringify(scene([request])), request, 1, policy);
  assert.match(result.beats[0].text, /^คำขอของคุณ:/);
  assert.equal(result.beats[1].text, scene([]).beats[1].text);
  assert.throws(() => decodeExperimentScene(JSON.stringify(scene(['ผมเดินไปแล้ว'])), 'สวัสดี', 1, policy), /ungrounded/);
});

test('v2 saves non-secret per-turn provenance atomically and projects clean action history with one call', async () => {
  const f = await characterExperimentFixture(options), saved = globalThis.fetch, sent = [];
  f.env.FIFTY_SHADES_SECRET_PROMPT = 'OPTIONAL_MODE_FIXTURE ${npcName}';
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.deepseek.com/chat/completions'); sent.push(JSON.parse(init.body));
    return Response.json({ model: 'deepseek-flash', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(scene(sent.length === 1 ? ['ไม่แดก'] : [])) } }], usage: { prompt_tokens: 123, completion_tokens: 45 } });
  };
  try {
    const first = await f.request('ไม่แดก', { data: { message: 'ไม่แดก', fiftyShades: true } });
    assert.equal(first.status, 200);
    assert.ok(!first.payload.messages.at(-1).content.includes('คุณ: ไม่แดก'));
    const trace = first.payload.messages.at(-1).trace;
    assert.equal(trace.contractVersion, 'cheer-response-v2');
    assert.deepEqual(first.payload.experiment.contractVersions, { contract: 'cheer-response-v2', 'contract-v1': 'cheer-response-v1' });
    assert.equal(trace.contractHash, first.payload.experiment.contractHash);
    assert.equal(trace.activeMode, 'fifty-shades');
    assert.equal(trace.responseVariant, 'contract');
    assert.equal(trace.sourceHash, first.payload.experiment.sourceHash);
    assert.deepEqual(trace.generation, EXPERIMENT_GENERATION);
    assert.equal(trace.resolvedModel, 'deepseek-flash');
    assert.equal(trace.tokensIn, 123); assert.equal(trace.tokensOut, 45);
    assert.ok(Number.isFinite(trace.providerLatencyMs));
    assert.ok(!JSON.stringify(trace).includes('OPTIONAL_MODE_FIXTURE'));
    assert.ok(!JSON.stringify(trace).includes('fixture-placeholder'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM experiment_chat_traces').get().n, 1);
    const stored = JSON.parse(f.sql.prepare("SELECT content FROM experiment_chat_messages WHERE role='assistant' AND id NOT LIKE 'experiment_opening_%'").get().content);
    assert.deepEqual(stored.playerActions, ['ไม่แดก'], 'original provider JSON stays available for diagnosis');
    await f.request('แล้วโจทย์อะไร', { data: { message: 'แล้วโจทย์อะไร', fiftyShades: true } });
    const previous = sent[1].messages.filter(m => m.role === 'assistant').at(-1);
    assert.deepEqual(JSON.parse(previous.content).playerActions, [], 'speech errors do not reinforce subsequent prompts');
    assert.equal(sent.length, 2);
    const a = await open(f, 'baseline'), b = await open(f, 'contract-v1');
    assert.equal(a.payload.chat.aiMessages.length, 1); assert.equal(b.payload.chat.aiMessages.length, 1);
    await f.request('', { action: 'reset-chat', data: { fiftyShades: true, responseVariant: 'contract' } });
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM experiment_chat_traces').get().n, 0);
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('trace write failure leaves no partial paid turn and refunds energy', async () => {
  const f = await characterExperimentFixture(options), saved = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(scene([])) } }] }); };
  try {
    await open(f);
    f.sql.exec("CREATE TRIGGER fail_trace BEFORE INSERT ON experiment_chat_traces BEGIN SELECT RAISE(ABORT,'fixture_trace_failure'); END");
    assert.equal((await f.request('สวัสดี')).status, 503);
    assert.equal(calls, 1);
    assert.equal((await open(f)).payload.chat.aiMessages.length, 1);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM experiment_chat_traces').get().n, 0);
    assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 100);
  } finally { globalThis.fetch = saved; f.sql.close(); }
});
