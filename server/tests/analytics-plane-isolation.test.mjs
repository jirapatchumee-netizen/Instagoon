import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTestDb } from './helpers/test-db.mjs';
import { calculateTokenCost } from '../src/token-pricing.mjs';
import { hourBucket, runHourly, LIFETIME_BUCKET } from '../src/analytics-rollup.mjs';
import analyticsWorker from '../src/analytics.mjs';
import app from '../src/index.mjs';

const HOST = 'https://analytics.instagoon.app';
const OVERVIEW = HOST + '/api/analytics/overview';
const ME = HOST + '/api/analytics/me';
const RUN = HOST + '/api/analytics/rollup/run';

const sha256 = async value => Array.from(
  new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
  n => n.toString(16).padStart(2, '0')
).join('');

const BUCKET = hourBucket(Date.now() - 3600000);
const WINDOW_START = Date.parse(BUCKET);
const IN_WINDOW = WINDOW_START + 60000;

// One hour of real-shaped production data: an admin, a creator who owns crt_yuki, a plain player who
// owns nothing, and a second creator whose numbers nobody in this fixture may read.
async function seedProdDb() {
  const db = createTestDb();
  const tokens = {};
  const person = async (id, email, role) => {
    db.raw.prepare('INSERT INTO users(id, email, google_id, created_at) VALUES (?, ?, ?, ?)').run(id, email, `g_${id}`, IN_WINDOW);
    db.raw.prepare('INSERT INTO user_credentials(user_id, password_hash, salt, role, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, 'x', 'y', role, IN_WINDOW);
    const raw = `token-${id}`;
    tokens[id] = raw;
    db.raw.prepare('INSERT INTO sessions(id, user_id, expires_at) VALUES (?, ?, ?)').run(await sha256(raw), id, Date.now() + 3600000);
  };
  await person('usr_ops', 'ops@instagoon.app', 'admin');
  await person('usr_yuki', 'yuki@instagoon.app', 'creator');
  await person('usr_player', 'player@example.com', 'player');

  db.raw.prepare("INSERT INTO creators(id, name, bio) VALUES ('crt_yuki', 'Yuki', 'b')").run();
  db.raw.prepare("INSERT INTO creators(id, name, bio) VALUES ('crt_other', 'Other', 'b')").run();
  db.raw.prepare('INSERT INTO cosplay_accounts(id, user_id, creator_id, account_status, rev_share_bps, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('acc_1', 'usr_yuki', 'crt_yuki', 'active', 3000, IN_WINDOW, IN_WINDOW);

  const turn = (id, creatorId, outcome, tokensIn, tokensOut, latency) => db.raw.prepare(
    'INSERT INTO ai_turn_metrics(id, user_id, creator_id, visit_id, created_at, outcome, model, latency_ms, tokens_in, tokens_out) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, 'usr_player', creatorId, `v_${id}`, IN_WINDOW, outcome, 'gemini-2.5-flash', latency, tokensIn, tokensOut);
  turn('t1', 'crt_yuki', 'ok', 1000, 100, 100);
  turn('t2', 'crt_yuki', 'ok', 2000, 200, 300);
  turn('t3', 'crt_yuki', 'error', 500, 50, null);
  turn('t4', 'crt_other', 'ok', 100, 10, 200);

  const act = (kind, userId) => db.raw.prepare('INSERT INTO activity(user_id, kind, created_at) VALUES (?, ?, ?)').run(userId, kind, IN_WINDOW);
  act('dm', 'usr_player'); act('dm', 'usr_player'); act('story', 'usr_player');

  db.raw.prepare("INSERT INTO products(sku, name, price_satang, energy) VALUES ('pk100', 'pack', 2900, 100)").run();
  db.raw.prepare("INSERT INTO orders(id, user_id, request_id, sku, price_satang, amount_satang, energy, status, created_at, expires_at, paid_at) VALUES ('ord_1', 'usr_player', 'r1', 'pk100', 2900, 2937, 100, 'paid', ?, ?, ?)")
    .run(IN_WINDOW, IN_WINDOW + 600000, IN_WINDOW);
  db.raw.prepare("INSERT INTO orders(id, user_id, request_id, sku, price_satang, amount_satang, energy, status, created_at, expires_at) VALUES ('ord_2', 'usr_player', 'r2', 'pk100', 2900, 2938, 100, 'pending', ?, ?)")
    .run(IN_WINDOW, IN_WINDOW + 600000);
  db.raw.prepare('INSERT INTO bank_deposits(id, amount_satang, deposited_at, order_id, imported_at) VALUES (?, ?, ?, ?, ?)').run('dep_1', 2937, IN_WINDOW, 'ord_1', IN_WINDOW);

  db.raw.prepare("INSERT INTO episodes(id, creator_id, title) VALUES ('ep1', 'crt_yuki', 't')").run();
  db.raw.prepare('INSERT INTO episode_unlocks(user_id, episode_id, unlocked_at) VALUES (?, ?, ?)').run('usr_player', 'ep1', IN_WINDOW);
  db.raw.prepare('INSERT INTO reward_unlocks(user_id, creator_id, reward_key, unlocked_at) VALUES (?, ?, ?, ?)').run('usr_player', 'crt_yuki', 'r1', IN_WINDOW);
  db.raw.prepare("INSERT INTO stories(id, creator_id, type, media_key, published_at) VALUES ('st1', 'crt_yuki', 'broadcast', 'k', ?)").run(IN_WINDOW);
  db.raw.prepare('INSERT INTO story_views(user_id, story_id, first_viewed_at) VALUES (?, ?, ?)').run('usr_player', 'st1', IN_WINDOW);
  // comments are guarded by a BEFORE INSERT trigger that requires a published post the commenter has
  // unlocked enough, so the seed has to satisfy the same rule instead of ducking it.
  db.raw.prepare("INSERT INTO posts(id, creator_id, caption, media_key, published_at, status) VALUES ('po1', 'crt_yuki', 'c', 'k', ?, 'published')").run(IN_WINDOW);
  db.raw.prepare('INSERT INTO relationships(user_id, creator_id, score) VALUES (?, ?, ?)').run('usr_player', 'crt_yuki', 5);
  db.raw.prepare('INSERT INTO likes(user_id, post_id) VALUES (?, ?)').run('usr_player', 'po1');
  db.raw.prepare("INSERT INTO comments(id, request_id, user_id, post_id, content, created_at) VALUES ('co1', 'cr1', 'usr_player', 'po1', 'hi', ?)").run(IN_WINDOW + 1);
  db.raw.prepare("INSERT INTO reports(id, comment_id, user_id, reason, created_at) VALUES ('re1', 'co1', 'usr_player', 'r', ?)").run(IN_WINDOW + 1);

  return { db, tokens };
}

const readValue = async (db, metric, subject = '', bucket = BUCKET) => {
  const row = await db.prepare('SELECT value FROM analytics_rollup WHERE bucket=? AND metric=? AND subject=?').bind(bucket, metric, subject).first();
  return row?.value;
};

const envFor = (db, overrides = {}) => ({
  ANALYTICS_DB: db,
  ANALYTICS_READ_ENABLED: 'true',
  ANALYTICS_SOURCE: 'production',
  ...overrides
});

const request = (url, token = null, method = 'GET') => new Request(url, {
  method,
  headers: token ? { cookie: `frost_session=${token}` } : {}
});

test('the hourly rollup collapses a whole hour into small indexed rows', async () => {
  const { db } = await seedProdDb();
  const result = await runHourly(db, BUCKET);
  assert.equal(result.skipped, false);
  assert.ok(result.rowsWritten > 20, `expected a full metric set, got ${result.rowsWritten}`);

  assert.equal(await readValue(db, 'players.new'), 3);
  assert.equal(await readValue(db, 'players.active'), 1);
  assert.equal(await readValue(db, 'activity.dm'), 2);
  assert.equal(await readValue(db, 'activity.story'), 1);
  assert.equal(await readValue(db, 'ai.turns'), 4);
  assert.equal(await readValue(db, 'ai.outcome.ok'), 3);
  assert.equal(await readValue(db, 'ai.outcome.error'), 1);
  assert.equal(await readValue(db, 'ai.tokens_in'), 3600);
  assert.equal(await readValue(db, 'creator.turns', 'crt_yuki'), 3);
  assert.equal(await readValue(db, 'creator.tokens_in', 'crt_yuki'), 3500);
  assert.equal(await readValue(db, 'creator.cost_satang', 'crt_yuki'),
    calculateTokenCost({ promptTokens: 3500, cachedTokens: 1750, completionTokens: 350 }).costSatang);
  assert.equal(await readValue(db, 'unlocks.episodes'), 1);
  assert.equal(await readValue(db, 'engagement.story_views'), 1);
  assert.equal(await readValue(db, 'money.orders_paid'), 1, 'a pending order is not revenue');
  assert.equal(await readValue(db, 'money.orders_paid_satang'), 2937);
  assert.equal(await readValue(db, 'money.energy_granted'), 100);
  assert.equal(await readValue(db, 'likes.total', '', LIFETIME_BUCKET), 1);
  assert.equal(await readValue(db, 'cosplay_accounts.bound', '', LIFETIME_BUCKET), 1);

  const run = await db.prepare('SELECT status, rows_written FROM analytics_rollup_runs WHERE bucket=?').bind(BUCKET).first();
  assert.equal(run.status, 'ok');
});

test('rerunning an hour replaces its numbers instead of stacking duplicates', async () => {
  const { db } = await seedProdDb();
  const first = await runHourly(db, BUCKET);
  assert.equal((await runHourly(db, BUCKET)).skipped, true, 'a finished bucket is not recomputed');
  const forced = await runHourly(db, BUCKET, { force: true });
  assert.equal(forced.skipped, false);

  const rows = await db.prepare("SELECT COUNT(*) n FROM analytics_rollup WHERE bucket IN (?, ?)").bind(BUCKET, LIFETIME_BUCKET).first();
  assert.equal(rows.n, first.rowsWritten, 'force rewrites the same rows instead of adding a second set');
  assert.equal(await readValue(db, 'ai.turns'), 4);
});

test('cron fills the last completed hour', async () => {
  const { db } = await seedProdDb();
  await analyticsWorker.scheduled({}, envFor(db));
  const run = await db.prepare('SELECT bucket, status FROM analytics_rollup_runs ORDER BY started_at DESC LIMIT 1').first();
  assert.equal(run.bucket, hourBucket(Date.now() - 3600000));
  assert.equal(run.status, 'ok');
});

test('admin reads the site-wide dashboard, creator reads only their own character', async () => {
  const { db, tokens } = await seedProdDb();
  await runHourly(db, BUCKET);
  const env = envFor(db);

  const overview = await analyticsWorker.fetch(request(OVERVIEW, tokens.usr_ops), env, {});
  assert.equal(overview.status, 200);
  const adminData = await overview.json();
  assert.equal(adminData.scope, 'admin');
  assert.equal(adminData.source, 'production');
  assert.match(adminData.meta.traffic, /not_connected/);
  assert.match(adminData.meta.revenuePerCreator, /not_instrumented/);
  assert.equal(adminData.lifetime['money.orders_paid_satang'], undefined, 'money lives in the hourly rows, not lifetime');
  assert.equal(adminData.hours[0].metrics['money.orders_paid_satang'], 2937);
  assert.deepEqual(adminData.creators.map(c => c.creatorId), ['crt_yuki', 'crt_other']);

  const me = await analyticsWorker.fetch(request(ME, tokens.usr_yuki), env, {});
  assert.equal(me.status, 200);
  const creatorData = await me.json();
  assert.equal(creatorData.scope, 'creator');
  assert.deepEqual(creatorData.creators, ['crt_yuki']);
  const json = JSON.stringify(creatorData);
  const everyKey = creatorData.hours.flatMap(h => Object.keys(h.metrics));
  assert.ok(!everyKey.some(k => k.includes('money') || k.includes('orders') || k.includes('deposit')));
  assert.ok(!json.includes('2937'), 'no revenue figure appears anywhere in the creator payload');
  assert.ok(!json.includes('crt_other'), 'another creator character is not even named');
  assert.ok(!json.includes('ops@instagoon.app'), 'no other account email leaks into the payload');
  const keys = Object.keys(creatorData.hours[0].metrics);
  assert.ok(keys.length > 0 && keys.every(k => k.startsWith('creator.') && k.endsWith(':crt_yuki')), keys.join(','));
});

test('a logged-in person with no admin role and no character is refused', async () => {
  const { db, tokens } = await seedProdDb();
  await runHourly(db, BUCKET);
  const env = envFor(db);
  assert.equal((await analyticsWorker.fetch(request(OVERVIEW, tokens.usr_player), env, {})).status, 403);
  assert.equal((await analyticsWorker.fetch(request(ME, tokens.usr_player), env, {})).status, 403);
});

test('the reader list is not the admin rule: an email on the allowlist alone is only a creator', async () => {
  const { db, tokens } = await seedProdDb();
  await runHourly(db, BUCKET);
  const demoted = await analyticsWorker.fetch(request(OVERVIEW, tokens.usr_ops), envFor(db, { ANALYTICS_ADMIN_EMAILS: '' , DEMOTE_ROLE: '1' }), {});
  assert.equal(demoted.status, 200, 'role from user_credentials still grants admin');
  assert.equal(demoted.headers.get('cache-control'), 'no-store');
  assert.equal(demoted.headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('it fails closed: no session, no flag, no binding, unknown path, non-admin refresh', async () => {
  const { db, tokens } = await seedProdDb();
  const env = envFor(db);
  assert.equal((await analyticsWorker.fetch(request(OVERVIEW), env, {})).status, 401);
  assert.equal((await analyticsWorker.fetch(request(OVERVIEW, 'not-a-real-token'), env, {})).status, 401);
  assert.equal((await analyticsWorker.fetch(request(OVERVIEW, tokens.usr_ops), envFor(db, { ANALYTICS_READ_ENABLED: undefined }), {})).status, 503);
  assert.equal((await analyticsWorker.fetch(request(OVERVIEW, tokens.usr_ops), envFor(db, { ANALYTICS_DB: undefined }), {})).status, 503);
  assert.equal((await analyticsWorker.fetch(request(HOST + '/api/analytics/cosplay', tokens.usr_ops), env, {})).status, 404);
  assert.equal((await analyticsWorker.fetch(request(OVERVIEW, tokens.usr_yuki), env, {})).status, 403);
  assert.equal((await analyticsWorker.fetch(request(RUN, tokens.usr_yuki, 'POST'), env, {})).status, 403);
  assert.equal((await analyticsWorker.fetch(request(RUN, tokens.usr_ops, 'POST'), env, {})).status, 200);
});

test('the game worker never serves the dashboard, even for the admin session', async () => {
  const { db, tokens } = await seedProdDb();
  for (const path of ['/api/analytics/overview', '/api/analytics/me', '/api/analytics/rollup/run']) {
    const response = await app.fetch(new Request('https://instagoon.app' + path, { headers: { cookie: `frost_session=${tokens.usr_ops}` } }), { DB: db }, {});
    assert.notEqual(response.status, 200, `${path} answered from the game worker`);
    const body = await response.json().catch(() => null);
    assert.equal(body?.lifetime, undefined);
    assert.equal(body?.hours, undefined);
  }
});

test('wrangler config keeps production data reachable only from the analytics worker', () => {
  const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
  const PROD_ID = /database_id\s*=\s*"([^"]+)"/.exec(read('wrangler.toml'))[1];
  const STAGING_ID = /database_id\s*=\s*"([^"]+)"/.exec(read('wrangler.staging.toml'))[1];
  const analytics = read('wrangler.analytics.toml');

  assert.ok(analytics.includes(PROD_ID), 'the dashboard must read the database players actually use');
  assert.ok(!analytics.includes(STAGING_ID), 'the dashboard must not read the test field');
  assert.match(analytics, /\[\[routes\]\][\s\S]*analytics\.instagoon\.app/, 'routes must be their own table');
  assert.match(analytics, /crons\s*=\s*\[/, 'rollups need a schedule');

  for (const name of ['wrangler.toml', 'wrangler.staging.toml', 'wrangler.local-staging.toml']) {
    const game = read(name);
    assert.ok(!game.includes('ANALYTICS_DB'), `${name} must not be able to read the dashboard binding`);
    assert.ok(!game.includes('analytics.mjs'), `${name} must not run the dashboard worker`);
  }

  assert.ok(read('wrangler.toml').includes('COSPLAY_ANALYTICS_ORIGIN'), 'production staff get the dashboard link');
  for (const name of ['wrangler.staging.toml', 'wrangler.local-staging.toml']) {
    assert.ok(!(/^\s*COSPLAY_ANALYTICS_ORIGIN\s*=/m).test(read(name)), `${name} must not link staging to real production numbers`);
  }
});
