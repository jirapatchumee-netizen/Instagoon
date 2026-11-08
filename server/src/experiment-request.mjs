import { SCENE_FORMAT_INSTRUCTION, SCENE_FORMAT_VERSION } from './experiment-scene-format.mjs';

export const EXPERIMENT_GENERATION = Object.freeze({ max_tokens: 1024, temperature: 0.7, reasoning_effort: 'none' });

export function findLastStoryTime(history = [], defaultTime = '12:15 น.') {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role === 'assistant') {
      if (m.content) {
        try {
          const parsed = JSON.parse(m.content);
          if (parsed && typeof parsed.time === 'string' && parsed.time.trim()) return parsed.time.trim();
        } catch {}
      }
      if (m.displayJson) {
        try {
          const parsed = JSON.parse(m.displayJson);
          if (parsed && typeof parsed.time === 'string' && parsed.time.trim()) return parsed.time.trim();
        } catch {}
      }
    }
  }
  return defaultTime;
}

export function buildExperimentRequest(npc, { history = [], userText, now, modePrompt = '', nickname = '' }) {
  const scene = npc.chatExperiment.presentation === SCENE_FORMAT_VERSION;
  const currentStoryTime = scene ? findLastStoryTime(history, npc.chatExperiment?.opening?.time || '12:15 น.') : '';
  const biography = nickname && typeof nickname === 'string' && nickname.trim()
    ? npc.biography.replaceAll('{{user}}', nickname.trim())
    : npc.biography;
  return { model: npc.chatExperiment.model, ...EXPERIMENT_GENERATION,
    ...(scene ? { response_format: { type: 'json_object' } } : {}),
    messages: [{ role: 'system', content: biography },
      ...(modePrompt ? [{ role: 'system', content: modePrompt }] : []),
      ...(scene ? [{ role: 'system', content: SCENE_FORMAT_INSTRUCTION + '\nCurrent story time: ' + currentStoryTime }] : []),
      ...history.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: userText }] };
}
