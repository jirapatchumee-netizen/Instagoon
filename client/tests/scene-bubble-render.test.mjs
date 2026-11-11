import test from 'node:test';
import assert from 'node:assert/strict';
import { readSceneHeader, sceneHeaderLabels, hasNarrativeActions, splitNarrativeBody, quoteDialogue } from '../player/message-format.ts';
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
