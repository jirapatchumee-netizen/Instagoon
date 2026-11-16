import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.mjs';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';

const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), n => n.toString(16).padStart(2, '0')).join('');

async function identity() {
  const f = await narrativeFixture();
  Object.assign(f.env, { COSPLAY_STUDIO_V1: 'true', DEV_EMAIL_CODES: 'true' });
  f.sql.exec('DELETE FROM studio_tokens');
  f.sql.exec('DELETE FROM invites');
  f.sql.prepare("INSERT INTO user_credentials(user_id,password_hash,salt,role,updated_at) VALUES(?, 'x','x','admin',?)").run('two', Date.now());
  const cookie = {};
  const login = async uid => {
    const raw = crypto.randomUUID();
    f.sql.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').run(await hash(raw), uid, Date.now() + 3600000);
    cookie[uid] = `frost_session=${raw}`;
  };
  await login('one');
  await login('two');
  const call = async (path, { uid = 'one', method = 'GET', json } = {}) => {
    const res = await worker.fetch(new Request(f.env.PUBLIC_ORIGIN + path, {
      method, body: json ? JSON.stringify(json) : undefined,
      headers: { cookie: cookie[uid], ...(method === 'GET' ? {} : { origin: f.env.PUBLIC_ORIGIN, 'content-type': 'application/json' }) }
    }), f.env, { waitUntil() {} });
    return { status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : null, location: res.headers.get('location') };
  };
  return { f, call, login };
}

const emailOf = (f, uid) => f.sql.prepare(`SELECT email FROM users WHERE id='${uid}'`).get().email;

test('a creator moves their email only after proving the new address, and the account keeps its identity', async () => {
  const { f, call } = await identity();
  assert.equal((await call('/api/account/email/request', { method: 'POST', json: { email: 'one@example.com' } })).body.error, 'same_email');
  assert.equal((await call('/api/account/email/request', { method: 'POST', json: { email: 'two@example.com' } })).body.error, 'email_taken', 'another account already owns it');
  assert.equal((await call('/api/account/email/request', { method: 'POST', json: { email: 'not-an-email' } })).status, 400);

  const asked = await call('/api/account/email/request', { method: 'POST', json: { email: 'New.Creator@Example.com' } });
  assert.equal(asked.status, 200);
  assert.match(asked.body.devCode, /^[0-9a-f]{10}$/);
  assert.equal((await call('/api/account/email')).body.pendingEmail, 'new.creator@example.com', 'stored lowercased');
  assert.equal((await call('/api/account/email/verify', { method: 'POST', json: { code: 'deadbeef00' } })).body.error, 'invalid_code');
  assert.equal(emailOf(f, 'one'), 'one@example.com', 'a wrong code changes nothing');

  assert.equal((await call('/api/account/email/verify', { method: 'POST', json: { code: asked.body.devCode } })).body.email, 'new.creator@example.com');
  assert.equal(f.sql.prepare("SELECT id FROM users WHERE email='new.creator@example.com'").get().id, 'one', 'the same account, not a new one');
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM email_changes').get().n, 0, 'the code is single-use');
  assert.deepEqual(f.sql.prepare("SELECT email FROM email_history WHERE user_id='one' ORDER BY email").all().map(r => r.email),
    ['new.creator@example.com', 'one@example.com'], 'the old address stays on record');
  assert.equal((await call('/api/account/email/verify', { method: 'POST', json: { code: asked.body.devCode } })).body.error, 'no_pending_change');
});

test('an expired code and a burst of guesses are both refused', async () => {
  const { f, call } = await identity();
  assert.equal((await call('/api/account/email/verify', { method: 'POST', json: { code: 'aaaaaaaaaa' } })).body.error, 'no_pending_change');

  const asked = await call('/api/account/email/request', { method: 'POST', json: { email: 'later@example.com' } });
  f.sql.exec('UPDATE email_changes SET expires_at=1');
  assert.equal((await call('/api/account/email/verify', { method: 'POST', json: { code: asked.body.devCode } })).body.error, 'expired');

  const fresh = await call('/api/account/email/request', { method: 'POST', json: { email: 'later@example.com' } });
  for (let k = 0; k < 5; k++) assert.equal((await call('/api/account/email/verify', { method: 'POST', json: { code: '0000000000' } })).body.error, 'invalid_code', `guess ${k + 1}`);
  assert.equal((await call('/api/account/email/verify', { method: 'POST', json: { code: fresh.body.devCode } })).status, 429, 'guessing is capped per hour');
  assert.equal(f.sql.prepare('SELECT attempts FROM email_changes').get().attempts, 5);

  f.sql.exec("DELETE FROM activity WHERE kind IN ('email_code_miss','email_change_request')");
  for (let i = 0; i < 5; i++) assert.equal((await call('/api/account/email/request', { method: 'POST', json: { email: 'later@example.com' } })).status, 200, `request ${i + 1}`);
  assert.equal((await call('/api/account/email/request', { method: 'POST', json: { email: 'later@example.com' } })).status, 429, 'requests are capped per hour too');
});

test('the code goes to the delivery hook and only its hash is stored', async () => {
  const { f, call } = await identity();
  const realFetch = globalThis.fetch;
  const sent = [];
  f.env.DEV_EMAIL_CODES = 'false';
  f.env.EMAIL_CODE_WEBHOOK = 'https://mailhook.test/inbox';
  globalThis.fetch = async (url, init) => { if (String(url) === 'https://mailhook.test/inbox') sent.push(JSON.parse(init.body)); return new Response('{}'); };
  try {
    const asked = await call('/api/account/email/request', { method: 'POST', json: { email: 'hooked@example.com' } });
    assert.equal(asked.body.sent, true);
    assert.equal(asked.body.devCode, undefined, 'nothing hands the code to the browser');
    assert.deepEqual(sent.map(s => s.to), ['hooked@example.com']);
    assert.equal(JSON.stringify(f.sql.prepare('SELECT * FROM email_changes').all()).includes(sent[0].code), false, 'only the hash is stored');
    assert.equal((await call('/api/account/email/verify', { method: 'POST', json: { code: sent[0].code } })).body.email, 'hooked@example.com');
  } finally { globalThis.fetch = realFetch; }
});

test('signing in with Google no longer rewrites the account email, and a revoked account is refused', async () => {
  const { f, call } = await identity();
  const state = crypto.randomUUID(), verifier = crypto.randomUUID();
  Object.assign(f.env, { GOOGLE_CLIENT_ID: 'cid', GOOGLE_CLIENT_SECRET: 'secret' });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async url => String(url).includes('oauth2.googleapis.com/token')
    ? new Response(JSON.stringify({ access_token: 'at' }))
    : new Response(JSON.stringify({ email: 'Renamed.Person@Example.com', email_verified: true, sub: 'one' }));
  try {
    f.sql.prepare('INSERT INTO oauth_states(id,verifier,expires_at) VALUES(?,?,?)').run(await hash(state), verifier, Date.now() + 600000);
    const res = await worker.fetch(new Request(f.env.PUBLIC_ORIGIN + `/auth/callback?code=c&state=${state}`, { headers: { cookie: `frost_oauth=${state}` } }), f.env, {});
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/', 'the sign-in succeeds');
    assert.equal(emailOf(f, 'one'), 'one@example.com', 'the silent overwrite is gone');
    assert.deepEqual(f.sql.prepare("SELECT email FROM email_history WHERE user_id='one'").all().map(r => r.email), ['renamed.person@example.com'], 'the new address is visible to support, unverified');

    f.sql.exec("UPDATE users SET access_status='revoked' WHERE id='one'");
    f.sql.prepare('INSERT INTO oauth_states(id,verifier,expires_at) VALUES(?,?,?)').run(await hash(state), verifier, Date.now() + 600000);
    const blocked = await worker.fetch(new Request(f.env.PUBLIC_ORIGIN + `/auth/callback?code=c&state=${state}`, { headers: { cookie: `frost_oauth=${state}` } }), f.env, {});
    assert.equal(blocked.headers.get('location'), '/?auth_error=access_revoked', 'a revoked identity cannot sign back in with any address');
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM users').get().n, 2, 'nor does it get a duplicate account');
    f.sql.exec("UPDATE users SET access_status='active' WHERE id='one'");
    assert.equal((await call('/api/me')).status, 200);
  } finally { globalThis.fetch = realFetch; }
});

test('revoking by user_id follows the person through an email change and kills sessions, studio and analytics', async () => {
  const { f, call, login } = await identity();
  const issued = (await call('/api/admin/studio-tokens', { uid: 'two', method: 'POST', json: {} })).body;
  assert.equal(issued.email, '', 'a first hand-over does not need an address yet');
  assert.match(issued.token, /^igs_[0-9a-f]{64}$/);
  assert.match(issued.creatorUid, /^ccu_/);
  assert.equal((await call('/api/studio/redeem', { method: 'POST', json: { token: issued.token } })).status, 200);

  const asked = await call('/api/account/email/request', { method: 'POST', json: { email: 'moved@example.com' } });
  assert.equal((await call('/api/account/email/verify', { method: 'POST', json: { code: asked.body.devCode } })).body.email, 'moved@example.com');

  const revoked = await call('/api/admin/users/access', { uid: 'two', method: 'POST', json: { userId: 'one', status: 'revoked' } });
  assert.deepEqual(revoked.body, { ok: true, userId: 'one', accessStatus: 'revoked' });
  assert.equal(f.sql.prepare("SELECT access_status FROM users WHERE id='one'").get().access_status, 'revoked');
  assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id='one'").get().n, 0, 'live sessions die');
  assert.equal((await call('/api/me')).status, 401);
  assert.deepEqual(f.sql.prepare("SELECT email FROM invites WHERE status='revoked' ORDER BY email").all().map(r => r.email),
    ['moved@example.com', 'one@example.com'], 'every address the account held is blocked too');

  await login('one');
  assert.equal((await call('/api/me')).status, 401, 'a brand new session for the same identity is still refused');
  assert.equal(f.sql.prepare('SELECT revoked_at FROM studio_tokens').get().revoked_at, null, 'revoking the person is not revoking their token');

  assert.equal((await call('/api/admin/users/access', { uid: 'two', method: 'POST', json: { userId: 'one', status: 'active' } })).status, 200);
  assert.equal((await call('/api/me')).body.user.email, 'moved@example.com', 'access returns with the identity, not a new account');
});

test('a token expires before it is claimed, and revocation closes the studio and the analytics bearer', async () => {
  const { f, call } = await identity();
  const analytics = (await import('../src/analytics.mjs')).default;
  const aenv = { ANALYTICS_READ_ENABLED: 'true', ANALYTICS_DB: f.env.DB };
  const ask = (path, bearer) => analytics.fetch(new Request('https://analytics.instagoon.app' + path, { headers: { authorization: `Bearer ${bearer}` } }), aenv, {});

  const stale = (await call('/api/admin/studio-tokens', { uid: 'two', method: 'POST', json: { email: 'stale@example.com' } })).body;
  assert.notEqual(f.sql.prepare('SELECT expires_at FROM studio_tokens').get().expires_at, null, 'a minted token carries a hand-over window');
  f.sql.exec('UPDATE studio_tokens SET expires_at=1');
  assert.equal((await call('/api/studio/redeem', { method: 'POST', json: { token: stale.token } })).status, 400, 'an unclaimed token past its window is dead');
  f.sql.exec(`UPDATE studio_tokens SET expires_at=${Date.now() + 86400000}`);

  const issued = (await call('/api/admin/studio-tokens', { uid: 'two', method: 'POST', json: { email: 'creator@example.com' } })).body;
  assert.notEqual(issued.token, stale.token);
  assert.equal((await call('/api/studio/redeem', { method: 'POST', json: { token: issued.token } })).body.creatorUid, issued.creatorUid);
  assert.equal((await call('/api/studio/draft', { method: 'PUT', json: { name: 'Yuki' } })).status, 200);
  assert.notEqual(f.sql.prepare("SELECT last_used_at FROM studio_tokens WHERE user_id='one'").get().last_used_at, null, 'usage is stamped');
  assert.equal(f.sql.prepare('SELECT last_used_at FROM studio_tokens WHERE user_id IS NULL').get().last_used_at, null, 'only the claimed token is stamped');

  assert.equal((await call('/api/admin/studio-tokens/revoke', { uid: 'two', method: 'POST', json: { token: 'igs_' + '0'.repeat(64) } })).status, 404);
  assert.equal((await call('/api/admin/studio-tokens/revoke', { uid: 'two', method: 'POST', json: { creatorUid: issued.creatorUid } })).status, 200);
  assert.equal((await call('/api/studio/draft')).status, 403, 'a revoked token no longer opens the studio');
  assert.equal((await call('/api/studio/redeem', { method: 'POST', json: { token: issued.token } })).status, 400, 'nor can it be claimed again');
  assert.equal((await ask('/api/analytics/me', issued.token)).status, 401, 'and the analytics plane stops accepting it');
});
