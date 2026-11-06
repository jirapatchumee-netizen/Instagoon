import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { findProblems } from '../../scripts/guard-commit.mjs';

const file = (path, content = '', status = 'A', diff = '') => ({ path, status, content: Buffer.isBuffer(content) ? content : Buffer.from(content), diff });
const png = withText => {
  const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, 'latin1'); data.copy(b, 8); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), ...(withText ? [chunk('tEXt', Buffer.from('prompt\0{"1":{}}', 'latin1'))] : []), chunk('IDAT', deflateSync(Buffer.from([0, 0, 0, 0]))), chunk('IEND', Buffer.alloc(0))]);
};

test('refuses what must never reach the public repo', () => {
  const cases = [
    file('server/.dev.vars', 'GEMINI_API_KEY=x'),
    file('.env', 'X=1'),
    file('server/.env.production', 'X=1'),
    file('gen-lang-client-0814085746-8ba27a1068a1.json', '{}'),
    file('keys/firebase-service-account.json', '{}'),
    file('client_secret_123.json', '{}'),
    file('tts.json', '{"type":"service_account","private_key":"-----BEGIN PRIVATE KEY-----\\n' + 'M'.repeat(64) + '"}'),
    file('server/src/leak.mjs', 'const k = `-----BEGIN PRIVATE KEY-----\n' + 'M'.repeat(64) + '`;'),
    file('private-docs/ROMANCE.md', 'x'),
    file('docs/art/milin_gm_ref_512x640.png', png(false)),
    file('content/media/posts/p.png', png(true)),
    file('content/creators/milin/visual_bible.json', '{"masterPromptTemplate":"..."}'),
    file('workflows/z_image.json', '{"12":{"class_type":"LoadImage","inputs":{"image":"ref.png"}}}'),
    file('server/src/ai/protected/gemini-config.mjs', 'x', 'M'),
    file('server/src/ai/protected/fifty-shades.mjs', '', 'D'),
    file('server/wrangler.toml', 'x', 'M', '@@ -28 +28 @@\n-GEMINI_MODEL = "gemini-2.5-flash"\n+GEMINI_MODEL = "gemini-3.5-flash-lite"\n')
  ];
  for (const c of cases) assert.equal(findProblems([c]).length > 0, true, `must refuse ${c.path}`);
});

test('lets the look-alikes through', () => {
  const cases = [
    file('content/media/posts/p.png', png(false)),
    file('.env.example', 'GEMINI_API_KEY='),
    file('docs/AI_CHAT_LATENCY_AND_THINKING_BUDGET_RUNBOOK.md', 'mentions .dev.vars, service account and BLOCK_NONE in prose'),
    file('server/src/index.mjs', "import { SAFETY_SETTINGS } from './ai/protected/gemini-config.mjs';", 'M'),
    file('server/tests/protected-zone.test.mjs', 'hashes of the zone', 'M'),
    file('content/creators/mook/character.json', '{"name":"Mook","prompt_style":"short"}'),
    file('scripts/guard-commit.mjs', 'if (/masterPromptTemplate|renderRecipe/.test(text)) push(...); // the guard names what it refuses'),
    file('AGENTS.md', 'ห้าม commit ไฟล์ที่มี masterPromptTemplate/renderRecipe และ private key'),
    file('server/tests/guard-commit.test.mjs', 'fixture: "private_key":"-----BEGIN PRIVATE KEY-----' + '\\n' + 'abc" (short test body, no real key)'),
    file('server/wrangler.toml', 'x', 'M', '@@ -12 +12 @@\n-ACCESS_AUDIENCE = "a"\n+ACCESS_AUDIENCE = "b"\n'),
    file('server/.dev.vars', '', 'D'),
    file('docs/adr/0013-owner-locked-ai-config-zone.md', 'server/src/ai/protected/ is owner-locked')
  ];
  for (const c of cases) assert.deepEqual(findProblems([c]), [], `must allow ${c.path}`);
});

test('CI mode reports the AI zone but still refuses secrets', () => {
  const zone = [file('server/src/ai/protected/gemini-config.mjs', 'x', 'M'), file('server/wrangler.toml', 'x', 'M', '-GEMINI_MODEL = "a"\n+GEMINI_MODEL = "b"\n')];
  assert.deepEqual(findProblems(zone, 'ci').map(p => p.fatal), [false, false]);
  assert.deepEqual(findProblems(zone, 'commit').map(p => p.fatal), [true, true]);
  const secret = [file('server/.dev.vars', 'GEMINI_API_KEY=x'), file('private-docs/ROMANCE.md', 'x')];
  assert.deepEqual(findProblems(secret, 'ci').map(p => p.fatal), [true, true]);
});

test('reads the staged files of a real commit and refuses with exit code 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'guard-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  git('init', '-q'); git('config', 'user.email', 'guard@test'); git('config', 'user.name', 'guard');
  mkdirSync(join(dir, 'docs'));
  writeFileSync(join(dir, 'docs/ok.md'), 'fine');
  git('add', '.');
  const script = new URL('../../scripts/guard-commit.mjs', import.meta.url).pathname;
  execFileSync('node', [script], { cwd: dir, stdio: 'pipe' });
  writeFileSync(join(dir, '.dev.vars'), 'GEMINI_API_KEY=x');
  git('add', '-f', '.dev.vars');
  assert.throws(() => execFileSync('node', [script], { cwd: dir, stdio: 'pipe' }), e => e.status === 1 && /Wrangler dev secrets/.test(String(e.stderr)));
});
