import test from 'node:test';
import assert from 'node:assert/strict';
import { readSceneHeader, sceneHeaderLabels, hasNarrativeActions, splitNarrativeBody, quoteDialogue, DEFAULT_SCENE_LOCATION } from '../player/message-format.ts';
import { serializeSceneBubble } from '../../server/src/scene-standard.mjs';

// The server owns the stored string, the client owns the visible bubble. This pins the contract
// between them: time + place header first, then inner thought, then alternating action and speech.
const stored = serializeSceneBubble({ at: Date.UTC(2026, 10, 10, 11, 42), time: '18:42 น.', location: 'ร้านขนมหลังมหาวิทยาลัย',
  thought: 'อยากแกล้งถามกลับ', beats: [
    { kind: 'action', text: 'เอียงหน้ามองจอ' },
    { kind: 'dialogue', text: 'ว่าไงน้า' },
    { kind: 'action', text: 'เลื่อนจานขนมเข้าหา' },
    { kind: 'dialogue', text: 'หรือว่ากลัวครู' }
  ] });

test('the stored inline bubble parses into header, thought and ordered beats', () => {
  const { scene, body } = readSceneHeader(stored);
  assert.ok(scene);
  assert.equal(scene.time, '18:42 น.');
  assert.equal(scene.location, 'ร้านขนมหลังมหาวิทยาลัย');

  const labels = sceneHeaderLabels(scene);
  // The UI template appends " น." itself, so the label carries the bare clock.
  assert.equal(labels.time, '18:42');
  assert.equal(labels.location, 'ร้านขนมหลังมหาวิทยาลัย');
  assert.match(labels.date, /2569/);

  const thought = body.match(/^\[thought:([\s\S]*?)\]\n?/);
  assert.ok(thought);
  assert.equal(thought[1], 'อยากแกล้งถามกลับ');

  const rest = body.slice(thought[0].length);
  assert.ok(hasNarrativeActions(rest));
  assert.deepEqual(splitNarrativeBody(rest).map(s => s.kind), ['action', 'dialogue', 'action', 'dialogue']);
  assert.equal(quoteDialogue(splitNarrativeBody(rest)[1].text), '“ว่าไงน้า”');
});

test('the fiction clock wins over the message timestamp in the header', () => {
  const scene = readSceneHeader(serializeSceneBubble({ at: Date.UTC(2026, 10, 10, 5, 0), time: '20:15 น.', location: 'ห้องสมุด',
    beats: [{ kind: 'dialogue', text: 'อ่านอะไรอยู่' }] })).scene;
  assert.equal(sceneHeaderLabels(scene).time, '20:15');
});

test('a stored header missing time or place still renders both lines', () => {
  const blankPlace = readSceneHeader('[scene:{"at":1700000000000,"location":""}]\nว่าไง');
  assert.ok(blankPlace.scene);
  assert.equal(blankPlace.scene.location, DEFAULT_SCENE_LOCATION);
  assert.match(sceneHeaderLabels(blankPlace.scene).time, /\d{1,2}:\d{2}/);

  const noTime = readSceneHeader('[scene:{"at":1700000000000,"location":"ร้านขนม"}]\nว่าไง');
  assert.equal(noTime.scene.time, undefined);
  assert.match(sceneHeaderLabels(noTime.scene).time, /\d{1,2}:\d{2}/);

  const overLong = readSceneHeader(`[scene:{"at":1700000000000,"location":"${'x'.repeat(140)}"}]\nว่าไง`);
  assert.equal(overLong.scene.location.length, 100);
});

test('quoteDialogue formats both single-speaker lines and multi-speaker emoji tags cleanly', () => {
  assert.equal(quoteDialogue('ว่าไงน้า'), '“ว่าไงน้า”');
  assert.equal(quoteDialogue('ไอริน 🔥: พี่ขาา วันนี้อยู่กับหนูก่อนนะคะ'), 'ไอริน 🔥: “พี่ขาา วันนี้อยู่กับหนูก่อนนะคะ”');
  assert.equal(quoteDialogue('[มินนี่ 💋]: เซอร์ไพรส์จ้ายัยแฝด!'), 'มินนี่ 💋: “เซอร์ไพรส์จ้ายัยแฝด!”');
  assert.equal(quoteDialogue('มินนี่ 💋 & ข้าวหอม 🌿: อื้อออ! พร้อมกันเลย!'), 'มินนี่ 💋 & ข้าวหอม 🌿: “อื้อออ! พร้อมกันเลย!”');
});
