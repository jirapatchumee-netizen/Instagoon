import { getCreatorPnL, MODEL_PRICING, EXCHANGE_RATE_THB } from './token-pricing.mjs';

export const ANALYTICS_PATH = '/api/analytics/cosplay';

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer'
};

export function analyticsJson(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...extra } });
}

// Fail closed: no flag and no ANALYTICS_DB binding means this worker answers 503, not partial data.
export function analyticsReady(env) {
  return String(env.ANALYTICS_READ_ENABLED) === 'true' && !!env.ANALYTICS_DB;
}

export async function analyticsReader(req, env) {
  const raw = req.headers.get('cookie')?.match(/(?:^|;\s*)frost_session=([^;]+)/)?.[1];
  const allow = String(env.ANALYTICS_EMAILS || '');
  if (!raw || !allow) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const row = await env.ANALYTICS_DB.prepare('SELECT u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?').bind(hash, Date.now()).first();
  const email = String(row?.email || '').toLowerCase();
  if (!email) return null;
  return allow.split(',').some(entry => entry.trim().toLowerCase() === email) ? { email } : null;
}

export async function cosplayAnalytics(env) {
  const limit = Number(env.ANALYTICS_MAX_CREATORS) > 0 ? Number(env.ANALYTICS_MAX_CREATORS) : 200;
  const { results = [] } = await env.ANALYTICS_DB.prepare(
    "SELECT ca.creator_id, ca.rev_share_bps, c.name FROM cosplay_accounts ca JOIN creators c ON c.id=ca.creator_id WHERE ca.account_status='active' ORDER BY ca.created_at, ca.creator_id LIMIT ?"
  ).bind(limit).all();

  const db = { DB: env.ANALYTICS_DB };
  const creators = [];
  for (const row of results) {
    const pnl = await getCreatorPnL(db, row.creator_id);
    if (pnl) creators.push({ name: row.name, ...pnl });
  }

  const totals = creators.reduce((sum, c) => {
    sum.turns += c.turns;
    sum.tokens += c.tokens.total;
    sum.aiCostSatang += c.costs.aiCostSatang;
    sum.grossRevenueSatang += c.revenue.grossRevenueSatang;
    sum.creatorEarningSatang += c.revenue.creatorEarningSatang;
    sum.platformFeeSatang += c.revenue.platformFeeSatang;
    sum.platformNetProfitSatang += c.pnl.platformNetProfitSatang;
    return sum;
  }, { turns: 0, tokens: 0, aiCostSatang: 0, grossRevenueSatang: 0, creatorEarningSatang: 0, platformFeeSatang: 0, platformNetProfitSatang: 0 });

  const thb = satang => Number((satang / 100).toFixed(2));
  return {
    scope: 'read-only',
    source: String(env.ANALYTICS_SOURCE || 'unlabelled'),
    generatedAt: Date.now(),
    modelPricing: { activeModel: 'deepseek-flash', exchangeRateThb: EXCHANGE_RATE_THB, pricing: MODEL_PRICING },
    totals: { creators: creators.length, ...totals, aiCostThb: thb(totals.aiCostSatang), grossRevenueThb: thb(totals.grossRevenueSatang), platformNetProfitThb: thb(totals.platformNetProfitSatang) },
    creators
  };
}
