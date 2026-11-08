export type SceneMetadata = { at: number; time?: string; location: string };
export type NarrativeSegment = { kind: 'dialogue' | 'action'; text: string };

export function readSceneHeader(text: string): { scene: SceneMetadata | null; body: string } {
  const match = text.match(/^\[scene:([^\]]*)\]\s*/i);
  if (!match) return { scene: null, body: text };
  const body = text.slice(match[0].length);
  try {
    const value = JSON.parse(match[1]);
    if (typeof value.at !== 'number' || !Number.isFinite(value.at) || !Number.isFinite(new Date(value.at).getTime()) ||
        typeof value.location !== 'string' || !value.location.trim() || value.location.length > 100) return { scene: null, body };
    const time = typeof value.time === 'string' && value.time.trim().length <= 30 ? value.time.trim() : undefined;
    return { scene: { at: value.at, location: value.location, ...(time ? { time } : {}) }, body };
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
  return /^["“「«]/.test(value) ? value : `“${value}”`;
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
