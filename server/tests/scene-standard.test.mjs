import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENE_STANDARD_INSTRUCTION, SCENE_STANDARD_ORDER, orderBeats, serializeSceneBubble, readStoredScene, resolveFictionClock, parseFictionTime, formatFictionClock } from '../src/scene-standard.mjs';
import { initialNarrativeState, readNarrativeState, reduceNarrativeState, narrativeSceneMetadata, narrativeSchema, narrativePrompt } from '../src/narrative.mjs';
import { SCENE_FORMAT_INSTRUCTION } from '../src/experiment-scene-format.mjs';
import { narrativeNpc } from './helpers/narrative-npc.mjs';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';

const bangkok = at => new Date(at + 7 * 3600 * 1000);
const bangkokLabel = at => `${String(bangkok(at).getUTCHours()).padStart(2, '0')}:${String(bangkok(at).getUTCMinutes()).padStart(2, '0')} น.`;

test('the fiction clock continues from the stored scene header and never from a stale value', () => {
  assert.equal(parseFictionTime('23:58 น.'), 1438);
  assert.equal(parseFictionTime('24:00'), null);
  assert.equal(formatFictionClock(5), '00:05 น.');
  assert.equal(resolveFictionClock('12:20 น.', Date.now()), 12 * 60 + 22);
  assert.equal(formatFictionClock(resolveFictionClock('23:59 น.', Date.now())), '00:01 น.');
  const at = Date.now();
  assert.equal(resolveFictionClock(null, at), bangkok(at).getUTCHours() * 60 + bangkok(at).getUTCMinutes());
  assert.equal(bangkokLabel(at), formatFictionClock(resolveFictionClock(null, at)));
});

test('the scene header is read back from the newest stored bubble', () => {
  const rows = [
    { role: 'assistant', content: '[scene:{"at":1,"time":"11:00 น.","location":"ร้านเก่า"}]' },
    { role: 'user', content: 'สวัสดี' },
    { role: 'assistant', content: '[scene:{"at":2,"time":"18:42 น.","location":"ร้านขนม"}]\n[thought:x]' },
    { role: 'user', content: 'อีกแล้ว' }
  ];
  assert.deepEqual(readStoredScene(rows), { time: '18:42 น.', location: 'ร้านขนม' });
  assert.deepEqual(readStoredScene([{ role: 'assistant', content: 'ไม่มี header' }]), { time: null, location: null });
});

test('beats are re-ordered into action -> dialogue -> action -> dialogue', () => {
  const reordered = orderBeats({ beats: [
    { kind: 'dialogue', text: 'พูดก่อน' },
    { kind: 'action', text: 'วางถ้วย' },
    { kind: 'dialogue', text: 'ท้าทายปิดท้าย' },
    { kind: 'action', text: 'เอียงหน้า' }
  ] });
  assert.deepEqual(reordered.map(b => b.kind), ['action', 'dialogue', 'action', 'dialogue']);
  assert.deepEqual(reordered.map(b => b.text), ['วางถ้วย', 'พูดก่อน', 'เอียงหน้า', 'ท้าทายปิดท้าย']);

  const legacy = orderBeats({ action: 'กอดอก', reply: 'ว่าไง' });
  assert.deepEqual(legacy, [{ kind: 'action', text: 'กอดอก' }, { kind: 'dialogue', text: 'ว่าไง' }]);
  assert.deepEqual(orderBeats({ reply: 'ไม่มี行動' }), [{ kind: 'dialogue', text: 'ไม่มี行動' }]);
  assert.equal(orderBeats({ beats: Array.from({ length: 9 }, (_, i) => ({ kind: i % 2 ? 'dialogue' : 'action', text: `b${i}` })) }).length, 6);
});

test('the stored bubble starts with the system header, then thought, then ordered beats', () => {
  const stored = serializeSceneBubble({ at: 1700000000000, time: '18:42 น.', location: 'ร้าน [ขนม]',
    mood: 'ยิ้ม', thought: 'อยากแกล้ง', beats: [{ kind: 'action', text: 'วางถ้วย' }, { kind: 'dialogue', text: 'หรือว่ากลัวครู' }] });
  const lines = stored.split('\n');
  assert.equal(lines[0], '[scene:{"at":1700000000000,"time":"18:42 น.","location":"ร้าน ［ขนม］"}]');
  assert.equal(lines[1], '[mood:ยิ้ม]');
  assert.equal(lines[2], '[thought:อยากแกล้ง]');
  assert.equal(lines[3], '[action:วางถ้วย]');
  assert.equal(lines[4], 'หรือว่ากลัวครู');
  assert.equal(lines.length, 5);
});

test('the ordering contract is identical in every reply lane', () => {
  assert.deepEqual([...SCENE_STANDARD_ORDER], ['innerThought', 'action', 'dialogue', 'action', 'dialogue']);
  assert.match(SCENE_STANDARD_INSTRUCTION, /inner thought, then a character-owned action beat, then spoken dialogue, then another action beat, then a closing spoken beat/);
  assert.match(SCENE_FORMAT_INSTRUCTION, /action -> dialogue -> action -> dialogue/);
  assert.match(narrativePrompt(narrativeNpc(), 'style', '', '', 'CANARY'), new RegExp('Bubble standard'));
  assert.ok(narrativeSchema([]).properties.sceneUpdate.properties.clock);
});

test('the narrative lane carries an in-fiction clock instead of the reply timestamp', () => {
  const npc = narrativeNpc();
  const at = Date.now();
  const initial = initialNarrativeState(npc);
  assert.equal(initial.clockMinutes, null);
  assert.equal(narrativeSceneMetadata(initial, at).time, bangkokLabel(at));

  const advanced = reduceNarrativeState(initial, { move: 'stay', activity: 'คุย', goal: 'รู้จัก', mood: 'สนใจ' }, 'สวัสดี', ' reply', at);
  assert.equal(formatFictionClock(advanced.clockMinutes), bangkokLabel(at));
  const nextTurn = reduceNarrativeState(advanced, { move: 'stay' }, 'ต่อ', '', at);
  assert.equal(formatFictionClock(nextTurn.clockMinutes), formatFictionClock(advanced.clockMinutes + 2));
  const jumped = reduceNarrativeState(nextTurn, { clock: '20:15 น.' }, 'ไปเจอกันตอนเย็น', '', at);
  assert.equal(formatFictionClock(jumped.clockMinutes), '20:15 น.');
  assert.equal(narrativeSceneMetadata(jumped, at).time, '20:15 น.');
  assert.equal(readNarrativeState(npc, jumped).clockMinutes, jumped.clockMinutes);
  assert.equal(readNarrativeState(npc, { ...jumped, clockMinutes: 99999 }).clockMinutes, null);
});

test('inline DM replies store the scene header and the ordered bubble, and the clock advances per turn', async () => {
  const f = await narrativeFixture();
  const inline = { ...f.npc, world: 'ร้านขนมหลังมหาวิทยาลัย' };
  delete inline.narrative;
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(inline), inline.id);

  const systems = [], turns = [];
  let turn = 0;
  f.env.PRIMARY_AI_PROVIDER = 'workers-ai';
  f.env.AI = { async run(_model, input) {
    systems.push(input.messages[0].content);
    turns.push(JSON.parse(input.messages[1].content));
    turn++;
    return { response: JSON.stringify(turn === 1
      ? { reply: 'ว่าไงน้า', innerThought: 'อยากแกล้งถามกลับ', action: 'วางถ้วยขนมลง',
        beats: [{ kind: 'dialogue', text: 'ว่าไงน้า' }, { kind: 'action', text: 'เอียงหน้ามอง' }, { kind: 'action', text: 'วางถ้วยขนมลง' }, { kind: 'dialogue', text: 'หรือว่ากลัวครู' }],
        sceneTime: '18:42 น.', sceneLocation: 'ร้านขนมหลังมหาวิทยาลัย', affectionDelta: 1 }
      : { reply: 'กินอะไรยัง', innerThought: 'ห่วงอยู่', action: 'เลื่อนจานเข้าหา', affectionDelta: 1 }) };
  } };

  const first = await f.request('สวัสดีค่ะ');
  assert.equal(first.status, 200);
  assert.equal(first.payload.scene.time, '18:42 น.');
  assert.equal(first.payload.scene.location, 'ร้านขนมหลังมหาวิทยาลัย');
  assert.deepEqual(first.payload.beats.map(b => b.kind), ['action', 'dialogue', 'action', 'dialogue']);

  const row = f.sql.prepare("SELECT content FROM ai_chat_messages WHERE role='assistant' AND creator_id=? ORDER BY created_at DESC").get(inline.id);
  const lines = row.content.split('\n');
  assert.match(lines[0], /^\[scene:\{"at":\d+,"time":"18:42 น\.","location":"ร้านขนมหลังมหาวิทยาลัย"\}\]$/);
  assert.equal(lines[1], '[thought:อยากแกล้งถามกลับ]');
  assert.deepEqual(lines.slice(2), ['[action:เอียงหน้ามอง]', 'ว่าไงน้า', '[action:วางถ้วยขนมลง]', 'หรือว่ากลัวครู']);

  assert.match(systems[0], /Bubble Component Standard/);
  assert.match(systems[0], /Scene Header \(the app prints these above your reply/);
  assert.doesNotMatch(systems[0], /NEVER output date, time, or location tags/);
  assert.match(systems[0], /เวลาในเรื่องราว: \d{2}:\d{2} น\./);
  assert.equal(turns[0].sceneClock.currentLocation, 'ร้านขนมหลังมหาวิทยาลัย');

  const second = await f.request('ยังกินไม่เสร็จ');
  assert.equal(second.status, 200);
  // The second turn continues the fiction clock stored by the first reply, not the real clock.
  assert.equal(turns[1].sceneClock.currentTime, '18:44 น.');
  assert.match(systems[1], /เวลาในเรื่องราว: 18:44 น\./);
  assert.equal(second.payload.scene.time, '18:44 น.');
  assert.equal(second.payload.scene.location, 'ร้านขนมหลังมหาวิทยาลัย');
  const secondRow = f.sql.prepare("SELECT content FROM ai_chat_messages WHERE role='assistant' AND creator_id=? ORDER BY created_at DESC LIMIT 1").get(inline.id);
  assert.match(secondRow.content, /^\[scene:\{"at":\d+,"time":"18:44 น\."/);
  assert.deepEqual(secondRow.content.split('\n').slice(1), ['[thought:ห่วงอยู่]', '[action:เลื่อนจานเข้าหา]', 'กินอะไรยัง']);
});
