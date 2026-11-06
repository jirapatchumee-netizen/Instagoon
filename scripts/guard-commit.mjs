// Pre-commit guard. This repo is public: a commit must not carry credentials, the private art pipeline
// (ComfyUI workflows, render recipes, reference images, generator metadata), or an unapproved change to
// the owner-locked AI zone (ADR-0013). Run by .githooks/pre-commit on staged files, and in CI from the
// BASE copy over every commit of the PR, so a PR cannot rewrite the checker that judges it.
import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Paths are matched case-insensitively: macOS clones are case-insensitive, so `Private-Docs/` is the same
// file, and Linux CI must not be the one that misses it.
const SECRET_PATHS = [
  [/(^|\/)\.?env\.(?!example$|sample$|template$)[^/]+$/i, 'environment file'],
  [/\.env$/i, 'environment file'],
  [/(^|\/)\.dev\.vars(\..+)?$/i, 'Wrangler dev secrets'],
  [/(^|\/)client_secret_[^/]*\.json$/i, 'OAuth client secret'],
  [/(^|\/|[-_])gen-lang-client-[0-9]+-[0-9a-f]+\.json$/i, 'Google service-account key'],
  [/(^|[-_])service[-_]?account\.json$/i, 'Google service-account key'],
  [/\.(pem|p12|pfx|jks|key)$/i, 'private key file'],
  [/(^|\/)secret_prompts[^/]*$/i, 'secret prompt file']
];
// What a real credential looks like, whatever the file is called.
const SECRET_CONTENT = [
  [/AIza[0-9A-Za-z\-_]{35}/, 'a Google API key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----(?:\r?\n|\\n)[A-Za-z0-9+/=]{40,}/, 'a private key'],
  [/\bglcbm-[0-9a-f]{4}:[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\b/, 'a Firebase admin token']
];
const PRIVATE_PATHS = [
  [/^private-docs\//i, 'private docs stay on the owner\'s machine'],
  [/^docs\/art\//i, 'golden-master and reference images stay in the local art pipeline']
];
const ZONE = /^server\/src\/ai\/protected\//i;
// Files whose edit would weaken the guardrails themselves. CI cannot block them (a PR may legitimately
// improve the guard) — that is what CODEOWNERS + required review is for.
const MECHANISM = /^(scripts\/guard-commit\.mjs|\.githooks\/|\.github\/workflows\/|\.claude\/settings\.json$|server\/tests\/(guard-commit|protected-zone)\.test\.mjs$|docs\/adr\/0013)/i;
const WRANGLER = /^server\/wrangler[^/]*\.toml$/i;
const DATA_FILE = /\.(json|jsonl|ya?ml|toml|ini|csv|txt|dat|mdx|ipynb)$/i;
const ZONE_VARS = /^[+-]\s*["']?(GEMINI_MODEL|SUMMARY_MODEL)["']?\s*=/m;
const PNG = 0x89504e47;

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
export function findProblems(files, mode = 'commit', opts = {}) {
  const problems = [];
  const soft = mode === 'ci' || opts.transientOp === true;
  const push = (path, message) => problems.push({ path, message, fatal: true });
  // Zone and mechanism edits: fatal on a normal commit, an annotation in CI (the owner is reviewing the PR)
  // and an annotation during merge/cherry-pick/revert, where the staged tree carries other people's commits.
  const pushSoft = (path, message) => problems.push({ path, message, fatal: !soft });
  for (const f of files) {
    if (ZONE.test(f.path)) pushSoft(f.path, 'owner-locked AI zone (ADR-0013). Agents: stop and ask the owner — only the owner commits a zone change, with --no-verify and who approved it in the message.');
    if (MECHANISM.test(f.path)) pushSoft(f.path, 'changing the guardrails themselves (ADR-0013) — owner review required, see CODEOWNERS.');
    if (WRANGLER.test(f.path) && ZONE_VARS.test(f.diff || '')) pushSoft(f.path, 'GEMINI_MODEL/SUMMARY_MODEL is part of the owner-locked AI zone (ADR-0013).');
    if (f.status === 'D') continue;
    for (const [re, what] of SECRET_PATHS) if (re.test(f.path)) push(f.path, `${what}; never commit it (public repo).`);
    for (const [re, what] of PRIVATE_PATHS) if (re.test(f.path)) push(f.path, `${what}.`);
    if (!f.content) continue;
    // Generator metadata is looked up by content, not by extension: a PNG renamed .dat is still a PNG.
    if (f.content.length > 8 && f.content.readUInt32BE(0) === PNG) {
      const keys = pngTextKeys(f.content);
      if (keys.length) push(f.path, `PNG carries generator metadata (${keys.join(', ')}); run instagoon-workbench/art-pipeline/scripts/strip_png_metadata.py on it.`);
    } else if (/\.(png|jpe?g|webp)$/i.test(f.path) && f.content.includes('ComfyUI', 'latin1')) {
      push(f.path, 'image carries ComfyUI generator metadata; strip it before committing.');
    }
    if (f.content.includes(0)) continue;
    const text = f.content.toString('utf8');
    // Real material and real data shapes only: docs, the guard and its tests may name these patterns
    // without blocking their own commit.
    // Credential material counts anywhere. A private *data shape* only counts in a data file: source files
    // and this guard's own tests quote those shapes as fixtures without shipping them.
    for (const [re, what] of SECRET_CONTENT) if (re.test(text)) push(f.path, `contains ${what}.`);
    if (DATA_FILE.test(f.path)) {
      if (/"type"\s*:\s*"service_account"/.test(text)) push(f.path, 'is a Google service-account key file.');
      if (/"(masterPromptTemplate|renderRecipe)"\s*:/.test(text)) push(f.path, 'contains the private render recipe; keep it in the local art pipeline.');
      if (/"class_type"\s*:/.test(text) && /"inputs"\s*:/.test(text)) push(f.path, 'contains a ComfyUI workflow; keep it in the local art pipeline.');
    }
  }
  return problems;
}

function gitRun(cwd, ...args) {
  return execFileSync('git', args, { cwd, maxBuffer: 256 * 1024 * 1024 });
}

function pairs(cwd, args) {
  const toks = gitRun(cwd, ...args, '-z').toString('latin1').split('\0').filter(Boolean);
  const out = [];
  for (let i = 0; i + 1 < toks.length; i += 2) out.push({ status: toks[i][0], path: toks[i + 1] });
  return out;
}

function stagedChanges(cwd) {
  return pairs(cwd, ['diff', '--cached', '--name-status', '--no-renames']).map(({ status, path }) => ({
    path, status,
    content: status === 'D' ? null : gitRun(cwd, 'show', `:${path}`),
    diff: WRANGLER.test(path) ? gitRun(cwd, 'diff', '--cached', '-U0', '--', path).toString('utf8') : ''
  }));
}

// CI reads every commit of the PR, not just the net result: a file added in one commit and deleted in the
// next is still in the public history after the merge, and the net diff would never show it.
function commitChanges(cwd, base) {
  const commits = gitRun(cwd, 'rev-list', '--no-merges', `${base}..HEAD`).toString('utf8').split('\n').filter(Boolean);
  const files = [];
  for (const c of commits) {
    // diff-tree, not git show: the commit header would otherwise glue itself onto the first status token.
    for (const { status, path } of pairs(cwd, ['diff-tree', '--root', '-r', '--no-commit-id', '--name-status', '--no-renames', c])) {
      files.push({
        path, status,
        content: status === 'D' ? null : gitRun(cwd, 'show', `${c}:${path}`),
        diff: WRANGLER.test(path) ? gitRun(cwd, 'show', '-U0', c, '--', path).toString('utf8') : ''
      });
    }
  }
  return files;
}

function transientOp(cwd) {
  const gitDir = gitRun(cwd, 'rev-parse', '--absolute-git-dir').toString('utf8').trim();
  return ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD'].some(name => existsSync(join(gitDir, name)));
}

const isMain = () => {
  const run = process.argv[1];
  return !!run && realpathSync(run) === realpathSync(fileURLToPath(import.meta.url));
};

// GitHub annotation text needs % and newlines escaped, or the payload breaks.
const annotate = s => s.replace(/%/g, '%25').replace(/\r?\n/g, '%0A');

if (isMain()) {
  const baseAt = process.argv.indexOf('--base');
  const mode = baseAt === -1 ? 'commit' : 'ci';
  const cwd = process.cwd();
  const opts = { transientOp: mode === 'commit' && transientOp(cwd) };
  const problems = findProblems(mode === 'commit' ? stagedChanges(cwd) : commitChanges(cwd, process.argv[baseAt + 1]), mode, opts);
  const fatal = problems.filter(p => p.fatal);
  for (const p of problems.filter(p => !p.fatal)) console.log(`::notice title=ADR-0013::${annotate(`${p.path}: ${p.message}`)}`);
  if (fatal.length) {
    console.error(`Commit refused (scripts/guard-commit.mjs):\n- ${fatal.map(p => `${p.path}: ${p.message}`).join('\n- ')}`);
    process.exit(1);
  }
}
