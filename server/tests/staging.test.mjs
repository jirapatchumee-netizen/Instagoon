import assert from 'node:assert/strict';
import worker from '../src/staging.mjs';
import app from '../src/index.mjs';

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
{
 const original=app.fetch;let forwarded;
 try {app.fetch=async (_req,passed)=>{forwarded=passed;return new Response('ok');};assert.equal((await request('/api/me','session')).status,200);assert.equal(forwarded,env,'staging passes its environment through unchanged');}finally{app.fetch=original;}
}
assert.equal(await (await request('/assets/game.js', 'session')).text(), 'private asset');
assert.equal((await request('/studio.html', 'session')).status, 404);
assert.equal((await request('/_content/media/rewards/secret.webp', 'session')).status, 404);
assert.equal((await request('/api/admin/overview', 'session')).status, 404);
// Money-moving admin routes are closed at the staging edge: importing the production bank statement here
// would credit real customers' deposits to test orders (ADR-0018 D3). The app must never be reached, which
// is what separates this 404 from the app's own auth rejecting a request.
{
 const original=app.fetch;let reached;
 try {
  app.fetch=async()=>{reached=true;return new Response('the app answered');};
  for (const path of ['/api/admin/orders/reconcile', '/api/admin/orders/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/credit', '/api/admin/orders/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/refund']) {
   const response = await worker.fetch(new Request(`https://staging.example${path}`, { method: 'POST', body: 'transaction,date\n1,1', headers: { cookie: 'frost_session=session' } }), env, {});
   assert.equal(response.status, 404, path);
  }
  assert.equal(reached, undefined, 'a blocked admin route never reaches the app');
 } finally { app.fetch=original; }
}
env.STAGING_EMAILS = '';
assert.equal((await request('/assets/game.js', 'session')).status, 401);
console.log('staging access checks passed');
