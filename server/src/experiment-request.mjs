import { SCENE_FORMAT_INSTRUCTION, SCENE_FORMAT_VERSION, decodeExperimentScene } from './experiment-scene-format.mjs';
import { PLAYER_ACTION_INSTRUCTION, PLAYER_ACTION_POLICY } from './experiment-player-actions.mjs';

export const EXPERIMENT_GENERATION = Object.freeze({ max_tokens: 1024, temperature: 0.7, reasoning_effort: 'none' });
export function responseContractFor(npc, requested) {
  const config = npc.id === 'cheer' ? npc.chatExperiment?.responseContract : null;
  const variant = requested ?? config?.defaultVariant ?? 'baseline';
  const variants = ['baseline', 'contract', ...(config?.previous ? ['contract-v1'] : [])];
  if (!variants.includes(variant) || (variant !== 'baseline' && !config)) throw new Error('invalid_response_variant');
  const selected = variant === 'baseline' ? null : variant === 'contract-v1' ? config.previous : config;
  if (selected && (!['cheer-response-v1', 'cheer-response-v2'].includes(selected.id) || typeof selected.text !== 'string' || !selected.text.trim() || selected.text.length > 2400)) throw new Error('invalid_response_contract');
  const versions = config ? { contract: config.id, ...(config.previous ? { 'contract-v1': config.previous.id } : {}) } : {};
  return { variant, text: selected?.text || '', id: selected?.id || null, available: Boolean(config), variants, versions, playerActionPolicy: selected?.id === 'cheer-response-v2' ? PLAYER_ACTION_POLICY : null };
}

export function buildExperimentRequest(npc, { history = [], userText, now, modePrompt = '', contractText = '', playerActionPolicy }) {
  const scene = npc.chatExperiment.presentation === SCENE_FORMAT_VERSION;
  let precedingInput = '';
  const projectedHistory = history.map(m => {
    if (m.role === 'user') precedingInput = m.content;
    if (m.role === 'assistant' && playerActionPolicy === PLAYER_ACTION_POLICY) {
      // Preserve provider JSON in storage; stop its misclassified speech reinforcing future turns.
      try {
        const value = JSON.parse(m.content);
        const clean = decodeExperimentScene(m.content, precedingInput, m.createdAt ?? now, { playerActionPolicy });
        return { role: m.role, content: JSON.stringify({ ...value, playerActions: clean.playerActions }) };
      } catch { /* Non-scene history is left verbatim. */ }
    }
    return { role: m.role, content: m.content };
  });
  return { model: npc.chatExperiment.model, ...EXPERIMENT_GENERATION,
    ...(scene ? { response_format: { type: 'json_object' } } : {}),
    messages: [{ role: 'system', content: npc.biography },
      ...(modePrompt ? [{ role: 'system', content: modePrompt }] : []),
      ...(contractText ? [{ role: 'system', content: contractText }] : []),
      ...(scene ? [{ role: 'system', content: SCENE_FORMAT_INSTRUCTION + (playerActionPolicy === PLAYER_ACTION_POLICY ? '\n' + PLAYER_ACTION_INSTRUCTION : '') + '\nServer clock (Asia/Bangkok): ' + new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(now)) }] : []),
      ...projectedHistory, { role: 'user', content: userText }] };
}
