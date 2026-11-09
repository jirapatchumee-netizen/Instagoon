// Every language has the same keys, en/ja carry no Thai, and player UI files do not hard-code Thai
// (it would show up for English/Japanese players). Run: node --experimental-strip-types --test client/tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { TRANSLATIONS } from '../player/i18n.ts';

const THAI = /[฀-๿]/;
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, p + k + '.') : [[p + k, v]]));

test('th, en and ja define the same keys', () => {
  const keys = (l) => flat(TRANSLATIONS[l]).map(([k]) => k).sort();
  assert.deepEqual(keys('en'), keys('th'));
  assert.deepEqual(keys('ja'), keys('th'));
});

test('en and ja strings contain no Thai', () => {
  for (const lang of ['en', 'ja']) {
    for (const [k, v] of flat(TRANSLATIONS[lang])) {
      const text = typeof v === 'function' ? v(...Array(v.length).fill('X')) : String(v);
      assert.ok(!THAI.test(text), `${lang}.${k} has Thai: ${text}`);
    }
  }
});

// Files that legitimately hold Thai: content-shaped text the AI chat renders or sends (out of scope for
// UI translation), and the shop's own per-language copy table.
const ALLOWED = new Set(['i18n.ts', 'EnergyShop.tsx', 'message-format.ts', 'ui.tsx']);
// Lines that are creator speech or messages sent to the AI, not UI chrome.
const ALLOWED_LINE = [/ตอบกลับสตอรี่/, /จัดห้องเสร็จแล้ว/, /สวัสดีค่ะ แวะมาคุยกับ/, /ELEVENLABS_API_KEY/, /ฟังเสียงตัวละคร|หยุดเสียง/, /เกิดข้อผิดพลาด \(/];

test('player UI files do not hard-code Thai', () => {
  const dir = new URL('../player/', import.meta.url);
  const files = readdirSync(dir, { recursive: true }).filter((f) => /\.(tsx?|mjs)$/.test(f) && !ALLOWED.has(f.split('/').pop()));
  const hits = [];
  for (const f of files) {
    readFileSync(new URL(f, dir), 'utf8').split('\n').forEach((line, i) => {
      const s = line.trim();
      if (s.startsWith('//') || s.startsWith('*') || s.startsWith('{/*')) return;
      if (THAI.test(line) && !ALLOWED_LINE.some((re) => re.test(line))) hits.push(`${f}:${i + 1}: ${s.slice(0, 80)}`);
    });
  }
  assert.deepEqual(hits, []);
});
