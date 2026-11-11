// One presentation standard for every reply path: system-owned scene header
// (in-fiction time + place) and the fixed component order inside the bubble.
// The model never writes the header; the server stores and renders it.
export const SCENE_STANDARD_VERSION = 'scene-standard-v1';
export const SCENE_STANDARD_ORDER = Object.freeze(['innerThought', 'action', 'dialogue', 'action', 'dialogue']);
export const STORY_TIME_STEP_MINUTES = 2;
export const DEFAULT_STORY_TIME = '12:15 น.';

const clean = (value, max) => typeof value === 'string'
  ? value.replace(/[[\]<>\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

export function parseFictionTime(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]), minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function formatFictionClock(minutes) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439) return null;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} น.`;
}

export function bangkokClockMinutes(at) {
  if (!Number.isFinite(at)) return null;
  const bangkok = new Date(at + 7 * 3600 * 1000);
  return bangkok.getUTCHours() * 60 + bangkok.getUTCMinutes();
}

// A thread with no stored scene clock is seeded once from the real clock, then
// every later turn advances from the stored fiction clock only.
export function resolveFictionClock(storedValue, at, step = STORY_TIME_STEP_MINUTES) {
  const stored = parseFictionTime(storedValue);
  if (stored !== null) return (stored + step) % 1440;
  const seeded = bangkokClockMinutes(at);
  return seeded === null ? parseFictionTime(DEFAULT_STORY_TIME) : seeded;
}

export function readStoredScene(rows = []) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const content = rows[i]?.role === 'assistant' ? String(rows[i]?.content || '') : '';
    const match = content.match(/^\[scene:([^\]]*)\]/i);
    if (!match) continue;
    try {
      const value = JSON.parse(match[1]);
      return { time: typeof value.time === 'string' ? value.time : null,
        location: typeof value.location === 'string' ? value.location : null };
    } catch {}
  }
  return { time: null, location: null };
}

// Canonical order: action -> dialogue -> action -> dialogue. Spoken text is never
// invented here; a missing component just shortens the bubble.
export function orderBeats({ beats, action, reply } = {}) {
  const source = Array.isArray(beats) && beats.length
    ? beats.map(beat => ({ kind: beat?.kind === 'action' ? 'action' : 'dialogue', text: clean(beat?.text, 350) }))
      .filter(beat => beat.text)
    : [{ kind: 'action', text: clean(action, 350) }, { kind: 'dialogue', text: clean(reply, 350) }]
      .filter(beat => beat.text);
  const actions = source.filter(beat => beat.kind === 'action');
  const dialogues = source.filter(beat => beat.kind === 'dialogue');
  const ordered = [];
  const pairs = Math.max(actions.length, dialogues.length);
  for (let i = 0; i < pairs && ordered.length < 6; i++) {
    if (actions[i]) ordered.push(actions[i]);
    if (dialogues[i]) ordered.push(dialogues[i]);
  }
  return ordered;
}

export function serializeSceneBubble({ at, time, location, mood, thought, beats }) {
  const escape = value => value.replaceAll('[', '［').replaceAll(']', '］');
  const parts = [];
  if (location) parts.push(`[scene:${JSON.stringify({ at, ...(time ? { time: escape(time) } : {}), location: escape(location) })}]`);
  if (mood) parts.push(`[mood:${escape(mood)}]`);
  if (thought) parts.push(`[thought:${escape(thought)}]`);
  for (const beat of beats) parts.push(beat.kind === 'action' ? `[action:${escape(beat.text)}]` : escape(beat.text));
  return parts.join('\n');
}

export const SCENE_STANDARD_INSTRUCTION = `Bubble standard (SCENE_HEADER + ${SCENE_STANDARD_ORDER.join(' > ')}):
- The app prints a scene header with in-fiction time and place above every reply from the scene fields you return. Never write a time or location header into reply or beat text, and never use the real-world clock as the story clock.
- sceneTime: continue the story clock given for this turn, advancing it about ${STORY_TIME_STEP_MINUTES} minutes per exchange, or jump it when the scene jumps. Format "HH:MM น.".
- sceneLocation: the place the scene is happening in now, from the current scene; update it as soon as the characters move.
- Order the visible components exactly as: private inner thought, then a character-owned action beat, then spoken dialogue, then another action beat, then a closing spoken beat that invites, persuades or playfully challenges the player.
- The closing beat follows the existing conversational-hook rate for this level; it is a tactic, not a compulsory question. Omit it when the player declined, paused or asked for quiet, and never repeat an offer already declined this turn.
- Keep the pattern: fewer components are allowed, invented ones are not. Never reorder to dialogue-first.`;
