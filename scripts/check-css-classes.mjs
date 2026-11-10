#!/usr/bin/env node
// Every `fs-*` class the player markup applies must have a rule in the player CSS. A typo or a deleted rule
// otherwise renders silently: the element falls back to the base `.fs-avatar` sizing contract (width:100%) and
// the row blows past the phone frame — the 2026-11-10 Profile > Following bug was `fs-avatar-md`, used twice,
// defined nowhere. Static check, no browser.
//
//   node scripts/check-css-classes.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SKIP = new Set(['node_modules', 'dist', '.wrangler', '.git']);
const TOKEN = /\bfs-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/g;
// Only class attributes count. Scanning whole lines would flag `id="fs-profile-title"` and other hooks that
// were never meant to have a rule.
const CLASS_ATTR = /className\s*=\s*(?:"([^"]*)"|\{([^}]*)\})/g;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(join(ROOT, 'client'));
const defined = new Set();
for (const f of files.filter((f) => f.endsWith('.css')))
  for (const m of readFileSync(f, 'utf8').matchAll(TOKEN)) defined.add(m[0]);

// Dead classes that predate this check, recorded so it can stop new ones without blocking every PR on debt it
// did not create. Delete an entry when its rule is added or the token is dropped; the list only shrinks.
const BASELINE = new Set([
  'fs-alert-error',
  'fs-avatar-picker-section',
  'fs-dm-composer-wrap',
  'fs-explore-section',
  'fs-home-tab',
  'fs-notifs-list',
  'fs-player-subtab-content',
  'fs-story-expired',
  'fs-vault-card-inner',
  'fs-verified',
]);

const missing = [];
for (const f of files.filter((f) => /\.(tsx?|jsx?)$/.test(f))) {
  readFileSync(f, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const attr of line.matchAll(CLASS_ATTR)) {
        for (const m of (attr[1] ?? attr[2]).matchAll(TOKEN))
          if (!defined.has(m[0]) && !BASELINE.has(m[0])) missing.push({ cls: m[0], at: `${relative(ROOT, f)}:${i + 1}` });
      }
    });
}

if (missing.length) {
  console.error(`${missing.length} class(es) used in markup with no rule in the player CSS:`);
  for (const { cls, at } of missing) console.error(`  .${cls}  ← ${at}`);
  process.exit(1);
}
console.log(`css-class check ok: ${defined.size} fs-* classes defined, none missing (${BASELINE.size} baselined)`);
