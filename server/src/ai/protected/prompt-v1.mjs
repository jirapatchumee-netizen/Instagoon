// Owner-locked zone (ADR-0013). The 10-layer romance prompt is a deploy secret, not repo text. A Cloudflare
// secret_text binding caps at ~5 kB, so the template travels as ROMANCE_PROMPT_V1_T1/_T2/_T3 and is joined
// here in order; ROMANCE_PROMPT_V1_SLOTS holds a per-creator JSON of the slots the public character card has
// no field for (goal pair, plot clock, cast ownership, voice slots).
// Returns null when nothing is configured or when a slot could not be filled, so callers fall back to
// the previous inline prompt instead of shipping a half-rendered one.
const templateOf = env => {
  const parts = [env.ROMANCE_PROMPT_V1_T1, env.ROMANCE_PROMPT_V1_T2, env.ROMANCE_PROMPT_V1_T3];
  // The chunks are one document: a partially deployed template would silently drop whole layers.
  if (!parts.every(part => typeof part === 'string' && part.length)) return '';
  return parts.join('');
};
const cardSlots = npc => {
  const s = npc.style || {};
  const ls = s.levelStyles || [];
  const rules = (npc.rules || []).map(r => `"${r.id}" (${r.description}; ${r.kind === 'keyword' ? `keywords: ${(r.keywords || []).join(', ')}` : 'detect semantically'}; effect: ${JSON.stringify(r.changes || {})}${r.maxUses ? `; max ${r.maxUses} uses` : ''})`).join(' | ');
  return {
    NPC_NAME: npc.name, NPC_AGE: npc.age, NPC_TAGLINE: npc.tagline, NPC_BIO: npc.biography,
    NPC_PERSONALITY: npc.personality, NPC_LIKES: npc.likes, NPC_DISLIKES: npc.dislikes, NPC_GOALS: npc.goals,
    NPC_APPEARANCE: npc.appearanceDetail, NPC_WORLD: npc.world, NPC_OCCUPATION: npc.occupation,
    NPC_SCENT: npc.sensoryProps?.scent, NPC_CLOTHING: npc.sensoryProps?.clothing, NPC_PROPS: npc.sensoryProps?.props,
    USER_ROLE: npc.userRole, PRECEDING_INCIDENT: npc.precedingIncident,
    IMMUTABLE_FACTS: (npc.immutableFacts || []).map(f => `"${f}"`).join('; '),
    KNOWLEDGE_BOUNDARY: npc.knowledgeBoundary,
    SECRETS_GATED: (npc.secrets || []).map(x => `"${x.content}" (Level ${x.minLevel}+)`).join(' | '),
    TRIGGER_RULES: rules,
    STYLE_L12: ls.slice(0, 2).join(' then '), STYLE_L34: ls.slice(2, 4).join(' then '), STYLE_L5: ls.at(-1),
    LENGTH_TARGET: { short: '1-3 short DM sentences', medium: '3-5 sentences' }[s.length] || '1-3 short DM sentences',
    EMOJI_BUDGET: { none: '0', some: '0-2', lots: 'up to 4' }[s.emoji] || '0-2',
    TONE: s.tone, EXAMPLES: s.examples || '', FALLBACK_LINE: s.fallback || ''
  };
};

const slotText = value => typeof value === 'string' || typeof value === 'number' ? String(value) : '';

const slotsFor = (npc, authored, state) => ({
  ...cardSlots(npc), ...authored, ...state,
  USER_REF: 'the player',
  USER_TOKEN: 'คุณ',
  MODE_BLOCK: state.fiftyShadesPrompt
    ? `FIFTY SHADES MODE IS ON FOR THIS TURN:\n${state.fiftyShadesPrompt}`
    : 'Fifty Shades Mode is off for this turn: keep the slow-burn level ladder above.'
});

// Layer markers are tolerant of CRLF and trailing spaces, so a template pasted from a doc still renders.
// The {{user}} macro is expanded last: cards write it inside Thai prose, and a raw macro in the middle of
// a sentence reads as a system term to the model.
const fill = (template, map) => template
  .replace(/^{{LAYER_([A-J])}}[ \t]*\r?$/gm, '[$1]')
  .replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, (mark, name) => slotText(map[name]).trim() ? map[name] : mark)
  .split('{{user}}').join(map.USER_TOKEN);

export function promptV1Gaps({ env, npc, creator, state }) {
  const template = templateOf(env);
  if (!template || !npc) return { reason: 'template or npc card missing', unresolved: [] };
  let authored = {};
  try {
    authored = env.ROMANCE_PROMPT_V1_SLOTS ? (JSON.parse(env.ROMANCE_PROMPT_V1_SLOTS)[creator] || {}) : {};
  } catch { return { reason: 'ROMANCE_PROMPT_V1_SLOTS is not valid JSON', unresolved: [] }; }
  const map = slotsFor(npc, authored, state);
  const out = fill(template, map);
  return { reason: null, unresolved: [...new Set([...out.matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)].map(m => m[1]))] };
}

export function promptV1({ env, npc, creator, state }) {
  const template = templateOf(env);
  if (!template || !npc) return null;
  let authored = {};
  try {
    authored = env.ROMANCE_PROMPT_V1_SLOTS ? (JSON.parse(env.ROMANCE_PROMPT_V1_SLOTS)[creator] || {}) : {};
  } catch { return null; }
  const out = fill(template, slotsFor(npc, authored, state));
  return /\{\{[A-Z][A-Z0-9_]*\}\}/.test(out) ? null : out;
}
