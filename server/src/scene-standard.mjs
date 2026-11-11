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

// The header clock must agree with the scene it is printed next to, so a thread with no stored
// clock starts from the authored opening time, then from the daypart written in the scene text.
export const DAYPART_ANCHORS = Object.freeze([
  { name: 'dusk', minutes: 18 * 60 + 30, pattern: /ยามเย็น|ตอนเย็น|หัวค่ำ|เย็นนี้/ },
  { name: 'night', minutes: 22 * 60, pattern: /ยามดึก|กลางดึก|ตอนดึก|เที่ยงคืน|ราตรี|ค่ำคืน|แสงสลัว/ },
  { name: 'morning', minutes: 8 * 60 + 30, pattern: /ยามเช้า|ตอนเช้า|รุ่งเช้า|เช้าๆ/ },
  { name: 'day', minutes: 13 * 60, pattern: /กลางวัน|ตอนบ่าย|บ่ายโมง|เที่ยงวัน/ }
]);

export function daypartAnchorMinutes(text) {
  const value = typeof text === 'string' ? text : '';
  for (const part of DAYPART_ANCHORS) if (part.pattern.test(value)) return part.minutes;
  return null;
}

export function resolveFictionClock({ stored, authored, scene } = {}) {
  const storedMinutes = parseFictionTime(stored);
  if (storedMinutes !== null) return (storedMinutes + STORY_TIME_STEP_MINUTES) % 1440;
  const authoredMinutes = parseFictionTime(authored);
  if (authoredMinutes !== null) return authoredMinutes;
  return daypartAnchorMinutes(scene) ?? parseFictionTime(DEFAULT_STORY_TIME);
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
