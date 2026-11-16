import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTestDb } from './helpers/test-db.mjs';
import analyticsWorker from '../src/analytics.mjs';
import app from '../src/index.mjs';

const TOKEN = 'analytics-plane-session-token';
const READER = 'analyst@instagoon.com';
const ANALYTICS_URL = 'https://analytics-staging.instagoon.app/api/analytics/cosplay';

const sha256 = async value => Array.from(
  new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
  n => n.toString(16).padStart(2, '0')
).join('');

// Stands in for the staging database the read plane is bound to. One Cosplay Creator launched by a
// person (10 turns of DeepSeek-Flash, one settled 500 THB payment) and one live character that was
// never brokered, which is exactly what a PnL report must tell apart.
async function seedStagingDb(email = READER) {
  const db = createTestDb();
  db.raw.prepare('INSERT INTO users(id, email, google_id, created_at) VALUES (?, ?, ?, 1000)').run('usr_analyst', email, 'g_analyst');
  db.raw.prepare("INSERT INTO creators(id, name, bio) VALUES ('crt_yuki', 'Yuki Cosplay', 'Bio')").run();
  db.raw.prepare("INSERT INTO creators(id, name, bio) VALUES ('crt_unbound', 'Unbound Cosplay', 'Bio')").run();
  db.raw.prepare('INSERT INTO cosplay_accounts(id, user_id, creator_id, account_status, rev_share_bps, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('acc_01', 'usr_analyst', 'crt_yuki', 'active', 3000, 1000, 1000);
  db.raw.prepare('INSERT INTO studio_creators(user_id, creator_id, draft_json, status, launched_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('usr_analyst', 'crt_yuki', '{}', 'live', 1000, 1000);
  db.raw.prepare('INSERT INTO users(id, email, google_id, created_at) VALUES (?, ?, ?, 1000)').run('usr_unbound', 'unbound@instagoon.local', 'g_unbound');
  db.raw.prepare('INSERT INTO studio_creators(user_id, creator_id, draft_json, status, launched_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('usr_unbound', 'crt_unbound', '{}', 'live', 1000, 1000);
  db.raw.prepare('INSERT INTO sessions(id, user_id, expires_at) VALUES (?, ?, ?)')
    .run(await sha256(TOKEN), 'usr_analyst', Date.now() + 60000);
  for (let turn = 0; turn < 10; turn++) {
    db.raw.prepare('INSERT INTO ai_token_usage_ledger(id, creator_id, user_id, call_type, model, prompt_tokens, cached_tokens, completion_tokens, total_tokens, cost_satang, cost_usd_micros, latency_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(`led_${turn}`, 'crt_yuki', 'usr_analyst', 'dm_turn', 'deepseek-flash', 1500, 750, 120, 1620, 1, 143, 400, 2000 + turn);
  }
  db.raw.prepare('INSERT INTO creator_financial_ledger(id, receiver_creator_id, sender_user_id, source_type, paid_amount_satang, creator_earning_satang, platform_fee_satang, status, escrow_release_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('fin_01', 'crt_yuki', 'usr_analyst', 'chat_topup', 50000, 15000, 35000, 'settled', 3000, 2000);
  return db;
}

const request = (url = ANALYTICS_URL, cookie = TOKEN, method = 'GET', headers = {}) => new Request(url, {
  method,
  headers: { ...(cookie ? { cookie: `frost_session=${cookie}` } : {}), ...headers }
});

const analyticsEnv = (db, overrides = {}) => ({
  ANALYTICS_DB: db,
  ANALYTICS_READ_ENABLED: 'true',
  ANALYTICS_EMAILS: READER,
  ANALYTICS_MODE: 'staging',
  ANALYTICS_SOURCE: 'instagoon-staging',
  ...overrides
});

test('read plane serves the dashboard payload for an allowlisted reader', async () => {
  const response = await analyticsWorker.fetch(request(), analyticsEnv(await seedStagingDb()), {});
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.mode, 'staging');
  assert.equal(data.source, 'instagoon-staging');
  assert.equal(data.revenueInstrumented, true);
  assert.equal(data.modelPricing.activeModel, 'deepseek-flash');
  assert.equal(data.modelPricing.exchangeRateThb, 34.5);
  assert.equal(data.modelPricing.rates.inputCacheMissUsdPerM, 0.14);
  assert.equal(data.overview.totalCreators, 2);
  assert.equal(data.overview.boundCosplayAccounts, 1);
  assert.equal(data.overview.revenue.grossRevenueSatang, 50000);
  assert.equal(data.overview.revenue.grossRevenueThb, 500);

  const yuki = data.creators.find(c => c.creatorId === 'crt_yuki');
  assert.equal(yuki.turns, 10);
  assert.equal(yuki.revenue.platformFeeThb, 350);
  assert.ok(yuki.pnl.platformNetProfitThb > 349);
  assert.equal(yuki.cosplayAccount.userId, 'usr_analyst');
  assert.equal(yuki.cosplayAccount.userEmail, READER);
  assert.equal(yuki.cosplayAccount.oneAccountOneCharacterEnforced, true);

  const unbound = data.creators.find(c => c.creatorId === 'crt_unbound');
  assert.equal(unbound.cosplayAccount, null, 'a live character nobody brokered stays visible as unbound');
  assert.equal(unbound.turns, 0);
});

test('a session outside the reader list is refused before any number is read', async () => {
  const env = analyticsEnv(await seedStagingDb('someone-else@instagoon.com'));
  const response = await analyticsWorker.fetch(request(), env, {});
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'unauthorized' });
});

test('the read plane fails closed: no session, no reader list, no flag, no binding', async () => {
  const db = await seedStagingDb();
  assert.equal((await analyticsWorker.fetch(request(undefined, null), analyticsEnv(db), {})).status, 401);
  assert.equal((await analyticsWorker.fetch(request(), analyticsEnv(db, { ANALYTICS_EMAILS: undefined }), {})).status, 401);
  assert.equal((await analyticsWorker.fetch(request(), analyticsEnv(db, { ANALYTICS_READ_ENABLED: undefined }), {})).status, 503);
  assert.equal((await analyticsWorker.fetch(request(), analyticsEnv(db, { ANALYTICS_DB: undefined }), {})).status, 503);
});

test('only the one analytics path is addressable', async () => {
  const env = analyticsEnv(await seedStagingDb());
  assert.equal((await analyticsWorker.fetch(request('https://analytics-staging.instagoon.app/api/analytics/creators'), env, {})).status, 404);
  assert.equal((await analyticsWorker.fetch(request('https://analytics-staging.instagoon.app/api/staging/analytics'), env, {})).status, 404);
  assert.equal((await analyticsWorker.fetch(request(ANALYTICS_URL, TOKEN, 'POST'), env, {})).status, 405);
});

test('browser reads are only granted to the origin the owner named', async () => {
  const env = analyticsEnv(await seedStagingDb(), { ANALYTICS_ALLOWED_ORIGIN: 'https://staging.instagoon.app' });
  const allowed = await analyticsWorker.fetch(request(ANALYTICS_URL, TOKEN, 'GET', { origin: 'https://staging.instagoon.app' }), env, {});
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://staging.instagoon.app');
  assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');

  const preflight = await analyticsWorker.fetch(request(ANALYTICS_URL, TOKEN, 'OPTIONS', { origin: 'https://staging.instagoon.app' }), env, {});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-methods'), 'GET, OPTIONS');

  const stranger = await analyticsWorker.fetch(request(ANALYTICS_URL, TOKEN, 'GET', { origin: 'https://evil.example' }), env, {});
  assert.equal(stranger.headers.get('access-control-allow-origin'), null);
  const noConfig = await analyticsWorker.fetch(request(ANALYTICS_URL, TOKEN, 'GET', { origin: 'https://staging.instagoon.app' }), analyticsEnv(await seedStagingDb()), {});
  assert.equal(noConfig.headers.get('access-control-allow-origin'), null);
});

test('the production worker never answers the read plane', async () => {
  const db = await seedStagingDb();
  const unauthenticated = await app.fetch(request('https://instagoon.app/api/analytics/cosplay', null), { DB: db }, {});
  assert.equal(unauthenticated.status, 401);

  // Same valid session the analytics reader uses: production still has no path that serves PnL.
  const authenticated = await app.fetch(request('https://instagoon.app/api/analytics/cosplay'), { DB: db, ADMIN_EMAIL: READER }, {});
  assert.notEqual(authenticated.status, 200);
  const body = await authenticated.json();
  assert.equal(body.overview, undefined);
  assert.equal(body.creators, undefined);
});

test('wrangler config keeps the ANALYTICS_DB binding off production and pointed at staging only', () => {
  const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
  const staging = read('wrangler.staging.toml');
  const STAGING_ID = /database_id\s*=\s*"([^"]+)"/.exec(staging)[1];
  const PROD_ID = /database_id\s*=\s*"([^"]+)"/.exec(read('wrangler.toml'))[1];

  for (const name of ['wrangler.toml', 'wrangler.local-staging.toml']) {
    const config = read(name);
    assert.ok(!config.includes('ANALYTICS_DB'), `${name} must not bind the analytics database`);
    assert.ok(!config.includes('analytics.mjs'), `${name} must not run the analytics worker`);
    assert.ok(!config.includes('COSPLAY_ANALYTICS_ORIGIN'), `${name} must not hand out an analytics origin`);
  }

  assert.ok(staging.includes('COSPLAY_ANALYTICS_ORIGIN'), 'staging hands the UI the analytics origin');

  const analytics = read('wrangler.analytics.toml');
  assert.match(analytics, /binding\s*=\s*"ANALYTICS_DB"/);
  assert.ok(analytics.includes(STAGING_ID), 'analytics plane must read the staging database');
  assert.ok(!analytics.includes(PROD_ID), 'analytics plane must never read the production database');
  assert.ok(!/^\s*\[assets\]/m.test(analytics) && !analytics.includes('database_name = "froststory"'));
});
