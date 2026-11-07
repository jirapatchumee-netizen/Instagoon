import { narrativeNpc } from './helpers/narrative-npc.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readSceneHeader, sceneHeaderLabels, splitNarrativeBody, quoteDialogue } from '../../client/player/message-format.ts';
import { initialNarrativeState, narrativeSceneMetadata, decodeNarrative, serializeNarrative } from '../src/narrative.mjs';
import { readFileSync } from 'node:fs';

test('scene headers use Bangkok time across a UTC date boundary and retain the saved timestamp', () => {
  const scene = { at: Date.UTC(2026, 10, 6, 18, 7), location: 'ห้องแล็บวงจร' };
  const text = `[scene:${JSON.stringify(scene)}]\n[thought:ลองดูหน่อย]\nสวัสดี`;
  const parsed = readSceneHeader(text);
  assert.deepEqual(parsed.scene, scene);
  const labels = sceneHeaderLabels(parsed.scene);
  assert.equal(labels.time, '01:07');
  assert.match(labels.date, /7.*2569/);
  assert.equal(labels.location, scene.location);
  assert.equal(parsed.body, '[thought:ลองดูหน่อย]\nสวัสดี');
  assert.equal(readSceneHeader('[scene:broken]\nบทพูด').body, 'บทพูด', 'malformed metadata is not shown as raw implementation text');
  assert.equal(readSceneHeader('บทพูดเดิม').scene, null);
});

test('legacy and mixed-case action labels are removed without changing dialogue order', () => {
  const segments = splitNarrativeBody('เริ่มพูด\n[Action: action: นัทวางแก้วลง]\nแล้วพูดต่อ\nAction: เธอยิ้ม\nจบบทพูด');
  assert.deepEqual(segments.map(s => s.kind), ['dialogue', 'action', 'dialogue', 'action', 'dialogue']);
  assert.equal(segments[1].text, 'นัทวางแก้วลง');
  assert.equal(segments[3].text, 'เธอยิ้ม');
  assert.ok(segments.every(s => !/action:/i.test(s.text)));
  assert.equal(quoteDialogue(segments[0].text), '“เริ่มพูด”');
  assert.equal(quoteDialogue('“พูดไว้แล้ว”'), '“พูดไว้แล้ว”', 'existing quotes are not doubled');
});

test('server normalizes model-authored labels and displays only the committed current location', () => {
  const npc = narrativeNpc();
  const initial = initialNarrativeState(npc);
  const decoded = decodeNarrative({
    beats: [{ kind: 'action', text: 'Action: นัทวางแก้วลง' }, { kind: 'dialogue', text: 'ลองดูสิ' }],
    sceneUpdate: { move: 'propose', place: { id: 'new-lab', name: 'ห้องแล็บวงจร', description: 'โต๊ะทดลอง' } }
  }, initial, 'อยากดูโปรเจกต์พี่');
  assert.equal(decoded.beats[0].text, 'นัทวางแก้วลง');
  assert.equal(serializeNarrative(decoded.beats), '[action:นัทวางแก้วลง]\nลองดูสิ');
  assert.equal(narrativeSceneMetadata(decoded.nextState, 123).location, npc.narrative.openingLocation.name);
});
