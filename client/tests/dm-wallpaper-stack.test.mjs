// Paint order inside the DM sheet with a chat wallpaper set. The wallpaper layer is a background:
// every other child of .fs-dm-modal must paint above it. It used to sit at z-index 0, which in CSS
// painting order is above plain in-flow children, so the composer (no position, no z-index) was
// covered by the image and the player could no longer see or continue the chat.
// Run: node --experimental-strip-types --test client/tests/dm-wallpaper-stack.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const CSS_PATH = fileURLToPath(new URL('../player/froststory.css', import.meta.url));
const WALLPAPER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#ff00ff"/></svg>'
);

// Mirrors the DM sheet in FrostStoryApp.tsx and the ChatComposer in ui.tsx.
const SHEET = `<!doctype html><html lang="th"><head><meta charset="utf-8">
<link rel="stylesheet" href="/froststory.css">
<style>body { margin: 0; width: 420px; background: #000; }</style>
</head><body>
<section class="fs-dm-modal">
  <div class="fs-dm-wallpaper-layer" aria-hidden="true">
    <img class="fs-dm-wallpaper-img" alt="" src="${WALLPAPER}">
    <div class="fs-dm-wallpaper-dim"></div>
  </div>
  <header class="fs-dm-header"><h2>ครูลิน</h2></header>
  <div class="fs-dm-mode-toggle" data-active="ai">
    <button class="fs-dm-mode-btn" aria-selected="true">แชท</button>
    <button class="fs-dm-mode-btn" aria-selected="false">เรื่องราว</button>
  </div>
  <div class="fs-dm-messages">
    <div class="fs-dm-row-left"><div class="fs-dm-msg-col"><div class="fs-dm-bubble-row">
      <div class="fs-bubble">สวัสดีค่ะ มาเล่าเรื่องวันนี้ให้ครูลินฟังหน่อยไหมคะ</div>
    </div></div></div>
  </div>
  <div class="fs-dm-memory"><button type="button" class="fs-dm-memory-toggle">ความทรงจำ</button></div>
  <div class="fs-dm-composer-wrap">
    <form class="fs-dm-input-form">
      <textarea class="fs-dm-text-input" rows="1" placeholder="ส่งข้อความหา ครูลิน..."></textarea>
      <button type="submit" class="fs-dm-send-btn">ส่ง</button>
    </form>
  </div>
</section>
</body></html>`;

// elementsFromPoint lists hit-testable elements frontmost-first, so with the layer made hit-testable
// it reads back the paint order Chrome resolved from the real stylesheet.
async function openSheet(browser) {
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.route('**/*', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/dm.html') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: SHEET });
    if (path === '/froststory.css') return route.fulfill({ contentType: 'text/css; charset=utf-8', body: readFileSync(CSS_PATH, 'utf8') });
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto('https://dm-wallpaper.test/dm.html');
  await page.waitForSelector('.fs-dm-wallpaper-layer');
  return page;
}

async function stackAt(page, selector) {
  const box = await page.locator(selector).boundingBox();
  return page.evaluate(
    ([x, y]) => {
      for (const s of ['.fs-dm-wallpaper-layer', '.fs-dm-wallpaper-dim']) {
        document.querySelector(s).style.pointerEvents = 'auto';
      }
      return document.elementsFromPoint(x, y).map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
    },
    [box.x + box.width / 2, box.y + box.height / 2]
  );
}

const indexOf = (needle, stack) => stack.findIndex((entry) => entry.includes(needle));

test('the composer paints above the wallpaper layer', async (t) => {
  const browser = await chromium.launch({ channel: 'chrome' });
  t.after(() => browser.close());
  const stack = await stackAt(await openSheet(browser), '.fs-dm-text-input');
  const composer = indexOf('fs-dm-input-form', stack);
  const layer = indexOf('fs-dm-wallpaper-layer', stack);
  assert.ok(composer >= 0 && layer >= 0, `composer or layer missing from the stack: ${stack.join(' | ')}`);
  assert.ok(composer < layer, `the wallpaper paints over the composer: ${stack.join(' | ')}`);
});

test('the wallpaper layer stays inside the sheet stacking context', async (t) => {
  const browser = await chromium.launch({ channel: 'chrome' });
  t.after(() => browser.close());
  const page = await openSheet(browser);
  const layerZ = await page.evaluate(() => getComputedStyle(document.querySelector('.fs-dm-wallpaper-layer')).zIndex);
  const isolation = await page.evaluate(() => getComputedStyle(document.querySelector('.fs-dm-modal')).isolation);
  assert.ok(Number(layerZ) < 0, `the layer must be a background, z-index was ${layerZ}`);
  assert.equal(isolation, 'isolate', 'a negative z-index escapes unless the sheet is its own stacking context');
});

test('nothing intercepts the click on the input', async (t) => {
  const browser = await chromium.launch({ channel: 'chrome' });
  t.after(() => browser.close());
  const page = await openSheet(browser);
  const box = await page.locator('.fs-dm-text-input').boundingBox();
  const hit = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y).className,
    [box.x + box.width / 2, box.y + box.height / 2]
  );
  assert.equal(hit, 'fs-dm-text-input');
});

test('header, tabs, messages and the memory row all sit above the wallpaper', async (t) => {
  const browser = await chromium.launch({ channel: 'chrome' });
  t.after(() => browser.close());
  const page = await openSheet(browser);
  for (const selector of ['.fs-dm-header', '.fs-dm-mode-toggle', '.fs-dm-messages', '.fs-dm-memory']) {
    const stack = await stackAt(page, selector);
    const layer = indexOf('fs-dm-wallpaper-layer', stack);
    assert.ok(layer >= 0, `wallpaper missing from the stack at ${selector}: ${stack.join(' | ')}`);
    assert.ok(indexOf(selector.slice(1), stack) < layer, `wallpaper paints over ${selector}: ${stack.join(' | ')}`);
  }
});
