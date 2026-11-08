import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAgentDevRoute, isAuthorizedAgent } from '../src/agent-dev-api.mjs';
import stagingWorker from '../src/staging.mjs';
import app from '../src/index.mjs';

const TEST_SECRET = 'test_agent_secret_key_12345';

function createMockDb() {
  return {
    prepare(query) {
      return {
        bind(...params) {
          return {
            async first() {
              if (query.includes('FROM npc_definitions')) {
                const creatorId = params[0];
                if (creatorId === 'cheer') {
                  return {
                    definition_json: JSON.stringify({
                      id: 'cheer', biography: 'Cheer test bio',
                      chatExperiment: {
                        mode: 'character-only',
                        model: 'deepseek-flash',
                        responseContract: {
                          id: 'cheer-response-v1',
                          defaultVariant: 'contract',
                          text: '# Cheer Response Contract'
                        }
                      }
                    })
                  };
                }
              }
              return null;
            },
            async all() {
              if (query.includes('FROM experiment_chat_messages')) {
                const creatorId = params[0];
                if (creatorId === 'cheer') {
                  return {
                    results: [
                      {
                        id: 'msg-1',
                        user_id: 'u-1',
                        experiment_key: 'exp-key-1',
                        role: 'user',
                        content: 'สวัสดีเชียร์',
                        created_at: 1794086471000,
                        presentation_json: null
                      },
                      {
                        id: 'msg-2',
                        user_id: 'u-1',
                        experiment_key: 'exp-key-1',
                        role: 'assistant',
                        content: JSON.stringify({
                          location: 'โรงอาหารคณะวิศวกรรมศาสตร์',
                          innerThought: 'คิดในใจ',
                          beats: [{ kind: 'dialogue', text: 'ว่าไงมึง' }]
                        }),
                        created_at: 1794086472000,
                        presentation_json: JSON.stringify({
                          location: 'โรงอาหารคณะวิศวกรรมศาสตร์',
                          innerThought: 'คิดในใจ',
                          beats: [{ kind: 'dialogue', text: 'ว่าไงมึง' }]
                        })
                      }
                    ]
                  };
                }
              }
              if (query.includes('FROM ai_turn_metrics')) {
                const creatorId = params[0];
                if (creatorId === 'cheer') {
                  return {
                    results: [
                      {
                        id: 'metric-1',
                        user_id: 'u-1',
                        visit_id: 'visit-1',
                        outcome: 'ok',
                        model: 'deepseek-flash',
                        latency_ms: 1200,
                        tokens_in: 500,
                        tokens_out: 100,
                        created_at: 1794086472000
                      }
                    ]
                  };
                }
              }
              return { results: [] };
            }
          };
        }
      };
    }
  };
}

test('Agent Dev API: requires authentication', async () => {
  const env = { AGENT_DEV_SECRET: TEST_SECRET, DB: createMockDb() };
  const req = new Request('https://staging.example/api/agent/characters/cheer/history');
  const res = await handleAgentDevRoute(req, env, '/api/agent/characters/cheer/history', Date.now());
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'unauthorized_agent');
});

test('Agent Dev API: rejects invalid secret', async () => {
  const env = { AGENT_DEV_SECRET: TEST_SECRET, DB: createMockDb() };
  const req = new Request('https://staging.example/api/agent/characters/cheer/history', {
    headers: { Authorization: 'Bearer wrong_key' }
  });
  const res = await handleAgentDevRoute(req, env, '/api/agent/characters/cheer/history', Date.now());
  assert.equal(res.status, 401);
});

test('Agent Dev API: blocks creators outside dev scope', async () => {
  const env = { AGENT_DEV_SECRET: TEST_SECRET, DB: createMockDb() };
  for (const forbidden of ['milin', 'mook', 'noey', 'other']) {
    const req = new Request(`https://staging.example/api/agent/characters/${forbidden}/history`, {
      headers: { Authorization: `Bearer ${TEST_SECRET}` }
    });
    const res = await handleAgentDevRoute(req, env, `/api/agent/characters/${forbidden}/history`, Date.now());
    assert.equal(res.status, 403, `Must block ${forbidden}`);
    const data = await res.json();
    assert.equal(data.error, 'creator_not_in_dev_scope');
  }
});

test('Agent Dev API: allows cheer history, metrics, contract, and health', async () => {
  const env = { AGENT_DEV_SECRET: TEST_SECRET, DB: createMockDb() };
  const authHeaders = { Authorization: `Bearer ${TEST_SECRET}` };

  // Health check
  const healthReq = new Request('https://staging.example/api/agent/health', { headers: authHeaders });
  const healthRes = await handleAgentDevRoute(healthReq, env, '/api/agent/health', Date.now());
  assert.equal(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.equal(healthData.ok, true);
  assert.deepEqual(healthData.allowedCreators, ['cheer']);

  // History endpoint
  const histReq = new Request('https://staging.example/api/agent/characters/cheer/history', { headers: authHeaders });
  const histRes = await handleAgentDevRoute(histReq, env, '/api/agent/characters/cheer/history', Date.now());
  assert.equal(histRes.status, 200);
  const histData = await histRes.json();
  assert.equal(histData.ok, true);
  assert.equal(histData.creatorId, 'cheer');
  assert.equal(histData.totalMessages, 2);
  assert.equal(histData.threads.length, 1);
  assert.equal(histData.threads[0].turns[1].scene.location, 'โรงอาหารคณะวิศวกรรมศาสตร์');

  // Metrics endpoint
  const metReq = new Request('https://staging.example/api/agent/characters/cheer/metrics', { headers: { 'x-agent-secret': TEST_SECRET } });
  const metRes = await handleAgentDevRoute(metReq, env, '/api/agent/characters/cheer/metrics', Date.now());
  assert.equal(metRes.status, 200);
  const metData = await metRes.json();
  assert.equal(metData.ok, true);
  assert.equal(metData.metrics.length, 1);
  assert.equal(metData.metrics[0].model, 'deepseek-flash');

  // Contract endpoint
  const contReq = new Request('https://staging.example/api/agent/characters/cheer/contract', { headers: authHeaders });
  const contRes = await handleAgentDevRoute(contReq, env, '/api/agent/characters/cheer/contract', Date.now());
  assert.equal(contRes.status, 200);
  const contData = await contRes.json();
  assert.equal(contData.ok, true);
  assert.equal(contData.contractId, 'cheer-response-v1');
  assert.match(contData.contractHash, /^[a-f0-9]{64}$/);
  assert.equal(contData.contractMarkdown, '# Cheer Response Contract');
});

test('Staging worker forwards agent requests with valid Bearer token without session cookie', async () => {
  const env = {
    STAGING_EMAILS: 'owner@example.com',
    AGENT_DEV_SECRET: TEST_SECRET,
    DB: createMockDb(),
    ASSETS: { fetch: async () => new Response('asset') }
  };

  // Without auth -> 401
  const unauthRes = await stagingWorker.fetch(
    new Request('https://staging.example/api/agent/health'),
    env,
    {}
  );
  assert.equal(unauthRes.status, 401);

  // With Bearer token -> passes through to app
  const originalFetch = app.fetch;
  let reachedApp = false;
  try {
    app.fetch = async () => {
      reachedApp = true;
      return new Response(JSON.stringify({ ok: true, forwarded: true }), {
        headers: { 'content-type': 'application/json' }
      });
    };
    const authRes = await stagingWorker.fetch(
      new Request('https://staging.example/api/agent/health', {
        headers: { Authorization: `Bearer ${TEST_SECRET}` }
      }),
      env,
      {}
    );
    assert.equal(authRes.status, 200);
    assert.equal(reachedApp, true);
  } finally {
    app.fetch = originalFetch;
  }
});
