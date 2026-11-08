// server/src/agent-dev-api.mjs
// Agent Developer API: Scoped endpoints for AI Agents to evaluate and co-develop character narratives.
// Strict boundary controls:
// 1. Authenticated via AGENT_DEV_SECRET (Bearer token or X-Agent-Secret header) or admin session.
// 2. Scoped strictly to permitted experiment characters (e.g. 'cheer').
// 3. Isolated from user credentials, financial orders, and non-experiment creator data.
import { loadBundle } from './content.mjs';
import { responseContractFor } from './experiment-request.mjs';

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  }
});

const ALLOWED_DEV_CREATORS = new Set(['cheer']);
const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), n => n.toString(16).padStart(2, '0')).join('');
const threadId = (creator, user, key) => hash(JSON.stringify([creator, user, key]));
async function contractSnapshot(definition, requested) {
  const experiment = definition?.chatExperiment;
  let response = null, configurationError = null;
  if (experiment?.responseContract) {
    try { response = responseContractFor(definition, requested); }
    catch (error) { configurationError = error.message; }
  }
  return { mode: experiment?.mode || 'default', model: experiment?.model || null,
    contractId: response?.id || null, contractHash: response?.text ? await hash(response.text) : null,
    contractMarkdown: response?.text || null, biography: definition?.biography || null,
    sourceHash: definition?.biography ? await hash(definition.biography) : null,
    responseVariant: response?.variant || null, responseVariants: response?.available ? response.variants : [],
    playerActionPolicy: response?.playerActionPolicy || null, configurationError };
}
const TRACE_FIELDS = ['experimentKey', 'responseVariant', 'activeMode', 'sourceHash', 'contractVersion', 'contractHash', 'configuredModel', 'resolvedModel', 'generation', 'playerActionPolicy', 'createdAt', 'providerLatencyMs', 'tokensIn', 'tokensOut'];
function safeTrace(raw) {
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const result = Object.fromEntries(TRACE_FIELDS.filter(key => key in value && key !== 'generation').map(key => [key, value[key]]));
    if (value.generation) result.generation = Object.fromEntries(['max_tokens', 'temperature', 'reasoning_effort'].filter(key => key in value.generation).map(key => [key, value.generation[key]]));
    return result;
  } catch { return null; }
}

export function isAuthorizedAgent(req, env) {
  const secret = env.AGENT_SECRET || env.AGENT_DEV_SECRET;
  if (!secret || typeof secret !== 'string' || secret.length < 8) return false;
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const headerSecret = req.headers.get('x-agent-secret')?.trim();
  return bearer === secret || headerSecret === secret;
}

function formatBkkTime(epochMs) {
  if (!epochMs) return null;
  return new Date(epochMs).toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace(' ', 'T') + '+07:00';
}

export async function handleAgentDevRoute(req, env, path, now, user = null) {
  // 1. Verify authentication
  const hasAgentKey = isAuthorizedAgent(req, env);
  const isStagingUser = !!user;

  if (!hasAgentKey && !isStagingUser) {
    return json({ error: 'unauthorized_agent', message: 'Valid Bearer token or X-Agent-Secret required' }, 401);
  }

  // Health check
  if (path === '/api/agent/health' && req.method === 'GET') {
    return json({
      ok: true,
      service: 'instagoon-agent-dev-api',
      version: '1.1.0',
      allowedCreators: Array.from(ALLOWED_DEV_CREATORS),
      time: new Date(now).toISOString()
    });
  }

  // 2. Character-specific routes: /api/agent/characters/:creatorId/...
  const match = path.match(/^\/api\/agent\/characters\/([\w-]+)(?:\/(history|metrics|contract))?$/);
  if (!match) {
    return json({ error: 'not_found' }, 404);
  }

  const creatorId = match[1].toLowerCase();
  const subRoute = match[2] || 'history';

  // Strict scope check
  if (!ALLOWED_DEV_CREATORS.has(creatorId)) {
    return json({
      error: 'creator_not_in_dev_scope',
      message: `Creator '${creatorId}' is not authorized for external agent developer access.`
    }, 403);
  }

  const url = new URL(req.url);

  // Endpoint: GET /api/agent/characters/:creatorId/contract
  if (subRoute === 'contract' && req.method === 'GET') {
    const row = await env.DB.prepare('SELECT definition_json FROM npc_definitions WHERE creator_id=?').bind(creatorId).first();
    let definition;
    try { definition = JSON.parse(row?.definition_json || 'null'); } catch {}

    const requested = url.searchParams.get('responseVariant') ?? undefined;
    if (requested !== undefined && !['baseline', 'contract', 'contract-v1'].includes(requested)) return json({ error: 'invalid_response_variant' }, 400);
    const current = await contractSnapshot(definition, requested);
    // Read-only: report drift rather than seeding/updating D1 from an agent GET.
    const bundle = env.ASSETS ? await loadBundle(env) : null;
    const deployedDefinition = bundle?.creators?.find(c => c.id === creatorId)?.definition;
    const deployed = deployedDefinition ? await contractSnapshot(deployedDefinition, requested) : null;
    return json({
      ok: true,
      creatorId,
      ...current,
      definitionSource: 'database',
      deployedBundleVersion: bundle?.version || null,
      deployed,
      matchesDeployed: deployed ? ['mode', 'model', 'sourceHash', 'contractHash', 'responseVariant'].every(key => current[key] === deployed[key]) : null
    });
  }

  // Endpoint: GET /api/agent/characters/:creatorId/metrics
  if (subRoute === 'metrics' && req.method === 'GET') {
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 200);
    const rows = (await env.DB.prepare(`
      SELECT id, user_id, visit_id, outcome, model, latency_ms, tokens_in, tokens_out, created_at
      FROM ai_turn_metrics
      WHERE creator_id=?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(creatorId, limit).all()).results || [];

    return json({
      ok: true,
      creatorId,
      count: rows.length,
      metrics: await Promise.all(rows.map(async r => ({
        id: r.id,
        visitId: r.visit_id,
        threadId: await threadId(creatorId, r.user_id, r.visit_id),
        outcome: r.outcome,
        model: r.model,
        latencyMs: r.latency_ms,
        tokensIn: r.tokens_in,
        tokensOut: r.tokens_out,
        createdAt: r.created_at,
        timeBkk: formatBkkTime(r.created_at)
      })))
    });
  }

  // Endpoint: GET /api/agent/characters/:creatorId/history
  if (subRoute === 'history' && req.method === 'GET') {
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), 500);
    const experimentKeyFilter = url.searchParams.get('experimentKey');
    const hasTraces = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='experiment_chat_traces'").bind().first();

    let query = `
      SELECT m.id, m.user_id, m.experiment_key, m.role, m.content, m.created_at,
             d.presentation_json, ${hasTraces ? 'x.metadata_json' : 'NULL'} AS trace_json
      FROM experiment_chat_messages m
      LEFT JOIN experiment_chat_displays d ON d.message_id = m.id
      ${hasTraces ? 'LEFT JOIN experiment_chat_traces x ON x.message_id = m.id' : ''}
      WHERE m.creator_id = ?
    `;
    const params = [creatorId];

    if (experimentKeyFilter) {
      query += ' AND m.experiment_key = ?';
      params.push(experimentKeyFilter);
    }

    query += ' ORDER BY m.created_at DESC, m.id DESC LIMIT ?';
    params.push(limit);

    const rows = (await env.DB.prepare(query).bind(...params).all()).results || [];
    rows.sort((a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id));

    // Experiment keys are shared across players; never combine their conversations.
    const threadsMap = new Map();
    for (const r of rows) {
      const key = JSON.stringify([r.user_id, r.experiment_key]);
      if (!threadsMap.has(key)) {
        threadsMap.set(key, {
          experimentKey: r.experiment_key,
          threadId: await threadId(creatorId, r.user_id, r.experiment_key),
          firstTurnAt: r.created_at,
          lastTurnAt: r.created_at,
          turns: []
        });
      }
      const t = threadsMap.get(key);
      t.lastTurnAt = r.created_at;

      let scene = null;
      if (r.presentation_json) {
        try { scene = JSON.parse(r.presentation_json); } catch {}
      } else if (r.role === 'assistant') {
        try { scene = JSON.parse(r.content); } catch {}
      }

      t.turns.push({
        id: r.id,
        role: r.role,
        createdAt: r.created_at,
        timeBkk: formatBkkTime(r.created_at),
        rawContent: r.content,
        trace: safeTrace(r.trace_json),
        scene: scene ? {
          location: scene.location || null,
          innerThought: scene.innerThought || null,
          beats: scene.beats || []
        } : null
      });
    }

    const threads = Array.from(threadsMap.values()).map(t => ({
      ...t,
      firstTurnTimeBkk: formatBkkTime(t.firstTurnAt),
      lastTurnTimeBkk: formatBkkTime(t.lastTurnAt),
      totalTurns: t.turns.length
    })).sort((a, b) => b.lastTurnAt - a.lastTurnAt);

    return json({
      ok: true,
      creatorId,
      totalMessages: rows.length,
      totalThreads: threads.length,
      threads
    });
  }

  return json({ error: 'not_found' }, 404);
}
