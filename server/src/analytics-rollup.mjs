import { calculateTokenCost } from './token-pricing.mjs';

export const LIFETIME_BUCKET = 'lifetime';

// Each query returns (subject, value) rows for one metric key, so a new metric is a row in this list
// rather than a new table. Every windowed query filters on a real timestamp column; tables without a
// timestamp (likes, relationships) can only ever be lifetime totals and are labelled that way.
export const WINDOW_METRICS = [
  { metric: 'players.new', sql: "SELECT '' subject, COUNT(*) value FROM users WHERE created_at >= ? AND created_at < ?" },
  { metric: 'players.active', sql: "SELECT '' subject, COUNT(DISTINCT user_id) value FROM activity WHERE created_at >= ? AND created_at < ?" },
  { metric: 'activity.', sql: 'SELECT kind subject, COUNT(*) value FROM activity WHERE created_at >= ? AND created_at < ? GROUP BY kind' },
  { metric: 'ai.turns', sql: "SELECT '' subject, COUNT(*) value FROM ai_turn_metrics WHERE created_at >= ? AND created_at < ?" },
  { metric: 'ai.outcome.', sql: 'SELECT outcome subject, COUNT(*) value FROM ai_turn_metrics WHERE created_at >= ? AND created_at < ? GROUP BY outcome' },
  { metric: 'ai.tokens_in', sql: "SELECT '' subject, SUM(COALESCE(tokens_in,0)) value FROM ai_turn_metrics WHERE created_at >= ? AND created_at < ?" },
  { metric: 'ai.tokens_out', sql: "SELECT '' subject, SUM(COALESCE(tokens_out,0)) value FROM ai_turn_metrics WHERE created_at >= ? AND created_at < ?" },
  { metric: 'ai.latency_ms', sql: "SELECT '' subject, AVG(latency_ms) value FROM ai_turn_metrics WHERE created_at >= ? AND created_at < ? AND latency_ms IS NOT NULL" },
  { metric: 'ai.fallback', sql: "SELECT '' subject, SUM(fallback_count) value FROM ai_turn_metrics WHERE created_at >= ? AND created_at < ?" },
  { metric: 'unlocks.episodes', sql: "SELECT '' subject, COUNT(*) value FROM episode_unlocks WHERE unlocked_at >= ? AND unlocked_at < ?" },
  { metric: 'unlocks.rewards', sql: "SELECT '' subject, COUNT(*) value FROM reward_unlocks WHERE unlocked_at >= ? AND unlocked_at < ?" },
  { metric: 'engagement.story_views', sql: "SELECT '' subject, COUNT(*) value FROM story_views WHERE first_viewed_at >= ? AND first_viewed_at < ?" },
  { metric: 'engagement.comments', sql: "SELECT '' subject, COUNT(*) value FROM comments WHERE created_at >= ? AND created_at < ?" },
  { metric: 'engagement.reports', sql: "SELECT '' subject, COUNT(*) value FROM reports WHERE created_at >= ? AND created_at < ?" },
  // Money that arrived. Per-creator attribution does not exist yet (nothing writes creator_financial_ledger),
  // so these stay site-level and are never handed to the creator tier.
  { metric: 'money.orders_paid', sql: "SELECT '' subject, COUNT(*) value FROM orders WHERE status='paid' AND paid_at >= ? AND paid_at < ?" },
  { metric: 'money.orders_paid_satang', sql: "SELECT '' subject, SUM(amount_satang) value FROM orders WHERE status='paid' AND paid_at >= ? AND paid_at < ?" },
  { metric: 'money.deposits_satang', sql: "SELECT '' subject, SUM(amount_satang) value FROM bank_deposits WHERE deposited_at >= ? AND deposited_at < ?" },
  { metric: 'money.energy_granted', sql: "SELECT '' subject, SUM(energy) value FROM orders WHERE status='paid' AND paid_at >= ? AND paid_at < ?" },
  // Per creator, subject = creator_id. This is what the creator tier is allowed to read about itself.
  { metric: 'creator.turns', sql: 'SELECT creator_id subject, COUNT(*) value FROM ai_turn_metrics WHERE created_at >= ? AND created_at < ? GROUP BY creator_id' },
  { metric: 'creator.tokens_in', sql: 'SELECT creator_id subject, SUM(COALESCE(tokens_in,0)) value FROM ai_turn_metrics WHERE created_at >= ? AND created_at < ? GROUP BY creator_id' },
  { metric: 'creator.tokens_out', sql: 'SELECT creator_id subject, SUM(COALESCE(tokens_out,0)) value FROM ai_turn_metrics WHERE created_at >= ? AND created_at < ? GROUP BY creator_id' }
];

export const LIFETIME_METRICS = [
  { metric: 'users.total', sql: "SELECT '' subject, COUNT(*) value FROM users" },
  { metric: 'creators.total', sql: "SELECT '' subject, COUNT(*) value FROM creators" },
  { metric: 'posts.total', sql: "SELECT '' subject, COUNT(*) value FROM posts" },
  { metric: 'stories.total', sql: "SELECT '' subject, COUNT(*) value FROM stories" },
  // likes and relationships have no timestamp column at all, so an hourly count is impossible:
  // reporting them as lifetime is the only honest option until the schema keeps a created_at.
  { metric: 'likes.total', sql: "SELECT '' subject, COUNT(*) value FROM likes" },
  { metric: 'relationships.total', sql: "SELECT '' subject, COUNT(*) value FROM relationships" },
  { metric: 'cosplay_accounts.bound', sql: "SELECT '' subject, COUNT(*) value FROM cosplay_accounts" },
  { metric: 'money.orders_lifetime_paid_satang', sql: "SELECT '' subject, SUM(amount_satang) value FROM orders WHERE status='paid'" }
];

export const hourBucket = ms => `${new Date(ms).toISOString().slice(0, 13)}:00Z`;
export const bucketWindow = bucket => {
  const start = Date.parse(bucket);
  return [start, start + 3600000];
};

// Cost is not a SUM of stored satang because ai_turn_metrics only keeps token counts. Cached input is
// estimated at 50% (the figure the existing PnL fallback already used) and is labelled as an estimate
// in the payload rather than passed off as a billed number.
const estimatedCostSatang = (tokensIn, tokensOut) =>
  calculateTokenCost({ promptTokens: tokensIn, cachedTokens: Math.floor(tokensIn * 0.5), completionTokens: tokensOut }).costSatang;

export async function computeHourly(db, bucket) {
  const [start, end] = bucketWindow(bucket);
  const now = Date.now();
  const rows = [];
  const push = (metric, subject, value, at = bucket) => {
    const number = Number(value || 0);
    if (Number.isFinite(number)) rows.push({ bucket: at, metric, subject: String(subject || ''), value: number, computed_at: now });
  };

  for (const { metric, sql } of WINDOW_METRICS) {
    const { results = [] } = await db.prepare(sql).bind(start, end).all();
    for (const row of results) {
      const split = metric === 'activity.' || metric === 'ai.outcome.';
      push(split ? metric + row.subject : metric, split ? '' : row.subject, row.value);
    }
  }

  const { results: costByCreator = [] } = await db.prepare(
    'SELECT creator_id, SUM(COALESCE(tokens_in,0)) tin, SUM(COALESCE(tokens_out,0)) tout FROM ai_turn_metrics WHERE created_at >= ? AND created_at < ? GROUP BY creator_id'
  ).bind(start, end).all();
  for (const row of costByCreator) push('creator.cost_satang', row.creator_id, estimatedCostSatang(row.tin, row.tout));
  const totals = costByCreator.reduce((s, r) => s + estimatedCostSatang(r.tin, r.tout), 0);
  push('ai.cost_satang_estimate', '', totals);

  for (const { metric, sql } of LIFETIME_METRICS) {
    const row = await db.prepare(sql).first();
    push(metric, '', row?.value, LIFETIME_BUCKET);
  }

  return rows;
}

// Rerunning an hour replaces its rows instead of adding them, and an 'ok' bucket is left alone so the
// cron costs nothing after the first pass.
export async function runHourly(db, bucket, { force = false } = {}) {
  const existing = await db.prepare('SELECT status FROM analytics_rollup_runs WHERE bucket=?').bind(bucket).first();
  if (existing?.status === 'ok' && !force) return { bucket, skipped: true, rowsWritten: 0 };

  const started = Date.now();
  await db.prepare('INSERT INTO analytics_rollup_runs(bucket, started_at, status) VALUES(?,?,\'running\') ON CONFLICT(bucket) DO UPDATE SET started_at=excluded.started_at, status=\'running\', error=NULL, finished_at=NULL').bind(bucket, started).run();

  try {
    const rows = await computeHourly(db, bucket);
    await db.batch(rows.map(r => db.prepare(
      'INSERT INTO analytics_rollup(bucket, metric, subject, value, computed_at) VALUES(?,?,?,?,?) ON CONFLICT(bucket, metric, subject) DO UPDATE SET value=excluded.value, computed_at=excluded.computed_at'
    ).bind(r.bucket, r.metric, r.subject, r.value, r.computed_at)));
    await db.prepare('UPDATE analytics_rollup_runs SET status=\'ok\', finished_at=?, rows_written=? WHERE bucket=?').bind(Date.now(), rows.length, bucket).run();
    return { bucket, skipped: false, rowsWritten: rows.length };
  } catch (error) {
    await db.prepare('UPDATE analytics_rollup_runs SET status=\'failed\', finished_at=?, error=? WHERE bucket=?').bind(Date.now(), String(error?.message || error).slice(0, 400), bucket).run();
    throw error;
  }
}

export async function readBuckets(db, buckets) {
  if (!buckets.length) return [];
  const marks = buckets.map(() => '?').join(',');
  const { results = [] } = await db.prepare(`SELECT bucket, metric, subject, value, computed_at FROM analytics_rollup WHERE bucket IN (${marks})`).bind(...buckets).all();
  return results;
}
