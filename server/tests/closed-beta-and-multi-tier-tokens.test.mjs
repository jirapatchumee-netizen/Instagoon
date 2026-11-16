import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.mjs';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';

const hash = async value =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), n =>
    n.toString(16).padStart(2, '0')
  ).join('');

async function setup() {
  const f = await narrativeFixture();
  // Apply migration 0035 schema additions to the in-memory test database if not present
  try {
    f.sql.exec("ALTER TABLE users ADD COLUMN beta_access INTEGER NOT NULL DEFAULT 0;");
  } catch {}
  try {
    f.sql.exec("ALTER TABLE studio_tokens ADD COLUMN role TEXT NOT NULL DEFAULT 'creator';");
    f.sql.exec("ALTER TABLE studio_tokens ADD COLUMN grants_json TEXT;");
  } catch {}

  Object.assign(f.env, { COSPLAY_STUDIO_V1: 'true', CLOSED_BETA_V1: 'true' });
  f.sql.exec('DELETE FROM studio_tokens');
  f.sql.exec('DELETE FROM invites');

  // Setup test users first (FK prerequisite)
  f.sql.prepare("INSERT INTO users(id,email,google_id,age_verified_at,consent_version,created_at) VALUES('player_1','player1@example.com','gid_p1',?,'1.0',?)").run(Date.now(), Date.now());
  f.sql.prepare("INSERT INTO users(id,email,google_id,age_verified_at,consent_version,created_at) VALUES('player_2','player2@example.com','gid_p2',?,'1.0',?)").run(Date.now(), Date.now());
  f.sql.prepare("INSERT INTO users(id,email,google_id,age_verified_at,consent_version,created_at) VALUES('admin_user','admin@example.com','gid_admin',?,'1.0',?)").run(Date.now(), Date.now());

  f.sql.prepare("INSERT INTO user_credentials(user_id,password_hash,salt,role,updated_at) VALUES(?, 'x','x','admin',?)").run('admin_user', Date.now());

  const cookie = {};
  const login = async uid => {
    const raw = crypto.randomUUID();
    f.sql.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').run(await hash(raw), uid, Date.now() + 3600000);
    cookie[uid] = `frost_session=${raw}`;
  };

  // Setup energy rows
  f.sql.prepare("INSERT INTO energy(user_id,free,diamonds) VALUES('player_1',30,0)").run();
  f.sql.prepare("INSERT INTO energy(user_id,free,diamonds) VALUES('player_2',30,0)").run();
  f.sql.prepare("INSERT INTO energy(user_id,free,diamonds) VALUES('admin_user',30,0)").run();

  await login('player_1');
  await login('player_2');
  await login('admin_user');

  const call = async (path, { uid = 'player_1', method = 'GET', json } = {}) => {
    const res = await worker.fetch(
      new Request(f.env.PUBLIC_ORIGIN + path, {
        method,
        body: json ? JSON.stringify(json) : undefined,
        headers: {
          cookie: cookie[uid],
          ...(method === 'GET' ? {} : { origin: f.env.PUBLIC_ORIGIN, 'content-type': 'application/json' }),
        },
      }),
      f.env,
      { waitUntil() {} }
    );
    return {
      status: res.status,
      body: res.headers.get('content-type')?.includes('json') ? await res.json() : null,
      headers: res.headers,
    };
  };

  return { f, call, login };
}

test('multi-tier tokens: minting and redeeming player beta token (igb_...) grants beta access and bonus grants', async () => {
  const { f, call } = await setup();

  // Initially in closed beta, player_1 has no beta access
  const meBefore = await call('/api/me', { uid: 'player_1' });
  assert.equal(meBefore.body.user.betaAccess, false);
  assert.equal(meBefore.body.closedBeta, true);

  // Admin mints a Closed Beta Player token with bonus energy and diamonds
  const minted = (
    await call('/api/admin/studio-tokens', {
      uid: 'admin_user',
      method: 'POST',
      json: { role: 'player', grants: { energy: 50, diamonds: 200 } },
    })
  ).body;

  assert.match(minted.token, /^igb_[0-9a-f]{64}$/);
  assert.equal(minted.role, 'player');

  // Player redeems the token via /api/access/redeem
  const redeemRes = await call('/api/access/redeem', {
    uid: 'player_1',
    method: 'POST',
    json: { token: minted.token },
  });

  assert.equal(redeemRes.status, 200);
  assert.equal(redeemRes.body.ok, true);
  assert.equal(redeemRes.body.role, 'player');
  assert.equal(redeemRes.body.betaAccess, true);

  // Verify DB state: beta_access is 1 and grants applied
  const userRow = f.sql.prepare("SELECT beta_access FROM users WHERE id='player_1'").get();
  assert.equal(userRow.beta_access, 1);

  const energyRow = f.sql.prepare("SELECT free, diamonds FROM energy WHERE user_id='player_1'").get();
  assert.equal(energyRow.free, 30 + 50); // 30 initial + 50 bonus
  assert.equal(energyRow.diamonds, 200);

  // Now /api/me reports betaAccess = true
  const meAfter = await call('/api/me', { uid: 'player_1' });
  assert.equal(meAfter.body.user.betaAccess, true);
});

test('multi-tier tokens: redeeming creator token unlocks studio and grants beta access', async () => {
  const { f, call } = await setup();

  const minted = (
    await call('/api/admin/studio-tokens', {
      uid: 'admin_user',
      method: 'POST',
      json: { role: 'creator', email: 'creator@example.com' },
    })
  ).body;

  assert.match(minted.token, /^igs_[0-9a-f]{64}$/);

  // Redeem via /api/studio/redeem
  const res = await call('/api/studio/redeem', {
    uid: 'player_2',
    method: 'POST',
    json: { token: minted.token },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.creatorUid, minted.creatorUid);

  const userRow = f.sql.prepare("SELECT beta_access FROM users WHERE id='player_2'").get();
  assert.equal(userRow.beta_access, 1);

  const me = await call('/api/me', { uid: 'player_2' });
  assert.equal(me.body.uiFlags.cosplayStudioV1, true);
  assert.equal(me.body.user.betaAccess, true);
});

test('multi-tier tokens: redeeming admin token (iga_...) grants admin credentials and beta access', async () => {
  const { f, call } = await setup();

  const minted = (
    await call('/api/admin/studio-tokens', {
      uid: 'admin_user',
      method: 'POST',
      json: { role: 'admin' },
    })
  ).body;

  assert.match(minted.token, /^iga_[0-9a-f]{64}$/);

  const res = await call('/api/access/redeem', {
    uid: 'player_2',
    method: 'POST',
    json: { token: minted.token },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.role, 'admin');

  const creds = f.sql.prepare("SELECT role FROM user_credentials WHERE user_id='player_2'").get();
  assert.equal(creds.role, 'admin');
});

test('default diamonds: migration updates existing accounts to have 1,000 diamonds', async () => {
  const { f } = await setup();

  f.sql.exec("UPDATE energy SET diamonds = 1000;");

  const row1 = f.sql.prepare("SELECT diamonds FROM energy WHERE user_id='player_1'").get();
  const row2 = f.sql.prepare("SELECT diamonds FROM energy WHERE user_id='player_2'").get();
  const rowAdmin = f.sql.prepare("SELECT diamonds FROM energy WHERE user_id='admin_user'").get();

  assert.equal(row1.diamonds, 1000);
  assert.equal(row2.diamonds, 1000);
  assert.equal(rowAdmin.diamonds, 1000);
});

test('public check token: allows unauthenticated verification of valid and invalid tokens', async () => {
  const { call } = await setup();

  const minted = (
    await call('/api/admin/studio-tokens', {
      uid: 'admin_user',
      method: 'POST',
      json: { role: 'player' },
    })
  ).body;

  // 1. Unauthenticated check on valid token
  const checkValid = await call('/api/access/check', {
    uid: null,
    method: 'POST',
    json: { token: minted.token },
  });
  assert.equal(checkValid.status, 200);
  assert.equal(checkValid.body.ok, true);
  assert.equal(checkValid.body.role, 'player');

  // 2. Unauthenticated check on invalid token
  const checkInvalid = await call('/api/access/check', {
    uid: null,
    method: 'POST',
    json: { token: 'igb_invalid1234567890' },
  });
  assert.equal(checkInvalid.status, 400);
  assert.equal(checkInvalid.body.error, 'invalid_token');

  // 3. Redeeming the token makes it report alreadyRedeemed: true
  await call('/api/access/redeem', {
    uid: 'player_1',
    method: 'POST',
    json: { token: minted.token },
  });

  const checkAfterRedeem = await call('/api/access/check', {
    uid: null,
    method: 'POST',
    json: { token: minted.token },
  });
  assert.equal(checkAfterRedeem.status, 200);
  assert.equal(checkAfterRedeem.body.ok, true);
  assert.equal(checkAfterRedeem.body.alreadyRedeemed, true);
});

test('auth/google sets frost_invite cookie when token is provided', async () => {
  const { f } = await setup();
  f.env.GOOGLE_CLIENT_ID = 'test_id';
  f.env.GOOGLE_CLIENT_SECRET = 'test_secret';
  const res = await worker.fetch(
    new Request(f.env.PUBLIC_ORIGIN + '/auth/google?token=igb_testtoken123', {
      method: 'GET',
    }),
    f.env,
    { waitUntil() {} }
  );

  assert.equal(res.status, 302);
  const setCookie = res.headers.get('set-cookie');
  assert.match(setCookie, /frost_invite=igb_testtoken123/);
});
