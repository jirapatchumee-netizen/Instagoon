import { Dimensions } from './schema.ts';
import type { Analysis, Condition, NpcDefinition, PlayerNpcState, RuleLog, Scores } from './schema.ts';
export function initialState(npc: NpcDefinition, playerId: string, simulated = false): PlayerNpcState {
  return { npcId: npc.id, playerId, scores: { closeness: 0, trust: 0, romance: 0 }, turn: 0, revision: 0, events: {}, ruleUses: {}, unlockedRewards: [], memories: npc.initialMemories.map((value, i) => ({ key: `creator.${i}`, value, source: 'creator', turn: 0, previous: [] })), summary: '', simulated };
}
export function relationship(npc: NpcDefinition, scores: Scores) {
  const weights = { ...npc.relationship.weights, romance: npc.relationship.romanceEnabled ? npc.relationship.weights.romance : 0 };
  const total = Dimensions.reduce((n, k) => n + weights[k], 0);
  const score = Math.round(Dimensions.reduce((n,k) => n + scores[k] * weights[k], 0) / total * 100) / 100;
  const level = npc.relationship.thresholds.filter(v => score >= v).length;
  return { score, level, style: npc.style.levelStyles[level - 1] };
}
export function conditionMet(npc: NpcDefinition, state: PlayerNpcState, c: Condition): boolean {
  if (c.field === 'event') return (state.events[c.eventId] ?? 0) >= Math.max(1, c.value);
  if (c.field === 'level') return relationship(npc, state.scores).level >= c.value;
  if (c.field === 'turns') return state.turn >= c.value;
  if (c.field === 'romance' && !npc.relationship.romanceEnabled) return c.value === 0;
  return state.scores[c.field] >= c.value;
}
export function applyAnalysis(npc: NpcDefinition, before: PlayerNpcState, message: string, source: string, analysis: Analysis) {
  const state = structuredClone(before); state.turn++; state.revision++;
  const ruleLog: RuleLog[] = [];
  for (const rule of npc.rules) {
    const event = analysis.events.find(e => e.ruleId === rule.id && e.evidence.trim() && message.includes(e.evidence));
    const matched = rule.kind === 'keyword' ? rule.keywords.some(k => message.toLocaleLowerCase().includes(k.toLocaleLowerCase())) : Boolean(event);
    if (!matched) continue;
    state.events[rule.id] = (state.events[rule.id] ?? 0) + 1;
    const uses = state.ruleUses[rule.id];
    const reason = uses && rule.maxUses > 0 && uses.count >= rule.maxUses ? 'ถึงจำนวนครั้งสูงสุดแล้ว' : uses && state.turn - uses.lastTurn <= rule.cooldown ? 'อยู่ในช่วง cooldown' : '';
    if (reason) { ruleLog.push({ ruleId: rule.id, name: rule.name, applied: false, reason, changes: { closeness:0, trust:0, romance:0 } }); continue; }
    const changes = { closeness:0, trust:0, romance:0 };
    for (const k of Dimensions) { const next = k === 'romance' && !npc.relationship.romanceEnabled ? 0 : Math.max(0, Math.min(100, state.scores[k] + rule.changes[k])); changes[k] = next - state.scores[k]; state.scores[k] = next; }
    state.ruleUses[rule.id] = { count: (uses?.count ?? 0) + 1, lastTurn: state.turn };
    ruleLog.push({ ruleId: rule.id, name: rule.name, applied: true, reason: event?.evidence ?? 'พบคำสำคัญที่กำหนด', changes });
  }
  for (const m of analysis.memories) {
    if (!m.key.startsWith('player.') || !m.evidence.trim() || !message.includes(m.evidence)) continue;
    const existing = state.memories.find(x => x.key === m.key);
    if (existing && existing.value !== m.value) { existing.previous.push({ value: existing.value, source: existing.source, turn: existing.turn }); existing.value = m.value; existing.source = source; existing.turn = state.turn; }
    else if (!existing) state.memories.push({ key: m.key, value: m.value, source, turn: state.turn, previous: [] });
  }
  if (analysis.summary.trim()) state.summary = analysis.summary.slice(0, 3000);
  const rewards = npc.rewards.filter(r => r.asset && !state.unlockedRewards.includes(r.id) && r.conditions.every(c => conditionMet(npc, state, c)));
  state.unlockedRewards.push(...rewards.map(r => r.id)); return { state, ruleLog, rewards };
}
export function relevantMemories(state: PlayerNpcState, message: string, limit = 20) {
  const terms = message.toLocaleLowerCase().split(/[\s,.;!?]+/).filter(Boolean);
  return [...state.memories].sort((a,b) => { const rank = (m: typeof a) => terms.reduce((n,t) => n + (m.value.toLocaleLowerCase().includes(t) ? 10 : 0), 0) + m.turn / Math.max(state.turn,1); return rank(b)-rank(a); }).slice(0,limit);
}
