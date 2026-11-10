#!/usr/bin/env node
// UI audit for the player app: the checks a human tester ran by hand in the 2026-11-09 audit, as a script.
// Deterministic, no AI. It only reads: GET requests and switching the bottom tabs. It never likes, saves,
// comments, opens a story or sends a DM, so it is safe to point at staging.
//
//   node scripts/ui-audit.mjs                                  # local Worker on :8799, logs in with /auth/demo
//   node scripts/ui-audit.mjs --base https://staging.instagoon.app --storage-state ~/instagoon-staging.json
//   node scripts/ui-audit.mjs --follow-all                     # local only: follow every creator first so the
//                                                              # feed, stories and Reels have something to check
// Options: --out <dir> (report.json + report.md, default ./ui-audit-report) · --chrome <path> (else Chrome channel)
// Exit code 1 when any check of severity "error" fails; "warn" findings are reported but do not fail.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const flag = (name) => process.argv.includes(`--${name}`);
const BASE = arg('base', 'http://127.0.0.1:8799').replace(/\/$/, '');
const OUT = arg('out', 'ui-audit-report');
const STORAGE = arg('storage-state');
const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(BASE);

const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812, mobile: true },
  { name: 'iphone-se', width: 375, height: 667, mobile: true },
  { name: 'desktop', width: 1280, height: 800, mobile: false },
];
const LANGS = ['en', 'th', 'ja'];
const TABS = ['home', 'explore', 'reels', 'inbox', 'profile']; // order of .fs-insta-bottom-bar buttons
const THAI = /[฀-๿]/;
const BUDGET = { imageBytes: 200 * 1024, pageImageBytes: 2 * 1024 * 1024, apiMs: 1000 };

mkdirSync(OUT, { recursive: true });
const findings = [];
const add = (severity, check, where, detail) => findings.push({ severity, check, where, detail });

async function login(context) {
  if (STORAGE) return; // the storage state already carries the session cookie
  if (!LOCAL) throw new Error('--storage-state is required for a non-local --base (/auth/demo only exists on localhost)');
  const page = await context.newPage();
  await page.goto(`${BASE}/auth/demo?redirect=/`);
  if (flag('follow-all')) {
    await page.evaluate(async () => {
      const { creators } = await (await fetch('/api/creators')).json();
      for (const c of creators.filter((x) => !x.following))
        await fetch(`/api/creators/${c.id}/follow`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ follow: true }) });
    });
  }
  await page.close();
}

// Every string that is game content (creator names, bios, captions, comments, DM previews). Thai inside these
// is expected in every language; Thai anywhere else on an en/ja page is UI text that was not translated.
async function contentStrings(page) {
  return page.evaluate(async () => {
    const get = async (u) => (await fetch(u)).json().catch(() => ({}));
    const [{ creators = [] }, { posts = [] }] = await Promise.all([get('/api/creators'), get('/api/feed')]);
    const out = [];
    for (const c of creators) out.push(c.name, c.bio, c.lastMessage?.text);
    for (const p of posts) out.push(p.caption, p.creatorName, ...(p.comments || []).map((x) => x.content));
    return out.filter(Boolean).sort((a, b) => b.length - a.length);
  });
}

async function mediaCrawl(page) {
  const results = await page.evaluate(async () => {
    const get = async (u) => (await fetch(u)).json().catch(() => ({}));
    const [{ creators = [] }, { posts = [] }, { stories = [] }] = await Promise.all([get('/api/creators'), get('/api/feed'), get('/api/stories')]);
    const keys = [
      ...creators.filter((c) => c.avatarKey).map((c) => ['avatar ' + c.id, c.avatarKey]),
      ...posts.filter((p) => p.mediaKey).map((p) => ['post ' + p.id, p.mediaKey]),
      // An unopened Exclusive Story is 404 by design until the player opens it.
      ...stories.filter((s) => s.mediaKey && (s.type === 'broadcast' || s.firstViewedAt)).map((s) => ['story ' + s.id, s.mediaKey]),
    ];
    const out = [];
    for (const [what, key] of keys) {
      const r = await fetch('/api/media/' + key.split('/').map(encodeURIComponent).join('/'));
      const size = (await r.arrayBuffer()).byteLength;
      out.push({ what, key, status: r.status, size, cache: r.headers.get('cache-control') });
    }
    return out;
  });
  for (const m of results) {
    if (m.status !== 200) add('error', 'media-missing', m.what, `${m.key} → HTTP ${m.status}`);
    else if (m.size > BUDGET.imageBytes) add('warn', 'image-weight', m.what, `${m.key} is ${Math.round(m.size / 1024)} KB (budget ${BUDGET.imageBytes / 1024} KB)`);
    if (m.status === 200 && /no-store/.test(m.cache || '')) add('warn', 'media-cache', m.what, `${m.key} is served with cache-control: ${m.cache}`);
  }
}

async function apiTiming(page) {
  const rows = await page.evaluate(async () => {
    const out = [];
    for (const u of ['/api/me', '/api/feed', '/api/creators', '/api/stories']) {
      const t = performance.now();
      const r = await fetch(u);
      await r.text();
      out.push({ u, status: r.status, ms: Math.round(performance.now() - t), server: r.headers.get('server-timing') });
    }
    return out;
  });
  for (const r of rows) {
    if (r.status >= 400) add('error', 'api-status', r.u, `HTTP ${r.status}`);
    else if (r.ms > BUDGET.apiMs) add('warn', 'api-latency', r.u, `${r.ms} ms (budget ${BUDGET.apiMs} ms; ${r.server || 'no server-timing'})`);
  }
  return rows;
}

// Checks run on whatever tab is showing.
async function inspect(page, where, { lang, viewport, content, tab }) {
  const r = await page.evaluate(({ content, lang, mobile, tab }) => {
    const THAI = /[฀-๿]/;
    const visible = (el) => {
      const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const out = { broken: [], unnamed: [], smallInputs: [], tiny: [], thai: [], clipped: [] };
    // Content wider than its own box, where the box neither scrolls nor declares an ellipsis: the text is being
    // cut off by an ancestor and the document itself may still fit the screen, so overflowX would miss it.
    for (const el of document.querySelectorAll('*')) {
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.textOverflow === 'ellipsis' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;
      if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
        out.clipped.push(`${String(el.className).slice(0, 40) || el.tagName} cuts ${el.scrollWidth - el.clientWidth}px`);
    }
    for (const img of document.images) if (img.complete && img.naturalWidth === 0 && img.getAttribute('src') && visible(img)) out.broken.push(img.getAttribute('src'));
    for (const el of document.querySelectorAll('button, a[href], [role=button], input, textarea')) {
      if (!visible(el)) continue;
      const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || el.getAttribute('placeholder') || el.querySelector('img[alt]')?.getAttribute('alt') || '').trim();
      if (!name && !el.closest('[aria-hidden=true]')) out.unnamed.push(el.outerHTML.slice(0, 90));
      const b = el.getBoundingClientRect();
      if (mobile && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && parseFloat(getComputedStyle(el).fontSize) < 16) out.smallInputs.push((el.getAttribute('placeholder') || el.name || el.className) + ' ' + getComputedStyle(el).fontSize);
      if (mobile && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && (Math.round(b.width) < 24 || Math.round(b.height) < 24)) out.tiny.push(`${name || el.className} ${Math.round(b.width)}x${Math.round(b.height)}`);
    }
    if (lang !== 'th') {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const texts = [];
      for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.parentElement && visible(n.parentElement)) texts.push(n.textContent);
      for (const el of document.querySelectorAll('[placeholder],[aria-label],[title]')) for (const a of ['placeholder', 'aria-label', 'title']) if (el.getAttribute(a)) texts.push(el.getAttribute(a));
      for (let text of texts) {
        if (!THAI.test(text)) continue;
        // A shortened piece of content (truncated bio, an avatar's first letter) is still content.
        if (content.some((c) => c.includes(text.trim()))) continue;
        for (const c of content) if (text.includes(c)) text = text.split(c).join(' ');
        if (THAI.test(text)) out.thai.push(text.trim().slice(0, 80));
      }
    }
    out.overflowX = document.documentElement.scrollWidth - innerWidth;
    out.overflowY = tab === 'reels' ? document.documentElement.scrollHeight - innerHeight : 0;
    return out;
  }, { content, lang, mobile: viewport.mobile, tab });
  for (const s of new Set(r.broken)) add('error', 'broken-image', where, s);
  for (const s of new Set(r.unnamed)) add('error', 'button-without-name', where, s);
  for (const s of new Set(r.smallInputs)) add('error', 'input-under-16px', where, s);
  for (const s of new Set(r.tiny)) add('warn', 'tap-target-under-24px', where, s);
  for (const s of new Set(r.thai)) add('error', 'untranslated-ui', where, s);
  for (const s of new Set(r.clipped)) add('warn', 'content-clipped', where, s);
  if (r.overflowX > 0) add('error', 'horizontal-overflow', where, `${r.overflowX}px wider than the screen`);
  if (r.overflowY > 0) add('error', 'reels-taller-than-screen', where, `${r.overflowY}px taller than the screen`);
}

const browser = await chromium.launch(arg('chrome') ? { executablePath: arg('chrome') } : { channel: 'chrome' });
let apiRows = [];
try {
  for (const viewport of VIEWPORTS) {
    for (const lang of LANGS) {
      const context = await browser.newContext({ viewport, isMobile: viewport.mobile, hasTouch: viewport.mobile, ...(STORAGE ? { storageState: STORAGE } : {}) });
      await context.addInitScript((l) => localStorage.setItem('froststory_lang', l), lang);
      await login(context);
      const page = await context.newPage();
      const bad = [];
      page.on('console', (m) => m.type() === 'error' && !/status of 401/.test(m.text()) && bad.push(['console-error', m.text().slice(0, 160)]));
      page.on('pageerror', (e) => bad.push(['page-error', String(e).slice(0, 160)]));
      page.on('response', (res) => {
        const u = new URL(res.url());
        if (u.origin === new URL(BASE).origin && res.status() >= 400) bad.push(['http-error', `${res.status()} ${u.pathname}`]);
      });
      await page.goto(BASE + '/', { waitUntil: 'networkidle' });
      if (!(await page.locator('.fs-insta-bottom-bar').count())) throw new Error(`not signed in at ${BASE} (no bottom bar); check --storage-state`);
      const content = await contentStrings(page);
      if (viewport.name === 'phone' && lang === 'en') {
        await mediaCrawl(page);
        apiRows = await apiTiming(page);
      }
      for (const [i, tab] of TABS.entries()) {
        await page.locator('.fs-insta-bottom-bar button').nth(i).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        await inspect(page, `${viewport.name}/${lang}/${tab}`, { lang, viewport, content, tab });
        if (viewport.name !== 'iphone-se') await page.screenshot({ path: join(OUT, `${viewport.name}-${lang}-${tab}.png`) }).catch(() => {});
        // The account tab holds three sub-tabs whose contents are React state, invisible until clicked.
        if (tab === 'profile') {
          const subtabs = page.locator('.fs-player-subtab');
          for (let s = 0, n = await subtabs.count(); s < n; s++) {
            await subtabs.nth(s).click();
            await page.waitForTimeout(200);
            await inspect(page, `${viewport.name}/${lang}/${tab}/subtab-${s}`, { lang, viewport, content, tab });
            if (viewport.name !== 'iphone-se')
              await page.screenshot({ path: join(OUT, `${viewport.name}-${lang}-profile-subtab-${s}.png`) }).catch(() => {});
          }
        }
      }
      for (const [check, detail] of new Map(bad.map(([c, d]) => [c + d, [c, d]])).values()) add('error', check, `${viewport.name}/${lang}`, detail);
      await context.close();
    }
  }
} finally {
  await browser.close();
}

// Collapse the same finding seen on many pages into one line with the pages listed.
const grouped = new Map();
for (const f of findings) {
  const k = `${f.severity}|${f.check}|${f.detail}`;
  if (!grouped.has(k)) grouped.set(k, { ...f, where: [] });
  grouped.get(k).where.push(f.where);
}
const rows = [...grouped.values()].sort((a, b) => (a.severity === b.severity ? a.check.localeCompare(b.check) : a.severity === 'error' ? -1 : 1));
const errors = rows.filter((r) => r.severity === 'error').length;
writeFileSync(join(OUT, 'report.json'), JSON.stringify({ base: BASE, at: new Date().toISOString(), errors, warnings: rows.length - errors, api: apiRows, findings: rows }, null, 2));
const md = [
  `# UI audit · ${BASE} · ${new Date().toISOString()}`,
  '',
  `**${errors} error(s), ${rows.length - errors} warning(s)** across ${VIEWPORTS.length} viewports × ${LANGS.length} languages × ${TABS.length} tabs`,
  '',
  '| API | status | ms | server-timing |',
  '| --- | --- | --- | --- |',
  ...apiRows.map((r) => `| ${r.u} | ${r.status} | ${r.ms} | ${r.server || ''} |`),
  '',
  '| severity | check | detail | where |',
  '| --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.severity} | ${r.check} | ${String(r.detail).replace(/\|/g, '\\|')} | ${r.where.length > 3 ? r.where.slice(0, 3).join(', ') + ` +${r.where.length - 3}` : r.where.join(', ')} |`),
].join('\n');
writeFileSync(join(OUT, 'report.md'), md + '\n');
console.log(md);
process.exit(errors ? 1 : 0);
