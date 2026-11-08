import { SCENE_FORMAT_INSTRUCTION, SCENE_FORMAT_VERSION } from './experiment-scene-format.mjs';

export const EXPERIMENT_GENERATION = Object.freeze({ max_tokens: 1024, temperature: 0.7, reasoning_effort: 'none' });

export function buildExperimentRequest(npc, { history = [], userText, now, modePrompt = '' }) {
  const scene = npc.chatExperiment.presentation === SCENE_FORMAT_VERSION;
  return { model: npc.chatExperiment.model, ...EXPERIMENT_GENERATION,
    ...(scene ? { response_format: { type: 'json_object' } } : {}),
    messages: [{ role: 'system', content: npc.biography },
      ...(modePrompt ? [{ role: 'system', content: modePrompt }] : []),
      ...(scene ? [{ role: 'system', content: SCENE_FORMAT_INSTRUCTION + '\nServer clock (Asia/Bangkok): ' + new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(now)) }] : []),
      ...history.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: userText }] };
}
