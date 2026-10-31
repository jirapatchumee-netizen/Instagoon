// Validates apps/Instagoon/content and copies it into the build as dist/_content.
// Runs after `vite build`. No network, no database: the Worker loads the bundle at runtime.
// Usage: node --experimental-strip-types scripts/build-content.mjs [contentDir] [distDir]
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NpcSchema } from '../../../src/modules/npc-studio/lib/npc/schema.ts';

const ID = /^[a-zA-Z0-9_-]{1,80}$/;
const KEY = /^[a-zA-Z0-9_./-]{1,200}$/;
const MAX_FILE = 25 * 1024 * 1024; // Workers Static Assets per-file limit
const STATUS = ['draft', 'published', 'suspended'];

export function buildContent(contentDir, distDir) {
  if (!existsSync(join(contentDir, 'creators'))) return null;
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const readJson = (file, fallback) => {
    if (!existsSync(file)) return fallback;
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch (e) { err(relative(contentDir, file), `invalid JSON (${e.message})`); return fallback; }
  };
  const mediaDir = join(contentDir, 'media');
  const media = existsSync(mediaDir) ? walk(mediaDir).map(f => relative(mediaDir, f).split(sep).join('/')) : [];
  const mediaSet = new Set(media);
  const needMedia = (where, k) => {
    if (!k) return;
    if (!KEY.test(k) || k.includes('..')) err(where, `invalid media key "${k}"`);
    else if (!mediaSet.has(k)) err(where, `missing file content/media/${k}`);
  };
  for (const k of media) if (statSync(join(mediaDir, k)).size > MAX_FILE) err(`media/${k}`, 'larger than 25 MiB');

  const ids = new Set();
  const uniqueId = (where, id) => {
    if (typeof id !== 'string' || !ID.test(id)) return err(where, `invalid id "${id}"`);
    if (ids.has(id)) err(where, `duplicate id "${id}"`);
    ids.add(id);
  };
  const time = (where, v) => { const t = Date.parse(v); if (!Number.isFinite(t)) err(where, `invalid publishedAt "${v}"`); return t; };
  const int = (where, v, min, max) => { const n = v ?? 0; if (!Number.isInteger(n) || n < min || n > max) err(where, `must be an integer ${min}-${max}`); return n; };
  const status = (where, v) => { const s = v ?? 'published'; if (!STATUS.includes(s)) err(where, `status must be ${STATUS.join('/')}`); return s; };

  const creators = [];
  for (const folder of readdirSync(join(contentDir, 'creators')).filter(f => statSync(join(contentDir, 'creators', f)).isDirectory()).sort()) {
    const base = join(contentDir, 'creators', folder);
    const where = `creators/${folder}`;
    const parsed = NpcSchema.safeParse(readJson(join(base, 'character.json'), undefined));
    if (!parsed.success) { err(`${where}/character.json`, parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')); continue; }
    const npc = parsed.data;
    if (npc.id !== folder) err(`${where}/character.json`, `id "${npc.id}" must match folder name`);
    needMedia(`${where}/character.json avatar`, npc.avatar);
    for (const r of npc.rewards) needMedia(`${where}/character.json reward ${r.id}`, r.asset);
    const posts = readJson(join(base, 'posts.json'), []).map((p, i) => {
      const w = `${where}/posts.json[${i}]`;
      uniqueId(w, p.id);
      if (typeof p.caption !== 'string' || p.caption.length > 2200) err(w, 'caption must be text up to 2200 chars');
      needMedia(w, p.media);
      return { id: p.id, caption: p.caption, mediaKey: p.media || null, publishedAt: time(w, p.publishedAt), relationshipRequired: int(w, p.relationshipRequired, 0, 100), simulatedLikes: int(w, p.simulatedLikes, 0, 1e9), status: status(w, p.status) };
    });
    const stories = readJson(join(base, 'stories.json'), []).map((s, i) => {
      const w = `${where}/stories.json[${i}]`;
      uniqueId(w, s.id);
      if (!['broadcast', 'unlockable'].includes(s.type)) err(w, 'type must be broadcast/unlockable');
      if (!s.media) err(w, 'media is required'); else needMedia(w, s.media);
      return { id: s.id, type: s.type, mediaKey: s.media, publishedAt: time(w, s.publishedAt), relationshipRequired: int(w, s.relationshipRequired, 0, 100), status: status(w, s.status) };
    });
    creators.push({ id: npc.id, name: npc.name, bio: npc.tagline, avatarKey: npc.avatar || null, definition: npc, posts, stories });
  }
  if (errors.length) throw new Error(`content check failed:\n- ${errors.join('\n- ')}`);

  const hash = createHash('sha256').update(JSON.stringify(creators));
  for (const k of media.sort()) hash.update(k).update(readFileSync(join(mediaDir, k)));
  const bundle = { version: hash.digest('hex').slice(0, 16), media, creators };
  const out = join(distDir, '_content');
  mkdirSync(out, { recursive: true });
  if (media.length) cpSync(mediaDir, join(out, 'media'), { recursive: true });
  writeFileSync(join(out, 'content.json'), JSON.stringify(bundle));
  return bundle;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : e.name.startsWith('.') ? [] : [join(dir, e.name)]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = fileURLToPath(new URL('..', import.meta.url));
  try {
    const b = buildContent(process.argv[2] || join(app, 'content'), process.argv[3] || join(app, 'dist'));
    console.log(b ? `content ${b.version}: ${b.creators.length} creators, ${b.media.length} media files` : 'content: none (no content/creators folder)');
  } catch (e) { console.error(e.message); process.exit(1); }
}
