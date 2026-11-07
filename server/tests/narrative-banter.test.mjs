import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpretNarrativeTurn, narrativeTurnContext, restoreLegacyInteraction } from '../src/narrative-interaction.mjs';
import { initialNarrativeState, readNarrativeState, reduceNarrativeState } from '../src/narrative.mjs';
import { narrativeFixture, modelReply } from './helpers/narrative-fixture.mjs';
const npc = JSON.parse(readFileSync(new URL('../../content/creators/cheer/character.json', import.meta.url), 'utf8'));
const payload = { beats: [{ kind: 'action', text: 'เชียร์เลิกคิ้วอย่างสนใจ' }, { kind: 'dialogue', text: 'แล้วมึงมีอะไรดีนอกจากทำหน้าเข้าถึงยากวะ' }], sceneUpdate: { move: 'stay', goal: 'เลิกจีบถาวร', mood: 'ท้าทาย', activity: 'คุยกัน' } };

test('competitive resistance preserves interest without repeating a rejected dating offer; explicit stops persist', () => {
  const initial = initialNarrativeState(npc);
  for (const text of ['ไม่อยากโดนจีบ', 'ไม่คบ', 'ยังไม่พร้อมคบ', 'ไม่เอา']) {
    const turn = interpretNarrativeTurn(initial, text);
    assert.equal(turn.intent, 'resistance', text);
    assert.equal(turn.romancePaused, false);
    assert.equal(turn.responseMove, 'keep_interest_and_reframe_without_repeating_offer');
    let state = reduceNarrativeState(initial, { ...payload.sceneUpdate, nextOffer: initial.interaction.pendingOffer }, text, initial.interaction.pendingOffer.quote);
    assert.equal(state.goal, initial.motivation);
    assert.equal(state.interaction.pendingOffer, null);
    state = readNarrativeState(npc, state);
    assert.equal(interpretNarrativeTurn(state, 'ยังมั่นใจอีกเหรอ').romancePaused, false);
    const stopped = reduceNarrativeState(state, {}, 'หยุดจีบ');
    assert.equal(interpretNarrativeTurn(stopped, 'ไม่อยากโดนจีบ').romancePaused, true);
  }
  const reserved = { ...initial, courtshipStyle: 'reserved' };
  assert.equal(interpretNarrativeTurn(reserved, 'ไม่อยากโดนจีบ').romancePaused, true);
  for (const text of ['ไม่อยากโดนจีบ พูดจริงนะ', 'โดนจีบแล้วอึดอัด'])
    assert.equal(interpretNarrativeTurn(initial, text).romancePaused, true, text);
});

test('variation cues change direction without canned dialogue or overriding discomfort and scope', () => {
  const state = initialNarrativeState(npc);
  const cues = new Set();
  for (let draw = 0; draw < 5; draw++) {
    const turn = narrativeTurnContext(state, 'ไม่แดก', () => draw);
    assert.equal(turn.scope, 'food');
    assert.equal(turn.preserveGoal, true);
    cues.add(turn.variationHint);
  }
  assert.equal(cues.size, 5);
  for (const text of ['หยุดจีบ', 'ขออยู่เงียบ ๆ', 'ไม่กินเผ็ด', 'มึงไม่อยากโดนจีบเหรอ', 'ช่วยดูโจทย์หน่อย'])
    assert.equal(narrativeTurnContext(state, text).variationHint, undefined, text);
});

test('primary Workers AI receives the creative contract and passes through model wording', async () => {
  const f = await narrativeFixture();
  const savedFetch = globalThis.fetch;
  let context, system;
  globalThis.fetch = async () => { throw new Error('primary Workers AI must not call Gemini'); };
  f.env.PRIMARY_AI_PROVIDER = 'workers-ai';
  f.env.AI = { async run(_model, input) {
    context = JSON.parse(input.messages[1].content); system = input.messages[0].content;
    return { response: JSON.stringify(payload) };
  } };
  try {
    const response = await f.request('ไม่อยากโดนจีบ');
    assert.equal(response.status, 200);
    assert.equal(response.payload.reply, payload.beats[1].text);
    assert.ok(context.playerTurnContext.variationHint);
    assert.equal(context.playerTurnContext.romancePaused, false);
    assert.equal(f.state().goal, f.npc.narrative.openingGoal);
    assert.match(system, /NOT reusable response scripts/);
    assert.equal((await f.request('หยุดจีบ')).status, 200);
    assert.equal(context.playerTurnContext.romancePaused, true);
    assert.equal(context.playerTurnContext.variationHint, undefined);
    assert.equal(f.state().interaction.romancePauseReason, 'explicit');
  } finally { globalThis.fetch = savedFetch; f.sql.close(); }
});

test('legacy pauses are reconciled from player evidence only; explicit stops survive later soft resistance', () => {
  const state = initialNarrativeState(npc);
  state.interaction = { ...state.interaction, romancePaused: true, romancePauseReason: 'legacy' };
  state.goal = 'คุยโดยไม่จีบ';
  const row = (content, created_at, role = 'user') => ({ content, created_at, role });
  assert.equal(restoreLegacyInteraction(state, [row('ไม่อยากโดนจีบ', 1)], true).interaction.romancePaused, false);
  assert.equal(restoreLegacyInteraction(state, [row('ไม่อยากโดนจีบ', 3), row('หยุดจีบ', 2)], true).interaction.romancePauseReason, 'explicit');
  assert.equal(restoreLegacyInteraction(state, [row('หยุดจีบ', 2), row('จีบต่อได้', 3)], true).interaction.romancePaused, false);
  assert.equal(restoreLegacyInteraction(state, [row('ไม่อยากโดนจีบ', 1)]).interaction.romancePaused, true, 'incomplete history cannot revoke a prior limit');
  assert.equal(restoreLegacyInteraction(state, [row('ไม่อยากโดนจีบ', 1, 'assistant')]).interaction.romancePaused, true);
  assert.equal(restoreLegacyInteraction(state, [row('คุยเรื่องเรียน', 1)]).interaction.romancePaused, true);
});

test('pause-reason migration preserves data, is idempotent and tolerates malformed legacy state', async () => {
  const f = await narrativeFixture();
  try {
    await f.open(); await f.open('two');
    const state = f.state(); delete state.interaction.romancePauseReason; state.interaction.romancePaused = true;
    f.sql.prepare("UPDATE npc_scene_states SET state_json=? WHERE user_id='one'").run(JSON.stringify(state));
    const migration = readFileSync(new URL('../migrations/0012_scene_pause_reason.sql', import.meta.url), 'utf8');
    f.sql.exec(migration); f.sql.exec(migration);
    assert.equal(f.state().interaction.romancePauseReason, 'legacy');
    assert.equal(f.state().interaction.romancePaused, true);
    f.sql.prepare("UPDATE npc_scene_states SET state_json='broken' WHERE user_id='two'").run();
    assert.doesNotThrow(() => f.sql.exec(migration));
  } finally { f.sql.close(); }
});

test('actual Worker restores legacy soft pauses across multiple turns without replacing model dialogue', async () => {
  const f = await narrativeFixture(); const savedFetch = globalThis.fetch; let context;
  globalThis.fetch = async (_url, init) => { context = JSON.parse(JSON.parse(init.body).contents[0].parts[0].text); return modelReply(payload); };
  try {
    await f.open();
    const state = f.state(); state.interaction.romancePaused = true; delete state.interaction.romancePauseReason;
    f.sql.prepare("UPDATE npc_scene_states SET state_json=? WHERE user_id='one'").run(JSON.stringify(state));
    f.sql.prepare('INSERT INTO ai_chat_messages(id,user_id,creator_id,role,content,created_at) VALUES(?,?,?,?,?,?)').run('old-soft-refusal', 'one', 'cheer', 'user', 'ไม่อยากโดนจีบ', Date.now() - 1000);
    for (const message of ['ไม่อยากโดนจีบ', 'ยังมั่นใจอีกเหรอ']) {
      const response = await f.request(message);
      assert.equal(response.status, 200);
      assert.equal(response.payload.innerThought, null, 'optional thought behavior stays unchanged');
      assert.equal(response.payload.reply, payload.beats[1].text);
      if (message === 'ไม่อยากโดนจีบ') assert.ok(context.playerTurnContext.variationHint);
      assert.equal(context.playerTurnContext.romancePaused, false);
      assert.equal(f.state().interaction.romancePaused, false);
    }
  } finally { globalThis.fetch = savedFetch; f.sql.close(); }
});
