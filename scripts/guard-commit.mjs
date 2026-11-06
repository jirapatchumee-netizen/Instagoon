// Pre-commit guard. This repo is public: a commit must not carry credentials, the private art pipeline
// (ComfyUI workflows, render recipes, reference images, PNG generator metadata), or an unapproved change
// to the owner-locked AI zone (ADR-0013). Run by .githooks/pre-commit on the staged files.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const SECRET_PATHS = [
  [/(^|\/)\.env(\.(?!example$)[^/]+)?$/, 'environment file'],
  [/(^|\/)\.dev\.vars(\..+)?$/, 'Wrangler dev secrets'],
  [/(^|\/)client_secret_[^/]*\.json$/, 'OAuth client secret'],
  [/(^|\/)gen-lang-client-[^/]*\.json$|service[-_]?account[^/]*\.json$/i, 'Google service-account key'],
  [/\.(pem|p12|key)$/, 'private key file'],
  [/(^|\/)secret_prompts[^/]*$/, 'secret prompt file']
];
const PRIVATE_PATHS = [
  [/^private-docs\//, 'private docs stay on the owner\'s machine'],
  [/^docs\/art\//, 'golden-master and reference images stay in the local art pipeline']
];
const ZONE = /^server\/src\/ai\/protected\//;
const WRANGLER = /^server\/wrangler[^/]*\.toml$/;
const ZONE_VARS = /^[+-]\s*(GEMINI_MODEL|SUMMARY_MODEL)\s*=/m;

// Keywords of tEXt/zTXt/iTXt chunks: where ComfyUI stores the full prompt and workflow.
export function pngTextKeys(buf) {
  const keys = [];
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) return keys;
  for (let i = 8; i + 8 <= buf.length;) {
    const len = buf.readUInt32BE(i), type = buf.toString('latin1', i + 4, i + 8);
    if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') { const d = buf.subarray(i + 8, i + 8 + len); keys.push(d.toString('latin1', 0, Math.max(0, d.indexOf(0)))); }
    i += 12 + len;
  }
  return keys;
}

// files: [{ path, status, content: Buffer|null, diff: string }] as staged. Returns one problem per finding.
// mode 'commit' (the hook) refuses everything flagged. mode 'ci' only refuses what cannot be undone once
// pushed: secrets, private art-pipeline files, generator metadata. An AI-zone change is reported instead,
// because reaching CI means it is already sitting in a PR the owner is reviewing (ADR-0013).
export function findProblems(files, mode = 'commit') {
  const problems = [];
  const push = (path, message, fatal = true) => problems.push({ path, message, fatal: fatal || mode !== 'ci' });
  for (const f of files) {
    const added = f.status !== 'D';
    if (ZONE.test(f.path)) push(f.path, 'owner-locked AI zone (ADR-0013). Owner: approve, then commit with --no-verify and say so in the message. Agents: never bypass this.', false);
    if (WRANGLER.test(f.path) && ZONE_VARS.test(f.diff || '')) push(f.path, 'GEMINI_MODEL/SUMMARY_MODEL is part of the owner-locked AI zone (ADR-0013).', false);
    if (!added) continue;
    for (const [re, what] of SECRET_PATHS) if (re.test(f.path)) push(f.path, `${what}; never commit it (public repo).`);
    for (const [re, what] of PRIVATE_PATHS) if (re.test(f.path)) push(f.path, `${what}.`);
    if (!f.content) continue;
    if (/\.png$/i.test(f.path)) {
      const keys = pngTextKeys(f.content);
      if (keys.length) push(f.path, `PNG carries generator metadata (${keys.join(', ')}); strip it with instagoon-workbench/art-pipeline/scripts/strip_png_metadata.py.`);
      continue;
    }
    const text = f.content.toString('utf8');
    // Key material means a real PEM body, recipe names mean a real data file: docs and guard tests that
    // only name these patterns must not block their own commit.
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----(?:\n|\\n)[A-Za-z0-9+/=]{40,}/.test(text)) push(f.path, 'contains a private key.');
    if (/\.json$/i.test(f.path) && /masterPromptTemplate|renderRecipe/.test(text)) push(f.path, 'contains the private render recipe; keep it in the local art pipeline.');
    if (/\.json$/i.test(f.path) && /"class_type"\s*:/.test(text) && /"inputs"\s*:/.test(text)) push(f.path, 'looks like a ComfyUI workflow; keep it in the local art pipeline.');
  }
  return problems;
}

function gitRun(cwd, ...args) {
  return execFileSync('git', args, { cwd, maxBuffer: 256 * 1024 * 1024 });
}

function readChanges(cwd, range) {
  // Staged files come from the index; a range compares committed trees instead.
  const staged = range.length ? [] : ['--cached'];
  const at = range.length ? 'HEAD:' : ':';
  const entries = gitRun(cwd, 'diff', ...staged, '--name-status', '--no-renames', '-z', ...range).toString('utf8').split('\0').filter(Boolean);
  const files = [];
  for (let i = 0; i + 1 < entries.length; i += 2) {
    const status = entries[i][0], path = entries[i + 1];
    const content = status === 'D' ? null : gitRun(cwd, 'show', `${at}${path}`);
    const diff = WRANGLER.test(path) ? gitRun(cwd, 'diff', ...staged, '-U0', ...range, '--', path).toString('utf8') : '';
    files.push({ path, status, content, diff });
  }
  return files;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const baseAt = process.argv.indexOf('--base');
  const mode = baseAt === -1 ? 'commit' : 'ci';
  const range = baseAt === -1 ? [] : [`${process.argv[baseAt + 1]}...HEAD`];
  const problems = findProblems(readChanges(process.cwd(), range), mode);
  const fatal = problems.filter(p => p.fatal);
  for (const p of problems.filter(p => !p.fatal)) console.log(`::notice title=Owner-locked AI zone::${p.path}: ${p.message}`);
  if (fatal.length) {
    console.error(`Commit refused (scripts/guard-commit.mjs):\n- ${fatal.map(p => `${p.path}: ${p.message}`).join('\n- ')}`);
    process.exit(1);
  }
}
