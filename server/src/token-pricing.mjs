// Token pricing engine for Instagoon
// Official DeepSeek API pricing: https://api-docs.deepseek.com/quick_start/pricing
// Default exchange rate: 1 USD = 34.50 THB

export const EXCHANGE_RATE_THB = 34.50;

export const MODEL_PRICING = {
  'deepseek-flash': {
    name: 'DeepSeek-Flash',
    inputCacheMissUsdPerM: 0.14,
    inputCacheHitUsdPerM: 0.014,
    outputUsdPerM: 0.28,
  },
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    inputCacheMissUsdPerM: 0.075,
    inputCacheHitUsdPerM: 0.01875,
    outputUsdPerM: 0.30,
  }
};

/**
 * Calculate token cost in USD micros ($0.000001) and THB Satang (0.01 THB).
 */
export function calculateTokenCost({
  promptTokens = 0,
  cachedTokens = 0,
  completionTokens = 0,
  model = 'deepseek-flash',
  exchangeRateThb = EXCHANGE_RATE_THB
} = {}) {
  const p = MODEL_PRICING[model] || MODEL_PRICING['deepseek-flash'];
  const uncachedPrompt = Math.max(0, promptTokens - cachedTokens);
  
  // Cost in USD
  const uncachedCostUsd = (uncachedPrompt * p.inputCacheMissUsdPerM) / 1e6;
  const cachedCostUsd = (cachedTokens * p.inputCacheHitUsdPerM) / 1e6;
  const completionCostUsd = (completionTokens * p.outputUsdPerM) / 1e6;
  const totalCostUsd = uncachedCostUsd + cachedCostUsd + completionCostUsd;

  const costUsdMicros = Math.round(totalCostUsd * 1e6);
  const totalCostThb = totalCostUsd * exchangeRateThb;
  // Satang is integer: round to nearest satang, with ceiling for sub-satang so cost is never underestimated
  const costSatang = totalCostThb > 0 ? Math.max(1, Math.round(totalCostThb * 100)) : 0;

  return {
    model,
    promptTokens,
    cachedTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    totalCostUsd,
    costUsdMicros,
    totalCostThb,
    costSatang,
  };
}

/**
 * Record token usage into D1 ai_token_usage_ledger
 */
export async function recordTokenUsage(env, {
  creatorId,
  userId = null,
  callType = 'dm_turn',
  model = 'deepseek-flash',
  promptTokens = 0,
  cachedTokens = 0,
  completionTokens = 0,
  latencyMs = 0,
  now = Date.now()
}) {
  if (!env?.DB || !creatorId) return null;
  const cost = calculateTokenCost({ promptTokens, cachedTokens, completionTokens, model });
  const id = crypto.randomUUID();

  try {
    await env.DB.prepare(`
      INSERT INTO ai_token_usage_ledger (
        id, creator_id, user_id, call_type, model, 
        prompt_tokens, cached_tokens, completion_tokens, total_tokens, 
        cost_satang, cost_usd_micros, latency_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, creatorId, userId, callType, model,
      promptTokens, cachedTokens, completionTokens, cost.totalTokens,
      cost.costSatang, cost.costUsdMicros, latencyMs, now
    ).run();
  } catch (err) {
    console.error('Failed to insert ai_token_usage_ledger:', err);
  }
  return { id, ...cost };
}

/**
 * Calculate PnL for a creator over a time window or all-time
 */
export async function getCreatorPnL(env, creatorId) {
  if (!env?.DB) return null;

  // 1. Fetch AI Token usage
  const tokenStats = await env.DB.prepare(`
    SELECT 
      COUNT(*) AS total_turns,
      SUM(COALESCE(prompt_tokens, 0)) AS total_prompt_tokens,
      SUM(COALESCE(cached_tokens, 0)) AS total_cached_tokens,
      SUM(COALESCE(completion_tokens, 0)) AS total_completion_tokens,
      SUM(COALESCE(cost_satang, 0)) AS total_ai_cost_satang
    FROM ai_token_usage_ledger
    WHERE creator_id = ?
  `).bind(creatorId).first() || {
    total_turns: 0,
    total_prompt_tokens: 0,
    total_cached_tokens: 0,
    total_completion_tokens: 0,
    total_ai_cost_satang: 0,
  };

  // If no ledger rows exist yet, check ai_turn_metrics as fallback
  let promptTokens = Number(tokenStats.total_prompt_tokens || 0);
  let completionTokens = Number(tokenStats.total_completion_tokens || 0);
  let totalTurns = Number(tokenStats.total_turns || 0);
  let aiCostSatang = Number(tokenStats.total_ai_cost_satang || 0);

  if (totalTurns === 0) {
    const fallback = await env.DB.prepare(`
      SELECT 
        COUNT(*) AS turns,
        SUM(COALESCE(tokens_in, 0)) AS tin,
        SUM(COALESCE(tokens_out, 0)) AS tout
      FROM ai_turn_metrics
      WHERE creator_id = ?
    `).bind(creatorId).first();

    if (fallback && Number(fallback.turns || 0) > 0) {
      totalTurns = Number(fallback.turns);
      promptTokens = Number(fallback.tin || 0);
      completionTokens = Number(fallback.tout || 0);
      const calculated = calculateTokenCost({
        promptTokens,
        cachedTokens: Math.floor(promptTokens * 0.5), // estimate 50% cache hit
        completionTokens,
        model: 'deepseek-flash'
      });
      aiCostSatang = calculated.costSatang;
    }
  }

  // 2. Fetch Creator Financials
  const fin = await env.DB.prepare(`
    SELECT 
      SUM(paid_amount_satang) AS gross_revenue_satang,
      SUM(creator_earning_satang) AS creator_earning_satang,
      SUM(platform_fee_satang) AS platform_fee_satang,
      SUM(CASE WHEN status = 'pending_escrow' THEN creator_earning_satang ELSE 0 END) AS pending_escrow_satang,
      SUM(CASE WHEN status = 'settled' THEN creator_earning_satang ELSE 0 END) AS settled_satang
    FROM creator_financial_ledger
    WHERE receiver_creator_id = ?
  `).bind(creatorId).first() || {};

  const acc = await env.DB.prepare('SELECT rev_share_bps FROM cosplay_accounts WHERE creator_id = ?').bind(creatorId).first();
  const revShareBps = Number(acc?.rev_share_bps || 3000);

  const grossRevenueSatang = Number(fin.gross_revenue_satang || 0);
  const creatorEarningSatang = Number(fin.creator_earning_satang || Math.round(grossRevenueSatang * (revShareBps / 10000)));
  const platformFeeSatang = Number(fin.platform_fee_satang || (grossRevenueSatang - creatorEarningSatang));
  const pendingEscrowSatang = Number(fin.pending_escrow_satang || 0);
  const settledSatang = Number(fin.settled_satang || 0);

  // Platform Net Profit = Platform Fee - Total AI Cost
  const platformNetProfitSatang = platformFeeSatang - aiCostSatang;

  return {
    creatorId,
    model: 'deepseek-flash',
    exchangeRateThb: EXCHANGE_RATE_THB,
    turns: totalTurns,
    tokens: {
      prompt: promptTokens,
      completion: completionTokens,
      total: promptTokens + completionTokens,
    },
    costs: {
      aiCostSatang,
      aiCostThb: Number((aiCostSatang / 100).toFixed(2)),
      aiCostPerTurnThb: totalTurns > 0 ? Number(((aiCostSatang / totalTurns) / 100).toFixed(4)) : 0,
    },
    revenue: {
      creatorCommissionPercent: revShareBps / 100, // 30.00%
      grossRevenueSatang,
      grossRevenueThb: Number((grossRevenueSatang / 100).toFixed(2)),
      creatorEarningSatang,
      creatorEarningThb: Number((creatorEarningSatang / 100).toFixed(2)),
      platformFeeSatang,
      platformFeeThb: Number((platformFeeSatang / 100).toFixed(2)),
      pendingEscrowThb: Number((pendingEscrowSatang / 100).toFixed(2)),
      settledThb: Number((settledSatang / 100).toFixed(2)),
    },
    pnl: {
      platformNetProfitSatang,
      platformNetProfitThb: Number((platformNetProfitSatang / 100).toFixed(2)),
      netMarginPercent: grossRevenueSatang > 0 
        ? Number(((platformNetProfitSatang / grossRevenueSatang) * 100).toFixed(2)) 
        : 0,
    }
  };
}
