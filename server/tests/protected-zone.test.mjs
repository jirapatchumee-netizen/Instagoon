import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as zone from '../src/ai/protected/gemini-config.mjs';
import { fiftyShadesPrompt } from '../src/ai/protected/fifty-shades.mjs';
import { promptV1, promptV1Gaps } from '../src/ai/protected/prompt-v1.mjs';

// ADR-0013: the owner-locked zone. A pinned hash changes only in a commit whose message carries the owner's go;
// update the hash in that same commit. Values are hashed so the test never repeats prompt text.
const PINNED = {
  models: '6be924fed02c7dfb56828d6ca980913da8c23dd42f5c76f7e86f75999975e0d5',
  defaultLite: '9a9f0bb7d45d033b80d2c4894621c0d5ca110ed6d006afc9ed6701ad1e83d371',
  safety: 'e5818ff1091c6d23229f84fd8b23d52d1d2efe513664cb3808e8033d65e5c810',
  chat: 'a72f693558de62e1a7108052396176e93ca1b986710f8942237ad3de2fb8b720',
  rewrite: '33a45bcbcfc2b062fac76a7ed4bddd2b9cffee8c6af0c9c5b6953e7a3fe2ee1f',
  summary: 'd78748fdcc35d82c69cb9701a620ac62470160df0b3eea38ec6a6fdffc7c517f',
  pick: '4427df6f073d7de3954f89b41accf6cd12d223e3e227ac683b29557eb285bdbe',
  order: '5d5d64d173dd826c29e7059d69414c96f8aa4642e2870f46757ef663562fa863',
  modelTest: '3b1a32871b7073b5ddcdcc115176a5796f04328a48e975cc20ee450550418bd6',
  fifty: 'd19066b3660c13972234e4ed226bc5d45376446fda1dff6706195933e206847f',
  v1: '9f9ae2cea7620d61a55305ee43e2c585343c4af0d32cb37f15cb3dbfdb586378'
};
// The v1 template itself is a deploy secret, so its pin covers only the renderer's behaviour, measured
// through the zone's own exports on a synthetic template and card: chunk joining, fail-closed paths,
// card->slot mapping, layer markers, macro expansion and the mode block.
const SYN = [
  '{{LAYER_A}}\nOVERT {{GOAL_OVERT}} COVERT {{GOAL_COVERT}} CLOCK {{PLOT_CLOCK}}\nNPC {{NPC_NAME}} ({{NPC_AGE}}) role {{USER_ROLE}}\n',
  '{{LAYER_D}}  \r\nSELF {{PRONOUN_SELF}} USER {{user}} L12 {{STYLE_L12}} LEN {{LENGTH_TARGET}} EMOJI {{EMOJI_BUDGET}}\nFACTS {{IMMUTABLE_FACTS}} SECRET {{SECRETS_GATED}} RULES {{TRIGGER_RULES}}\n',
  '{{LAYER_F}}\n{{NOW_DATE}} {{NOW_TIME}} @ {{NOW_PLACE}} C{{CLOSENESS}}/T{{TRUST}}/R{{ROMANCE}} {{REL}} LV{{LEVEL}} CLOCK {{CLOCK_STATE}} LOOPS {{OPEN_LOOPS}}\nBOT {{BOT_NPCS}} USER_NPCS {{USER_NPCS}} NOTE {{STATE_DELTA_NOTE}} FLAVOUR {{FLAVOUR_FIELDS}}\n{{LAYER_J}}\nCANARY {{CANARY}}\n{{MODE_BLOCK}}\n'
];
const chunks = (over = {}) => ({ ROMANCE_PROMPT_V1_T1: SYN[0], ROMANCE_PROMPT_V1_T2: SYN[1], ROMANCE_PROMPT_V1_T3: SYN[2], ...over });
const FIX_SLOTS = { GOAL_OVERT: 'win the bet', GOAL_COVERT: 'catch feelings', PLOT_CLOCK: 'one semester', PRONOUN_SELF: 'we', BOT_NPCS: 'no bots', USER_NPCS: 'the friend speaks for herself', STATE_DELTA_NOTE: 'state moves only on a matched rule', FLAVOUR_FIELDS: 'scent, sleeve rolls' };
const FIX_NPC = {
  name: 'Fix', age: 22, userRole: 'the junior',
  immutableFacts: ['she is 22'],
  secrets: [{ content: 'first secret', minLevel: 3 }, { content: 'later secret', minLevel: 5 }],
  rules: [
    { id: 'kw', kind: 'keyword', keywords: ['exam', 'coffee'], description: 'teases him', changes: { closeness: 1 } },
    { id: 'sem', kind: 'state', description: 'protects him', changes: { trust: 1 }, maxUses: 2 }
  ],
  style: { levelStyles: ['s1', 's2', 's3', 's4', 's5'], length: 'short', emoji: 'some', tone: 'dry', examples: 'ex', fallback: 'fb' }
};
const FIX_STATE = { NOW_DATE: 'Mon 1', NOW_TIME: '10:00', NOW_PLACE: 'rooftop', CLOSENESS: 12, TRUST: 20, ROMANCE: 5, REL: 'senior', LEVEL: 2, CLOCK_STATE: 'Level 2/5 so far', OPEN_LOOPS: 'the bet', CANARY: 'IGX-fixture' };
const slotsEnv = chunks({ ROMANCE_PROMPT_V1_SLOTS: JSON.stringify({ fix: FIX_SLOTS }) });
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
    modelTest: sha(models.map(zone.modelTestGenerationConfig)),
    pick: sha([undefined, '', 'models/gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-9-ultra'].map(zone.pickLiteModel)),
    order: sha(['', 'a', 'visit-1', '00000000-0000-4000-8000-000000000001'].map(v => zone.modelsForVisit(models, v))),
    fifty: sha([
      fiftyShadesPrompt({ enabled: false, npcName: 'N', env: {} }),
      fiftyShadesPrompt({ enabled: true, npcName: 'N', env: {} }),
      fiftyShadesPrompt({ enabled: true, npcName: 'N', env: { FIFTY_SHADES_SECRET_PROMPT: 'S ${npcName} ${npcName}' } })
    ]),
    v1: sha([
      promptV1({ env: {}, npc: FIX_NPC, creator: 'fix', state: FIX_STATE }),
      promptV1({ env: chunks({ ROMANCE_PROMPT_V1_T2: '' }), npc: FIX_NPC, creator: 'fix', state: FIX_STATE }),
      promptV1({ env: chunks({ ROMANCE_PROMPT_V1_SLOTS: '{' }), npc: FIX_NPC, creator: 'fix', state: FIX_STATE }),
      promptV1({ env: chunks({ ROMANCE_PROMPT_V1_SLOTS: '{}' }), npc: null, creator: 'fix', state: FIX_STATE }),
      promptV1({ env: chunks({ ROMANCE_PROMPT_V1_SLOTS: '{}' }), npc: FIX_NPC, creator: 'other', state: FIX_STATE }),
      promptV1({ env: slotsEnv, npc: FIX_NPC, creator: 'fix', state: FIX_STATE }),
      promptV1({ env: slotsEnv, npc: FIX_NPC, creator: 'fix', state: { ...FIX_STATE, fiftyShadesPrompt: 'S ${npcName} ${npcName}' } }),
      promptV1Gaps({ env: chunks({ ROMANCE_PROMPT_V1_SLOTS: '{}' }), npc: FIX_NPC, creator: 'other', state: FIX_STATE })
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
  // A new call site that builds its own generationConfig would silently escape the zone.
  const calls = (src.match(/:generateContent/g) || []).length;
  const fromZone = (src.match(/\b(chat|rewrite|summary|modelTest)GenerationConfig\(/g) || []).length;
  assert.equal(calls, 4, 'unexpected number of Gemini call sites in server/src/index.mjs');
  assert.equal(fromZone, calls, 'every Gemini call site must take generationConfig from the zone');
});
