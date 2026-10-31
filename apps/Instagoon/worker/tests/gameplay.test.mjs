import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { relationshipConfig, overallScore, levelOf, matchKeywordRules, secretsFor, levelStyle, applyRules, pickReward } from '../src/gameplay/index.mjs';

const dir = new URL('../src/gameplay/', import.meta.url);

test('gameplay folder stays pure: no env, database, network or outside imports', () => {
  const banned = [/\benv\b/, /\bfetch\s*\(/, /\.prepare\s*\(/, /\bDB\b/, /GEMINI|SECRET|API_KEY/, /\bimport\s*\(/, /from\s+['"](?!\.\/)/, /\brequire\s*\(/, /globalThis|caches|crypto\.subtle/];
  for (const f of readdirSync(dir).filter(f => /\.m?js$/.test(f))) {
    const src = readFileSync(new URL(f, dir), 'utf8').replace(/\/\/.*$/gm, '');
    for (const re of banned) assert.ok(!re.test(src), `${f} must not match ${re}`);
  }
});

test('score and level use weights, romance toggle and thresholds', () => {
  const cfg = relationshipConfig({});
  assert.equal(overallScore(cfg, { closeness: 50, trust: 50, romance: 0 }, 0), 40);
  assert.equal(levelOf(cfg, 40), 3);
  assert.equal(levelOf(cfg, -5), 1);
  const noRomance = relationshipConfig({ relationship: { romanceEnabled: false } });
  assert.equal(overallScore(noRomance, { closeness: 50, trust: 50, romance: 100 }, 0), 50);
  assert.equal(overallScore(relationshipConfig({ relationship: { weights: { closeness: 0, trust: 0, romance: 0 } } }), { closeness: 9, trust: 9, romance: 9 }, 7), 7);
});

test('keyword rules, secrets and level style', () => {
  const npc = { rules: [{ id: 'cat', kind: 'keyword', keywords: [' Cat '] }, { id: 'sem', kind: 'semantic' }], secrets: [{ content: 'a' }, { content: 'b', minLevel: 3 }], style: { levelStyles: ['shy', 'warm'] } };
  assert.deepEqual(matchKeywordRules(npc, 'I love CATs'), ['cat']);
  assert.deepEqual(matchKeywordRules({}, 'cat'), []);
  assert.equal(secretsFor(npc, 2).length, 1);
  assert.equal(secretsFor(npc, 3).length, 2);
  assert.equal(levelStyle(npc, 2), 'warm');
  assert.equal(levelStyle(npc, 5), 'เป็นธรรมชาติ อบอุ่น');
});

test('rules clamp axes, count events and respect maxUses without mutating input', () => {
  const npc = { rules: [{ id: 'r', maxUses: 1, changes: { closeness: 30, trust: -10 } }, { id: 'inf', maxUses: 0, changes: { romance: 5 } }] };
  const start = { closeness: 90, trust: 5, romance: 0, events: {}, ruleUses: {} };
  const once = applyRules(npc, ['r', 'inf'], start);
  assert.deepEqual(once, { closeness: 100, trust: 0, romance: 5, events: { r: 1, inf: 1 }, ruleUses: { r: 1, inf: 1 } });
  assert.deepEqual(start.events, {});
  const twice = applyRules(npc, ['r', 'inf'], once);
  assert.equal(twice.closeness, 100); assert.equal(twice.romance, 10); assert.equal(twice.events.r, 2); assert.equal(twice.ruleUses.r, 1);
});

test('rewards: first passing, skip unlocked, legacy threshold', () => {
  const npc = { rewards: [{ asset: 'a', message: 'A', conditions: [{ field: 'level', value: 2 }] }, { asset: 'b', message: 'B', conditions: [{ field: 'event', eventId: 'cat', value: 2 }, { field: 'turns', value: 3 }] }] };
  const st = { closeness: 0, trust: 0, romance: 0, level: 2, events: { cat: 2 }, turns: 3, score: 0, scoreDelta: 1 };
  assert.deepEqual(pickReward(npc, st, new Set()), { asset: 'a', message: 'A' });
  assert.deepEqual(pickReward(npc, st, new Set(['a'])), { asset: 'b', message: 'B' });
  assert.equal(pickReward(npc, { ...st, turns: 2 }, new Set(['a'])), null);
  assert.equal(pickReward({}, { ...st, score: 20, scoreDelta: 1 }, new Set()).asset, 'rewards/noey_special_smile.webp');
  assert.equal(pickReward({}, { ...st, score: 22, scoreDelta: 1 }, new Set()), null);
});
