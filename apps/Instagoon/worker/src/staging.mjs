import app from './index.mjs';

const headers = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };

async function allowed(req, env) {
 const raw = req.headers.get('cookie')?.match(/(?:^|;\s*)frost_session=([^;]+)/)?.[1];
 if (!raw || !env.STAGING_EMAILS) return false;
 const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
 const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
 const user = await env.DB.prepare('SELECT u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?').bind(hash, Date.now()).first();
 return !!user && env.STAGING_EMAILS.split(',').some(email => email.trim().toLowerCase() === user.email.toLowerCase());
}

export default {
 async fetch(req, env, ctx) {
  const { pathname } = new URL(req.url);
  if (pathname === '/auth/google' || pathname === '/auth/callback') {
   if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.STAGING_EMAILS) return new Response('Staging sign-in is not configured', { status: 503, headers });
   return app.fetch(req, env, ctx);
  }
  if (!await allowed(req, env)) {
   if (req.method === 'GET' && (pathname === '/' || pathname.startsWith('/staging-login/') || pathname === '/privacy' || pathname === '/privacy.html' || pathname === '/terms' || pathname === '/terms.html' || pathname === '/legal.css' || pathname === '/legal.js')) {
    const assetUrl = new URL(req.url);
    if (pathname === '/') assetUrl.pathname = '/staging-login/staging-login';
    const response = await env.ASSETS.fetch(new Request(assetUrl, req));
    const result = new Response(response.body, response);
    for (const [key, value] of Object.entries(headers)) result.headers.set(key, value);
    return result;
   }
   return new Response('Unauthorized', { status: 401, headers });
  }
  if (pathname === '/studio' || pathname === '/studio.html' || pathname.startsWith('/api/admin/') || pathname.startsWith('/api/dev/') || pathname === '/auth/login' || pathname === '/auth/demo') return new Response('Not found', { status: 404, headers });
  if (pathname.startsWith('/api/')) return app.fetch(req, env, ctx);
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers });
  const response = await env.ASSETS.fetch(req);
  const result = new Response(response.body, response);
  result.headers.set('cache-control', 'no-store');
  result.headers.set('x-robots-tag', 'noindex, nofollow');
  return result;
 }
};
