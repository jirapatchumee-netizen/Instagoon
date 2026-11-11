import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENE_STANDARD_INSTRUCTION, SCENE_STANDARD_ORDER, orderBeats, serializeSceneBubble, readStoredScene, resolveFictionClock, advanceFictionClock, inferSceneLocation, compactProse, daypartAnchorMinutes, parseFictionTime, formatFictionClock, resolveSceneHeader, FALLBACK_SCENE_LOCATION, MAX_VIEWPORT_BEATS, MAX_VIEWPORT_BEAT_CHARS } from '../src/scene-standard.mjs';
import { initialNarrativeState, readNarrativeState, reduceNarrativeState, narrativeSceneMetadata, narrativeSchema, narrativePrompt } from '../src/narrative.mjs';
import { SCENE_FORMAT_INSTRUCTION } from '../src/experiment-scene-format.mjs';
import { narrativeNpc } from './helpers/narrative-npc.mjs';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';

const NIGHT_SCENE = 'คอนโดมิเนียมหรูใจกลางเมือง เสียงแอร์ยามดึก และระเบียงวิวเมือง';

test('the fiction clock continues from the stored header and is seeded from the scene, never the wall clock', () => {
  assert.equal(parseFictionTime('23:58 น.'), 1438);
  assert.equal(parseFictionTime('24:00'), null);
  assert.equal(formatFictionClock(5), '00:05 น.');
  assert.equal(resolveFictionClock({ stored: '12:20 น.' }), 12 * 60 + 22);
  assert.equal(formatFictionClock(resolveFictionClock({ stored: '23:59 น.' })), '00:01 น.');
  assert.equal(daypartAnchorMinutes(NIGHT_SCENE), 22 * 60);
  assert.equal(daypartAnchorMinutes('เจอกันหัวค่ำ'), 18 * 60 + 30);
  assert.equal(daypartAnchorMinutes('ห้องเรียนตอนเช้า'), 8 * 60 + 30);
  assert.equal(daypartAnchorMinutes('คาเฟ่กลางวัน'), 13 * 60);
  assert.equal(daypartAnchorMinutes('ไม่มีเบาะแสเวลา'), null);
  assert.equal(resolveFictionClock({ scene: NIGHT_SCENE }), 22 * 60);
  assert.equal(resolveFictionClock({ authored: '19:05 น.', scene: NIGHT_SCENE }), 19 * 60 + 5);
  assert.equal(formatFictionClock(resolveFictionClock({})), '12:15 น.');
  // A stored header always wins over the scene seed, so the clock keeps running.
  assert.equal(resolveFictionClock({ stored: '22:40 น.', scene: NIGHT_SCENE }), 22 * 60 + 42);
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
  assert.equal(formatFictionClock(initial.clockMinutes), '12:15 น.');
  assert.equal(narrativeSceneMetadata(initial, at).time, '12:15 น.');
  assert.equal(narrativeSceneMetadata(initial, at + 86400000).time, '12:15 น.');

  const nightNpc = { ...npc, precedingIncident: 'ลมหนาวยามดึกพัดเข้ามาจนตัวสั่น' };
  assert.equal(formatFictionClock(initialNarrativeState(nightNpc).clockMinutes), '22:00 น.');

  const advanced = reduceNarrativeState(initial, { move: 'stay', activity: 'คุย', goal: 'รู้จัก', mood: 'สนใจ' }, 'สวัสดี', 'reply');
  assert.equal(formatFictionClock(advanced.clockMinutes), '12:17 น.');
  const nextTurn = reduceNarrativeState(advanced, { move: 'stay' }, 'ต่อ');
  assert.equal(formatFictionClock(nextTurn.clockMinutes), '12:19 น.');
  const jumped = reduceNarrativeState(nextTurn, { clock: '20:15 น.' }, 'ไปเจอกันตอนเย็น');
  assert.equal(narrativeSceneMetadata(jumped, at).time, '20:15 น.');
  assert.equal(readNarrativeState(npc, jumped).clockMinutes, jumped.clockMinutes);
  assert.equal(readNarrativeState(npc, { ...jumped, clockMinutes: 99999 }).clockMinutes, initial.clockMinutes);
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
  assert.doesNotMatch(systems[0], /STRICT ZERO 'คะ\/ค่ะ' RULE/);
  assert.doesNotMatch(systems[0], /STRICTLY NO 'คะ\/ค่ะ'/);
  assert.match(systems[0], /Player Narrative Sovereignty & Improv \(Director Roleplay Support\)/);
  assert.match(systems[0], /ACCEPT AS CANON/);
  assert.match(systems[0], /INTERNAL AGENCY/);
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

test('inline DM prompt reflects character-defined voice, pronouns and cameos without global stylistic overrides', async () => {
  const f = await narrativeFixture();
  const custom = {
    ...f.npc,
    style: {
      ...f.npc.style,
      tone: 'สุภาพ อ่อนหวาน นุ่มนวล ลงท้ายคะ/ค่ะ อย่างเป็นธรรมชาติ',
      pronouns: 'หนู / พี่',
      emoji: 'some'
    },
    cameos: [
      'มุก 🍸 (23 ปี, พี่สาวคนสนิท): สาวเท่ คูล บาร์เทนเดอร์ ปากไวแต่ใจดี',
      'มิลิน 🌸 (22 ปี, เพื่อนสนิท): สดใส ติดแกรม ขี้อ้อน ชอบชวนไปปาร์ตี้'
    ]
  };
  delete custom.narrative;
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(custom), custom.id);

  let capturedSystem = '';
  f.env.PRIMARY_AI_PROVIDER = 'workers-ai';
  f.env.AI = { async run(_model, input) {
    capturedSystem = input.messages[0].content;
    return { response: JSON.stringify({
      reply: 'ยินดีค่ะพี่',
      innerThought: 'ดีใจจัง',
      action: 'ยิ้มรับอย่างสุภาพ',
      beats: [{ kind: 'action', text: 'ยิ้มรับอย่างสุภาพ' }, { kind: 'dialogue', text: 'ยินดีค่ะพี่' }],
      sceneTime: '12:15 น.',
      sceneLocation: 'ห้องสมุด',
      affectionDelta: 1
    }) };
  } };

  const res = await f.request('สวัสดีครับน้อง');
  assert.equal(res.status, 200);
  assert.match(capturedSystem, /Voice & Speaking Register: "สุภาพ อ่อนหวาน นุ่มนวล ลงท้ายคะ\/ค่ะ อย่างเป็นธรรมชาติ"/);
  assert.match(capturedSystem, /Pronouns & Form of Address: "หนู \/ พี่"/);
  assert.match(capturedSystem, /Available Cameos & Shared Universe NPCs/);
  assert.match(capturedSystem, /มุก 🍸/);
  assert.match(capturedSystem, /มิลิน 🌸/);
  assert.doesNotMatch(capturedSystem, /STRICT ZERO 'คะ\/ค่ะ'/);
  assert.doesNotMatch(capturedSystem, /STRICTLY NO 'คะ\/ค่ะ'/);
  assert.match(capturedSystem, /ENTITY ATTRIBUTION & TARGETING DISCIPLINE/);
  assert.match(capturedSystem, /Separate Player \(\{\{user\}\} \/ "คุณ"\) from Third-Party Entities/);
  assert.match(capturedSystem, /Affection & Relationship Scoring \("affectionDelta"\)/);
  assert.match(capturedSystem, /STRICT SENTIMENT INVARIANT/);
});

test('advanceFictionClock strictly prevents clock stagnation and backward drift', () => {
  // First turn without stored clock: proposed clock seeds it
  assert.equal(advanceFictionClock({ stored: null, proposed: '12:17 น.' }), '12:17 น.');
  assert.equal(advanceFictionClock({ stored: null, proposed: null }), '12:15 น.');

  // Normal advance: +2 min step
  assert.equal(advanceFictionClock({ stored: '12:17 น.', proposed: null }), '12:19 น.');

  // Clock stagnation bug (as seen in chatbot test: 12:21 proposed when stored was 12:21):
  // Must reject stagnation and advance +2 min to 12:23
  assert.equal(advanceFictionClock({ stored: '12:21 น.', proposed: '12:21 น.' }), '12:23 น.');

  // Backward clock drift (12:15 proposed when stored was 12:21):
  assert.equal(advanceFictionClock({ stored: '12:21 น.', proposed: '12:15 น.' }), '12:23 น.');

  // Unprompted jump without sceneJump flag is clamped to canonical +2 min step
  assert.equal(advanceFictionClock({ stored: '12:17 น.', proposed: '12:25 น.', sceneJump: false }), '12:19 น.');

  // Explicit scene jump (e.g. night transition) allows time jump
  assert.equal(advanceFictionClock({ stored: '12:17 น.', proposed: '20:30 น.', sceneJump: true }), '20:30 น.');

  // Midnight rollover (e.g. 22:50 -> 00:30 or 23:35 -> 01:00) is accepted on sceneJump
  assert.equal(advanceFictionClock({ stored: '23:35 น.', proposed: '01:00 น.', sceneJump: true }), '01:00 น.');
  assert.equal(advanceFictionClock({ stored: '22:50 น.', proposed: '00:00 น.', sceneJump: true }), '00:00 น.');
});

test('inferSceneLocation and inline DM update location on player scene cuts and sub-zone moves even if model repeats old location', async () => {
  const oldOffice = 'ออฟฟิศหรูใจกลางเมืองหลังเวลาเลิกงาน ท่ามกลางแสงไฟอบอุ่นยามค่ำคืน';
  assert.equal(
    inferSceneLocation({
      storedLocation: oldOffice,
      proposedLocation: oldOffice,
      userText: 'ตัดภาพกลับมาที่ห้องนอนของเนย',
      actionText: 'เนยนั่งตัวสั่นอยู่บนเตียงนุ่มในห้องนอนส่วนตัว'
    }),
    'ห้องนอนของเนย'
  );
  assert.equal(
    inferSceneLocation({
      storedLocation: oldOffice,
      proposedLocation: null,
      userText: 'งั้นเรานอนคุยกันต่อนะ',
      actionText: 'เนยนั่งตัวสั่นอยู่บนเตียงนุ่มในห้องนอนส่วนตัว โคมไฟหัวเตียงส่องสว่าง'
    }),
    'ห้องนอนส่วนตัว (บนเตียงนุ่ม)'
  );
  assert.equal(
    inferSceneLocation({
      storedLocation: 'ร้านคาราโอเกะ (ห้อง VIP)',
      proposedLocation: 'ร้านคาราโอเกะ (ห้อง VIP)',
      userText: 'ลงไปแช่น้ำในอ่างจากุซซี่กันเถอะ',
      actionText: 'ก้าวลงในอ่างจากุซซี่ที่มีฟองสบู่'
    }),
    'ร้านคาราโอเกะ (ห้อง VIP - ในอ่างจากุซซี่)'
  );

  // End-to-end inline DM check: player cuts scene to bedroom, model forgets to update sceneLocation
  const f = await narrativeFixture();
  const noey = { ...f.npc, world: oldOffice };
  delete noey.narrative;
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(noey), noey.id);

  let turn = 0;
  f.env.PRIMARY_AI_PROVIDER = 'workers-ai';
  f.env.AI = { async run() {
    turn++;
    return { response: JSON.stringify(turn === 1
      ? {
          reply: 'สวัสดีค่ะพี่',
          innerThought: 'พี่ทักมาแล้ว ดีใจจังเลย',
          action: 'เงยหน้าจากจอคอมพิวเตอร์ในออฟฟิศ',
          sceneTime: '22:02 น.',
          sceneLocation: oldOffice,
          affectionDelta: 1
        }
      : {
          reply: 'ค่ะ... กลับถึงห้องแล้วค่ะพี่',
          innerThought: 'ใจสั่นไปหมดแล้ว... แต่ถ้าพี่ต้องการหนูก็พร้อมค่ะ',
          action: 'เนยนั่งตัวสั่นอยู่บนเตียงนุ่มในห้องนอนส่วนตัว แสงไฟสลัวจากโคมไฟหัวเตียง',
          beats: [
            { kind: 'action', text: 'เนยนั่งตัวสั่นอยู่บนเตียงนุ่มในห้องนอนส่วนตัว แสงไฟสลัวจากโคมไฟหัวเตียง' },
            { kind: 'dialogue', text: 'ค่ะ... กลับถึงห้องแล้วค่ะพี่' },
            { kind: 'action', text: 'กอดตุ๊กตากระต่ายแนบอกแน่น' },
            { kind: 'dialogue', text: 'คืนนี้พี่จะให้หนูใส่ชุดไหนดีคะ ชุดเมดหรือชุดแมวเหมียวดีคะ?' },
            { kind: 'action', text: 'ส่วนเกินที่ควรถูกตัดออกเพื่อให้พอดี 1 หน้าจอ' }
          ],
          sceneTime: '22:45 น.',
          sceneLocation: oldOffice, // Model mistakenly repeated old office location
          affectionDelta: 1
        }) };
  } };

  await f.request('สวัสดีครับเนย');
  const second = await f.request('ตัดภาพกลับมาที่ห้องนอนของเนย');
  assert.equal(second.status, 200);
  assert.equal(second.payload.scene.location, 'ห้องนอนของเนย');
  assert.equal(second.payload.scene.time, '22:45 น.');
  assert.equal(second.payload.beats.length, MAX_VIEWPORT_BEATS);
  assert.ok(second.payload.beats.every(b => b.text.length <= MAX_VIEWPORT_BEAT_CHARS));
});

test('inline DM clamps affectionDelta to 0 when reaction expresses shock, anger or harassment', async () => {
  const f = await narrativeFixture();
  const inline = { ...f.npc, world: 'ห้องพักครูโรงเรียน' };
  delete inline.narrative;
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(inline), inline.id);

  f.env.PRIMARY_AI_PROVIDER = 'workers-ai';
  f.env.AI = { async run(_model, _input) {
    return { response: JSON.stringify({
      reply: 'อุ๊ย! ทำอะไรเนี่ย...',
      innerThought: 'ตกใจหมดเลย! เด็กอะไรกล้ามาเล่นพิเรนทร์',
      action: 'สะดุ้งสุดตัวด้วยความตกใจ รีบเอามือตะครุบกระโปรงไว้',
      beats: [{ kind: 'action', text: 'สะดุ้งสุดตัวด้วยความตกใจ' }, { kind: 'dialogue', text: 'อุ๊ย! ทำอะไรเนี่ย...' }],
      sceneTime: '12:21 น.',
      sceneLocation: 'ห้องพักครู',
      affectionDelta: 1 // Malicious / hallucinated positive affection during harassment
    }) };
  } };

  const res = await f.request('เด็กวิ่งเข้ามาเปิดกระโปรง');
  assert.equal(res.status, 200);

  // Score delta must be clamped to 0 by the sentiment guardrail
  const row = f.sql.prepare("SELECT affection_delta FROM ai_chat_messages WHERE role='assistant' AND creator_id=? ORDER BY created_at DESC LIMIT 1").get(inline.id);
  assert.equal(row.affection_delta, 0, 'affection delta must be 0 during shock/harassment');
});

test('the scene header is total: a story clock and a place are always stored', () => {
  assert.deepEqual(resolveSceneHeader({ at: 5, time: null, location: null }),
    { at: 5, time: '12:15 น.', location: FALLBACK_SCENE_LOCATION });
  assert.equal(resolveSceneHeader({ at: 5, location: '   ' }).location, FALLBACK_SCENE_LOCATION);
  assert.equal(resolveSceneHeader({ at: 5, location: 'คาเฟ่', fallbackLocation: 'ร้านขนม' }).location, 'คาเฟ่');
  assert.equal(resolveSceneHeader({ at: 5, location: 'x'.repeat(140) }).location.length, 100);
  assert.equal(resolveSceneHeader({ time: '20:15 น.', location: 'ห้องสมุด' }).time, '20:15 น.');
  const headerless = serializeSceneBubble({ beats: [{ kind: 'dialogue', text: 'ว่าไง' }] });
  assert.match(headerless, /^\[scene:\{"at":\d+,"time":"12:15 น\.","location":".+"\}\]\nว่าไง$/);
  assert.ok(readStoredScene([{ role: 'assistant', content: headerless }]).location);
});
