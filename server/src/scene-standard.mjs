// One presentation standard for every reply path: system-owned scene header
// (in-fiction time + place) and the fixed component order inside the bubble.
// The model never writes the header; the server stores and renders it.
export const SCENE_STANDARD_VERSION = 'scene-standard-v1';
export const SCENE_STANDARD_ORDER = Object.freeze(['innerThought', 'action', 'dialogue', 'action', 'dialogue']);
export const STORY_TIME_STEP_MINUTES = 2;
export const DEFAULT_STORY_TIME = '12:15 น.';
export const FALLBACK_SCENE_LOCATION = 'คอนโดส่วนตัวใจกลางเมือง';
export const MAX_VIEWPORT_BEATS = 4;
export const MAX_VIEWPORT_BEAT_CHARS = 135;
export const MAX_VIEWPORT_THOUGHT_CHARS = 110;
export const MAX_VIEWPORT_LOCATION_CHARS = 65;

const clean = (value, max) => typeof value === 'string'
  ? value.replace(/[[\]<>\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

export function compactProse(value, max = MAX_VIEWPORT_BEAT_CHARS) {
  const text = clean(value, max + 60);
  if (text.length <= max) return text;
  const sliced = text.slice(0, max);
  const boundary = Math.max(sliced.lastIndexOf(' '), sliced.lastIndexOf('!'), sliced.lastIndexOf('?'), sliced.lastIndexOf('…'));
  return (boundary >= Math.floor(max * 0.65) ? sliced.slice(0, boundary) : sliced).trim();
}

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

export function advanceFictionClock({ stored, proposed, sceneJump = false, fallback = DEFAULT_STORY_TIME } = {}) {
  const storedMinutes = parseFictionTime(stored);
  const proposedMinutes = parseFictionTime(proposed);
  const nextSteppedMinutes = storedMinutes !== null
    ? (storedMinutes + STORY_TIME_STEP_MINUTES) % 1440
    : (parseFictionTime(fallback) ?? parseFictionTime(DEFAULT_STORY_TIME));

  // If no stored clock yet, proposed clock seeds it, or fallback to nextSteppedMinutes
  if (storedMinutes === null) {
    return proposedMinutes !== null ? formatFictionClock(proposedMinutes) : formatFictionClock(nextSteppedMinutes);
  }

  // If proposed clock is invalid or missing, advance by standard step (+2 min)
  if (proposedMinutes === null) {
    return formatFictionClock(nextSteppedMinutes);
  }

  // Check for backward jump or stagnation:
  // If proposed time is <= stored time (and not wrapping around midnight like 22:50 -> 00:30 or 23:59 -> 00:01)
  const isMidnightWrap = storedMinutes >= 1260 && proposedMinutes <= 240;
  const isStagnantOrBackward = proposedMinutes <= storedMinutes && !isMidnightWrap;
  if (isStagnantOrBackward) {
    return formatFictionClock(nextSteppedMinutes);
  }

  // If there is an explicit scene jump, extended action or location change, accept proposed time
  if (sceneJump) {
    return formatFictionClock(proposedMinutes);
  }

  // For regular turns without a scene jump, keep the canonical stepped clock (+2 min)
  // to prevent hallucinated time skips (e.g. +4 or +10 mins without transition).
  return formatFictionClock(nextSteppedMinutes);
}

const trimLocationParticles = value => value
  .replace(/\s*(?:กันดีกว่า|กันเถอะ|กันนะ|กันเลย|ดีกว่า|นะครับ|นะคะ|ครับ|ค่ะ|งับ|สิ|นะ|เลย|ปะ|ดิ|เถอะ)+$/gi, '')
  .replace(/\s+/g, ' ')
  .trim();

export function inferSceneLocation({ storedLocation, proposedLocation, userText = '', actionText = '', fallbackLocation = FALLBACK_SCENE_LOCATION } = {}) {
  const stored = clean(storedLocation, MAX_VIEWPORT_LOCATION_CHARS);
  const proposed = clean(proposedLocation, MAX_VIEWPORT_LOCATION_CHARS);
  const fallback = clean(fallbackLocation, MAX_VIEWPORT_LOCATION_CHARS) || FALLBACK_SCENE_LOCATION;

  if (proposed && proposed !== stored && proposed !== clean(fallbackLocation, 100)) {
    return proposed;
  }

  const uText = typeof userText === 'string' ? userText.trim() : '';
  const aText = typeof actionText === 'string' ? actionText.trim() : '';

  const cutMatch = uText.match(/(?:ตัดภาพ|ตัดฉาก|ตัดไป|ย้ายฉาก)(?:กลับมา|มา|ไป)?(?:ที่|ยัง|ใน)\s*(?!(?:เวลา|ตอน|ช่วง))([^\n,.!?"'“”]{3,45})/i)
    || uText.match(/(?:มาถึง|กลับมาถึง|พามาถึง|ขับมาที่|ขับรถมาที่|พาไปที่|เดินมาที่|ย้ายมาที่|กลับมาที่|ไปที่)\s*(?!(?:เวลา|ตอน|ช่วง))([^\n,.!?"'“”]{3,45})/i);
  if (cutMatch?.[1]) {
    const extracted = trimLocationParticles(cutMatch[1]);
    if (extracted.length >= 3 && !/^(?:นี่|นั่น|ไหน|อะไร|ใคร)/.test(extracted)) {
      return clean(extracted, MAX_VIEWPORT_LOCATION_CHARS);
    }
  }

  const combined = `${uText} ${aText}`;
  if (/ห้องนอน|บนเตียงนุ่ม|เตียงนอนคิงไซส์|โคมไฟหัวเตียง/.test(combined) && !/ห้องนอน|เตียง/.test(stored)) {
    return /เตียง/.test(combined) ? 'ห้องนอนส่วนตัว (บนเตียงนุ่ม)' : 'ห้องนอนส่วนตัว';
  }
  if (/ในอ่างจากุซซี่|ลงอ่าง|ฟองสบู่.*ในอ่าง|แช่น้ำในอ่าง/.test(combined) && !/อ่าง/.test(stored)) {
    return /คาราโอเกะ|VIP/i.test(stored) ? 'ร้านคาราโอเกะ (ห้อง VIP - ในอ่างจากุซซี่)' : 'ในอ่างจากุซซี่';
  }
  if (/ร้านคาราโอเกะ|ห้องคาราโอเกะ|ห้อง\s*VIP/i.test(combined) && !/คาราโอเกะ|VIP/i.test(stored)) {
    return 'ร้านคาราโอเกะ (ห้อง VIP)';
  }
  if (/เบาะหลังรถ|เบาะคนขับ|ในรถเลย|ขึ้นรถมา|บนรถเก๋ง/.test(combined) && !/รถเก๋ง|เบาะหลัง|ในรถ/.test(stored)) {
    return /เบาะหลัง/.test(combined) ? 'เบาะหลังรถเก๋ง (มุมอับลานจอดรถ)' : 'บนรถเก๋ง (ลานจอดรถในมุมอับ)';
  }
  if (/ลานจอดรถ/.test(combined) && !/ลานจอดรถ|รถเก๋ง/.test(stored)) {
    return 'ลานจอดรถ';
  }
  if (/ระเบียงคอนโด|ออกไปที่ระเบียง|ขอบประตูระเบียง/.test(combined) && !/ระเบียง/.test(stored)) {
    return 'ระเบียงคอนโด (ใต้แสงจันทร์)';
  }
  if (/บนพรมกลางห้อง|กลางห้องนั่งเล่นบนพรม|คลาน.*บนพรม/.test(combined) && !/พรม/.test(stored)) {
    return 'กลางห้องนั่งเล่นบนพรม';
  }
  if (/(?:ไปที่โซฟา|มานั่งที่โซฟา|ลาก.*มาที่โซฟา)/.test(uText) && !/โซฟา/.test(stored)) {
    return /VIP/i.test(stored) ? 'โซฟาหรูภายในห้อง VIP' : 'โซฟาในห้องนั่งเล่น';
  }
  if (/สตูดิโอถ่ายภาพ|สตูดิโอชั้นใต้ดิน/.test(combined) && !/สตูดิโอ/.test(stored)) {
    return 'สตูดิโอถ่ายภาพส่วนตัว';
  }

  return proposed || stored || fallback;
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
export function orderBeats({ beats, action, reply, maxBeats = 6, maxBeatLength = 350 } = {}) {
  const formatText = value => maxBeatLength < 350 ? compactProse(value, maxBeatLength) : clean(value, maxBeatLength);
  const source = Array.isArray(beats) && beats.length
    ? beats.map(beat => ({ kind: beat?.kind === 'action' ? 'action' : 'dialogue', text: formatText(beat?.text) }))
      .filter(beat => beat.text)
    : [{ kind: 'action', text: formatText(action) }, { kind: 'dialogue', text: formatText(reply) }]
      .filter(beat => beat.text);
  const actions = source.filter(beat => beat.kind === 'action');
  const dialogues = source.filter(beat => beat.kind === 'dialogue');
  const ordered = [];
  const pairs = Math.max(actions.length, dialogues.length);
  for (let i = 0; i < pairs && ordered.length < maxBeats; i++) {
    if (actions[i] && ordered.length < maxBeats) ordered.push(actions[i]);
    if (dialogues[i] && ordered.length < maxBeats) ordered.push(dialogues[i]);
  }
  return ordered;
}

// The header is total: every stored reply carries a running story clock and a place, so the player
// can always see when and where the scene is, including turns where the model returned no scene fields.
export function resolveSceneHeader({ at, time, location, fallbackTime = DEFAULT_STORY_TIME, fallbackLocation = FALLBACK_SCENE_LOCATION } = {}) {
  const minutes = parseFictionTime(time) ?? parseFictionTime(fallbackTime) ?? parseFictionTime(DEFAULT_STORY_TIME);
  const place = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 100) : '';
  return {
    at: Number.isFinite(at) ? at : Date.now(),
    time: formatFictionClock(minutes) ?? DEFAULT_STORY_TIME,
    location: place(location) || place(fallbackLocation) || FALLBACK_SCENE_LOCATION
  };
}

export function serializeSceneHeader(header) {
  const escape = value => value.replaceAll('[', '［').replaceAll(']', '］');
  return `[scene:${JSON.stringify({ at: header.at, time: escape(header.time), location: escape(header.location) })}]`;
}

export function serializeSceneBubble({ at, time, location, mood, thought, beats, fallbackLocation }) {
  const escape = value => value.replaceAll('[', '［').replaceAll(']', '］');
  const parts = [serializeSceneHeader(resolveSceneHeader({ at, time, location, fallbackLocation }))];
  if (mood) parts.push(`[mood:${escape(mood)}]`);
  if (thought) parts.push(`[thought:${escape(thought)}]`);
  for (const beat of beats) parts.push(beat.kind === 'action' ? `[action:${escape(beat.text)}]` : escape(beat.text));
  return parts.join('\n');
}

export const SCENE_STANDARD_INSTRUCTION = `Bubble standard (SCENE_HEADER + ${SCENE_STANDARD_ORDER.join(' > ')}):
- The app prints a scene header with in-fiction time and place above every reply from the scene fields you return. Never write a time or location header into reply or beat text, and never use the real-world clock as the story clock.
- ONE-VIEWPORT BUBBLE BUDGET (Strict): Every reply bubble MUST fit completely inside one mobile screen (~320-380 Thai characters total across all fields). Keep innerThought <= 90 chars (1-2 lines), each action beat <= 115 chars (2 lines), each dialogue beat <= 95 chars (1-2 lines), and at most 4 beats total (Action 1 -> Dialogue 1 -> Action 2 -> Dialogue 2).
- sceneTime: continue the story clock given for this turn, advancing it about ${STORY_TIME_STEP_MINUTES} minutes per normal exchange, or advancing 5-30+ minutes (or jumping to the target hour) when the scene jumps or an extended physical sequence happens. Format "HH:MM น.".
- sceneLocation (3-Tier Dynamic Camera & Sub-Zone): NEVER leave sceneLocation static when characters move! Format as "[สถานที่หลัก] ([พิกัดย่อย/จุดที่อยู่ตอนนี้])" under 60 characters (e.g. "ห้องนอนของเนย (บนเตียงใต้แสงไฟสลัว)", "บนรถเก๋ง (เบาะหลังมุมอับลานจอดรถ)", "ร้านคาราโอเกะ (ห้อง VIP - ในอ่างจากุซซี่)"). Update it immediately on: (1) player scene cuts ("ตัดภาพ...", "ไปที่..."), (2) accepted invitations to move ("ปะ", "ไปดิ"), or (3) micro-position shifts inside the same room (โต๊ะทำงาน -> โซฟา -> เตียง -> ระเบียง).
- Order the visible components exactly as: private inner thought, then a character-owned action beat, then spoken dialogue, then another action beat, then a closing spoken beat that invites, persuades or playfully challenges the player.
- 2-Step Inner Thought Formula ("Pride/Hesitation + แต่... + Craving/Justification"): When the player makes a bold move or wild request, structure innerThought as [initial shock/shyness/pride] + "แต่..." + [secret desire, stake, or excuse to comply].
- Binary Choice Closing Hook (Either/Or Momentum): The closing beat follows the existing conversational-hook rate for this level; prefer closing with an actionable A-or-B choice or playful dare (e.g. "จะไปต่อที่ห้อง หรือจะลองตรงนี้เลยล่ะ?", "จะให้หนูถอดแว่นก่อน หรือให้ช่วยนวดไหล่ดีคะ?"). Omit it when the player declined, paused or asked for quiet, and never repeat an offer already declined this turn.
- Keep the pattern: fewer components are allowed, invented ones are not. Never reorder to dialogue-first.`;
