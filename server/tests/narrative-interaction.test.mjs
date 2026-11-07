import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretNarrativeTurn } from '../src/narrative-interaction.mjs';
import { initialNarrativeState, reduceNarrativeState, decodeNarrative, readNarrativeState } from '../src/narrative.mjs';
import { narrativeFixture, modelReply } from './helpers/narrative-fixture.mjs';
import { readFileSync } from 'node:fs';

const lab = { id: 'circuits-lab', name: 'ห้องแล็บวงจร', description: 'โต๊ะทดลองริมหน้าต่าง' };
test('food refusal is local, including after a combined courtship/food opening', async () => {
  const f = await narrativeFixture();
  try {
    const state = initialNarrativeState(f.npc);
    for (const text of ['ไม่แดก', 'ไม่กิน', 'ไม่เอาอาหาร', 'อิ่มแล้ว', 'ไม่แดก แต่คุยต่อได้']) {
      const hint = interpretNarrativeTurn(state, text);
      assert.equal(hint.scope, 'food', text);
      assert.equal(hint.romancePaused, false, text);
      assert.equal(hint.preserveGoal, true, text);
    }
    const mealGoal = { ...state, goal: 'ชวนกินข้าว' };
    const next = reduceNarrativeState(mealGoal, { move: 'stay', goal: 'เลิกจีบแล้วกลับไป', mood: 'สนใจความปากดี' }, 'ไม่แดก');
    assert.equal(next.goal, state.motivation, 'preserve the broader motivation, not the rejected meal tactic');
    assert.equal(next.interaction.lastScope, 'food');
    assert.equal(next.interaction.romancePaused, false);
    assert.equal(interpretNarrativeTurn(state, 'ไม่กินเผ็ด').intent, 'preference');
    assert.equal(interpretNarrativeTurn(state, 'ไม่กินเผ็ด').responseMove, 'honor_preference_and_continue_current_offer');
    assert.equal(interpretNarrativeTurn(state, 'ไม่อยากคุยเรื่องอาหาร').scope, 'offer');
  } finally { f.sql.close(); }
});

test('the optional interaction migration is idempotent and preserves explicit boundaries and malformed legacy rows', async () => {
  const f = await narrativeFixture();
  try {
    await f.open(); await f.open('two');
    const legacy = f.state(); delete legacy.interaction;
    f.sql.prepare('UPDATE npc_scene_states SET state_json=? WHERE user_id=?').run(JSON.stringify(legacy), 'one');
    const paused = f.state('two'); paused.interaction.romancePaused = true;
    f.sql.prepare('UPDATE npc_scene_states SET state_json=? WHERE user_id=?').run(JSON.stringify(paused), 'two');
    const migration = readFileSync(new URL('../migrations/0011_scene_interaction_scope.sql', import.meta.url), 'utf8');
    f.sql.exec(migration); f.sql.exec(migration);
    assert.equal(f.state().interaction.romancePaused, false);
    assert.equal(f.state('two').interaction.romancePaused, true);
    f.sql.prepare("UPDATE npc_scene_states SET state_json='broken' WHERE user_id='one'").run();
    assert.doesNotThrow(() => f.sql.exec(migration));
  } finally { f.sql.close(); }
});

test('clear boundaries persist and casual acknowledgements do not restart courtship', async () => {
  const f = await narrativeFixture();
  try {
    for (const text of ['ไม่อยากโดนจีบ', 'หยุดจีบ', 'ไม่อยากให้มึงจีบ', 'ไม่แดก และไม่อยากโดนจีบ']) {
      const initial = initialNarrativeState(f.npc);
      let state = reduceNarrativeState(initial, { goal: 'เอาชนะให้ได้', nextOffer: { kind: 'romance', quote: 'จีบต่อได้ไหม' } }, text, 'จีบต่อได้ไหม');
      assert.equal(state.interaction.romancePaused, true, text);
      assert.equal(state.interaction.pendingOffer, null, text);
      assert.equal(state.goal, 'คุยตามหัวข้อที่ผู้เล่นเลือกโดยไม่จีบ');
      state = readNarrativeState(f.npc, JSON.stringify(state));
      state = reduceNarrativeState(state, { goal: 'จีบอีกครั้ง' }, 'โอเค');
      assert.equal(state.interaction.romancePaused, true, 'acknowledgement is not consent to resume');
      assert.equal(state.goal, 'คุยตามหัวข้อที่ผู้เล่นเลือกโดยไม่จีบ');
      state = reduceNarrativeState(state, { goal: 'เริ่มหยอกกันใหม่' }, 'จีบต่อได้');
      assert.equal(state.interaction.romancePaused, false);
      const pausedAgain = reduceNarrativeState(state, {}, 'ไม่อยากโดนจีบ');
      const scopedResume = interpretNarrativeTurn(pausedAgain, 'จีบต่อได้ แต่อย่าชวนกินข้าวซ้ำ');
      assert.equal(scopedResume.romancePaused, false, 'an unrelated meal restriction must not negate explicit permission to resume');
      assert.equal(scopedResume.scope, 'food');
    }
    const paused = reduceNarrativeState(initialNarrativeState(f.npc), { goal: 'ถามเพิ่ม' }, 'ขออยู่เงียบ ๆ ก่อน');
    assert.equal(paused.interaction.conversationPaused, true);
    assert.equal(interpretNarrativeTurn(paused, 'ช่วยดูโจทย์หน่อย').conversationPaused, false);
    assert.equal(interpretNarrativeTurn(initialNarrativeState(f.npc), 'เขาบอกว่าไม่อยากโดนจีบ').scope, 'ambiguous');
    for (const question of ['มึงไม่อยากโดนจีบเหรอ', 'ไม่ไปเหรอ', 'ผมไม่อยากให้ใครมาจีบเธอ'])
      assert.equal(interpretNarrativeTurn(initialNarrativeState(f.npc), question).scope, 'ambiguous');
    assert.equal(interpretNarrativeTurn(initialNarrativeState(f.npc), 'หยุดจีบได้ไหม?').romancePaused, true);
  } finally { f.sql.close(); }
});

test('offer evidence scopes short refusals and an unrelated food refusal preserves travel', async () => {
  const f = await narrativeFixture();
  try {
    let state = initialNarrativeState(f.npc);
    state = reduceNarrativeState(state, { nextOffer: { kind: 'food', quote: 'กินข้าวไหม' } }, 'หิวแล้ว', 'กินข้าวไหม');
    assert.equal(interpretNarrativeTurn(state, 'ไม่เอา').scope, 'food');
    const ignored = reduceNarrativeState(state, { nextOffer: { kind: 'romance', quote: 'เป็นแฟนกัน' } }, 'คุยต่อ', 'พูดเรื่องอื่น');
    assert.equal(ignored.interaction.pendingOffer.kind, 'food', 'invented offers without a spoken quote are discarded');
    const pending = reduceNarrativeState(state, { move: 'propose', place: lab }, 'อยากดูโปรเจกต์');
    assert.equal(interpretNarrativeTurn(pending, 'ไม่เอา').scope, 'travel');
    const foodOnly = reduceNarrativeState(pending, { move: 'cancel', goal: 'เลิกคุย' }, 'ไม่เอาอาหาร');
    assert.equal(foodOnly.pendingLocationId, lab.id);
    const moved = decodeNarrative({ beats: [{ kind: 'dialogue', text: 'งั้นไปดูวงจรกัน' }], sceneUpdate: { move: 'confirm', place: lab } }, pending, 'ไม่เอาอาหาร แต่ไปห้องแล็บวงจรได้');
    assert.equal(moved.nextState.locationId, lab.id);
    const old = structuredClone(state); delete old.interaction; delete old.motivation;
    const normalized = readNarrativeState(f.npc, JSON.stringify(old));
    assert.equal(normalized.interaction.romancePaused, false);
    assert.equal(normalized.motivation, f.npc.narrative.openingGoal);
    assert.equal(interpretNarrativeTurn(normalized, 'ไม่เอา').scope, 'ambiguous');
  } finally { f.sql.close(); }
});

test('the Worker supplies scoped turn context and persists the broader goal across a food rejection', async () => {
  const f = await narrativeFixture();
  const savedFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (_url, init) => {
    sent = JSON.parse(init.body);
    return modelReply({ beats: [{ kind: 'action', text: 'เชียร์เลิกคิ้วแล้วหัวเราะ' }, { kind: 'dialogue', text: 'ไม่กินก็ไม่กิน ว่าแต่ที่เขาว่ามึงจีบยากนี่ จริงหรือทำฟอร์ม' }], sceneUpdate: { move: 'stay', activity: 'เปลี่ยนมุกจากเรื่องอาหาร', goal: 'เลิกเข้าหาทั้งหมด', mood: 'อยากรู้จักมากขึ้น', nextOffer: { kind: 'challenge', quote: 'จริงหรือทำฟอร์ม' } } });
  };
  try {
    const response = await f.request('ไม่แดก');
    assert.equal(response.status, 200);
    const turn = JSON.parse(sent.contents[0].parts[0].text).playerTurnContext;
    assert.equal(turn.scope, 'food');
    assert.equal(turn.responseMove, 'acknowledge_specific_decline_then_change_tactic');
    assert.equal(turn.romancePaused, false);
    assert.equal(f.state().goal, f.npc.narrative.openingGoal);
    assert.equal(f.state().interaction.lastScope, 'food');
    assert.equal(f.state().interaction.pendingOffer.kind, 'challenge');
  } finally { globalThis.fetch = savedFetch; f.sql.close(); }
});

test('the team fallback path applies the same refusal scope and goal reducer', async () => {
  const f = await narrativeFixture();
  const savedFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async () => new Response('fixture primary unavailable', { status: 503 });
  f.env.AI = { async run(_model, input) {
    sent = JSON.parse(input.messages[1].content);
    const text = sent.playerTurnContext.romancePaused ? 'เออ หยุดก็หยุด กูได้ยินแล้ว' : 'ไม่กินก็ไม่กิน งั้นที่ว่ามึงจีบยากนี่จริงหรือทำฟอร์ม';
    return { response: JSON.stringify({ beats: [{ kind: 'dialogue', text }], sceneUpdate: { move: 'stay', goal: 'เลิกคุย', activity: 'เปลี่ยนมุก', mood: 'สนใจ' } }) };
  } };
  try {
    assert.equal((await f.request('ไม่แดก')).status, 200);
    assert.equal(sent.playerTurnContext.scope, 'food');
    assert.equal(f.state().goal, f.npc.narrative.openingGoal);
    assert.equal(f.state().interaction.romancePaused, false);
    assert.equal((await f.request('หยุดจีบ')).status, 200);
    assert.equal(sent.playerTurnContext.scope, 'romance');
    assert.equal(f.state().interaction.romancePaused, true);
    assert.equal(f.state().goal, 'คุยตามหัวข้อที่ผู้เล่นเลือกโดยไม่จีบ');
  } finally { globalThis.fetch = savedFetch; f.sql.close(); }
});
