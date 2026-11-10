#!/usr/bin/env node
// Derived delivery format for content art: a .webp beside each .png, so /api/media can serve roughly a tenth
// of the bytes (scripts/gen-webp.mjs + bundledMedia in server/src/content.mjs). The PNG the art pipeline owns
// is never rewritten, and the .webp files are committed, so CI needs no encoder.
//
// Local tool — needs python3 with Pillow (`pip install pillow`). Run it after adding or replacing a PNG:
//   node scripts/gen-webp.mjs             # write missing or stale .webp
//   node scripts/gen-webp.mjs --check     # exit 1 if any PNG lacks an up-to-date .webp (no writes)
//   node scripts/gen-webp.mjs --force     # rewrite every .webp
// Every output is verified against its source: same pixel dimensions and a mean absolute error under 8, or
// the file is rejected and the run fails. A .webp that is not smaller than its PNG is dropped, not kept.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const MEDIA = join(ROOT, 'content', 'media');
const QUALITY = 90;
const MAX_MAE = 8;
const flag = (n) => process.argv.includes(`--${n}`);

const pngs = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.toLowerCase().endsWith('.png')) pngs.push(p);
  }
})(MEDIA);

const key = (p) => relative(MEDIA, p).split(sep).join('/');
const stale = (png) => {
  const w = png.replace(/\.png$/i, '.webp');
  return !existsSync(w) || statSync(w).size === 0 || statSync(w).mtimeMs < statSync(png).mtimeMs;
};
const missing = pngs.filter((p) => !existsSync(p.replace(/\.png$/i, '.webp')));
const outOfDate = pngs.filter((p) => existsSync(p.replace(/\.png$/i, '.webp')) && stale(p));

if (flag('check')) {
  const bad = pngs.filter(stale);
  for (const p of bad) console.log(`stale or missing: content/media/${key(p)}`);
  console.log(`${pngs.length - bad.length}/${pngs.length} PNG have an up-to-date .webp`);
  process.exit(bad.length ? 1 : 0);
}

const todo = pngs.filter((p) => flag('force') || stale(p));
if (!todo.length) {
  console.log(`every PNG already has a .webp (${pngs.length} files) — nothing to do`);
  process.exit(0);
}

const PY = `
import json, os, sys
from PIL import Image, ImageChops
out = []
for src, dst in json.load(sys.stdin):
    im = Image.open(src)
    rgb = im.convert('RGB')
    rgb.save(dst, 'WEBP', quality=${QUALITY}, method=6)
    back = Image.open(dst)
    diff = ImageChops.difference(back.convert('RGB'), rgb)
    hist = diff.histogram()
    samples = back.size[0] * back.size[1] * 3
    mae = sum(i * (hist[i] + hist[i + 256] + hist[i + 512]) for i in range(256)) / samples
    out.append({'dst': dst, 'src_size': list(im.size), 'dst_size': list(back.size), 'mae': round(mae, 2),
                'src_bytes': os.path.getsize(src), 'dst_bytes': os.path.getsize(dst)})
print(json.dumps(out))
`;

let rows;
try {
  rows = JSON.parse(
    execFileSync('python3', ['-c', PY], { input: JSON.stringify(todo.map((p) => [p, p.replace(/\.png$/i, '.webp')])) }).toString(),
  );
} catch (e) {
  console.error(
    `needs python3 with Pillow (pip install pillow):\n${(e.stderr || e.message).toString().trim().split('\n').slice(-3).join('\n')}`,
  );
  process.exit(1);
}

let fail = 0;
const pad = (s, n) => String(s).padEnd(n);
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
console.log(`${pad('media key', 34)}${pad('png', 9)}${pad('webp', 9)}${pad('of png', 9)}MAE`);
for (const r of rows) {
  const k = key(r.dst);
  const pct = Math.round((r.dst_bytes / r.src_bytes) * 100);
  const why =
    r.mae > MAX_MAE ? `MAE ${r.mae} > ${MAX_MAE}` :
    r.src_size.join('x') !== r.dst_size.join('x') ? `resized ${r.src_size.join('x')} -> ${r.dst_size.join('x')}` :
    pct >= 100 ? `not smaller than the PNG (${pct}%)` : '';
  if (why) {
    fail++;
    rmSync(r.dst, { force: true });
    console.log(`${pad(k, 34)}${pad(kb(r.src_bytes), 9)}${pad(kb(r.dst_bytes), 9)}${pad(pct + '%', 9)}REJECTED (${why})`);
    continue;
  }
  console.log(`${pad(k, 34)}${pad(kb(r.src_bytes), 9)}${pad(kb(r.dst_bytes), 9)}${pad(pct + '%', 9)}${r.mae}`);
}
console.log(`\nwrote ${rows.length - fail}/${rows.length} .webp at quality ${QUALITY} (${pngs.length - todo.length} were already current)`);
if (fail) {
  console.error(`${fail} file(s) rejected: the .webp was not faithful (MAE > ${MAX_MAE}) or not smaller. PNG unchanged.`);
  process.exit(1);
}
console.log('commit the .webp files; /api/media serves them to browsers that accept webp.');
