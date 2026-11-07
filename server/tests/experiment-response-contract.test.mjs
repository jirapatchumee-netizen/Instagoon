import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { characterExperimentFixture, sourceNpc } from './helpers/character-experiment-fixture.mjs';
import { characterOnlyIdentity, EXPERIMENT_GENERATION } from '../src/character-only-chat.mjs';
import { responseContractFor } from '../src/experiment-request.mjs';
import { loadResponseContract } from '../../scripts/load-response-contract.mjs';
import { NpcSchema } from '../../packages/contracts/npc/schema.ts';

const options = { scene: true, opening: true, allowFiftyShades: true, responseContract: true };
const sample = { location: 'โรงอาหารคณะวิศวกรรมศาสตร์', innerThought: 'ลองฟังเรื่องโปรเจกต์ก่อน', playerActions: [], beats: [{ kind: 'action', text: 'เชียร์วางสมุดลง' }, { kind: 'dialogue', text: 'เล่าเรื่องโปรเจกต์มึงมาดิ' }] };
const baseline = { responseVariant: 'baseline' }, contract = { responseVariant: 'contract' };
const open = (f, variant, mode = false) => f.request('', { action: '', path: `/api/chats/cheer?responseVariant=${variant}&fiftyShades=${mode ? '1' : '0'}` });

test('baseline preserves deployed keys; contract edits select a new independent run', async () => {
  const f = await characterExperimentFixture(options);
  try {
    const old = await characterOnlyIdentity(f.npc, baseline);
    assert.equal(old.experimentKey, 'bbbc200f370a87987507fadbc8376f5543c872296d8e2f06b37e3e68515a4ae5');
    assert.equal((await characterOnlyIdentity(f.npc, { ...baseline, modePrompt: 'OPTIONAL_MODE_FIXTURE เชียร์' })).experimentKey, '822ee020d5b6b7a9037215c1bbb8587ab09f75c2e75c15ddff86a4e1005e0f47');
    const next = await characterOnlyIdentity(f.npc);
    assert.equal(next.response.variant, 'contract');
    assert.notEqual(next.experimentKey, old.experimentKey);
    f.npc.chatExperiment.responseContract.text += '\nKeep a new relevant detail.';
    assert.notEqual((await characterOnlyIdentity(f.npc)).experimentKey, next.experimentKey);
    assert.equal((await characterOnlyIdentity(f.npc, baseline)).experimentKey, old.experimentKey);
  } finally { f.sql.close(); }
});

test('both variants use unchanged generation and one call; histories and resets are isolated across variants and modes', async () => {
  const f = await characterExperimentFixture(options), saved = globalThis.fetch, sent = [];
  f.env.FIFTY_SHADES_SECRET_PROMPT = 'OPTIONAL_MODE_FIXTURE ${npcName}';
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.deepseek.com/chat/completions');
    sent.push(JSON.parse(init.body));
    return Response.json({ model: 'deepseek-flash', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(sample) } }] });
  };
  try {
    const a = await f.request('BASELINE_PROJECT', { data: { message: 'BASELINE_PROJECT', ...baseline } });
    const b = await f.request('CONTRACT_PROJECT', { data: { message: 'CONTRACT_PROJECT', ...contract } });
    assert.equal(a.status, 200); assert.equal(b.status, 200);
    assert.equal(sent.length, 2);
    for (const body of sent) {
      for (const [key, value] of Object.entries(EXPERIMENT_GENERATION)) assert.equal(body[key], value);
      assert.equal(body.model, 'deepseek-flash');
      assert.equal(body.messages[0].content, sourceNpc.biography);
    }
    assert.equal(sent[0].messages.filter(m => m.role === 'system').length, 2);
    assert.equal(sent[1].messages.filter(m => m.role === 'system').length, 3);
    assert.equal(sent[1].messages[1].content, f.npc.chatExperiment.responseContract.text);
    assert.ok(!JSON.stringify(sent[1]).includes('BASELINE_PROJECT'));
    assert.ok(!JSON.stringify(b.payload.experiment).includes('Use the supplied profile'));
    assert.equal((await open(f, 'baseline')).payload.chat.aiMessages.length, 3);
    assert.equal((await open(f, 'contract', true)).payload.chat.aiMessages.length, 1);
    assert.equal(sent.length, 2, 'opening and switches never call AI');
    await f.request('', { action: 'reset-chat', data: { ...contract, fiftyShades: true } });
    assert.equal((await open(f, 'contract')).payload.chat.aiMessages.length, 3);
    await f.request('', { action: 'reset-chat', data: contract });
    assert.equal((await open(f, 'contract')).payload.chat.aiMessages.length, 1);
    assert.equal((await open(f, 'baseline')).payload.chat.aiMessages.length, 3);
    assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 98);
    assert.equal(sent.length, 2);
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('invalid variant or missing compiled contract fails before charging or calling a provider', async () => {
  const f = await characterExperimentFixture(options), saved = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('must not call'); };
  try {
    assert.equal((await open(f, 'unknown')).status, 400);
    delete f.npc.chatExperiment.responseContract.text;
    assert.equal((await f.request('ทักทาย')).status, 503);
    assert.equal(f.sql.prepare("SELECT free FROM energy WHERE user_id='one'").get().free, 100);
    assert.equal((await open(f, 'baseline')).status, 200);
    const other = structuredClone(f.npc); other.id = 'another';
    assert.equal(NpcSchema.safeParse(other).success, false);
    assert.throws(() => responseContractFor(other, 'contract'), /invalid_response_variant/);
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('build compiler loads only the bounded Cheer Markdown, never a supplied compiled override', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cheer-contract-'));
  writeFileSync(join(dir, 'response-contract.md'), '# Runtime\nAnswer the current point.\n');
  const compiled = loadResponseContract(structuredClone(sourceNpc), dir);
  assert.equal(compiled.chatExperiment.responseContract.text, '# Runtime\nAnswer the current point.');
  assert.equal(NpcSchema.safeParse(compiled).success, true);
  assert.throws(() => loadResponseContract(compiled, dir), /invalid response contract source/);
  writeFileSync(join(dir, 'response-contract.md'), 'x'.repeat(2401));
  assert.throws(() => loadResponseContract(structuredClone(sourceNpc), dir), /1-2400/);
});
