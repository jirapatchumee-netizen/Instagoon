import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newNpc } from '../../../../src/modules/npc-studio/lib/npc/schema.ts';
import { buildContent } from '../../scripts/build-content.mjs';
import { ensureContent, bundledMedia, resetContentCache } from '../src/content.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'content-'));
  const content = join(root, 'content'), dist = join(root, 'dist');
  mkdirSync(join(content, 'creators', 'tester'), { recursive: true });
  mkdirSync(join(content, 'media', 'avatars'), { recursive: true });
  writeFileSync(join(content, 'media', 'avatars', 'tester.webp'), 'RIFFxxxxWEBP');
  writeFileSync(join(content, 'creators', 'tester', 'character.json'), JSON.stringify({ ...newNpc('tester'), name: 'Tester', avatar: 'avatars/tester.webp' }));
  writeFileSync(join(content, 'creators', 'tester', 'posts.json'), JSON.stringify([
    { id: 'p1', caption: 'hi', media: 'avatars/tester.webp', publishedAt: '2026-10-01T00:00:00Z' },
    { id: 'p2', caption: 'two', publishedAt: '2026-10-02T00:00:00Z', relationshipRequired: 20 },
  ]));
  return { content, dist };
}

function env(dist) {
  const sql = new DatabaseSync(':memory:');
  const dir = new URL('../migrations/', import.meta.url);
  for (const f of readdirSync(dir).sort()) if (f.endsWith('.sql')) sql.exec(readFileSync(new URL(f, dir), 'utf8'));
  const st = (q, a = []) => ({ bind: (...n) => st(q, n), first: async () => sql.prepare(q).get(...a) ?? null, run: async () => sql.prepare(q).run(...a), all: async () => ({ results: sql.prepare(q).all(...a) }) });
  const DB = { prepare: q => st(q), async batch(list) { sql.exec('BEGIN'); try { for (const s of list) await s.run(); sql.exec('COMMIT'); } catch (e) { sql.exec('ROLLBACK'); throw e; } } };
  const ASSETS = { async fetch(url) { const f = join(dist, decodeURIComponent(new URL(url).pathname)); return existsSync(f) ? new Response(readFileSync(f), { headers: { 'content-type': f.endsWith('.json') ? 'application/json' : 'image/webp' } }) : new Response('<html>', { status: 404 }); } };
  return { sql, env: { DB, ASSETS } };
}

test('build rejects broken content with a readable reason', () => {
  const { content, dist } = fixture();
  writeFileSync(join(content, 'creators', 'tester', 'posts.json'), JSON.stringify([{ id: 'p1', caption: 'x', media: 'missing.webp', publishedAt: 'soon' }]));
  assert.throws(() => buildContent(content, dist), /missing file content\/media\/missing\.webp[\s\S]*invalid publishedAt/);
});

test('no content folder means no bundle and the worker skips sync', async () => {
  const root = mkdtempSync(join(tmpdir(), 'empty-'));
  assert.equal(buildContent(join(root, 'content'), join(root, 'dist')), null);
  resetContentCache();
  const { sql, env: e } = env(join(root, 'dist'));
  await ensureContent(e);
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM creators').get().n, 0);
});

test('worker seeds D1 from the bundle, is idempotent, and suspends removed posts', async () => {
  const { content, dist } = fixture();
  const b1 = buildContent(content, dist);
  resetContentCache();
  const { sql, env: e } = env(dist);
  sql.prepare("INSERT INTO creators(id,name) VALUES('other','Other')").run();
  sql.prepare("INSERT INTO posts(id,creator_id,caption,published_at,status) VALUES('o1','other','keep',0,'published')").run();
  await ensureContent(e); await ensureContent(e);
  assert.equal(sql.prepare("SELECT name FROM creators WHERE id='tester'").get().name, 'Tester');
  assert.equal(JSON.parse(sql.prepare("SELECT definition_json d FROM npc_definitions WHERE creator_id='tester'").get().d).id, 'tester');
  assert.deepEqual(sql.prepare("SELECT id,status,relationship_required r FROM posts ORDER BY id").all().map(r => ({ ...r })), [{ id: 'o1', status: 'published', r: 0 }, { id: 'p1', status: 'published', r: 0 }, { id: 'p2', status: 'published', r: 20 }]);
  const file = await bundledMedia(e, 'avatars/tester.webp');
  assert.equal(file.httpMetadata.contentType, 'image/webp');
  assert.equal(await bundledMedia(e, 'avatars/unknown.webp'), null);

  writeFileSync(join(content, 'creators', 'tester', 'posts.json'), JSON.stringify([{ id: 'p1', caption: 'edited', publishedAt: '2026-10-01T00:00:00Z' }]));
  const b2 = buildContent(content, dist);
  assert.notEqual(b2.version, b1.version);
  resetContentCache();
  await ensureContent(e);
  assert.deepEqual(sql.prepare("SELECT id,caption,status FROM posts ORDER BY id").all().map(r => ({ ...r })), [{ id: 'o1', caption: 'keep', status: 'published' }, { id: 'p1', caption: 'edited', status: 'published' }, { id: 'p2', caption: 'two', status: 'suspended' }]);
});

test('NPC ZIP import unpacks into a folder the build accepts', async () => {
  const { default: JSZip } = await import('jszip');
  const { importNpcZip } = await import('../../scripts/import-npc-zip.mjs');
  const { createHash } = await import('node:crypto');
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
  const zip = new JSZip();
  zip.file('character.json', JSON.stringify({ ...newNpc('zipped'), avatar: 'avatars/zipped.png' }));
  zip.file('avatars/zipped.png', png);
  zip.file('manifest.json', JSON.stringify({ format: 'instagoon-npc', version: 1, gameId: 'zipped', revisionId: 'r1', schemaVersion: '1.0', assets: [{ path: 'avatars/zipped.png', sha256: createHash('sha256').update(png).digest('hex'), bytes: png.length }] }));
  const root = mkdtempSync(join(tmpdir(), 'zip-'));
  assert.deepEqual(await importNpcZip(await zip.generateAsync({ type: 'nodebuffer' }), join(root, 'content')), { gameId: 'zipped', assets: 1 });
  assert.equal(buildContent(join(root, 'content'), join(root, 'dist')).creators[0].id, 'zipped');
});
