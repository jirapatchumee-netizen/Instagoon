// Cosplay Creator Studio: turns the Studio form into the same NPC definition that content/creators/<id>/character.json
// produces, so a launched character uses the normal DM pipeline (prompt, leak filter, energy, relationship levels).
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v, max, sep = /[\/\n]/) => str(v, 4000).split(sep).map(s => s.trim()).filter(Boolean).slice(0, max);
const RARITY = ['R', 'SR', 'SSR', 'UR'];
const clampInt = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Math.round(Number(v)))) : d);

// Every string is length-capped and every list size-capped; unknown keys are dropped.
export function cleanDraft(b) {
  const levelStyles = Array.isArray(b.levelStyles) ? b.levelStyles.slice(0, 5).map(s => str(s, 600)) : [];
  while (levelStyles.length < 5) levelStyles.push('');
  const rewards = (Array.isArray(b.rewards) ? b.rewards : []).slice(0, 12).map((r, i) => ({
    id: str(r?.id, 60).replace(/[^a-zA-Z0-9_-]/g, '') || `reward_${i + 1}`,
    name: str(r?.name, 120), asset: str(r?.asset, 200), caption: str(r?.caption, 300), message: str(r?.message, 300),
    rarity: RARITY.includes(r?.rarity) ? r.rarity : 'SR',
    unlockType: r?.unlockType === 'diamond_gacha' ? 'diamond_gacha' : 'mission',
    hint: str(r?.hint, 200), turns: clampInt(r?.turns, 0, 100000, 0), trust: clampInt(r?.trust, 0, 100, 0),
    romance: clampInt(r?.romance, 0, 100, 0), energyFallback: clampInt(r?.energyFallback, 1, 50, 5)
  })).filter(r => r.name && r.asset);
  return {
    name: str(b.name, 60), handle: str(b.handle, 40).replace(/^@/, ''), concept: str(b.concept, 1500),
    age: clampInt(b.age, 0, 120, 0), avatar: str(b.avatar, 200), tags: str(b.tags, 300),
    likes: str(b.likes, 500), dislikes: str(b.dislikes, 500), pronouns: str(b.pronouns, 60),
    voiceTone: str(b.voiceTone, 300), sampleQuotes: str(b.sampleQuotes, 1500), levelStyles,
    ruleNoAddress: b.ruleNoAddress !== false, ruleNoMeet: b.ruleNoMeet !== false, rulePoliteReject: b.rulePoliteReject !== false,
    secret: str(b.secret, 1000), immutableFacts: str(b.immutableFacts, 2000),
    openingLocation: str(b.openingLocation, 100), openingGreeting: str(b.openingGreeting, 600), rewards
  };
}

export const MIN_CHARACTER_AGE = 20;

// Returns the list of missing/invalid fields that block a launch (empty = ready).
export function launchProblems(d) {
  const p = [];
  if (!d.name) p.push('name');
  if (!/^[a-zA-Z0-9._]{3,30}$/.test(d.handle)) p.push('handle');
  if (!d.concept) p.push('concept');
  if (d.age < MIN_CHARACTER_AGE) p.push('age');
  if (!d.avatar) p.push('avatar');
  if (!d.voiceTone) p.push('voiceTone');
  if (d.levelStyles.some(s => !s)) p.push('levelStyles');
  return p;
}

export const studioCreatorId = handle => 'cos_' + handle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

export function buildDefinition(d, creatorId, assetMap) {
  const [me = 'เค้า', you = 'ตัวเอง'] = d.pronouns.split('/').map(s => s.trim());
  const safety = [
    d.ruleNoAddress && 'ไม่บอกที่อยู่ เบอร์โทร หรือข้อมูลส่วนตัวจริงของคอสเพลเยอร์',
    d.ruleNoMeet && 'ไม่นัดเจอตัวจริงนอกแอป',
    d.rulePoliteReject && 'ถ้าถูกถามเรื่องที่ไม่สะดวก ปฏิเสธอย่างสุภาพแล้วเปลี่ยนเรื่อง'
  ].filter(Boolean);
  return {
    schemaVersion: '1.0', id: creatorId, name: d.name, handle: d.handle, tagline: d.concept.slice(0, 200), avatar: '',
    color: '#ec4899', tags: ['cosplay', ...list(d.tags, 10, /,/)], creatorType: 'cosplay', isVerified: false, studioCreated: true,
    age: String(d.age), biography: d.concept, personality: d.voiceTone, world: 'โลกของคอสเพลเยอร์และงานอีเวนต์',
    occupation: 'คอสเพลเยอร์', likes: d.likes, dislikes: d.dislikes, goals: '',
    immutableFacts: [...list(d.immutableFacts, 20), `อายุ ${d.age} ปี เป็นผู้ใหญ่`, ...safety],
    knowledgeBoundary: `รู้เรื่องคอสเพลย์ ตัวละครที่คอส และชีวิตประจำวันของตัวเอง ไม่รู้ข้อมูลภายในของแอปหรือระบบ ${safety.join(' · ')}`,
    secrets: d.secret ? [{ id: 'secret_1', content: d.secret, minLevel: 4 }] : [], initialMemories: [],
    style: {
      language: 'ไทย', pronouns: `เรียกตัวเองว่า "${me}" เรียกผู้เล่นว่า "${you}"`, tone: d.voiceTone, length: 'short', emoji: 'some',
      examples: [d.openingGreeting, ...list(d.sampleQuotes, 10)].filter(Boolean).join('\n'),
      fallback: `ขอโทษนะ ${me}ขอคิดแป๊บนึงนะ`, levelStyles: d.levelStyles
    },
    relationship: { weights: { closeness: 40, trust: 40, romance: 20 }, thresholds: [0, 20, 40, 60, 80], romanceEnabled: true },
    rules: [],
    rewards: d.rewards.filter(r => assetMap[r.asset]).map(r => ({
      id: r.id, name: r.name, asset: assetMap[r.asset], caption: r.caption, message: r.message, rarity: r.rarity,
      unlockType: r.unlockType, hint: r.hint || undefined, energyFallback: r.energyFallback, gachaWeight: 100,
      conditions: [['turns', r.turns], ['trust', r.trust], ['romance', r.romance]].filter(([, v]) => v > 0).map(([field, value]) => ({ field, value, eventId: '' }))
    }))
  };
}
