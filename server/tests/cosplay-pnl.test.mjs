import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { calculateTokenCost, recordTokenUsage, getCreatorPnL, MODEL_PRICING, EXCHANGE_RATE_THB } from '../src/token-pricing.mjs';
import analyticsWorker from '../src/analytics.mjs';

function createTestDb() {
  const db = new DatabaseSync(':memory:');
  const dir = new URL('../migrations/', import.meta.url);
  for (const name of readdirSync(dir).sort()) {
    if (name.endsWith('.sql')) {
      db.exec(readFileSync(new URL(name, dir), 'utf8'));
    }
  }

  // Cloudflare D1 compatibility shim
  return {
    raw: db,
    prepare(query) {
      return {
        bind(...params) {
          return {
            async first() {
              const stmt = db.prepare(query);
              return stmt.get(...params);
            },
            async all() {
              const stmt = db.prepare(query);
              return { results: stmt.all(...params) };
            },
            async run() {
              const stmt = db.prepare(query);
              const info = stmt.run(...params);
              return { meta: { changes: info.changes } };
            }
          };
        },
        async first() {
          const stmt = db.prepare(query);
          return stmt.get();
        },
        async all() {
          const stmt = db.prepare(query);
          return { results: stmt.all() };
        },
        async run() {
          const stmt = db.prepare(query);
          const info = stmt.run();
          return { meta: { changes: info.changes } };
        }
      };
    },
    async batch(stmts) {
      const results = [];
      for (const s of stmts) {
        results.push(await s.run());
      }
      return results;
    }
  };
}

test('DeepSeek-Flash token cost calculation matches official pricing in THB satang', () => {
  // Official DeepSeek-Flash:
  // Input cache miss: $0.14 / 1M
  // Input cache hit: $0.014 / 1M
  // Output: $0.28 / 1M
  // Exchange rate: 34.50 THB

  const promptTokens = 1500;
  const cachedTokens = 800; // 800 hit, 700 miss
  const completionTokens = 120;

  const cost = calculateTokenCost({
    promptTokens,
    cachedTokens,
    completionTokens,
    model: 'deepseek-flash',
    exchangeRateThb: EXCHANGE_RATE_THB
  });

  assert.equal(cost.model, 'deepseek-flash');
  assert.equal(cost.promptTokens, 1500);
  assert.equal(cost.cachedTokens, 800);
  assert.equal(cost.completionTokens, 120);
  assert.equal(cost.totalTokens, 1620);

  // Uncached USD: (700 * 0.14) / 1e6 = 0.000098
  // Cached USD: (800 * 0.014) / 1e6 = 0.0000112
  // Output USD: (120 * 0.28) / 1e6 = 0.0000336
  // Total USD: 0.0001428 ($142.8 micro-USD)
  assert.equal(cost.costUsdMicros, 143);
  // Total THB: 0.0001428 * 34.50 = 0.0049266 THB (~0.49 satang)
  // Rounded satang is at least 1 satang
  assert.equal(cost.costSatang, 1);
});

test('1 Account can create only 1 Character (Strict 1:1 Cosplay Account Constraint in D1)', async () => {
  const d1 = createTestDb();
  const userId = 'usr_cosplayer_01';
  const creator1 = 'crt_yuki';
  const creator2 = 'crt_mira_clone';

  // Seed user and creators
  d1.raw.prepare("INSERT INTO users(id, email, google_id, created_at) VALUES (?, 'yuki@example.com', 'g_yuki', 1000)").run(userId);
  d1.raw.prepare("INSERT INTO creators(id, name, bio) VALUES (?, 'Yuki Cosplay', 'Bio 1')").run(creator1);
  d1.raw.prepare("INSERT INTO creators(id, name, bio) VALUES (?, 'Mira Clone', 'Bio 2')").run(creator2);

  // 1. Create first character binding -> MUST SUCCEED
  await d1.prepare(`
    INSERT INTO cosplay_accounts (id, user_id, creator_id, account_status, rev_share_bps, created_at, updated_at)
    VALUES (?, ?, ?, 'active', 3000, 1000, 1000)
  `).bind('acc_01', userId, creator1).run();

  const bound = await d1.prepare("SELECT * FROM cosplay_accounts WHERE user_id = ?").bind(userId).first();
  assert.equal(bound.creator_id, creator1);

  // 2. Attempt to create SECOND character for the SAME user -> MUST FAIL at DB constraint level
  assert.throws(() => {
    d1.raw.prepare(`
      INSERT INTO cosplay_accounts (id, user_id, creator_id, account_status, rev_share_bps, created_at, updated_at)
      VALUES (?, ?, ?, 'active', 3000, 2000, 2000)
    `).run('acc_02', userId, creator2);
  }, /UNIQUE constraint failed: cosplay_accounts\.user_id/);
});

test('Token usage ledger records sub-turn calls and calculates creator PnL', async () => {
  const d1 = createTestDb();
  const env = { DB: d1 };
  const creatorId = 'crt_yuki';
  const userId = 'usr_fan_01';

  d1.raw.prepare("INSERT INTO users(id, email, google_id, created_at) VALUES (?, 'fan@example.com', 'g_fan', 1000)").run(userId);
  d1.raw.prepare("INSERT INTO creators(id, name, bio) VALUES (?, 'Yuki', 'Bio')").run(creatorId);

  // Record 10 turns of AI usage
  for (let i = 0; i < 10; i++) {
    await recordTokenUsage(env, {
      creatorId,
      userId,
      callType: 'dm_turn',
      model: 'deepseek-flash',
      promptTokens: 1500,
      cachedTokens: 800,
      completionTokens: 120,
      latencyMs: 450,
      now: 1000 + i * 60000
    });
  }

  // Simulate revenue from fans: 500.00 THB = 50,000 satang
  // Creator Commission (30%) = 15,000 satang
  // Platform Fee (70%) = 35,000 satang
  await d1.prepare(`
    INSERT INTO creator_financial_ledger (
      id, receiver_creator_id, sender_user_id, source_type,
      paid_amount_satang, creator_earning_satang, platform_fee_satang,
      status, escrow_release_at, created_at
    ) VALUES (?, ?, ?, 'gift', 50000, 15000, 35000, 'pending_escrow', 200000, 1000)
  `).bind('fin_01', creatorId, userId).run();

  const pnl = await getCreatorPnL(env, creatorId);

  assert.equal(pnl.creatorId, creatorId);
  assert.equal(pnl.model, 'deepseek-flash');
  assert.equal(pnl.turns, 10);
  assert.equal(pnl.tokens.prompt, 15000);
  assert.equal(pnl.tokens.completion, 1200);
  assert.equal(pnl.revenue.grossRevenueThb, 500);
  assert.equal(pnl.revenue.creatorEarningThb, 150);
  assert.equal(pnl.revenue.platformFeeThb, 350);
  assert.ok(pnl.costs.aiCostThb > 0);
  // Platform Net Profit = Platform Fee (350 THB) - AI Cost (~0.10 THB)
  assert.ok(pnl.pnl.platformNetProfitThb > 349);
});

// The read plane is its own Worker bound to the staging database; the staging wrapper no longer
// serves PnL. analytics-plane-isolation.test.mjs holds both directions of that promise.
test('Analytics read plane returns DeepSeek-Flash PnL for an allowlisted staging session', async () => {
  const d1 = createTestDb();
  const creatorId = 'crt_test';
  const token = 'valid_test_token';
  const sessionId = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))),
    n => n.toString(16).padStart(2, '0')
  ).join('');

  d1.raw.prepare('INSERT INTO users(id, email, google_id, created_at) VALUES (?, ?, ?, 1000)').run('usr_test', 'admin@instagoon.com', 'g_test');
  d1.raw.prepare("INSERT INTO creators(id, name, bio) VALUES (?, 'Test Creator', 'Bio')").run(creatorId);
  d1.raw.prepare('INSERT INTO cosplay_accounts(id, user_id, creator_id, account_status, rev_share_bps, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('acc_test', 'usr_test', creatorId, 'active', 3000, 1000, 1000);
  d1.raw.prepare('INSERT INTO sessions(id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, 'usr_test', Date.now() + 60000);

  const env = {
    ANALYTICS_DB: d1,
    ANALYTICS_READ_ENABLED: 'true',
    ANALYTICS_EMAILS: 'admin@instagoon.com',
    ANALYTICS_SOURCE: 'instagoon-staging'
  };

  const req = new Request('https://analytics-staging.instagoon.local/api/analytics/cosplay', {
    headers: { cookie: `frost_session=${token}` }
  });

  const res = await analyticsWorker.fetch(req, env, {});
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.scope, 'read-only');
  assert.equal(data.source, 'instagoon-staging');
  assert.equal(data.modelPricing.activeModel, 'deepseek-flash');
  assert.equal(data.modelPricing.exchangeRateThb, 34.50);
  assert.ok(Array.isArray(data.creators));
  assert.equal(data.creators.length, 1);
  assert.equal(data.creators[0].creatorId, creatorId);
});
