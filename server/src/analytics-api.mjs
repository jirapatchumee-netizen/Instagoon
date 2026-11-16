import { readBuckets, runHourly, hourBucket, LIFETIME_BUCKET } from './analytics-rollup.mjs';

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY'
};

export const PATHS = {
  overview: '/api/analytics/overview',
  me: '/api/analytics/me',
  run: '/api/analytics/rollup/run'
};

// Metrics the creator tier must never receive. Money per creator is not attributed anywhere yet, so
// beyond the values being absent, asking for them is refused instead of returning a zero a creator
// could read as "you earned nothing".
const CREATOR_ALLOWED = ['creator.turns', 'creator.tokens_in', 'creator.tokens_out', 'creator.cost_satang'];

export function analyticsReady(env) {
  return String(env.ANALYTICS_READ_ENABLED) === 'true' && !!env.ANALYTICS_DB;
}

export function analyticsJson(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: BASE_HEADERS });
}

// The dashboard shares the login cookie with the game because it is a subdomain of the same site, so
// the session is looked up in the same database the numbers come from.
export async function analyticsSession(req, env) {
  const raw = req.headers.get('cookie')?.match(/(?:^|;\s*)frost_session=([^;]+)/)?.[1];
  if (!raw) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const user = await env.ANALYTICS_DB.prepare(
    "SELECT u.id, u.email, COALESCE(c.role, 'player') role FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN user_credentials c ON c.user_id=u.id WHERE s.id=? AND s.expires_at>?"
  ).bind(hash, Date.now()).first();
  return user || null;
}

// A creator token is a bearer credential: the analytics site sends it instead of the game cookie, so
// no session row is written and this plane stays read-only. It only ever resolves to the creator tier.
export async function tokenTier(env, req) {
  const raw = req.headers.get('authorization')?.match(/^Bearer (igs_[0-9a-f]{64})$/)?.[1];
  if (!raw) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const row = await env.ANALYTICS_DB.prepare('SELECT creator_id FROM studio_tokens WHERE token_hash=?').bind(hash).first();
  if (!row) return null;
  return { user: null, admin: false, creatorIds: row.creator_id ? [row.creator_id] : [] };
}

export async function tiersFor(env, user) {
  if (!user) return null;
  const admins = String(env.ANALYTICS_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const admin = user.role === 'admin' || admins.includes(String(user.email || '').toLowerCase());
  // Ownership, not an email list: whoever brokered or launched a character is a creator of that
  // character. cosplay_accounts only exists since launch brokered it, so studio_creators is unioned in
  // to cover characters that are already live.
  const { results = [] } = await env.ANALYTICS_DB.prepare(
    "SELECT creator_id FROM cosplay_accounts WHERE user_id=? UNION SELECT creator_id FROM studio_creators WHERE user_id=? AND status='live'"
  ).bind(user.id, user.id).all();
  const creatorIds = results.map(r => r.creator_id).filter(Boolean);
  if (admin || creatorIds.length) return { user, admin, creatorIds };
  return null;
}

export async function overview(env, { hours = 24 } = {}) {
  const db = env.ANALYTICS_DB;
  const now = Date.now();
  const buckets = [];
  for (let back = 1; back <= hours; back++) buckets.push(hourBucket(now - back * 3600000));
  const rows = await readBuckets(db, [...buckets, LIFETIME_BUCKET]);

  const byBucket = new Map();
  for (const row of rows) {
    if (!byBucket.has(row.bucket)) byBucket.set(row.bucket, {});
    const key = row.subject ? `${row.metric}:${row.subject}` : row.metric;
    byBucket.get(row.bucket)[key] = row.value;
  }

  const lastRun = await db.prepare('SELECT bucket, status, rows_written, finished_at, error FROM analytics_rollup_runs ORDER BY bucket DESC LIMIT 1').first();

  // Per-creator totals come from the same rollup rows already in hand: one extra table scan for a
  // name list would buy nothing, and admin can resolve names in the UI from its own creator list.
  const perCreator = new Map();
  for (const row of rows) {
    if (!row.subject || !row.metric.startsWith('creator.')) continue;
    if (!perCreator.has(row.subject)) perCreator.set(row.subject, { creatorId: row.subject, turns: 0, tokensIn: 0, tokensOut: 0, costSatangEstimate: 0 });
    const entry = perCreator.get(row.subject);
    if (row.metric === 'creator.turns') entry.turns += row.value;
    if (row.metric === 'creator.tokens_in') entry.tokensIn += row.value;
    if (row.metric === 'creator.tokens_out') entry.tokensOut += row.value;
    if (row.metric === 'creator.cost_satang') entry.costSatangEstimate += row.value;
  }

  const lifetime = byBucket.get(LIFETIME_BUCKET) || {};
  return {
    scope: 'admin',
    source: String(env.ANALYTICS_SOURCE || 'production'),
    generatedAt: now,
    meta: {
      costBasis: 'estimated (ai_turn_metrics has no cached-token column; 50% cache hit assumed)',
      revenuePerCreator: 'not_instrumented: creator_financial_ledger has no writer, so no per-creator money is shown anywhere',
      traffic: 'not_connected: Cloudflare Insights/GA is a separate adapter and is not part of these numbers',
      freshness: 'last completed hour, recomputed once by cron',
      lastRun: lastRun || null
    },
    hours: buckets.map(bucket => ({ bucket, metrics: byBucket.get(bucket) || {} })),
    lifetime,
    creators: [...perCreator.values()].sort((a, b) => b.turns - a.turns)
  };
}

export async function creatorView(env, tier, { hours = 24 } = {}) {
  const db = env.ANALYTICS_DB;
  const now = Date.now();
  const buckets = [];
  for (let back = 1; back <= hours; back++) buckets.push(hourBucket(now - back * 3600000));
  const rows = await readBuckets(db, buckets);
  const mine = rows.filter(row => row.subject && tier.creatorIds.includes(row.subject) && CREATOR_ALLOWED.includes(row.metric));

  const byBucket = new Map();
  for (const row of mine) {
    const key = `${row.metric}:${row.subject}`;
    byBucket.set(row.bucket, { ...(byBucket.get(row.bucket) || {}), [key]: row.value });
  }

  return {
    scope: 'creator',
    source: String(env.ANALYTICS_SOURCE || 'production'),
    generatedAt: now,
    creators: tier.creatorIds,
    meta: { money: 'hidden_until_attributed', costBasis: 'estimated (50% cache hit assumed)' },
    hours: buckets.map(bucket => ({ bucket, metrics: byBucket.get(bucket) || {} }))
  };
}

export async function rollupNow(env, { force = false } = {}) {
  const bucket = hourBucket(Date.now() - 3600000);
  return runHourly(env.ANALYTICS_DB, bucket, { force });
}
