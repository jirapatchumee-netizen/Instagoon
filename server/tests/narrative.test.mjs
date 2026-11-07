import test from 'node:test';
import assert from 'node:assert/strict';
import { initialNarrativeState, readNarrativeState, reduceNarrativeState, decodeNarrative, narrativeHistory, narrativePrompt } from '../src/narrative.mjs';
import { narrativeFixture, modelReply } from './helpers/narrative-fixture.mjs';

const lab = { id: 'circuits-lab', name: 'ห้องแล็บวงจร', description: 'โต๊ะทดลองริมหน้าต่าง มีออสซิลโลสโคป' };
const beatReply = (sceneUpdate = {}, text = 'ลองดูวงจรนี้ก่อน พี่อยากฟังวิธีคิดของเธอ') => ({
  beats: [{ kind: 'action', text: 'นัทเลื่อนกระดาษให้แล้วแตะปลายปากกาลงข้างโจทย์' }, { kind: 'dialogue', text }, { kind: 'action', text: 'เธอเว้นจังหวะให้คิดโดยไม่เร่ง' }],
  innerThought: 'อยากรู้เหมือนกันว่าจะคิดทันไหม',
  sceneUpdate: { move: 'stay', activity: 'คุยเรื่องวงจร', goal: 'ช่วยรุ่นน้องคิดโจทย์', mood: 'สนใจ', ...sceneUpdate },
  matchedRuleIds: [], suggestedReplies: []
});

test('a destination is pending until accepted; refusal and questions cannot teleport the player', async () => {
  const f = await narrativeFixture();
  const initial = initialNarrativeState(f.npc);
  const pending = reduceNarrativeState(initial, { move: 'propose', place: lab }, 'อยากดูโปรเจกต์พี่');
  assert.equal(pending.locationId, initial.locationId);
  assert.equal(pending.pendingLocationId, lab.id);
  for (const message of ['ไม่ไป', 'ไว้วันหลัง', 'ไปไหม', 'ห้องแล็บวงจรอยู่ไหน', 'พาไปห้องแล็บวงจรไหม']) {
    assert.throws(() => decodeNarrative(beatReply({ move: 'confirm', place: lab }), pending, message), /unconfirmed/);
  }
  const moved = decodeNarrative(beatReply({ move: 'confirm', place: lab }), pending, 'ไปเลย').nextState;
  assert.equal(moved.locationId, lab.id);
  assert.equal(moved.pendingLocationId, null);
  const returned = reduceNarrativeState(moved, { move: 'propose', place: initial.places[0] }, 'กลับโรงอาหารกัน');
  const home = reduceNarrativeState(returned, { move: 'confirm', place: initial.places[0] }, 'ไปเลย');
  const again = reduceNarrativeState(home, { move: 'propose', place: { ...lab, description: 'changed incorrectly' } }, 'ขอดูแล็บอีกที');
  assert.equal(again.places.find(p => p.id === lab.id).description, lab.description);
  f.sql.close();
});

test('memory is attributed to a player statement with actual evidence, never an invented completed fact', async () => {
  const f = await narrativeFixture();
  let state = initialNarrativeState(f.npc);
  state = reduceNarrativeState(state, { memory: { text: 'ผู้เล่นบอกว่าไม่กินเผ็ด', evidence: 'ไม่กินเผ็ด' } }, 'ผมไม่กินเผ็ด');
  assert.equal(state.memories[0].kind, 'player_statement');
  const bad = reduceNarrativeState(state, { memory: { text: 'เป็นแฟนกันแล้ว', evidence: 'ตกลงเป็นแฟน' } }, 'ยังไม่ตกลง');
  assert.equal(bad.memories.length, 1);
  const promised = reduceNarrativeState(bad, { commitment: { text: 'นัทรับปากจะทำข้าวผัดไม่เผ็ด', evidence: 'เดี๋ยวพี่ทำข้าวผัดไม่เผ็ดให้' } }, 'หิวแล้ว', 'เดี๋ยวพี่ทำข้าวผัดไม่เผ็ดให้');
  assert.equal(promised.memories.at(-1).kind, 'npc_promise');
  const restored = readNarrativeState(f.npc, JSON.stringify(bad));
  assert.equal(restored.memories[0].evidence, 'ไม่กินเผ็ด');
  assert.equal(readNarrativeState(f.npc, '{broken').locationId, state.locationId);
  assert.throws(() => decodeNarrative({ beats: [{ kind: 'dialogue', text: '[img:secret.webp]' }] }, state, 'hi'), /invalid_narrative_reply/);
  f.sql.close();
});

test('the prompt respects character voice and recent history covers the gap before summary', async () => {
  const f = await narrativeFixture();
  const prompt = narrativePrompt(f.npc, 'กำลังรู้จักกัน', 'No secrets yet', '', 'CANARY');
  assert.ok(prompt.includes(f.npc.style.pronouns));
  assert.ok(prompt.includes('3-5 short ordered beats'));
  assert.ok(!prompt.includes('75%'));
  const rows = Array.from({ length: 23 }, (_, i) => ({ id: String(23 - i), role: i % 2 ? 'assistant' : 'user', content: `ข้อความ ${23 - i}`, created_at: 23 - i }));
  const history = narrativeHistory(rows, 3, '23', 'นัท');
  assert.ok(history.recentHistory.includes('ข้อความ 5'), 'unsummarized middle is present, not only the last six messages');
  assert.ok(!history.recentHistory.includes('ข้อความ 23'), 'current message is not duplicated');
  assert.equal(history.truncatedUnsummarized, false);
  assert.equal(narrativeHistory(rows, 0, '23', 'นัท', 30).truncatedUnsummarized, true);
  f.sql.close();
});

test('real Worker path persists ordered scene beats, short-answer transitions, memory and player isolation', async () => {
  const f = await narrativeFixture();
  const savedFetch = globalThis.fetch;
  const requests = [];
  let answer = beatReply({ move: 'propose', place: lab, memory: { text: 'ผู้เล่นบอกว่าไม่กินเผ็ด', evidence: 'ไม่กินเผ็ด' } }, 'ไม่เผ็ด พี่จำไว้แล้ว ถ้าสนใจโปรเจกต์ เดี๋ยวพาไปแล็บวงจรไหม');
  globalThis.fetch = async (_url, init) => { requests.push(JSON.parse(init.body)); return modelReply(answer); };
  try {
    let result = await f.request('ผมไม่กินเผ็ด แต่อยากดูโปรเจกต์พี่');
    assert.equal(result.status, 200);
    assert.equal(result.payload.beats.length, 3);
    assert.equal(result.payload.scene.location, f.npc.narrative.openingLocation.name, 'pending destinations do not replace the displayed place');
    assert.match(result.payload.messages.at(-1).content, /^\[scene:/, 'every new narrative reply stores its scene header');
    assert.match(result.payload.messages.at(-1).content, /\[action:/);
    assert.equal(f.state().pendingLocationId, lab.id);
    assert.equal(f.state().memories[0].kind, 'player_statement');
    answer = beatReply({ move: 'confirm', place: lab, activity: 'ดูโปรเจกต์ในแล็บ' });
    result = await f.request('ไปเลย');
    assert.equal(result.status, 200);
    assert.equal(f.state().locationId, lab.id);
    assert.equal(result.payload.scene.location, lab.name, 'a confirmed transition updates the displayed place');
    const playerTurn = JSON.parse(requests.at(-1).contents[0].parts[0].text);
    assert.equal(playerTurn.scene.pendingLocationId, lab.id);
    assert.ok(playerTurn.relevantMemories.some(m => m.text.includes('ไม่กินเผ็ด')));
    assert.equal(f.state('two'), null);
    answer = beatReply();
    await f.request('สวัสดีพี่', { uid: 'two' });
    assert.equal(f.state('two').locationId, f.npc.narrative.openingLocation.id);
    await f.request('', { action: 'reset-chat' });
    assert.equal(f.state(), null);
    assert.notEqual(f.state('two'), null, 'reset is scoped to the current player');
    assert.equal((await f.request('เริ่มใหม่')).status, 200);
    assert.equal(f.state().locationId, f.npc.narrative.openingLocation.id);
  } finally { globalThis.fetch = savedFetch; f.sql.close(); }
});

test('invalid or blocked replies never commit a scene or charge energy, and a failed batch rolls both writes back', async () => {
  const f = await narrativeFixture();
  const savedFetch = globalThis.fetch;
  try {
    await f.open();
    const initialState = f.state();
    globalThis.fetch = async () => modelReply(beatReply({ move: 'confirm', place: lab }));
    assert.equal((await f.request('ยังไม่ไป')).status, 503);
    assert.deepEqual(f.state(), initialState);
    assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 100);
    globalThis.fetch = async () => Response.json({ candidates: [{ finishReason: 'SAFETY' }] });
    assert.equal((await f.request('ลองอีกที')).status, 503);
    assert.deepEqual(f.state(), initialState);
    globalThis.fetch = async () => modelReply(beatReply());
    f.sql.exec(`CREATE TRIGGER reject_scene BEFORE INSERT ON npc_scene_states BEGIN SELECT RAISE(ABORT, 'fixture_write_failure'); END;`);
    assert.equal((await f.request('ช่วยดูวงจรหน่อย')).status, 500);
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM ai_chat_messages WHERE user_id='one' AND role='assistant'").get().n, 1, 'only the free opening remains after a failed reply');
    assert.deepEqual(f.state(), initialState);
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM relationships WHERE user_id='one' AND creator_id='narrative-tester'").get().n, 0, 'relationship writes roll back with the failed reply');
  } finally { globalThis.fetch = savedFetch; f.sql.close(); }
});
