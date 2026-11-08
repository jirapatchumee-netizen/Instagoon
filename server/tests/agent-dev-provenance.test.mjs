import test from 'node:test';
import assert from 'node:assert/strict';
import { characterExperimentFixture } from './helpers/character-experiment-fixture.mjs';
import { handleAgentDevRoute } from '../src/agent-dev-api.mjs';
import { resetContentCache } from '../src/content.mjs';

const scene = { location: 'โรงอาหาร', innerThought: 'ลองฟังเรื่องนี้', playerActions: [], beats: [{ kind: 'dialogue', text: 'เล่าต่อดิ' }] };
const options = { scene: true, opening: true, responseContract: true };
async function agent(f, path) {
  const req = new Request('https://staging.example' + path, { headers: { Authorization: 'Bearer fixture-agent-credential' } });
  const res = await handleAgentDevRoute(req, { ...f.env, AGENT_DEV_SECRET: 'fixture-agent-credential' }, new URL(req.url).pathname, Date.now());
  return { status: res.status, data: await res.json() };
}

test('agent history returns latest messages, separates players sharing a variant, and exposes only allowlisted traces', async () => {
  const f = await characterExperimentFixture(options), saved = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ model: 'deepseek-flash', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(scene) } }] });
  try {
    const one = await f.request('ONE_PRIVATE_TEST_MESSAGE');
    const two = await f.request('TWO_PRIVATE_TEST_MESSAGE', { uid: 'two' });
    assert.equal(one.status, 200); assert.equal(two.status, 200);
    const id = two.payload.messages.at(-1).id;
    const raw = JSON.parse(f.sql.prepare('SELECT metadata_json FROM experiment_chat_traces WHERE message_id=?').get(id).metadata_json);
    raw.unexpectedSecret = 'HIDDEN_TRACE_PROPERTY'; raw.generation.unexpectedSecret = 'HIDDEN_GENERATION_PROPERTY';
    f.sql.prepare('UPDATE experiment_chat_traces SET metadata_json=? WHERE message_id=?').run(JSON.stringify(raw), id);
    const result = await agent(f, '/api/agent/characters/cheer/history?limit=100');
    assert.equal(result.status, 200); assert.equal(result.data.totalThreads, 2);
    assert.notEqual(result.data.threads[0].threadId, result.data.threads[1].threadId);
    for (const t of result.data.threads) {
      assert.equal(t.totalTurns, 3);
      const userMessages = t.turns.filter(m => m.role === 'user');
      assert.equal(userMessages.length, 1);
      assert.equal(t.turns.at(-1).trace.contractVersion, 'cheer-response-v2');
    }
    const latest = await agent(f, '/api/agent/characters/cheer/history?limit=1');
    assert.equal(latest.data.totalMessages, 1);
    assert.equal(latest.data.threads[0].turns[0].id, id);
    assert.ok(!JSON.stringify(result.data).includes('HIDDEN_TRACE_PROPERTY'));
    assert.ok(!JSON.stringify(result.data).includes('HIDDEN_GENERATION_PROPERTY'));
    assert.ok(!JSON.stringify(result.data).includes('one@example.com'));
    const metrics = await agent(f, '/api/agent/characters/cheer/metrics');
    const threadIds = new Set(result.data.threads.map(t => t.threadId));
    assert.ok(metrics.data.metrics.every(m => threadIds.has(m.threadId)));
    f.sql.exec('DROP TABLE experiment_chat_traces');
    const legacy = await agent(f, '/api/agent/characters/cheer/history?limit=1');
    assert.equal(legacy.status, 200); assert.equal(legacy.data.threads[0].turns[0].trace, null);
    assert.equal(f.sql.prepare("SELECT name FROM sqlite_master WHERE name='experiment_chat_traces'").get(), undefined, 'agent GET never bootstraps tables');
  } finally { globalThis.fetch = saved; f.sql.close(); }
});

test('contract endpoint reads compiled Markdown and reports database/deployment drift without rewriting content', async () => {
  const f = await characterExperimentFixture(options);
  resetContentCache();
  f.env.ASSETS = { fetch: async () => Response.json({ version: 'deployed-fixture', creators: [{ id: 'cheer', definition: f.npc }] }) };
  try {
    const stale = { id: 'cheer', biography: 'older profile' };
    f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(stale), 'cheer');
    const result = await agent(f, '/api/agent/characters/cheer/contract');
    assert.equal(result.status, 200);
    assert.equal(result.data.mode, 'default');
    assert.equal(result.data.contractId, null);
    assert.equal(result.data.deployed.contractId, 'cheer-response-v2');
    assert.equal(result.data.deployed.contractMarkdown, f.npc.chatExperiment.responseContract.text);
    assert.match(result.data.deployed.contractHash, /^[a-f0-9]{64}$/);
    assert.equal(result.data.matchesDeployed, false);
    assert.equal(JSON.parse(f.sql.prepare('SELECT definition_json FROM npc_definitions WHERE creator_id=?').get('cheer').definition_json).biography, 'older profile');
    f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(f.npc), 'cheer');
    const current = await agent(f, '/api/agent/characters/cheer/contract?responseVariant=contract-v1');
    assert.equal(current.data.contractId, 'cheer-response-v1');
    assert.equal(current.data.matchesDeployed, true);
    assert.equal((await agent(f, '/api/agent/characters/cheer/contract?responseVariant=unknown')).status, 400);
  } finally { resetContentCache(); f.sql.close(); }
});
