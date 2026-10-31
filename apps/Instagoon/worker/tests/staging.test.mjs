import assert from 'node:assert/strict';
import worker from '../src/staging.mjs';

let user = null;
const env = {
 STAGING_EMAILS: 'owner@example.com',
 DB: { prepare: () => ({ bind: () => ({ first: async () => user }) }) },
 ASSETS: { fetch: async () => new Response('private asset') }
};
const request = (path, cookie) => worker.fetch(new Request(`https://staging.example${path}`, { headers: cookie ? { cookie: `frost_session=${cookie}` } : {} }), env, {});
assert.equal((await request('/')).status, 200);
assert.equal((await request('/assets/game.js')).status, 401);
for (const path of ['/privacy', '/privacy.html', '/terms', '/terms.html']) assert.equal((await request(path)).status, 200, path);
assert.equal((await request('/api/me')).status, 401);
assert.equal((await request('/auth/google')).status, 503);
user = { email: 'other@example.com' };
assert.equal((await request('/assets/game.js', 'session')).status, 401);
user = { email: 'owner@example.com' };
assert.equal(await (await request('/assets/game.js', 'session')).text(), 'private asset');
assert.equal((await request('/studio.html', 'session')).status, 404);
assert.equal((await request('/_content/media/rewards/secret.webp', 'session')).status, 404);
assert.equal((await request('/api/admin/overview', 'session')).status, 404);
env.STAGING_EMAILS = '';
assert.equal((await request('/assets/game.js', 'session')).status, 401);
console.log('staging access checks passed');
