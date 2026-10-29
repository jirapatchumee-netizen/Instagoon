import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gameDir = path.join(root, 'games/overtime');
const scenesDir = path.join(gameDir, 'scenes');
const revision = (text) => crypto.createHash('sha256').update(text).digest('hex');
const sceneName = /^[A-Za-z0-9_-]+$/;
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

function respond(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}

function localRequest(req, write = false) {
  const remote = req.socket.remoteAddress;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) return false;
  try {
    const host = new URL(`http://${req.headers.host}`);
    if (!localHosts.has(host.hostname)) return false;
    if (!req.headers.origin) return !write;
    const origin = new URL(req.headers.origin);
    return origin.protocol === 'http:' && origin.host === host.host && localHosts.has(origin.hostname);
  } catch {
    return false;
  }
}

function scenePath(id) {
  if (!sceneName.test(id)) return null;
  const file = path.join(scenesDir, `${id}.json`);
  try {
    return fs.lstatSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
}

function structuralErrors(scene, id) {
  const errors = [];
  if (!scene || typeof scene !== 'object' || Array.isArray(scene) || scene.id !== id || typeof scene.title !== 'string' || !Array.isArray(scene.nodes) || !scene.nodes.length) return ['Scene id, title and non-empty nodes are required.'];
  const manifest = JSON.parse(fs.readFileSync(path.join(gameDir, 'game.json'), 'utf8'));
  const ids = new Set();
  if (scene.bg !== undefined && (typeof scene.bg !== 'string' || !Object.hasOwn(manifest.backgrounds || {}, scene.bg))) errors.push('Scene background is not declared.');
  for (const [index, node] of scene.nodes.entries()) {
    if (!node || typeof node !== 'object' || Array.isArray(node) || typeof node.id !== 'string' || !/^\d{3}$/.test(node.id)) { errors.push('Node IDs must contain three digits.'); continue; }
    if (ids.has(node.id)) errors.push(`Duplicate node ID: ${node.id}`);
    ids.add(node.id);
    for (const field of ['say', 'bg', 'bgm', 'fx', 'text', 'go', 'choice', 'end', 'retry']) {
      if (node[field] !== undefined && typeof node[field] !== 'string') errors.push(`${node.id}: ${field} must be text.`);
    }
    if (node.cast !== undefined && (!Array.isArray(node.cast) || node.cast.some((v) => {
      if (typeof v !== 'string') return true;
      const match = /^([a-z_]+)(?::[a-z_]+)?@(far-left|left|center|right|far-right)$/.exec(v);
      return !match || !Object.hasOwn(manifest.characters || {}, match[1]);
    }))) errors.push(`${node.id}: invalid cast.`);
    if (node.set !== undefined && (!node.set || typeof node.set !== 'object' || Array.isArray(node.set))) errors.push(`${node.id}: set must be an object.`);
    if (node.choice !== undefined && (!Array.isArray(node.options) || !node.options.length || node.options.some(o => !o || typeof o.label !== 'string' || typeof o.go !== 'string' || !o.go))) errors.push(`${node.id}: choices require labels and targets.`);
    if (!node.choice && !node.text && !node.end && !node.set) errors.push(`${node.id}: node has no content.`);
    if (node.go !== undefined && !node.go) errors.push(`${node.id}: target cannot be empty.`);
    if (node.set && typeof node.set === 'object' && !Array.isArray(node.set)) for (const name of Object.keys(node.set)) if (!Object.hasOwn(manifest.variables || {}, name)) errors.push(`${node.id}: variable ${name} is not declared.`);
    if (index === scene.nodes.length - 1 && !node.go && !node.choice && !node.end) errors.push(`${node.id}: last node has no exit.`);
  }
  return errors;
}

function sourceSnapshot() {
  const files = ['game.json', 'assets.json'].map(name => path.join(gameDir, name));
  files.push(...fs.readdirSync(scenesDir).filter(name => name.endsWith('.json')).sort().map(name => path.join(scenesDir, name)));
  return files.map(file => `${file}:${revision(fs.readFileSync(file))}`).join('\n');
}

function validateCandidate(id, text) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vn-studio-'));
  try {
    fs.mkdirSync(path.join(temp, 'scenes'));
    for (const name of ['game.json', 'assets.json', 'CANON.md', 'THREADS.md']) {
      const src = path.join(gameDir, name);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(temp, name));
    }
    for (const name of fs.readdirSync(scenesDir).filter(name => name.endsWith('.json'))) {
      if (name === `${id}.json`) fs.writeFileSync(path.join(temp, 'scenes', name), text);
      else fs.copyFileSync(path.join(scenesDir, name), path.join(temp, 'scenes', name));
    }
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/vn-check.mjs')], {
      cwd: root, encoding: 'utf8', timeout: 15000,
      env: { ...process.env, VN_STUDIO_GAME_DIR: temp },
    });
    return { ok: result.status === 0, diagnostics: `${result.stdout || ''}${result.stderr || ''}${result.error ? result.error.message : ''}` };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export function studioEndpoint() {
  return {
    name: 'vn-studio-scenes',
    configureServer(server) {
      server.watcher.unwatch(scenesDir);
      server.middlewares.use('/__vn/studio/scenes', (req, res) => {
        if (!localRequest(req, req.method === 'PUT')) return respond(res, 403, { error: 'Studio is available only from localhost.' });
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        if (pathname === '/' && req.method === 'GET') {
          try {
            const indexPath = path.join(gameDir, 'INDEX.md');
            const index = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
            const titles = new Map([...index.matchAll(/^\| `([^`]+)` \| \*\*(.+?)\*\* \|/gm)].map(m => [m[1], m[2]]));
            const scenes = fs.readdirSync(scenesDir).filter(n => n.endsWith('.json')).sort().map(n => n.slice(0, -5)).filter(id => sceneName.test(id)).map(id => ({ id, title: titles.get(id) || id }));
            return respond(res, 200, { scenes });
          } catch (error) {
            return respond(res, 500, { error: error instanceof Error ? error.message : 'Unable to list scenes.' });
          }
        }
        const referencePath = /^\/([A-Za-z0-9_-]+)\/references\/(\d{3})$/.exec(pathname);
        if (referencePath && req.method === 'GET') {
          const [, targetScene, targetNode] = referencePath;
          if (!scenePath(targetScene)) return respond(res, 404, { error: 'Scene not found.' });
          try {
            const target = `${targetScene}/${targetNode}`;
            const references = [];
            for (const name of fs.readdirSync(scenesDir).filter(n => n.endsWith('.json')).sort()) {
              if (name === `${targetScene}.json`) continue;
              const source = JSON.parse(fs.readFileSync(path.join(scenesDir, name), 'utf8'));
              if (!source.id || !Array.isArray(source.nodes)) throw new Error(`Invalid scene: ${name}`);
              for (const node of source.nodes) {
                if (node.go === target) references.push({ sceneId: source.id, nodeId: node.id, field: 'go' });
                if (node.retry === target) references.push({ sceneId: source.id, nodeId: node.id, field: 'retry' });
                if (Array.isArray(node.options)) node.options.forEach((option, index) => {
                  if (option.go === target) references.push({ sceneId: source.id, nodeId: node.id, field: `options[${index}].go` });
                });
              }
            }
            return respond(res, 200, { references });
          } catch (error) {
            return respond(res, 500, { error: error instanceof Error ? error.message : 'Unable to inspect references.' });
          }
        }
        let id;
        try { id = decodeURIComponent(pathname.replace(/^\//, '')); } catch { return respond(res, 400, { error: 'Invalid scene ID.' }); }
        const file = scenePath(id);
        if (!file) return respond(res, 404, { error: 'Scene not found.' });
        if (req.method === 'GET') {
          try {
            const text = fs.readFileSync(file, 'utf8');
            return respond(res, 200, { scene: JSON.parse(text), revision: revision(text) });
          } catch (error) {
            return respond(res, 500, { error: error instanceof Error ? error.message : 'Unable to read scene.' });
          }
        }
        if (req.method !== 'PUT') return respond(res, 405, { error: 'Method not allowed.' });
        if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return respond(res, 415, { error: 'JSON required.' });
        let body = '';
        let bytes = 0;
        req.on('data', chunk => { bytes += chunk.length; if (bytes <= 1024 * 1024) body += chunk; });
        req.on('end', () => {
          if (bytes > 1024 * 1024) return respond(res, 413, { error: 'Scene is too large.' });
          try {
            const input = JSON.parse(body);
            if (!input || typeof input.revision !== 'string' || !/^[a-f0-9]{64}$/.test(input.revision)) return respond(res, 400, { error: 'Revision is required.' });
            let current = fs.readFileSync(file, 'utf8');
            const conflict = () => respond(res, 409, { error: 'Scene changed on disk.', currentScene: JSON.parse(current), currentRevision: revision(current) });
            if (revision(current) !== input.revision) return conflict();
            const errors = structuralErrors(input.scene, id);
            if (errors.length) return respond(res, 422, { error: 'Invalid scene.', diagnostics: errors.join('\n') });
            const text = JSON.stringify(input.scene, null, 2) + '\n';
            const snapshot = sourceSnapshot();
            const validation = validateCandidate(id, text);
            if (!validation.ok) return respond(res, 422, { error: 'Validation failed.', diagnostics: validation.diagnostics });
            current = fs.readFileSync(file, 'utf8');
            if (revision(current) !== input.revision) return conflict();
            if (sourceSnapshot() !== snapshot) return respond(res, 409, { error: 'Another scene or registry changed during validation. Retry.', currentScene: JSON.parse(current), currentRevision: revision(current) });
            const temp = path.join(scenesDir, `.${id}.${crypto.randomUUID()}.tmp`);
            try {
              fs.writeFileSync(temp, text, { flag: 'wx', mode: fs.statSync(file).mode });
              fs.renameSync(temp, file);
            } finally {
              if (fs.existsSync(temp)) fs.unlinkSync(temp);
            }
            const index = spawnSync(process.execPath, [path.join(root, 'scripts/vn-index.mjs')], { cwd: root, encoding: 'utf8', timeout: 15000 });
            return respond(res, 200, { scene: input.scene, revision: revision(text), diagnostics: validation.diagnostics, indexUpdated: index.status === 0, indexError: index.status === 0 ? undefined : `${index.stdout || ''}${index.stderr || ''}${index.error?.message || ''}` });
          } catch (error) {
            return respond(res, 500, { error: error instanceof Error ? error.message : 'Unable to save scene.' });
          }
        });
      });
    },
  };
}
