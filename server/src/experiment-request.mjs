import { SCENE_FORMAT_INSTRUCTION, SCENE_FORMAT_VERSION } from './experiment-scene-format.mjs';

export const EXPERIMENT_GENERATION = Object.freeze({ max_tokens: 1024, temperature: 0.7, reasoning_effort: 'none' });
export function responseContractFor(npc, requested) {
  const config = npc.id === 'cheer' ? npc.chatExperiment?.responseContract : null;
  const variant = requested ?? config?.defaultVariant ?? 'baseline';
  if (!['baseline', 'contract'].includes(variant) || (variant === 'contract' && !config)) throw new Error('invalid_response_variant');
  if (variant === 'contract' && (config.id !== 'cheer-response-v1' || typeof config.text !== 'string' || !config.text.trim() || config.text.length > 2400)) throw new Error('invalid_response_contract');
  return { variant, text: variant === 'contract' ? config.text : '', id: variant === 'contract' ? config.id : null, available: Boolean(config) };
}

export function buildExperimentRequest(npc, { history = [], userText, now, modePrompt = '', contractText = '' }) {
  const scene = npc.chatExperiment.presentation === SCENE_FORMAT_VERSION;
  return { model: npc.chatExperiment.model, ...EXPERIMENT_GENERATION,
    ...(scene ? { response_format: { type: 'json_object' } } : {}),
    messages: [{ role: 'system', content: npc.biography },
      ...(modePrompt ? [{ role: 'system', content: modePrompt }] : []),
      ...(contractText ? [{ role: 'system', content: contractText }] : []),
      ...(scene ? [{ role: 'system', content: SCENE_FORMAT_INSTRUCTION + '\nServer clock (Asia/Bangkok): ' + new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(now)) }] : []),
      ...history.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: userText }] };
}
