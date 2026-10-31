// Gameplay rules for DM turns. Owned by the Content team (see CODEOWNERS).
// Pure functions only: no env, database, network, secrets or imports from outside this folder.
// worker/tests/gameplay.test.mjs enforces this and must pass before staging deploys.

const DEFAULT_WEIGHTS = { closeness: 40, trust: 40, romance: 20 };
const DEFAULT_THRESHOLDS = [0, 20, 40, 60, 80];
const DEFAULT_STYLE = 'เป็นธรรมชาติ อบอุ่น';
const clamp = v => Math.min(100, Math.max(0, v));

export function relationshipConfig(npcDef) {
  const weights = npcDef?.relationship?.weights || DEFAULT_WEIGHTS;
  const w = npcDef?.relationship?.romanceEnabled !== false ? weights : { closeness: weights.closeness, trust: weights.trust, romance: 0 };
  return {
    weights: w,
    totalWeight: (w.closeness || 0) + (w.trust || 0) + (w.romance || 0),
    thresholds: npcDef?.relationship?.thresholds || DEFAULT_THRESHOLDS,
  };
}

// Weighted 0–100 score from the three axes; `fallback` when no axis has weight.
export function overallScore(cfg, { closeness, trust, romance }, fallback) {
  const w = cfg.weights;
  return cfg.totalWeight > 0
    ? Math.round((((closeness * (w.closeness || 0)) + (trust * (w.trust || 0)) + (romance * (w.romance || 0))) / cfg.totalWeight) * 100) / 100
    : fallback;
}

export function levelOf(cfg, score) {
  let lv = 0;
  for (const th of cfg.thresholds) if (score >= th) lv++;
  return Math.max(1, Math.min(5, lv));
}

export function matchKeywordRules(npcDef, text) {
  const lower = text.toLowerCase();
  return (npcDef?.rules || [])
    .filter(r => r.kind === 'keyword' && Array.isArray(r.keywords) && r.keywords.some(k => k && lower.includes(String(k).toLowerCase().trim())))
    .map(r => r.id);
}

export const secretsFor = (npcDef, level) => (npcDef?.secrets || []).filter(s => level >= (s.minLevel || 1));

export const levelStyle = (npcDef, level) => (npcDef?.style?.levelStyles && npcDef.style.levelStyles[level - 1]) || DEFAULT_STYLE;

// Apply each detected rule's axis changes (respecting maxUses). Returns a new state.
export function applyRules(npcDef, ruleIds, state) {
  const s = { ...state, events: { ...state.events }, ruleUses: { ...state.ruleUses } };
  for (const r of npcDef?.rules || []) {
    if (!ruleIds.includes(r.id)) continue;
    s.events[r.id] = (s.events[r.id] || 0) + 1;
    const previous = s.ruleUses[r.id];
    const count = typeof previous === 'number' ? previous : (previous?.count || 0);
    const lastTurn = typeof previous === 'object' && Number.isInteger(previous?.lastTurn) ? previous.lastTurn : null;
    const cooling = lastTurn !== null && Number.isInteger(s.turns) && s.turns - lastTurn <= (r.cooldown || 0);
    if (!cooling && (!r.maxUses || count < r.maxUses)) {
      s.closeness = clamp(s.closeness + (r.changes?.closeness || 0));
      s.trust = clamp(s.trust + (r.changes?.trust || 0));
      s.romance = npcDef?.relationship?.romanceEnabled === false ? 0 : clamp(s.romance + (r.changes?.romance || 0));
      s.ruleUses[r.id] = Number.isInteger(s.turns) ? {count:count+1,lastTurn:s.turns} : count+1;
    }
  }
  return s;
}

// First reward whose conditions all pass and is not in `unlocked`, else null.
// state: { closeness, trust, romance, level, events, turns, score, scoreDelta }
export function pickReward(npcDef, state, unlocked) {
  if (!npcDef?.rewards) {
    // Legacy NPCs without a reward table.
    return state.score >= 20 && (state.score - state.scoreDelta) < 20
      ? { asset: 'rewards/noey_special_smile.webp', message: 'เนยแอบส่งรูปพิเศษให้คุณเป็นรางวัลที่สนิทกันมากขึ้นนะคะ 💕' }
      : null;
  }
  for (const rew of npcDef.rewards) {
    if (!rew.asset || unlocked.has(rew.asset)) continue;
    const passed = (rew.conditions || []).every(c => {
      switch (c.field) {
        case 'level': return state.level >= (c.value || 0);
        case 'closeness': return state.closeness >= (c.value || 0);
        case 'trust': return state.trust >= (c.value || 0);
        case 'romance': return state.romance >= (c.value || 0);
        case 'event': return (state.events[c.eventId] || 0) >= Math.max(1, c.value || 1);
        case 'turns': return state.turns >= (c.value || 0);
        default: return false;
      }
    });
    if (passed) return { asset: rew.asset, message: rew.message };
  }
  return null;
}
