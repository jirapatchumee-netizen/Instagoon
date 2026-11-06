import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as zone from '../src/ai/protected/gemini-config.mjs';
import { fiftyShadesPrompt } from '../src/ai/protected/fifty-shades.mjs';

// ADR-0013: the owner-locked zone. A pinned hash changes only in a commit whose message carries the owner's go;
// update the hash in that same commit. Values are hashed so the test never repeats prompt text.
const PINNED = {
  models: '6be924fed02c7dfb56828d6ca980913da8c23dd42f5c76f7e86f75999975e0d5',
  defaultLite: '9a9f0bb7d45d033b80d2c4894621c0d5ca110ed6d006afc9ed6701ad1e83d371',
  safety: 'e5818ff1091c6d23229f84fd8b23d52d1d2efe513664cb3808e8033d65e5c810',
  chat: '8c7cbaef0f5eed98f15496941844f2d348abae54d2212de0c727104a04c2776f',
  rewrite: '1dbfc94b694bc1a7251738ebff670911282dea8162da1ffde9a263c31ce338d7',
  summary: 'ed5e1024aa773cdc7854308cf1e05a4466e2002518113af88d5f5614354bb4cc',
  pick: '4427df6f073d7de3954f89b41accf6cd12d223e3e227ac683b29557eb285bdbe',
  order: '5d5d64d173dd826c29e7059d69414c96f8aa4642e2870f46757ef663562fa863',
  fifty: 'd19066b3660c13972234e4ed226bc5d45376446fda1dff6706195933e206847f'
};
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const models = zone.ALLOWED_GEMINI_MODELS;

test('owner-locked AI config matches its pinned behaviour', () => {
  const actual = {
    models: sha(models),
    defaultLite: sha(zone.DEFAULT_LITE_MODEL),
    safety: sha(zone.SAFETY_SETTINGS),
    chat: sha(models.map(m => zone.chatGenerationConfig(m, { type: 'OBJECT' }))),
    rewrite: sha(models.map(zone.rewriteGenerationConfig)),
    summary: sha(models.map(zone.summaryGenerationConfig)),
    pick: sha([undefined, '', 'models/gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-9-ultra'].map(zone.pickLiteModel)),
    order: sha(['', 'a', 'visit-1', '00000000-0000-4000-8000-000000000001'].map(v => zone.modelsForVisit(models, v))),
    fifty: sha([
      fiftyShadesPrompt({ enabled: false, npcName: 'N', env: {} }),
      fiftyShadesPrompt({ enabled: true, npcName: 'N', env: {} }),
      fiftyShadesPrompt({ enabled: true, npcName: 'N', env: { FIFTY_SHADES_SECRET_PROMPT: 'S ${npcName} ${npcName}' } })
    ])
  };
  for (const [name, hash] of Object.entries(PINNED)) assert.equal(actual[name], hash, `${name} changed: owner-locked zone (ADR-0013)`);
});

test('the zone values cannot be changed at runtime', () => {
  assert.ok(Object.isFrozen(models));
  assert.ok(Object.isFrozen(zone.SAFETY_SETTINGS) && zone.SAFETY_SETTINGS.every(Object.isFrozen));
});

test('the worker takes every zone value from the zone, never inline', () => {
  const src = readFileSync(new URL('../src/index.mjs', import.meta.url), 'utf8');
  for (const re of [/BLOCK_NONE|BLOCK_MEDIUM_AND_ABOVE|HARM_CATEGORY_/, /thinkingBudget|thinkingConfig|thinkingLevel/, /FIFTY_SHADES_SECRET_PROMPT/, /['"`]gemini-[0-9]/])
    assert.ok(!re.test(src), `server/src/index.mjs must not contain ${re}`);
});
