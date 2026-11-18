export type SceneMetadata = {
  at: number;
  time?: string;
  location: string;
  fastForward?: { time?: string; location: string; label: string };
};
export type NarrativeSegment = { kind: 'dialogue' | 'action'; text: string };

// A stored reply with a missing field still shows a clock and a place; the header is never hidden.
export const DEFAULT_SCENE_LOCATION = 'คอนโดส่วนตัวใจกลางเมือง';

export function cleanFastForwardLocation(location: string): string {
  return location
    .replace(/^ห้อง(?:กู|ฉัน|เรา|เค้า)(?:\s*([0-9A-Za-z]+))?/i, (_, room) => room ? `ห้อง ${room}` : 'ห้องของเธอ')
    .replace(/^บ้าน(?:กู|ฉัน|เรา|เค้า)/, 'บ้านของเธอ')
    .replace(/^โต๊ะ(?:กู|ฉัน|เรา|เค้า)/, 'โต๊ะของเธอ')
    .trim()
    .replace(/^ที่\s*/, '');
}

export function cleanFastForwardLabel(label: string): string {
  return label
    .replace(/ห้อง(?:กู|ฉัน|เรา|เค้า)(?:\s*([0-9A-Za-z]+))?/gi, (_, room) => room ? `ห้อง ${room}` : 'ห้องของเธอ')
    .replace(/บ้าน(?:กู|ฉัน|เรา|เค้า)/g, 'บ้านของเธอ')
    .replace(/โต๊ะ(?:กู|ฉัน|เรา|เค้า)/g, 'โต๊ะของเธอ');
}

export function formatFastForwardAction(ff: { location: string; time?: string }): string {
  const loc = cleanFastForwardLocation(ff.location || '');
  if (loc && ff.time) {
    return `*มาตามนัดที่${loc} เวลา ${ff.time}*`;
  }
  if (loc) {
    return `*มาตามนัดที่${loc}*`;
  }
  if (ff.time) {
    return `*มาถึงตามเวลานัด ${ff.time}*`;
  }
  return `*มาถึงตามเวลานัดหมาย*`;
}

export function readSceneHeader(text: string): { scene: SceneMetadata | null; body: string } {
  const match = text.match(/^\[scene:([^\]]*)\]\s*/i);
  if (!match) return { scene: null, body: text };
  const body = text.slice(match[0].length);
  try {
    const value = JSON.parse(match[1]);
    const at = typeof value.at === 'number' && Number.isFinite(value.at) && Number.isFinite(new Date(value.at).getTime()) ? value.at : Date.now();
    const location = (typeof value.location === 'string' ? value.location.trim() : '').slice(0, 100) || DEFAULT_SCENE_LOCATION;
    const time = typeof value.time === 'string' && value.time.trim().length <= 30 ? value.time.trim() : undefined;
    const rawLoc = value.fastForward?.location ? String(value.fastForward.location).trim() : '';
    const rawTime = typeof value.fastForward?.time === 'string' && value.fastForward.time.trim() ? value.fastForward.time.trim() : undefined;
    const rawLabel = typeof value.fastForward?.label === 'string' && value.fastForward.label.trim() ? value.fastForward.label.trim() : '';
    const fastForward = value.fastForward && typeof value.fastForward === 'object' && rawLoc
      ? {
          location: rawLoc,
          ...(rawTime ? { time: rawTime } : {}),
          label: rawLabel
            ? cleanFastForwardLabel(rawLabel)
            : (rawTime ? `⏩ ไปที่${cleanFastForwardLocation(rawLoc)} (${rawTime})` : `⏩ ไปที่${cleanFastForwardLocation(rawLoc)}`)
        }
      : undefined;
    return { scene: { at, location, ...(time ? { time } : {}), ...(fastForward ? { fastForward } : {}) }, body };
  } catch { return { scene: null, body }; }
}

export function sceneHeaderLabels(scene: SceneMetadata) {
  const date = new Date(scene.at);
  const timeStr = scene.time
    ? scene.time.trim().replace(/\s*น\.?$/i, '').trim()
    : new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  return {
    date: new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'full' }).format(date),
    time: timeStr,
    location: scene.location
  };
}

export function hasNarrativeActions(text: string) {
  return /\[(?:action|visual):/i.test(text) || /^\s*(?:action|visual)\s*:/im.test(text);
}

export function quoteDialogue(text: string) {
  const value = text.trim();
  const speakerMatch = value.match(/^\[?([ก-๙A-Za-z0-9_.\s&]{1,35}?\s*[\p{Extended_Pictographic}\u2600-\u27BF]+(?:[\s&]+[ก-๙A-Za-z0-9_.\s]{1,25}?\s*[\p{Extended_Pictographic}\u2600-\u27BF]+)*)\]?\s*:\s*([\s\S]+)$/u)
    || value.match(/^\[([ก-๙A-Za-z0-9_.\s&]{1,35})\]\s*:\s*([\s\S]+)$/u);
  if (speakerMatch) {
    const speaker = speakerMatch[1].trim();
    const spoken = speakerMatch[2].trim().replace(/^["“「«]([\s\S]*?)["”」»]$/, '$1').trim();
    return `${speaker}: “${spoken}”`;
  }
  return /^["“「«]/.test(value) ? value : `“${value}”`;
}

export type EpisodeBannerMeta = { number: number; title: string; subtitle: string };
export type CatalystMeta = { kind: string; title: string; prompt: string };
export type LockedMediaMeta = { title: string; hint: string; unlocked?: boolean };

export interface ParsedMessageSegment {
  type: 'text' | 'redacted_edict' | 'screaming_parchment';
  content: string;
}

export function parseMagicAcademyMessage(rawText: string): ParsedMessageSegment[] {
  if (!rawText) return [];

  const tokenRegex = /(\[howler:\s*([^\]]+)\]|\[REDACTED BY EDICT 42\])/gi;
  const segments: ParsedMessageSegment[] = [];
  let lastIndex = 0;

  for (const match of rawText.matchAll(tokenRegex)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      const plain = rawText.slice(lastIndex, matchIndex).trim();
      if (plain) segments.push({ type: 'text', content: plain });
    }

    const fullToken = match[0];
    if (fullToken.toLowerCase().startsWith('[howler:')) {
      segments.push({ type: 'screaming_parchment', content: (match[2] || '').trim() });
    } else {
      segments.push({ type: 'redacted_edict', content: '[REDACTED BY EDICT 42]' });
    }

    lastIndex = matchIndex + fullToken.length;
  }

  if (lastIndex < rawText.length) {
    const tail = rawText.slice(lastIndex).trim();
    if (tail) segments.push({ type: 'text', content: tail });
  }

  return segments;
}

export function parseRealityBubbleTags(text: string): {
  episodeBanner: EpisodeBannerMeta | null;
  howler: string | null;
  catalyst: CatalystMeta | null;
  lockedMedia: LockedMediaMeta | null;
  cleanBody: string;
} {
  let cleanBody = text || '';
  let episodeBanner: EpisodeBannerMeta | null = null;
  let howler: string | null = null;
  let catalyst: CatalystMeta | null = null;
  let lockedMedia: LockedMediaMeta | null = null;

  cleanBody = cleanBody.replace(/^\[episode:([^\]]*)\]\n?/gim, (_, raw) => {
    try {
      const val = JSON.parse(raw);
      if (val && typeof val.title === 'string') {
        episodeBanner = {
          number: Number(val.number) || 1,
          title: val.title,
          subtitle: typeof val.subtitle === 'string' ? val.subtitle : ''
        };
      }
    } catch {}
    return '';
  });

  // Stored replies still carry the tag, so it is stripped before the bubble renders.
  cleanBody = cleanBody.replace(/^\[draft:[^\]]*\]\n?/gim, '');

  cleanBody = cleanBody.replace(/^\[howler:([^\]]*)\]\n?/gim, (_, raw) => {
    const val = String(raw || '').trim();
    if (val) howler = val;
    return '';
  });

  cleanBody = cleanBody.replace(/^\[catalyst:([^\]]*)\]\n?/gim, (_, raw) => {
    try {
      const val = JSON.parse(raw);
      if (val && typeof val.title === 'string') {
        catalyst = {
          kind: typeof val.kind === 'string' ? val.kind : 'event',
          title: val.title,
          prompt: typeof val.prompt === 'string' ? val.prompt : ''
        };
      }
    } catch {}
    return '';
  });

  cleanBody = cleanBody.replace(/^\[locked-media:([^\]]*)\]\n?/gim, (_, raw) => {
    try {
      const val = JSON.parse(raw);
      if (val && typeof val.title === 'string') {
        lockedMedia = {
          title: val.title,
          hint: typeof val.hint === 'string' ? val.hint : '',
          unlocked: Boolean(val.unlocked)
        };
      }
    } catch {}
    return '';
  });

  return { episodeBanner, howler, catalyst, lockedMedia, cleanBody: cleanBody.trim() };
}

export function splitNarrativeBody(text: string): NarrativeSegment[] {
  // Older model replies sometimes include a bare Action: label in the text itself.
  const normalized = text.replace(/^\s*(?:action|visual)\s*:\s*(.+)$/gim, '[action:$1]');
  return normalized.split(/(\[(?:action|visual):[\s\S]*?\])/gi).filter(part => part.trim()).map(part => {
    const action = part.match(/^\[(?:action|visual):\s*([\s\S]*?)\]$/i);
    return action
      ? { kind: 'action', text: action[1].replace(/^(?:action|visual)\s*:\s*/i, '').trim() }
      : { kind: 'dialogue', text: part.trim() };
  });
}
