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

// Only a launched or bound character belongs in a creator PnL report; the git-driven static canon would
// otherwise show up as rows that look like zero-sales creators.
const CREATORS_SQL = `SELECT c.id creator_id, c.name, c.avatar_key, ca.user_id, ca.account_status, ca.rev_share_bps,
  ca.created_at bound_at, u.email user_email
  FROM creators c
  LEFT JOIN cosplay_accounts ca ON ca.creator_id=c.id
  LEFT JOIN users u ON u.id=ca.user_id
  LEFT JOIN studio_creators sc ON sc.creator_id=c.id
  WHERE ca.id IS NOT NULL OR sc.status='live'
  ORDER BY c.id LIMIT ?`;

export async function cosplayAnalytics(env) {
  const limit = Number(env.ANALYTICS_MAX_CREATORS) > 0 ? Number(env.ANALYTICS_MAX_CREATORS) : 200;
  const db = { DB: env.ANALYTICS_DB };
  const { results = [] } = await env.ANALYTICS_DB.prepare(CREATORS_SQL).bind(limit).all();

  const { results: perUser = [] } = await env.ANALYTICS_DB.prepare(
    'SELECT user_id, COUNT(*) n FROM cosplay_accounts GROUP BY user_id'
  ).all();
  const charactersPerAccount = new Map(perUser.map(row => [row.user_id, Number(row.n || 0)]));

  const creators = [];
  for (const row of results) {
    const pnl = await getCreatorPnL(db, row.creator_id);
    if (!pnl) continue;
    creators.push({
      creatorId: row.creator_id,
      name: row.name,
      avatarKey: row.avatar_key || null,
      cosplayAccount: row.user_id ? {
        userId: row.user_id,
        userEmail: row.user_email || null,
        accountStatus: row.account_status,
        revShareBps: Number(row.rev_share_bps || 3000),
        boundAt: Number(row.bound_at || 0),
        oneAccountOneCharacterEnforced: charactersPerAccount.get(row.user_id) === 1
      } : null,
      ...pnl
    });
  }

  const sum = fn => creators.reduce((total, c) => total + fn(c), 0);
  const grossRevenueSatang = sum(c => c.revenue.grossRevenueSatang);
  const creatorPayoutSatang = sum(c => c.revenue.creatorEarningSatang);
  const platformNetProfitSatang = sum(c => c.pnl.platformNetProfitSatang);
  const aiCostSatang = sum(c => c.costs.aiCostSatang);
  const totalTurns = sum(c => c.turns);
  const promptTokens = sum(c => c.tokens.prompt);
  const completionTokens = sum(c => c.tokens.completion);
  const thb = satang => Number((satang / 100).toFixed(2));

  // Nothing writes creator_financial_ledger yet, so a zero here means "not measured", not "no sales".
  const ledgerRows = Number((await env.ANALYTICS_DB.prepare('SELECT COUNT(*) n FROM creator_financial_ledger').first())?.n || 0);

  return {
    mode: String(env.ANALYTICS_MODE || 'staging'),
    source: String(env.ANALYTICS_SOURCE || 'unlabelled'),
    generatedAt: Date.now(),
    revenueInstrumented: ledgerRows > 0,
    modelPricing: { activeModel: 'deepseek-flash', exchangeRateThb: EXCHANGE_RATE_THB, rates: MODEL_PRICING['deepseek-flash'] },
    overview: {
      totalCreators: creators.length,
      boundCosplayAccounts: creators.filter(c => c.cosplayAccount).length,
      totalTurns,
      tokens: { prompt: promptTokens, completion: completionTokens, total: promptTokens + completionTokens },
      costs: {
        aiCostSatang,
        aiCostThb: thb(aiCostSatang),
        avgCostPerTurnThb: totalTurns > 0 ? Number(((aiCostSatang / totalTurns) / 100).toFixed(4)) : 0
      },
      revenue: {
        grossRevenueSatang,
        grossRevenueThb: thb(grossRevenueSatang),
        creatorPayoutSatang,
        creatorPayoutThb: thb(creatorPayoutSatang),
        platformNetProfitSatang,
        platformNetProfitThb: thb(platformNetProfitSatang),
        netMarginPercent: grossRevenueSatang > 0 ? Number(((platformNetProfitSatang / grossRevenueSatang) * 100).toFixed(2)) : 0
      }
    },
    creators
  };
}
