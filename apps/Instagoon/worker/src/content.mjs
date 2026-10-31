// Game content (creators, NPC definitions, posts, stories, media) comes from git via the build
// (dist/_content, see scripts/build-content.mjs). D1 keeps a copy so feed queries can join player
// data; the Worker refreshes that copy itself when the deployed bundle version changes.
const BASE = 'https://assets.local/_content/';
let bundle; // per isolate: undefined = not loaded, null = no bundle in this deploy
let seeded = null;

export async function loadBundle(env) {
  if (bundle !== undefined) return bundle;
  try {
    const r = await env.ASSETS?.fetch(BASE + 'content.json');
    bundle = r?.ok && (r.headers.get('content-type') || '').includes('json') ? await r.json() : null;
  } catch { bundle = null; }
  return bundle;
}

// Idempotent. Only touches content tables, and only for creators present in the bundle;
// posts/stories removed from git are suspended, never deleted (player rows reference them).
export async function ensureContent(env) {
  const b = await loadBundle(env);
  if (!b || seeded === b.version) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS content_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)').run();
  const cur = await env.DB.prepare("SELECT value FROM content_meta WHERE key='version'").first();
  if (cur?.value !== b.version) {
    const q = (sql, ...v) => env.DB.prepare(sql).bind(...v);
    const now = Date.now();
    const stmts = [];
    for (const c of b.creators) {
      stmts.push(
        q('INSERT INTO creators(id,name,bio,avatar_key) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,bio=excluded.bio,avatar_key=excluded.avatar_key', c.id, c.name, c.bio, c.avatarKey),
        q('INSERT INTO npc_definitions(creator_id,definition_json,updated_at) VALUES(?,?,?) ON CONFLICT(creator_id) DO UPDATE SET definition_json=excluded.definition_json,updated_at=excluded.updated_at', c.id, JSON.stringify(c.definition), now),
        q("UPDATE posts SET status='suspended' WHERE creator_id=? AND status<>'suspended' AND id NOT IN (SELECT value FROM json_each(?))", c.id, JSON.stringify(c.posts.map(p => p.id))),
        q("UPDATE stories SET status='suspended' WHERE creator_id=? AND status<>'suspended' AND id NOT IN (SELECT value FROM json_each(?))", c.id, JSON.stringify(c.stories.map(s => s.id))),
        ...c.posts.map(p => q('INSERT INTO posts(id,creator_id,caption,media_key,published_at,relationship_required,simulated_likes,status) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET creator_id=excluded.creator_id,caption=excluded.caption,media_key=excluded.media_key,published_at=excluded.published_at,relationship_required=excluded.relationship_required,simulated_likes=excluded.simulated_likes,status=excluded.status', p.id, c.id, p.caption, p.mediaKey, p.publishedAt, p.relationshipRequired, p.simulatedLikes, p.status)),
        ...c.stories.map(s => q('INSERT INTO stories(id,creator_id,type,media_key,published_at,relationship_required,status) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET creator_id=excluded.creator_id,type=excluded.type,media_key=excluded.media_key,published_at=excluded.published_at,relationship_required=excluded.relationship_required,status=excluded.status', s.id, c.id, s.type, s.mediaKey, s.publishedAt, s.relationshipRequired, s.status)),
      );
    }
    stmts.push(q("INSERT INTO content_meta(key,value) VALUES('version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", b.version));
    await env.DB.batch(stmts);
    console.log('content synced', b.version, b.creators.length);
  }
  seeded = b.version;
}

// Media file shipped in the bundle, or null so the caller falls back to D1/R2.
export async function bundledMedia(env, key) {
  const b = await loadBundle(env);
  if (!b?.media.includes(key)) return null;
  const r = await env.ASSETS.fetch(BASE + 'media/' + key.split('/').map(encodeURIComponent).join('/'));
  return r.ok ? { body: r.body, httpMetadata: { contentType: r.headers.get('content-type') } } : null;
}

export function resetContentCache() { bundle = undefined; seeded = null; } // tests only
