// Presentation only. No persona examples, banter policy, goal reducer or relationship rules.
export const SCENE_FORMAT_VERSION = 'scene-v1';
export const SCENE_FORMAT_INSTRUCTION = `Output formatting only; the character profile determines personality, wording, feelings and decisions.
Return a single JSON object with these fields:
{"location":"current fictional scene location","time":"fictional story time (e.g. 12:17 น.)","innerThought":"brief fictional character inner monologue","playerActions":["verbatim excerpt from the latest player input"],"beats":[{"kind":"dialogue","text":"content"}]}
location: name the current scene from this conversation; keep it unless the exchange changes it. If none is established, choose a plausible fictional place consistent with the profile and input. Do not invent a real address.
time: maintain the narrative clock of the story. Progress time naturally from the previous turn (typically 1-3 minutes per exchange, e.g. 12:15 น. -> 12:17 น.) or jump appropriately if the player or story jumps time. Do not use real-world clock time.
innerThought: required, one short fictional character reaction, not model reasoning or analysis.
playerActions: include only physical actions or gestures explicitly marked by the player with asterisks (*action*) or action tags ([action: ...]). Never include spoken words, dialogue, or normal chat messages. If the player only spoke or sent text without action markers, return []. Do not invent player actions, feelings, decisions, acceptance or the outcome of a request.
beats: each kind is exactly "action" or "dialogue". Order character actions and spoken dialogue; use at least one dialogue beat. Put event/action descriptions in action beats and spoken words in dialogue beats. Actions may be absent. Do not repeat playerActions in beats or put inner thoughts into action beats. No action:/dialogue: prefixes inside text. The character's language and voice come from the profile; these formatting requirements do not prescribe conversational tactics or sample lines.
fastForward: optional. If a future appointment or rendezvous is agreed upon (e.g. at 17:00, or a specific venue) and characters are physically parting ways, return a single object: {"location":"target place","time":"target time e.g. 17:00 น.","label":"⏩ ไปที่ <place> (<time>)"}. Otherwise null or omit.
The app displays time and location from these fields. Do not repeat a time/location header in beats. Output JSON only.`;
const text = (value, max, required = true) => {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('experiment_invalid_scene');
  return value.trim();
};
export function explicitPlayerActions(input) {
  const actions = [];
  const re = /\*{1,2}([^*\n]+)\*{1,2}|\[(?:action|การกระทำ):\s*([^\]\n]+)\]|^\s*(?:\/me\s+|การกระทำ:\s*)([^\n]+)/gim;
  for (const match of input.matchAll(re)) {
    const prefix = input.slice(0, match.index);
    const linePrefix = prefix.slice(prefix.lastIndexOf('\n') + 1);
    const quoted = (prefix.match(/"/g) || []).length % 2 === 1 || prefix.lastIndexOf('“') > prefix.lastIndexOf('”') || prefix.lastIndexOf('「') > prefix.lastIndexOf('」');
    if (quoted || /ถ้า|สมมติ|ตัวอย่าง|คำว่า/.test(linePrefix)) continue;
    const quote = (match[1] || match[2] || match[3] || '').trim();
    if (quote && !actions.includes(quote)) actions.push(quote);
  }
  return actions;
}
export function advanceStoryTime(timeStr, minutesToAdd = 2) {
  if (typeof timeStr !== 'string') return undefined;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;
  let h = parseInt(match[1], 10);
  let m = parseInt(match[2], 10) + minutesToAdd;
  h = (h + Math.floor(m / 60)) % 24;
  m = m % 60;
  const suffix = timeStr.includes('น') ? ' น.' : '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${suffix}`;
}
const escape = value => value.replaceAll('[', '［').replaceAll(']', '］');
export function decodeExperimentScene(raw, input, at, fallbackTime) {
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('experiment_invalid_scene'); }
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Number.isFinite(at)) throw new Error('experiment_invalid_scene');
  const location = text(value.location, 100), innerThought = text(value.innerThought, 300);
  const time = typeof value.time === 'string' && value.time.trim() ? text(value.time, 30) : (fallbackTime ? advanceStoryTime(fallbackTime) : undefined);
  if (!Array.isArray(value.beats) || !value.beats.length || value.beats.length > 12 || !Array.isArray(value.playerActions) || value.playerActions.length > 8) throw new Error('experiment_invalid_scene');
  const beats = value.beats.map(beat => {
    if (!['action', 'dialogue'].includes(beat?.kind)) throw new Error('experiment_invalid_scene');
    return { kind: beat.kind, text: text(beat.text, 1600) };
  });
  if (!beats.some(beat => beat.kind === 'dialogue') || beats.reduce((sum, beat) => sum + beat.text.length, 0) > 6000) throw new Error('experiment_invalid_scene');
  const marked = explicitPlayerActions(input);
  const supplied = value.playerActions.map(quote => {
    const excerpt = text(quote, 1000);
    if (!input.includes(excerpt)) throw new Error('experiment_ungrounded_player_action');
    const isExplicit = excerpt.match(/^\*{1,2}([^*]+)\*{1,2}$/) || excerpt.match(/^\[(?:action|การกระทำ):\s*([^\]]+)\]$/i);
    if (isExplicit) return isExplicit[1].trim();
    // Drop unmarked excerpts when the player supplied no marked action syntax or when the model quoted full speech
    if (!marked.length || excerpt.trim() === input.trim()) return null;
    return excerpt;
  }).filter(Boolean);
  const playerActions = [...new Set([...marked, ...supplied])].sort((a, b) => input.indexOf(a) - input.indexOf(b));
  const displayBeats = structuredClone(beats);
  if (playerActions.length) {
    const playerText = playerActions.map(quote => `คุณ: ${quote}`).join('\n');
    if (displayBeats[0].kind === 'action') displayBeats[0].text = playerText + '\n' + displayBeats[0].text;
    else displayBeats.unshift({ kind: 'action', text: playerText });
  }
  let fastForward = undefined;
  if (value.fastForward && typeof value.fastForward === 'object' && !Array.isArray(value.fastForward)) {
    const ffLoc = typeof value.fastForward.location === 'string' && value.fastForward.location.trim() ? text(value.fastForward.location, 100) : undefined;
    const ffTime = typeof value.fastForward.time === 'string' && value.fastForward.time.trim() ? text(value.fastForward.time, 30) : undefined;
    const ffLabel = typeof value.fastForward.label === 'string' && value.fastForward.label.trim() ? text(value.fastForward.label, 150) : undefined;
    if (ffLoc) {
      fastForward = { location: ffLoc, ...(ffTime ? { time: ffTime } : {}), label: ffLabel || (ffTime ? `⏩ ไปที่ ${ffLoc} (${ffTime})` : `⏩ ไปที่ ${ffLoc}`) };
    }
  }
  return { at, ...(time ? { time } : {}), location, innerThought, playerActions, beats: displayBeats, ...(fastForward ? { fastForward } : {}) };
}
export function serializeExperimentScene(scene) {
  const meta = { at: scene.at, ...(scene.time ? { time: escape(scene.time) } : {}), location: escape(scene.location), ...(scene.fastForward ? { fastForward: scene.fastForward } : {}) };
  return [`[scene:${JSON.stringify(meta)}]`,
    `[thought:${escape(scene.innerThought)}]`,
    ...scene.beats.map(beat => beat.kind === 'action' ? `[action:${escape(beat.text)}]` : escape(beat.text))].join('\n');
}
