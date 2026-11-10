// Game content (creators, NPC definitions, posts, stories, media) comes from git via the build
// (dist/_content, see scripts/build-content.mjs). D1 keeps a copy so feed queries can join player
// data; the Worker refreshes that copy itself when the deployed bundle version changes.
import { applyCreatorResets } from './creator-resets.mjs';
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

// Idempotent. Syncs content tables and retires definitions removed from the bundle;
// referenced content rows are suspended and player records are preserved.
export async function ensureContent(env) {
  const b = await loadBundle(env);
  if (!b || seeded === b.version) return;
  try {
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
        // Episodes have no status column: an episode drops out of the game when none of its revisions is
        // published, so removal from git suspends the revision instead of deleting player state. A published
        // revision is never rewritten — its id is a hash of its nodes (ADR 0004), so re-running only flips status.
        ...c.episodes.map(e => q('INSERT INTO episodes(id,creator_id,title,relationship_required,position) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,creator_id=excluded.creator_id,relationship_required=excluded.relationship_required,position=excluded.position', e.id, c.id, e.title, e.relationshipRequired, e.position)),
        q("UPDATE revisions SET status='suspended' WHERE creator_id=? AND status='published' AND id NOT IN (SELECT value FROM json_each(?))", c.id, JSON.stringify(c.episodes.map(e => e.revisionId))),
        ...c.episodes.map(e => q('INSERT INTO revisions(id,creator_id,episode_id,nodes,status,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status', e.revisionId, c.id, e.id, JSON.stringify(e.nodes), e.status, now)),
      );
    }
    // A creator that was in an earlier bundle and is gone from this one is hidden: its posts and
    // stories/revisions are suspended and its profile/definition removed. Player references stay.
    // Creators that never came from git (older D1 rows) are not touched.
    const meta = async k => JSON.parse((await env.DB.prepare('SELECT value FROM content_meta WHERE key=?').bind(k).first())?.value || '[]');
    const ids = b.creators.map(c => c.id);
    const removed = [...new Set([...(await meta('creators')), ...(await meta('removed_creators'))])].filter(id => !ids.includes(id));
    for (const id of removed) {
      stmts.push(
        q('DELETE FROM npc_definitions WHERE creator_id=?', id),
        q("UPDATE creators SET name='Removed creator',bio='',avatar_key='' WHERE id=?", id),
        q("UPDATE posts SET status='suspended' WHERE creator_id=? AND status<>'suspended'", id),
        q("UPDATE stories SET status='suspended' WHERE creator_id=? AND status<>'suspended'", id),
        q("UPDATE revisions SET status='suspended' WHERE creator_id=? AND status='published'", id),
      );
    }
    const setMeta = (k, v) => q('INSERT INTO content_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', k, v);
    stmts.push(setMeta('creators', JSON.stringify(ids)), setMeta('removed_creators', JSON.stringify(removed)));
    stmts.push(q("INSERT INTO content_meta(key,value) VALUES('version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", b.version));
    await env.DB.batch(stmts);
    console.log('content synced', b.version, b.creators.length);
  }
  await applyCreatorResets(env, b);
  seeded = b.version;
  } catch (cause) {
    if (b.creatorResets?.length) throw Object.assign(new Error('content_reset_pending', { cause }), { contentResetFailed: true });
    throw cause;
  }
}

// Creator ids removed from git since they were last published; [] before the first sync.
export async function removedCreators(env) {
  try {
    return JSON.parse((await env.DB.prepare("SELECT value FROM content_meta WHERE key='removed_creators'").first())?.value || '[]');
  } catch {
    return []; // content_meta does not exist until a bundle has been synced
  }
}

// Media file shipped in the bundle, or null so the caller falls back to D1/R2.
// A browser that accepts webp is given the .webp that scripts/gen-webp.mjs derived beside the PNG (~10% of the
// bytes); the swap happens here, after the caller already authorised `key`, so it changes bytes and never
// permissions. Clients that do not accept webp, and any bundle without the derived file, keep the PNG.
export async function bundledMedia(env, key, accept = '') {
  const b = await loadBundle(env);
  if (!b?.media) return null;
  const webp = /\.png$/i.test(key) && /webp/i.test(accept) ? key.replace(/\.png$/i, '.webp') : null;
  const served = webp && b.media.includes(webp) ? webp : key;
  if (!b.media.includes(served)) return null;
  const r = await env.ASSETS.fetch(BASE + 'media/' + served.split('/').map(encodeURIComponent).join('/'));
  return r.ok ? { body: r.body, httpMetadata: { contentType: r.headers.get('content-type') } } : null;
}

export function resetContentCache() { bundle = undefined; seeded = null; } // tests only
