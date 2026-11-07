// Runs the actual authenticated Worker chat route against an in-memory DB. No production player
// data or credentials are stored in the report. Use the same pinned model for both variants.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { narrativeFixture } from '../server/tests/helpers/narrative-fixture.mjs';
import { ALLOWED_GEMINI_MODELS } from '../server/src/ai/protected/gemini-config.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
const variant = flag('variant', 'narrative');
const model = process.env.EVAL_MODEL || ALLOWED_GEMINI_MODELS[0];
if (!['baseline', 'narrative', 'both'].includes(variant)) throw new Error('variant must be baseline, narrative, or both');
if (!ALLOWED_GEMINI_MODELS.includes(model)) throw new Error('EVAL_MODEL must be in the existing allowed model pool');
const fixtures = JSON.parse(readFileSync(new URL('../server/fixtures/cheer-evaluation.json', import.meta.url), 'utf8'));
if (args.includes('--dry-run')) {
  console.log(JSON.stringify({ model, variant, scenarios: fixtures.scenarios.map(s => ({ id: s.id, turns: s.messages.length })), networkCalls: 0, rubric: fixtures.rubric }, null, 2));
  process.exit(0);
}
if (!process.env.GEMINI_API_KEY) {
  console.error('Live evaluation not run: GEMINI_API_KEY is not available. Set it in the process environment; never put it in a command argument or report. --dry-run checks the evaluation plan without a key.');
  process.exit(2);
}
const output = resolve(flag('out', '.eval/cheer'));
mkdirSync(output, { recursive: true });
for (const selected of variant === 'both' ? ['baseline', 'narrative'] : [variant]) {
  const report = { variant: selected, model, generatedAt: new Date().toISOString(), rubric: fixtures.rubric, note: 'Same character data/examples in both variants. Baseline disables narrative state/prompt/rendering. Semantic quality requires human review; regression checks do not prove parity with another app.', scenarios: [] };
  for (const scenario of fixtures.scenarios) {
    const f = await narrativeFixture({ apiKey: process.env.GEMINI_API_KEY, model });
    if (selected === 'baseline') {
      delete f.npc.narrative;
      f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(f.npc), 'cheer');
    }
    const turns = [];
    for (const message of scenario.messages) {
      const started = Date.now();
      const result = await f.request(message);
      const state = f.state();
      turns.push({ player: message, status: result.status, latencyMs: Date.now() - started, reply: result.payload.reply || null, beats: result.payload.beats || null,
        error: result.payload.error || null,
        scene: state ? { location: state.places.find(p => p.id === state.locationId)?.name, pending: state.places.find(p => p.id === state.pendingLocationId)?.name || null, mood: state.mood } : null });
      console.log(`${selected} / ${scenario.id}: ${turns.length}/${scenario.messages.length}, HTTP ${result.status}`);
      if (result.status !== 200) break; // Do not retry paid turns or continue a broken evaluation branch.
    }
    const metrics = f.sql.prepare('SELECT model, tokens_in tokensIn, tokens_out tokensOut, latency_ms latencyMs, outcome FROM ai_turn_metrics ORDER BY created_at').all();
    report.scenarios.push({ id: scenario.id, turns, metrics, humanScores: Object.fromEntries(fixtures.rubric.map(r => [r, null])) });
    f.sql.close();
    // Save after each scenario so an interruption cannot lose completed comparisons.
    writeFileSync(join(output, `${selected}.json`), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(`Saved ${join(output, `${selected}.json`)}`);
}
