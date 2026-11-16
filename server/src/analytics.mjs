import { PATHS, analyticsJson, analyticsReady, analyticsSession, creatorView, overview, rollupNow, tiersFor } from './analytics-api.mjs';
import { runHourly, hourBucket } from './analytics-rollup.mjs';

// One Worker, one database binding, prod only. It reads rollups written by its own cron and answers
// three paths; anything else is 404 so the surface cannot grow by accident.
async function handle(req, env) {
  const { pathname } = new URL(req.url);

  if (pathname === '/auth/google') {
    return new Response(null, {
      status: 302,
      headers: {
        location: 'https://instagoon.app/auth/google?redirect=https://analytics.instagoon.app/',
        'cache-control': 'no-store'
      }
    });
  }

  if (pathname === '/auth/verify') {
    if (req.method !== 'POST') return analyticsJson({ error: 'method_not_allowed' }, 405);
    if (!analyticsReady(env)) return analyticsJson({ error: 'analytics_disabled' }, 503);

    try {
      const body = await req.json().catch(() => ({}));
      const email = String(body.email || '').trim().toLowerCase();
      const raw = String(body.token || '').trim();

      if (!email || !raw || !/^[a-zA-Z0-9_-]{8,128}$/.test(raw)) {
        return analyticsJson({ error: 'invalid_input', message: 'กรุณากรอกอีเมล Gmail และ Access Token ให้ครบถ้วน' }, 400);
      }

      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');

      const user = await env.ANALYTICS_DB.prepare(
        'SELECT u.id, u.email, c.role FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN user_credentials c ON c.user_id=u.id WHERE s.id=? AND s.expires_at>?'
      ).bind(hash, Date.now()).first();

      if (!user) {
        return analyticsJson({ error: 'invalid_token', message: 'Checkpoint 2 ล้มเหลว: Access Token ไม่ถูกต้องหรือหมดอายุ' }, 401);
      }

      if (String(user.email || '').trim().toLowerCase() !== email) {
        return analyticsJson({ error: 'email_mismatch', message: 'Checkpoint 1 ล้มเหลว: บัญชี Gmail ไม่ตรงกับเจ้าของ Access Token นี้' }, 403);
      }

      const tier = await tiersFor(env, user);
      if (!tier) {
        return analyticsJson({ error: 'forbidden', message: 'Checkpoint 2 ล้มเหลว: บัญชีนี้ไม่มีสิทธิ์เข้าถึง Analytics (จำกัดเฉพาะ Admin หรือ Creator)' }, 403);
      }

      const headers = new Headers({
        'content-type': 'application/json; charset=utf-8',
        'set-cookie': `frost_session=${raw}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
        'cache-control': 'no-store'
      });
      return new Response(JSON.stringify({ ok: true, email: user.email, admin: tier.admin, role: user.role || 'creator' }), { status: 200, headers });
    } catch (err) {
      return analyticsJson({ error: 'server_error', message: err.message }, 500);
    }
  }

  if (pathname === '/auth/session') {
    const raw = new URL(req.url).searchParams.get('token');
    if (raw && /^[a-zA-Z0-9_-]{16,128}$/.test(raw)) {
      const headers = new Headers({
        location: '/',
        'set-cookie': `frost_session=${raw}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
        'cache-control': 'no-store'
      });
      return new Response(null, { status: 302, headers });
    }
    return new Response(null, { status: 302, headers: { location: '/' } });
  }

  if (pathname === '/auth/logout') {
    const headers = new Headers({
      location: '/',
      'set-cookie': 'frost_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      'cache-control': 'no-store'
    });
    return new Response(null, { status: 302, headers });
  }

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
