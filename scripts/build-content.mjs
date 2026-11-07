// Validates apps/Instagoon/content and copies it into the build as dist/_content.
// Runs after `vite build`. No network, no database: the Worker loads the bundle at runtime.
// Usage: node --experimental-strip-types scripts/build-content.mjs [contentDir] [distDir]
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NpcSchema } from '../packages/contracts/npc/schema.ts';

const ID = /^[a-zA-Z0-9_-]{1,80}$/;
const KEY = /^[a-zA-Z0-9_./-]{1,200}$/;
const MAX_FILE = 25 * 1024 * 1024; // Workers Static Assets per-file limit
const STATUS = ['draft', 'published', 'suspended'];
// DM episodes (ADR 0008). The engine reads {id,text,choices:[{id,text,nextNodeId}],end} and nothing else,
// so effects/memory are additions the Worker applies on /choose.
const EP_DIMS = ['closeness', 'trust', 'romance'];
const EP_MAX_NODES = 24;
const EP_TEXT = 180;
const EP_CHOICE_TEXT = 40;
const EP_EFFECT_CAP = 30;
const EP_BEST_GAIN = [20, 24]; // one playthrough must be able to cross thresholds[1] (Lv2)
const EP_MEMORY_KEY = /^[a-zA-Z0-9_.-]{1,60}$/;

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
  // This repo is public and media is served as-is: generator metadata (ComfyUI embeds the full workflow + prompt
  // in PNG text chunks) would publish the private art pipeline. Strip it before committing.
  for (const k of media) if (/\.png$/i.test(k) && pngTextKeys(readFileSync(join(mediaDir, k))).length) err(`media/${k}`, `PNG carries metadata (${pngTextKeys(readFileSync(join(mediaDir, k))).join(', ')}); strip it before committing`);
  // Render recipes and prompt templates stay in the local art pipeline, never in this public repo.
  for (const folder of readdirSync(join(contentDir, 'creators'))) for (const name of ['visual_bible.json', 'production_manifest.json']) {
    const file = join(contentDir, 'creators', folder, name);
    if (existsSync(file) && /masterPromptTemplate|renderRecipe|promptAnchor|negativePrompt|"prompt"/.test(readFileSync(file, 'utf8'))) err(`creators/${folder}/${name}`, 'contains private render recipe/prompt; keep it in the local art pipeline');
  }

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
    const episodes = readJson(join(base, 'episodes.json'), []).map((ep, i) => {
      const w = `${where}/episodes.json[${i}]`;
      uniqueId(w, ep.id);
      if (typeof ep.title !== 'string' || !ep.title.trim() || ep.title.length > 120) err(w, 'title must be text up to 120 chars');
      const rawNodes = Array.isArray(ep.nodes) ? ep.nodes : [];
      if (!rawNodes.length) { err(w, 'nodes must be a non-empty array'); return null; }
      if (rawNodes.length > EP_MAX_NODES) err(w, `nodes must be at most ${EP_MAX_NODES}`);
      const nodeIds = new Set(), choiceIds = new Set();
      for (const n of rawNodes) {
        if (typeof n?.id !== 'string' || !ID.test(n.id)) err(w, 'invalid node id');
        else if (nodeIds.has(n.id)) err(w, `duplicate node id \"${n.id}\"`);
        else nodeIds.add(n.id);
      }
      const nodes = rawNodes.map((n, j) => {
        const nw = `${w}.nodes[${j}]`;
        if (typeof n.text !== 'string' || !n.text.trim()) err(nw, 'text is required');
        else if (n.text.length > EP_TEXT) err(nw, `text is longer than ${EP_TEXT} chars`);
        const end = n.end === true;
        const rawChoices = Array.isArray(n.choices) ? n.choices : [];
        if (end && rawChoices.length) err(nw, 'an end node must have no choices');
        if (!end && !rawChoices.length) err(nw, 'a non-end node needs at least one choice');
        const choices = rawChoices.map((c, k) => {
          const cw = `${nw}.choices[${k}]`;
          if (typeof c.id !== 'string' || !ID.test(c.id)) err(cw, 'invalid choice id');
          else if (choiceIds.has(c.id)) err(cw, `duplicate choice id \"${c.id}\"`);
          else choiceIds.add(c.id);
          if (typeof c.text !== 'string' || !c.text.trim() || c.text.length > EP_CHOICE_TEXT) err(cw, `text must be 1-${EP_CHOICE_TEXT} chars`);
          if (!nodeIds.has(c.nextNodeId)) err(cw, `unknown nextNodeId \"${c.nextNodeId}\"`);
          const clean = { id: c.id, text: c.text, nextNodeId: c.nextNodeId };
          if (c.effects) {
            const eff = {};
            for (const dim of EP_DIMS) {
              const v = c.effects[dim] ?? 0;
              if (!Number.isInteger(v) || Math.abs(v) > EP_EFFECT_CAP) err(`${cw}.effects.${dim}`, `must be an integer within ±${EP_EFFECT_CAP}`);
              eff[dim] = v;
            }
            clean.effects = eff;
          }
          if (c.memory) {
            if (typeof c.memory.key !== 'string' || !EP_MEMORY_KEY.test(c.memory.key)) err(`${cw}.memory`, 'invalid memory key');
            if (typeof c.memory.value !== 'string' || !c.memory.value.trim() || c.memory.value.length > 400) err(`${cw}.memory`, 'memory value must be 1-400 chars');
            clean.memory = { key: c.memory.key, value: c.memory.value };
          }
          return clean;
        });
        return { id: n.id, text: n.text, choices, end };
      });
      const byId = new Map(nodes.map(n => [n.id, n]));
      const reached = new Set([nodes[0].id]), queue = [nodes[0]];
      while (queue.length) for (const c of queue.shift().choices) {
        const next = byId.get(c.nextNodeId);
        if (next && !reached.has(next.id)) { reached.add(next.id); queue.push(next); }
      }
      for (const id of nodeIds) if (!reached.has(id)) err(w, `node \"${id}\" is unreachable from the first node`);
      if (!nodes.some(n => n.end)) err(w, 'no end node');
      const W = npc.relationship.weights;
      const totalW = W.closeness + W.trust + (npc.relationship.romanceEnabled ? W.romance : 0);
      if (totalW <= 0) { err(w, 'character weights must sum above 0 to validate episode gains'); return null; }
      const gains = [];
      const walk = (id, acc, path) => {
        const n = byId.get(id);
        if (!n) return; // an unknown nextNodeId is already reported; path analysis must not crash on it
        if (n.end) { gains.push(Math.round(((acc.closeness * W.closeness + acc.trust * W.trust + acc.romance * W.romance) / totalW) * 10) / 10); return; }
        for (const c of n.choices) {
          if (path.has(c.nextNodeId)) { err(w, `cycle back to node \"${c.nextNodeId}\"`); continue; }
          const e = c.effects || {};
          walk(c.nextNodeId, { closeness: acc.closeness + (e.closeness || 0), trust: acc.trust + (e.trust || 0), romance: acc.romance + (e.romance || 0) }, new Set([...path, c.nextNodeId]));
        }
      };
      walk(nodes[0].id, { closeness: 0, trust: 0, romance: 0 }, new Set([nodes[0].id]));
      const best = Math.max(...gains), worst = Math.min(...gains);
      if (gains.length > 1 && best === worst) err(w, 'every path gives the same score gain, so the choices do not matter');
      if (best < EP_BEST_GAIN[0] || best > EP_BEST_GAIN[1]) err(w, `best path weighted score gain is ${best}, must be ${EP_BEST_GAIN[0]}-${EP_BEST_GAIN[1]} so one playthrough can reach Lv2`);
      if (worst < -EP_EFFECT_CAP) err(w, `worst path costs ${worst}, must not fall below -${EP_EFFECT_CAP}`);
      const revisionId = `rev_${ep.id}_${createHash('sha256').update(JSON.stringify(nodes)).digest('hex').slice(0, 8)}`;
      return { id: ep.id, title: ep.title, relationshipRequired: int(w, ep.relationshipRequired, 0, 100), position: int(w, ep.position, 0, 1000), status: status(w, ep.status), revisionId, nodes };
    }).filter(Boolean);
    creators.push({ id: npc.id, name: npc.name, bio: npc.tagline, avatarKey: npc.avatar || null, definition: npc, posts, stories, episodes });
  }
  const creatorResets = readJson(join(contentDir, 'creator-resets.json'), []);
  if (!Array.isArray(creatorResets) || creatorResets.length > 10) err('creator-resets.json', 'must be an array with at most 10 explicit reset requests');
  else {
    const seen = new Set();
    for (const reset of creatorResets) {
      const active = creators.find(c => c.id === reset?.creatorId);
      if (!reset || Object.keys(reset).some(k => !['id', 'creatorId', 'allowWithCharacterOnly'].includes(k)) || !ID.test(reset.id || '') || !ID.test(reset.creatorId || '') || (reset.allowWithCharacterOnly !== undefined && typeof reset.allowWithCharacterOnly !== 'boolean')) err('creator-resets.json', 'invalid reset id or creatorId');
      else if (seen.has(reset.id)) err('creator-resets.json', 'duplicate reset id');
      else if (active && !(reset.allowWithCharacterOnly === true && active.definition.chatExperiment?.mode === 'character-only')) err('creator-resets.json', 'cannot reset a published creator; remove its reset request before republishing');
      seen.add(reset?.id);
    }
  }
  if (errors.length) throw new Error(`content check failed:\n- ${errors.join('\n- ')}`);

  const hash = createHash('sha256').update(JSON.stringify(creators));
  if (creatorResets.length) hash.update(JSON.stringify(creatorResets));
  for (const k of media.sort()) hash.update(k).update(readFileSync(join(mediaDir, k)));
  const bundle = { version: hash.digest('hex').slice(0, 16), media, creators, creatorResets };
  const out = join(distDir, '_content');
  mkdirSync(out, { recursive: true });
  if (media.length) cpSync(mediaDir, join(out, 'media'), { recursive: true });
  writeFileSync(join(out, 'content.json'), JSON.stringify(bundle));
  // A player pinned to an older revision would keep reading a script that is no longer published. Wiping
  // player progress is never a side effect of a content deploy, so this ships as a file the owner runs.
  const eps = bundle.creators.flatMap(c => c.episodes);
  if (eps.length) {
    const stale = eps.map(e => `(episode_id = '${e.id}' AND revision_id <> '${e.revisionId}')`).join(' OR ');
    writeFileSync(join(out, 'episode-progress-reset.sql'), [
      '-- ADR 0008: ส่งผู้เล่นที่ติดอยู่บน revision เก่ากลับไปเล่นบทเวอร์ชันปัจจุบันใหม่',
      '-- คนที่เล่น revision นี้อยู่แล้วไม่ถูกแตะ. รันหลัง deploy bundle นี้เท่านั้น:',
      '--   pnpm --dir apps/Instagoon exec wrangler d1 execute instagoon-staging --remote \\',
      '--     --config worker/wrangler.staging.toml --file apps/Instagoon/dist/_content/episode-progress-reset.sql',
      `DELETE FROM chat_active WHERE (user_id, episode_id) IN (SELECT user_id, episode_id FROM chat_states WHERE ${stale});`,
      `DELETE FROM chat_history WHERE (user_id, episode_id) IN (SELECT user_id, episode_id FROM chat_states WHERE ${stale});`,
      `DELETE FROM chat_states WHERE ${stale};`,
      ''
    ].join('\n'));
  }
  return bundle;
}

// Keywords of tEXt/zTXt/iTXt chunks in a PNG (where generators store prompts/workflows).
function pngTextKeys(buf) {
  const keys = [];
  for (let i = 8; i + 8 <= buf.length;) {
    const len = buf.readUInt32BE(i), type = buf.toString('latin1', i + 4, i + 8);
    if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') { const d = buf.subarray(i + 8, i + 8 + len); keys.push(d.toString('latin1', 0, Math.max(0, d.indexOf(0)))); }
    if (type === 'IEND') break;
    i += 12 + len;
  }
  return keys;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : e.name.startsWith('.') ? [] : [join(dir, e.name)]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = fileURLToPath(new URL('..', import.meta.url));
  try {
    const b = buildContent(process.argv[2] || join(app, 'content'), process.argv[3] || join(app, 'client', 'dist'));
    console.log(b ? `content ${b.version}: ${b.creators.length} creators, ${b.media.length} media files, ${b.creators.reduce((n, c) => n + c.episodes.length, 0)} episodes` : 'content: none (no content/creators folder)');
  } catch (e) { console.error(e.message); process.exit(1); }
}
