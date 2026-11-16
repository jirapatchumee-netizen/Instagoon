import { PATHS, analyticsJson, analyticsReady, analyticsSession, creatorView, overview, rollupNow, tiersFor } from './analytics-api.mjs';
import { runHourly, hourBucket } from './analytics-rollup.mjs';

// One Worker, one database binding, prod only. It reads rollups written by its own cron and answers
// three paths; anything else is 404 so the surface cannot grow by accident.
async function handle(req, env) {
  const { pathname } = new URL(req.url);
  if (!pathname.startsWith('/api/')) {
    if (env.ASSETS) return env.ASSETS.fetch(req);
    return analyticsJson({ error: 'not_found' }, 404);
  }
  if (!Object.values(PATHS).includes(pathname)) return analyticsJson({ error: 'not_found' }, 404);
  if (!analyticsReady(env)) return analyticsJson({ error: 'analytics_disabled' }, 503);

  const user = await analyticsSession(req, env);
  if (!user) return analyticsJson({ error: 'unauthorized' }, 401);
  const tier = await tiersFor(env, user);
  if (!tier) return analyticsJson({ error: 'forbidden' }, 403);

  const hours = Math.min(Math.max(Number(new URL(req.url).searchParams.get('hours')) || 24, 1), 168);

  if (pathname === PATHS.me) {
    if (req.method !== 'GET') return analyticsJson({ error: 'method_not_allowed' }, 405);
    if (!tier.creatorIds.length) return analyticsJson({ error: 'not_a_creator' }, 403);
    return analyticsJson(await creatorView(env, tier, { hours }));
  }

  if (!tier.admin) return analyticsJson({ error: 'forbidden' }, 403);

  if (pathname === PATHS.run) {
    if (req.method !== 'POST') return analyticsJson({ error: 'method_not_allowed' }, 405);
    return analyticsJson(await rollupNow(env, { force: true }));
  }
  return analyticsJson(await overview(env, { hours }));
}

export default {
  fetch: (req, env) => handle(req, env).catch(error => {
    console.error('analytics request failed', error?.name);
    return analyticsJson({ error: 'analytics_failed' }, 500);
  }),

  // Hourly: the previous hour only, so a partially filled bucket is never published.
  async scheduled(event, env) {
    const bucket = hourBucket(Date.now() - 3600000);
    try {
      await runHourly(env.ANALYTICS_DB, bucket);
    } catch (error) {
      console.error(`analytics rollup failed for ${bucket}`, error?.message);
    }
  }
};
