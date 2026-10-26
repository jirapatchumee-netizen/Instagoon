#!/usr/bin/env node
/**
 * Art production CLI for Overtime Secrets.
 *   plan                       create missing shot files and registry entries from scenes + art data
 *   check                      compile every shot and validate presets, sources and ids (no ComfyUI needed)
 *   status                     table of shots
 *   compile <shot>             print the compiled prompt
 *   render <shot> [--n 4] [--seed S] [--denoise D] [--lora L] [--allow-draft]
 *   promote <shot> <v> [--draft]   copy a version into public/art and the registry (--draft = test play only)
 *   feedback <shot> <text>     append owner feedback to the shot
 *   inbox                      list feedback sent from the in-game F2 overlay
 * Render talks to an ALREADY RUNNING ComfyUI (COMFY_URL, default http://127.0.0.1:8188). It never starts,
 * stops, or frees it, and refuses to submit while the queue is busy.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const game = path.join(root, 'games', 'overtime');
const art = path.join(game, 'art');
const COMFY = process.env.COMFY_URL || 'http://127.0.0.1:8188';

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, o) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); };
const die = (m) => { console.error('❌ ' + m); process.exit(1); };
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex');
const fileKey = (s) => s.replace(/[^a-zA-Z0-9_-]/g, '_');

function load() {
  const characters = {};
  for (const f of fs.readdirSync(path.join(art, 'characters'))) if (f.endsWith('.json')) { const c = read(path.join(art, 'characters', f)); characters[c.id] = c; }
  const shots = {};
  const sd = path.join(art, 'shots');
  if (fs.existsSync(sd)) for (const f of fs.readdirSync(sd)) if (f.endsWith('.json')) { const s = read(path.join(sd, f)); shots[s.id] = s; }
  const presets = {};
  for (const f of fs.readdirSync(path.join(art, 'presets'))) if (f.endsWith('.json') && !f.endsWith('.workflow.json')) { const p = read(path.join(art, 'presets', f)); presets[p.id] = p; }
  return { style: read(path.join(art, 'style.json')), characters, locations: read(path.join(art, 'locations.json')), shots, presets, assets: read(path.join(game, 'assets.json')) };
}
const saveShot = (s) => write(path.join(art, 'shots', s.id + '.json'), s);
const saveAssets = (a) => write(path.join(game, 'assets.json'), a);

function scenesUsage() {
  const dir = path.join(game, 'scenes');
  const bgs = new Set(); const sprites = new Set();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const sc = read(path.join(dir, f));
    if (sc.bg) bgs.add(sc.bg);
    for (const n of sc.nodes) {
      if (n.bg) bgs.add(n.bg);
      for (const t of n.cast || []) { const m = /^([a-z_]+)(?::([a-z_]+))?@/.exec(t); if (m) sprites.add(`${m[1]}:${m[2] || 'normal'}`); }
    }
  }
  return { bgs, sprites };
}

// ---------------------------------------------------------------- plan
function plan() {
  const ctx = load();
  const { bgs, sprites } = scenesUsage();
  const wanted = [];
  const anchorChars = new Set();
  for (const id of bgs) {
    const loc = ctx.locations[id];
    if (!loc) { console.error(`⚠️  scene uses bg "${id}" but art/locations.json has no entry`); continue; }
    if (loc.render === false) continue;
    wanted.push({ id, kind: loc.kind, asset: id, cast: (loc.cast || []).map((c) => ({ ...c })), location: id, camera: loc.camera, beat: loc.beat || '', mode: 't2i' });
    for (const c of loc.cast || []) anchorChars.add(c.id);
  }
  const bases = new Set();
  for (const key of sprites) {
    const [cid, expr] = key.split(':');
    const ch = ctx.characters[cid];
    if (!ch) { console.error(`⚠️  scene casts unknown character "${cid}"`); continue; }
    if (!ch.render) continue;
    if (!ch.expressions[expr]) { console.error(`⚠️  ${cid} has no expression "${expr}" in its card`); continue; }
    anchorChars.add(cid); bases.add(cid);
    const o = ch.default_outfit;
    wanted.push({ id: `sp_${cid}_${expr}`, kind: 'sprite', asset: key, cast: [{ id: cid, outfit: o, expression: expr, pose: 'standing relaxed, hands resting naturally in front' }],
      mode: 'i2i', source: expr === 'normal' ? `sheet_${cid}_${o}_full` : `sp_${cid}_normal`, denoise: expr === 'normal' ? 0.6 : 0.45, beat: '' });
  }
  for (const cid of bases) { // make sure a base sprite exists for expression variants
    const ch = ctx.characters[cid]; const o = ch.default_outfit;
    if (!wanted.find((w) => w.id === `sp_${cid}_normal`)) wanted.push({ id: `sp_${cid}_normal`, kind: 'sprite', asset: `${cid}:normal`, cast: [{ id: cid, outfit: o, expression: 'normal', pose: 'standing relaxed, hands resting naturally in front' }], mode: 'i2i', source: `sheet_${cid}_${o}_full`, denoise: 0.6, beat: '' });
  }
  for (const cid of anchorChars) {
    const ch = ctx.characters[cid]; if (!ch?.render) continue;
    const o = ch.default_outfit;
    for (const part of ['full', 'face'])
      wanted.push({ id: `sheet_${cid}_${o}_${part}`, kind: `sheet_${part}`, asset: null, cast: [{ id: cid, outfit: o, expression: 'normal' }], mode: 't2i', beat: '' });
  }
  let created = 0;
  for (const w of wanted) {
    if (ctx.shots[w.id]) continue;
    const shot = { ...w, preset: w.mode === 'i2i' ? 'zit-i2i-544x960-v1' : 'zit-t2i-544x960-v1', seed: parseInt(hash(w.id).slice(0, 7), 16), status: 'todo', approved: null, versions: [], feedback: [] };
    saveShot(shot); created++;
    if (shot.asset && !ctx.assets.assets[shot.asset]) ctx.assets.assets[shot.asset] = { kind: shot.kind, status: 'missing', shot: shot.id };
  }
  for (const w of wanted) if (w.asset && w.kind === 'sprite' && !ctx.assets.assets[w.asset]) ctx.assets.assets[w.asset] = { kind: 'sprite', status: 'missing', shot: w.id };
  saveAssets(ctx.assets);
  console.log(`plan: ${wanted.length} shots wanted, ${created} created, ${wanted.length - created} already existed`);
  status();
}

// ---------------------------------------------------------------- compile
const COMPOSITION = {
  sheet_full: 'Character design reference: a single full-body figure standing in a relaxed neutral pose, front view, head to feet fully visible, centered on a plain flat light-gray studio background with no scenery.',
  sheet_face: 'Character design reference: a close-up of the face and shoulders, front view, centered on a plain flat light-gray studio background with no scenery.',
  sprite: 'Visual novel character sprite: a three-quarter-length figure from head to knees, facing the viewer, centered on a plain flat light-gray background with no scenery or props behind her.',
  bg: 'Background illustration with no people and no characters, an empty scene, wide establishing view composed for a vertical 9:16 frame.',
  cg: 'Full-screen visual novel event illustration composed for a vertical 9:16 frame.',
};

function compile(shot, ctx) {
  const parts = [ctx.style.short + '.', COMPOSITION[shot.kind] || ''];
  const many = shot.cast.length > 1;
  shot.cast.forEach((c, i) => {
    const ch = ctx.characters[c.id];
    if (!ch) throw new Error(`${shot.id}: unknown character ${c.id}`);
    const outfit = ch.outfits[c.outfit || ch.default_outfit];
    if (!outfit) throw new Error(`${shot.id}: ${c.id} has no outfit ${c.outfit}`);
    const ex = ch.expressions[c.expression || 'normal'];
    if (!ex) throw new Error(`${shot.id}: ${c.id} has no expression ${c.expression}`);
    let t = `${many ? `Person ${i + 1}: ` : ''}${ch.identity.summary} She wears ${outfit}. Expression: ${ex.text}.`;
    if (c.pose) t += ` Pose: ${c.pose}.`;
    parts.push(t);
  });
  const loc = ctx.locations[shot.location || shot.asset];
  if (loc && loc.text) parts.push(`Setting: ${loc.text}.${loc.light ? ' Lighting: ' + loc.light + '.' : ''}${loc.time ? ' Time: ' + loc.time + '.' : ''}`);
  if (shot.camera) parts.push(`Camera: ${shot.camera}.`);
  if (shot.beat) parts.push(shot.beat.endsWith('.') ? shot.beat : shot.beat + '.');
  parts.push(fs.readFileSync(path.resolve(art, ctx.style.detail_file), 'utf8').trim());
  return parts.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------- check
function check() {
  const ctx = load(); let bad = 0;
  const err = (m) => { console.error('❌ ' + m); bad++; };
  for (const p of Object.values(ctx.presets)) {
    const wfPath = path.join(art, 'presets', p.workflow);
    if (!fs.existsSync(wfPath)) { err(`preset ${p.id}: workflow file missing`); continue; }
    const wf = read(wfPath);
    for (const [k, [node, input]] of Object.entries(p.inject)) if (!wf[node] || !(input in wf[node].inputs)) err(`preset ${p.id}: inject "${k}" -> ${node}.${input} not in workflow`);
    if (!wf[p.output_node]) err(`preset ${p.id}: output node ${p.output_node} missing`);
  }
  for (const s of Object.values(ctx.shots)) {
    try { const t = compile(s, ctx); if (t.length < 200) err(`${s.id}: prompt suspiciously short`); } catch (e) { err(e.message); }
    if (!ctx.presets[s.preset]) err(`${s.id}: unknown preset ${s.preset}`);
    if (s.mode === 'i2i' && !ctx.shots[s.source]) err(`${s.id}: source shot ${s.source} does not exist`);
    if (s.asset && !ctx.assets.assets[s.asset]) err(`${s.id}: asset ${s.asset} missing from assets.json (run plan)`);
  }
  for (const [k, a] of Object.entries(ctx.assets.assets)) {
    if (a.file && a.status !== 'procedural' && !fs.existsSync(path.join(root, 'public', a.file))) err(`asset ${k}: file ${a.file} not found in public/`);
  }
  const { bgs, sprites } = scenesUsage();
  for (const b of bgs) if (!ctx.assets.assets[b]) err(`scene uses bg ${b} that is not in assets.json`);
  for (const sp of sprites) { const cid = sp.split(':')[0]; if (ctx.characters[cid]?.render && !ctx.assets.assets[sp]) err(`scene casts ${sp} that is not in assets.json`); }
  console.log(bad ? `art check: ${bad} problem(s)` : `art check: ok (${Object.keys(ctx.shots).length} shots, ${Object.keys(ctx.presets).length} presets, ${Object.keys(ctx.assets.assets).length} assets)`);
  process.exit(bad ? 1 : 0);
}

// ---------------------------------------------------------------- status
function status() {
  const ctx = load();
  const rows = Object.values(ctx.shots).sort((a, b) => a.id.localeCompare(b.id));
  console.log('\n' + 'shot'.padEnd(36) + 'kind'.padEnd(12) + 'mode'.padEnd(6) + 'status'.padEnd(16) + 'versions  approved');
  for (const s of rows) console.log(s.id.padEnd(36) + s.kind.padEnd(12) + s.mode.padEnd(6) + s.status.padEnd(16) + String(s.versions.length).padEnd(10) + (s.approved ?? '-'));
  const counts = {}; for (const a of Object.values(ctx.assets.assets)) counts[a.status] = (counts[a.status] || 0) + 1;
  console.log('\nassets:', JSON.stringify(counts));
}

// ---------------------------------------------------------------- render
async function comfy(route, init) {
  const r = await fetch(COMFY + route, init);
  if (!r.ok) throw new Error(`${route} -> HTTP ${r.status} ${await r.text().catch(() => '')}`);
  return r;
}

function versionFile(shot, v) { return path.join(art, 'renders', shot.id, `v${v}.png`); }

async function render(id, flags) {
  const ctx = load(); const shot = ctx.shots[id];
  if (!shot) die(`unknown shot ${id}`);
  const preset = ctx.presets[shot.preset]; if (!preset) die(`unknown preset ${shot.preset}`);
  if (preset.status?.startsWith('UNTESTED')) console.warn(`⚠️  preset ${preset.id} is untested; check the first result by eye.`);
  try { await comfy('/system_stats'); } catch { die(`ComfyUI is not reachable at ${COMFY}. This tool never starts it.`); }
  const q = await (await comfy('/queue')).json();
  if ((q.queue_running?.length || q.queue_pending?.length) && !flags.force) die('ComfyUI queue is busy; refusing to add work. Wait, or pass --force.');

  const prompt = compile(shot, ctx);
  const wfBase = read(path.join(art, 'presets', preset.workflow));
  let srcName = null;
  if (preset.mode === 'i2i') {
    const src = ctx.shots[shot.source];
    const v = src.approved ?? (flags['allow-draft'] ? src.versions.at(-1)?.v : null);
    if (!v) die(`source ${shot.source} has no approved version${src.versions.length ? ' (use --allow-draft to take the latest)' : ''}`);
    const form = new FormData();
    srcName = `vn_${shot.id}_src.png`;
    form.append('image', new Blob([fs.readFileSync(versionFile(src, v))], { type: 'image/png' }), srcName);
    form.append('overwrite', 'true');
    await comfy('/upload/image', { method: 'POST', body: form });
  }
  const n = Number(flags.n || 1);
  const baseSeed = flags.seed != null ? Number(flags.seed) : shot.seed;
  for (let i = 0; i < n; i++) {
    const v = (shot.versions.reduce((m, x) => Math.max(m, x.v), 0)) + 1;
    const seed = baseSeed + i;
    const wf = JSON.parse(JSON.stringify(wfBase));
    const set = (k, val) => { const [node, input] = preset.inject[k]; wf[node].inputs[input] = val; };
    set('prompt', prompt); set('seed', seed); set('prefix', `vn_${shot.id}_v${v}`);
    set('steps', preset.defaults.steps);
    set('lora_strength', flags.lora != null ? Number(flags.lora) : preset.defaults.lora_strength);
    const denoise = flags.denoise != null ? Number(flags.denoise) : (shot.denoise ?? preset.defaults.denoise);
    if (preset.mode === 'i2i') { set('denoise', denoise); set('image', srcName); }
    const clientId = crypto.randomUUID();
    const res = await (await comfy('/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: wf, client_id: clientId }) })).json();
    const pid = res.prompt_id; if (!pid) die('ComfyUI returned no prompt_id: ' + JSON.stringify(res));
    process.stdout.write(`${shot.id} v${v} seed ${seed} queued ${pid.slice(0, 8)} `);
    const t0 = Date.now(); let hist = null;
    while (Date.now() - t0 < 600000) {
      const h = await (await comfy(`/history/${pid}`)).json();
      if (h[pid]?.status?.completed || h[pid]?.outputs?.[preset.output_node]) { hist = h[pid]; break; }
      if (h[pid]?.status?.status_str === 'error') die('\nComfyUI reported an error: ' + JSON.stringify(h[pid].status));
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!hist) die(`\ntimed out waiting for ${pid}. It may still be running in ComfyUI; do not resubmit blindly.`);
    const img = hist.outputs?.[preset.output_node]?.images?.[0]; if (!img) die('\nno image in history output');
    const buf = Buffer.from(await (await comfy(`/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type || 'output'}`)).arrayBuffer());
    fs.mkdirSync(path.dirname(versionFile(shot, v)), { recursive: true });
    fs.writeFileSync(versionFile(shot, v), buf);
    const meta = { v, seed, denoise: preset.mode === 'i2i' ? denoise : null, preset: preset.id, mode: preset.mode, source: preset.mode === 'i2i' ? { shot: shot.source } : null, prompt, promptHash: hash(prompt), comfyPromptId: pid, seconds: Math.round((Date.now() - t0) / 1000), created: new Date().toISOString() };
    write(versionFile(shot, v).replace(/\.png$/, '.json'), meta);
    shot.versions.push({ v, seed, promptHash: meta.promptHash, qa: null, owner: null, created: meta.created });
    shot.status = 'review';
    saveShot(shot);
    console.log(`done in ${meta.seconds}s -> ${path.relative(root, versionFile(shot, v))}`);
  }
}

// ---------------------------------------------------------------- promote / feedback / inbox
function promote(id, v, flags) {
  const ctx = load(); const shot = ctx.shots[id]; if (!shot) die(`unknown shot ${id}`);
  const ver = shot.versions.find((x) => x.v === Number(v)); if (!ver) die(`${id} has no v${v}`);
  if (!shot.asset) { shot.approved = ver.v; shot.status = 'approved'; saveShot(shot); console.log(`${id} v${v} approved as an anchor (not used in game).`); return; }
  const dir = shot.kind === 'sprite' ? 'sprites' : shot.kind === 'cg' ? 'cg' : 'bg';
  const rel = `/art/${dir}/${fileKey(shot.asset)}.v${ver.v}.png`;
  fs.mkdirSync(path.join(root, 'public', 'art', dir), { recursive: true });
  fs.copyFileSync(versionFile(shot, ver.v), path.join(root, 'public', rel));
  ctx.assets.assets[shot.asset] = { kind: shot.kind, status: flags.draft ? 'draft' : 'approved', shot: shot.id, version: ver.v, file: rel };
  if (!flags.draft) shot.approved = ver.v;
  shot.status = flags.draft ? 'in-game-draft' : 'approved';
  saveShot(shot); saveAssets(ctx.assets);
  console.log(`${id} v${ver.v} -> ${rel} (${flags.draft ? 'draft' : 'approved'})`);
}

function feedback(id, text) {
  const ctx = load(); const shot = ctx.shots[id]; if (!shot) die(`unknown shot ${id}`);
  shot.feedback.push({ at: new Date().toISOString(), text }); saveShot(shot); console.log('saved');
}
function inbox() {
  const f = path.join(art, 'feedback.jsonl');
  if (!fs.existsSync(f)) return console.log('inbox empty');
  fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).forEach((l, i) => console.log(`#${i + 1}`, l));
}

// ---------------------------------------------------------------- main
const [cmd, ...rest] = process.argv.slice(2);
const flags = {}; const pos = [];
for (let i = 0; i < rest.length; i++) { if (rest[i].startsWith('--')) { const k = rest[i].slice(2); const nx = rest[i + 1]; if (nx && !nx.startsWith('--')) { flags[k] = nx; i++; } else flags[k] = true; } else pos.push(rest[i]); }
switch (cmd) {
  case 'plan': plan(); break;
  case 'check': check(); break;
  case 'status': status(); break;
  case 'compile': { const ctx = load(); const s = ctx.shots[pos[0]]; if (!s) die('unknown shot'); console.log(compile(s, ctx)); break; }
  case 'render': await render(pos[0], flags); break;
  case 'promote': promote(pos[0], pos[1], flags); break;
  case 'feedback': feedback(pos[0], pos.slice(1).join(' ')); break;
  case 'inbox': inbox(); break;
  default: console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace('#!/usr/bin/env node\n', ''));
}
