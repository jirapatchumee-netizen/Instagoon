import { ANALYTICS_PATH, analyticsJson, analyticsReady, analyticsReader, cosplayAnalytics } from './analytics-api.mjs';

// The staging UI lives on another origin, so a browser can only read this plane when the owner
// names that origin. Anything else gets no CORS headers and the browser blocks the response body.
function corsHeaders(req, env) {
  const origin = req.headers.get('origin');
  const allowed = String(env.ANALYTICS_ALLOWED_ORIGIN || '');
  if (!origin || !allowed || origin !== allowed) return {};
  return { 'access-control-allow-origin': allowed, 'access-control-allow-credentials': 'true', vary: 'Origin' };
}

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'cookie' } });
    }
    if (req.method !== 'GET') return analyticsJson({ error: 'method_not_allowed' }, 405, cors);
    if (pathname !== ANALYTICS_PATH) return analyticsJson({ error: 'not_found' }, 404, cors);
    if (!analyticsReady(env)) return analyticsJson({ error: 'analytics_disabled' }, 503, cors);
    if (!await analyticsReader(req, env)) return analyticsJson({ error: 'unauthorized' }, 401, cors);
    try {
      return analyticsJson(await cosplayAnalytics(env), 200, cors);
    } catch (e) {
      console.error('analytics read failed', e?.name);
      return analyticsJson({ error: 'analytics_failed' }, 500, cors);
    }
  }
};
