import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
    file('gen-lang-client-0000000000-000000000000.json', '{}'),
    file('keys/firebase-service-account.json', '{}'),
    file('client_secret_123.json', '{}'),
    file('config/prod.env', 'GEMINI_API_KEY=x'),
    file('tts.json', '{"type":"service_account","private_key":"-----BEGIN PRIVATE KEY-----\\n' + 'M'.repeat(64) + '"}'),
    file('server/src/leak.mjs', 'const k = `-----BEGIN PRIVATE KEY-----\n' + 'M'.repeat(64) + '`;'),
    file('whatever.json', '{"type": "service_account", "project_id": "p"}'),
    file('server/src/keys.mjs', 'const KEY = "AIza' + "0".repeat(35) + '";'),
    file('.github/workflows/pr-check-instagoon.yml', 'rm the guard step', 'M'),
    file('scripts/guard-commit.mjs', 'soften every rule', 'M'),
    file('server/tests/protected-zone.test.mjs', 'repin the hashes to pass', 'M'),
    file('docs/adr/0013-owner-locked-ai-config-zone.md', 'water down the ADR', 'M'),
    file('private-docs/ROMANCE.md', 'x'),
    file('Private-Docs/ROMANCE.md', 'x'),
    file('Docs/Art/milin_ref.png', png(false)),
    file('content/media/posts/p.dat', png(true)),
    file('content/media/posts/p.jpg', Buffer.from('JFIF junk ComfyUI workflow junk', 'latin1')),
    file('notes/z_image.txt', '{"12":{"class_type":"LoadImage","inputs":{"image":"ref.png"}}}'),
    file('secrets.yml', 'key: "AIza' + '0'.repeat(35) + '"'),
    file('docs/art/milin_gm_ref_512x640.png', png(false)),
    file('content/media/posts/p.png', png(true)),
    file('content/creators/milin/visual_bible.json', '{"masterPromptTemplate":"..."}'),
    file('workflows/z_image.json', '{"12":{"class_type":"LoadImage","inputs":{"image":"ref.png"}}}'),
    file('server/src/ai/protected/gemini-config.mjs', 'x', 'M'),
    file('server/src/ai/protected/fifty-shades.mjs', '', 'D'),
    file('server/wrangler.staging.toml', 'x', 'M', '-SUMMARY_MODEL = "a"\n+SUMMARY_MODEL = "b"\n'),
    file('server/wrangler.toml', 'x', 'M', '@@ -28 +28 @@\n-GEMINI_MODEL = "gemini-2.5-flash"\n+GEMINI_MODEL = "gemini-3.5-flash-lite"\n')
  ];
  for (const c of cases) assert.equal(findProblems([c]).length > 0, true, `must refuse ${c.path}`);
});

test('lets the look-alikes through', () => {
  const cases = [
    file('content/media/posts/p.png', png(false)),
    file('.env.example', 'GEMINI_API_KEY='),
    file('.env.sample', 'GEMINI_API_KEY='),
    file('config/serviceaccount-schema.json', '{"title":"how service accounts work"}'),
    file('server/src/keys.mjs', 'const KEY = "AIza" + "0".repeat(35); // placeholder built at runtime, no key here'),
    file('docs/AI_CHAT_LATENCY_AND_THINKING_BUDGET_RUNBOOK.md', 'mentions .dev.vars, service account and BLOCK_NONE in prose'),
    file('server/src/index.mjs', "import { SAFETY_SETTINGS } from './ai/protected/gemini-config.mjs';", 'M'),
    file('server/tests/gameplay.test.mjs', 'hashes of nothing', 'M'),
    file('content/creators/mook/character.json', '{"name":"Mook","prompt_style":"short"}'),
    file('AGENTS.md', 'ห้าม commit ไฟล์ที่มี masterPromptTemplate/renderRecipe และ private key'),
    file('docs/security-notes.md', 'fixture: "private_key":"-----BEGIN PRIVATE KEY-----' + '\\n' + 'abc" (short test body, no real key)'),
    file('server/tests/knowledge.test.mjs', 'fixtures that merely name data shapes: {"type":"service_account"} {"12":{"class_type":"x","inputs":{}}} masterPromptTemplate in prose'),
    file('server/wrangler.toml', 'x', 'M', '@@ -12 +12 @@\n-ACCESS_AUDIENCE = "a"\n+ACCESS_AUDIENCE = "b"\n'),
    file('server/.dev.vars', '', 'D'),
    file('docs/adr/0004-script-revision-pinning.md', 'old ADR, anyone may fix a typo')
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
  const script = fileURLToPath(new URL('../../scripts/guard-commit.mjs', import.meta.url));
  execFileSync('node', [script], { cwd: dir, stdio: 'pipe' });
  writeFileSync(join(dir, '.dev.vars'), 'GEMINI_API_KEY=x');
  git('add', '-f', '.dev.vars');
  assert.throws(() => execFileSync('node', [script], { cwd: dir, stdio: 'pipe' }), e => e.status === 1 && /Wrangler dev secrets/.test(String(e.stderr)));
});

test('CI scans every commit of the range, so add-then-delete cannot pass', () => {
  const dir = mkdtempSync(join(tmpdir(), 'guard-ci-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  const run = (...args) => execFileSync('node', [script, ...args], { cwd: dir, stdio: 'pipe' });
  const script = fileURLToPath(new URL('../../scripts/guard-commit.mjs', import.meta.url));
  git('init', '-q', '-b', 'main'); git('config', 'user.email', 'guard@test'); git('config', 'user.name', 'guard');
  writeFileSync(join(dir, 'README.md'), 'ok');
  git('add', '.'); git('commit', '-q', '-m', 'base');
  git('checkout', '-q', '-b', 'pr');
  writeFileSync(join(dir, '.dev.vars'), 'GEMINI_API_KEY=x');
  git('add', '-f', '.dev.vars'); git('commit', '-q', '-m', 'oops');
  git('rm', '-q', '.dev.vars'); git('commit', '-q', '-m', 'revert it');
  // The net diff of main...pr is clean; the branch history still carries the file.
  assert.deepEqual(findProblems([{ path: 'README.md', status: 'A', content: Buffer.from('ok'), diff: '' }], 'ci'), []);
  assert.throws(() => run('--base', 'main'), e => e.status === 1 && /Wrangler dev secrets/.test(String(e.stderr)));
  rmSync(dir, { recursive: true, force: true });
});
