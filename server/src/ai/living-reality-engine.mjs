// Living Reality World & Narrative Roleplay Engine
// Smart, Fast, and Minimum Space: compact D1 micro-state + cross-character jealousy sniffer + shared world stage.

import {
  selectCharacterStagePrompt,
  evaluateCurfewState,
  generateProceduralCampusMeme,
  applySmartEdict42Filter,
  recordFeedQuickReply,
  getAcademicYearContext,
  sniffCrossCharacterJealousy as sniffAethelgardCrossJealousy,
  evaluateYear7EndgameFate
} from './magic-academy-helpers.mjs';

export {
  selectCharacterStagePrompt,
  evaluateCurfewState,
  generateProceduralCampusMeme,
  applySmartEdict42Filter,
  recordFeedQuickReply,
  getAcademicYearContext,
  sniffAethelgardCrossJealousy,
  evaluateYear7EndgameFate
};

export const DEFAULT_REALITY_EPISODES = Object.freeze([
  {
    number: 1,
    key: 'the_perfect_facade',
    title: 'The Perfect Facade',
    subtitle: 'หน้ากากที่สมบูรณ์แบบ',
    minScore: 0,
    minTurns: 0,
    toneDirective: 'Keep a polished public-facing charm (Tatemae). Playful and warm, but guarding deep personal struggles.'
  },
  {
    number: 2,
    key: 'midnight_cracks',
    title: 'Midnight Cracks',
    subtitle: 'รอยร้าวยามเที่ยงคืน',
    minScore: 15,
    minTurns: 4,
    toneDirective: 'Show subtle cracks in your perfection. Hint at hidden fatigue, late-night doubts, or unposted drafts when talking privately.'
  },
  {
    number: 3,
    key: 'the_secret_invitation',
    title: 'The Secret Invitation',
    subtitle: 'คำเชิญสู่พื้นที่ลับ',
    minScore: 35,
    minTurns: 8,
    toneDirective: 'Treat the player as an inner-circle Close Friend. Invite personal games, candid opinions, and unguarded moments.'
  },
  {
    number: 4,
    key: 'confronting_the_past',
    title: 'Confronting the Past',
    subtitle: 'เผชิญหน้าความลับในอดีต',
    minScore: 60,
    minTurns: 14,
    toneDirective: 'Lean deeply on the player as your trusted confidant. Gradually open up about unspoken past secrets and personal stakes.'
  },
  {
    number: 5,
    key: 'true_resonance',
    title: 'True Resonance',
    subtitle: 'หัวใจที่ไร้ฟิลเตอร์',
    minScore: 85,
    minTurns: 20,
    toneDirective: 'Full Honne mode: completely honest, emotionally devoted, raw chemistry without social masks.'
  }
]);

const DEFAULT_WORLD_EVENTS = Object.freeze([
  {
    id: 'world_s1_mod_1',
    seasonId: 'season_1',
    eventKind: 'moderator',
    headline: '📢 Official Moderator: ค่ำคืนเปิดเทศกาล Reality Gala ประจำซีซัน',
    content: 'ประกาศจากกองบรรณาธิการโลกจำลอง: คืนนี้ครีเอเตอร์ทุกคนต้องเตรียมคำตอบและคู่ควงสำหรับเทศกาลสำคัญประจำซีซัน กระแสกำลังเดือด!',
    promptDirective: 'Season Spotlight: Tonight is the Reality Gala Prep Night. Creators are buzzing about who to invite or team up with.',
    sourceCreatorId: null
  },
  {
    id: 'world_s1_spotted_1',
    seasonId: 'season_1',
    eventKind: 'spotted',
    headline: '👀 @Spotted_Instagoon: มีคนเห็นแชทลับยามดึก...',
    content: 'กระแสซุบซิบวันนี้: มีคนแอบเห็นข้อความดึกๆ ระหว่างคนดังกับใครบางคน... ระวังมีคนแอบหึงโดยไม่รู้ตัวนะจ๊ะ!',
    promptDirective: 'Spotted Gossip: A viral gossip post teased secret late-night DMs, making creators slightly more observant and possessive.',
    sourceCreatorId: null
  }
]);

const clamp100 = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

/**
 * Resolve the 5-episode arc for a creator (allows custom overrides in npcDef.realityArc while keeping 5-episode bounds).
 */
export function resolveRealityArc(npcDef) {
  const custom = Array.isArray(npcDef?.realityArc?.episodes) ? npcDef.realityArc.episodes : null;
  if (!custom || custom.length === 0) return DEFAULT_REALITY_EPISODES;
  return DEFAULT_REALITY_EPISODES.map((def, idx) => {
    const ov = custom[idx];
    if (!ov || typeof ov !== 'object') return def;
    return {
      ...def,
      title: typeof ov.title === 'string' && ov.title.trim() ? ov.title.trim() : def.title,
      subtitle: typeof ov.subtitle === 'string' && ov.subtitle.trim() ? ov.subtitle.trim() : def.subtitle,
      toneDirective: typeof ov.toneDirective === 'string' && ov.toneDirective.trim() ? ov.toneDirective.trim() : def.toneDirective
    };
  });
}

/**
 * Compute updated Living Reality micro-state and triggers from relationship metrics and player input.
 */
export function computeRealityState({
  relRow = null,
  score = 0,
  closeness = 0,
  trust = 0,
  romance = 0,
  turns = 1,
  affectionDelta = 0,
  userText = '',
  npcName = 'Creator',
  npcDef = null
} = {}) {
  const arc = resolveRealityArc(npcDef);
  const currentEpisode = Math.max(1, Math.min(5, Number(relRow?.current_episode) || 1));

  let milestones = [];
  if (Array.isArray(relRow?.emotional_milestones)) {
    milestones = [...relRow.emotional_milestones];
  } else if (typeof relRow?.emotional_milestones === 'string' && relRow.emotional_milestones.trim()) {
    try {
      const parsed = JSON.parse(relRow.emotional_milestones);
      if (Array.isArray(parsed)) milestones = parsed;
    } catch {}
  }

  let stressLevel = relRow?.stress_level != null ? Number(relRow.stress_level) : 20;
  let affectionLevel = relRow?.affection_level != null ? Number(relRow.affection_level) : 10;
  let cloutLevel = relRow?.clout_level != null ? Number(relRow.clout_level) : 50;

  const academicYear = relRow?.academic_year != null ? Number(relRow.academic_year) : 1;
  const termSeason = relRow?.term_season || 'autumn';
  const bastionHouse = relRow?.bastion_house || 'Zephyr-Crown';
  const censorshipLevel = relRow?.censorship_level != null ? Number(relRow.censorship_level) : 0;
  const focusPoints = relRow?.focus_points != null ? Number(relRow.focus_points) : 3;
  const statArcane = relRow?.stat_arcane != null ? Number(relRow.stat_arcane) : 10;
  const statCharisma = relRow?.stat_charisma != null ? Number(relRow.stat_charisma) : 10;
  const statAlchemy = relRow?.stat_alchemy != null ? Number(relRow.stat_alchemy) : 10;
  const endgameRouteFlag = relRow?.endgame_route_flag || 'undetermined';

  const text = typeof userText === 'string' ? userText : '';

  if (/(พักผ่อน|เป็นห่วง|อยู่ข้างๆ|ไม่ต้องฝืน|กอด|ปลอบ|ใจเย็น|สู้ๆ|เหนื่อยไหม|ดูแลตัวเอง)/i.test(text)) {
    stressLevel -= 8;
    affectionLevel += 5;
  }
  if (/(ปั่นกระแส|ดราม่า|แฉ|ห้ามแพ้|ทำไมไม่ตอบ)/i.test(text)) {
    stressLevel += 8;
  }
  if (/(โพสต์|ไลฟ์|แคปชั่น|ไวรัล|ชุดนี้|ลงรูป|แฮชแท็ก|สปอนเซอร์)/i.test(text)) {
    cloutLevel += 6;
  }

  const delta = Number(affectionDelta) || 0;
  if (delta > 0) {
    affectionLevel += delta * 3;
    stressLevel -= 1;
  } else if (delta < 0) {
    affectionLevel += delta * 3;
    stressLevel += Math.abs(delta) * 4;
  }

  stressLevel = clamp100(stressLevel);
  affectionLevel = clamp100(Math.max(affectionLevel, Math.round(score * 0.85)));
  cloutLevel = clamp100(cloutLevel);

  // Episode calculation: never regress below currentEpisode; require score thresholds or sustained turns + partial score
  const effectiveScore = Math.max(Number(score) || 0, Math.round((Number(closeness) + Number(trust) + Number(romance)) / 3));
  let nextEpisode = currentEpisode;
  for (const ep of arc) {
    if (ep.number <= nextEpisode) continue;
    const meetsScore = effectiveScore >= ep.minScore;
    const meetsTurnAndScore = turns >= ep.minTurns && effectiveScore >= Math.ceil(ep.minScore * 0.7);
    if (meetsScore || meetsTurnAndScore) {
      nextEpisode = ep.number;
    }
  }

  const episodeChanged = nextEpisode > currentEpisode;
  const episodeMeta = arc[nextEpisode - 1] || arc[0];
  const isCloseFriend = (nextEpisode >= 3 || effectiveScore >= 35 || closeness >= 30 || relRow?.is_close_friend === 1) ? 1 : 0;

  if (episodeChanged && !milestones.includes(`ep_${nextEpisode}`)) {
    milestones.push(`ep_${nextEpisode}`);
  }
  if (isCloseFriend === 1 && !milestones.includes('close_friend')) {
    milestones.push('close_friend');
  }

  let catalyst = null;
  if (/(เกมความจริง|ถามความจริง|ห้ามโกหก|หมุนขวด|truth game|truth or dare)/i.test(text) || (episodeChanged && nextEpisode === 3)) {
    catalyst = {
      kind: 'truth_game',
      title: 'REALITY CATALYST: เกมความจริงยามดึก',
      prompt: `${npcName}ท้าให้ผลัดกันถามความจริงคนละข้อโดยห้ามโกหก`
    };
  } else if (/(เลือกชุด|เลือกรูป|ลงรูปไหน|แคปชั่นไหน)/i.test(text)) {
    catalyst = {
      kind: 'dilemma',
      title: 'REALITY CATALYST: ที่ปรึกษาส่วนตัวหลังม่าน',
      prompt: `ช่วย${npcName}เลือกโพสต์และทิศทางภาพลักษณ์บนฟีด`
    };
  }

  let rippleEvent = null;
  if (/(แนะนำให้โพสต์|ลองไปแอบดู|เปิดโปง|รับงานนี้เลย|ปรุงยาสูตร|ประกาศไปเลย|จัดไลฟ์ด่วน|ตั้งแฮชแท็ก)/i.test(text)) {
    rippleEvent = {
      headline: `🦋 Ripple News: ความเคลื่อนไหวครั้งใหม่ของ ${npcName}!`,
      content: `หลังจากปรึกษาคนพิเศษในแชทลับ ล่าสุด ${npcName} ตัดสินใจเคลื่อนไหวครั้งสำคัญจนติดเทรนด์!`,
      promptDirective: `The player recently advised ${npcName} ("${text.slice(0, 60)}"), creating a buzz on the public timeline.`
    };
  }

  return {
    currentEpisode: nextEpisode,
    previousEpisode: currentEpisode,
    episodeChanged,
    episodeMeta,
    episodeBanner: episodeChanged
      ? { number: episodeMeta.number, title: episodeMeta.title, subtitle: episodeMeta.subtitle }
      : null,
    affectionLevel,
    stressLevel,
    cloutLevel,
    isCloseFriend,
    academicYear,
    termSeason,
    bastionHouse,
    censorshipLevel,
    focusPoints,
    statArcane,
    statCharisma,
    statAlchemy,
    endgameRouteFlag,
    emotionalMilestones: milestones.slice(-20),
    catalyst,
    rippleEvent
  };
}

/**
 * Detect whether the player has recently flirted/bonded with a rival creator.
 */
export async function sniffCrossCharacterJealousy(env, userId, currentCreatorId, userText = '', now = Date.now()) {
  const none = { active: false, groupAmbush: false };
  if (!env?.DB || !userId || !currentCreatorId) return none;

  try {
    const res = await env.DB.prepare(`
      SELECT r.creator_id, c.name AS creator_name, r.score,
             COALESCE(r.closeness, 0) AS closeness,
             COALESCE(r.romance, 0) AS romance,
             (SELECT MAX(m.created_at) FROM ai_chat_messages m
              WHERE m.user_id = r.user_id AND m.creator_id = r.creator_id) AS last_chat_at
      FROM relationships r
      JOIN creators c ON c.id = r.creator_id
      WHERE r.user_id = ? AND r.creator_id != ?
        AND (r.score >= 10 OR COALESCE(r.closeness, 0) >= 10 OR COALESCE(r.romance, 0) >= 10)
      ORDER BY COALESCE(last_chat_at, 0) DESC, r.score DESC
      LIMIT 3
    `).bind(userId, currentCreatorId).all();

    const rows = res?.results || [];
    if (rows.length === 0) return none;

    const text = typeof userText === 'string' ? userText : '';
    const TWO_HOURS_MS = 2 * 3600 * 1000;

    const match = rows.find((r) => {
      const recent = r.last_chat_at != null && (now - Number(r.last_chat_at)) <= TWO_HOURS_MS;
      return recent || Number(r.score) >= 25 || Number(r.closeness) >= 20;
    });
    if (!match) return none;

    const rivalScore = Number(match.score) || 0;
    const rivalName = String(match.creator_name || match.creator_id);
    const recentMinutes = match.last_chat_at != null
      ? Math.max(0, Math.round((now - Number(match.last_chat_at)) / 60000))
      : null;

    const ambushCue = /(เคลียร์ใจ|คุยพร้อมกัน|ดึงเข้ากลุ่ม|สามคน|เลือกใคร)/i.test(text);
    const rivalNamedAtHighScore = rivalScore >= 50 && rivalName && text.includes(rivalName);
    const groupAmbush = ambushCue || rivalNamedAtHighScore;

    return {
      active: true,
      rivalId: match.creator_id,
      rivalName,
      rivalScore,
      recentMinutes,
      groupAmbush
    };
  } catch {
    return none;
  }
}

/**
 * Retrieve active World Season Events (Official Moderator, Spotted Gossip, Ripple News).
 * Falls back to 2 default season events when no active rows exist in D1.
 */
export async function getActiveWorldSeasonContext(env, now = Date.now()) {
  if (!env?.DB) return [...DEFAULT_WORLD_EVENTS];
  try {
    const res = await env.DB.prepare(`
      SELECT id, season_id AS seasonId, event_kind AS eventKind, headline, content,
             prompt_directive AS promptDirective, source_creator_id AS sourceCreatorId,
             active_from AS activeFrom, active_until AS activeUntil, created_at AS createdAt
      FROM world_season_events
      WHERE active_from <= ? AND active_until >= ?
      ORDER BY created_at DESC
      LIMIT 6
    `).bind(now, now).all();

    const rows = res?.results || [];
    if (rows.length === 0) return [...DEFAULT_WORLD_EVENTS];
    return rows;
  } catch {
    return [...DEFAULT_WORLD_EVENTS];
  }
}

/**
 * Persist a Ripple World Event triggered by player advice in DM.
 */
export async function recordRippleWorldEvent(env, creatorId, rippleEvent, now = Date.now()) {
  if (!env?.DB || !rippleEvent?.headline || !rippleEvent?.content) return null;
  const id = 'evt_' + crypto.randomUUID().slice(0, 16);
  const activeUntil = now + 24 * 3600 * 1000;
  try {
    await env.DB.prepare(`
      INSERT INTO world_season_events(id, season_id, event_kind, headline, content, prompt_directive, source_creator_id, active_from, active_until, created_at)
      VALUES(?, 'season_1', 'ripple', ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      String(rippleEvent.headline).slice(0, 200),
      String(rippleEvent.content).slice(0, 500),
      String(rippleEvent.promptDirective || '').slice(0, 300),
      creatorId || null,
      now,
      activeUntil,
      now
    ).run();
    return {
      id,
      seasonId: 'season_1',
      eventKind: 'ripple',
      headline: rippleEvent.headline,
      content: rippleEvent.content,
      promptDirective: rippleEvent.promptDirective || '',
      sourceCreatorId: creatorId || null
    };
  } catch {
    return null;
  }
}

/**
 * Assemble a compact (<90 tokens) Micro-Prompt block injecting Reality Episode, Mood, Jealousy, and World Events.
 */
export function buildLivingRealityPromptBlock({
  npcName = 'Creator',
  realityState,
  jealousy = { active: false, groupAmbush: false },
  worldEvents = [],
  isEn = false
} = {}) {
  const st = realityState || computeRealityState({ npcName });
  const ep = st.episodeMeta || DEFAULT_REALITY_EPISODES[0];
  const lines = [
    `[Living Reality State: Episode ${ep.number}/5 (${ep.title}) | Affection:${st.affectionLevel}/100 | Stress:${st.stressLevel}/100 | Clout:${st.cloutLevel}/100${st.isCloseFriend ? ' | Close Friends: UNLOCKED' : ''}]`,
    `Episode Pacing: ${ep.toneDirective}`
  ];

  if (jealousy?.active) {
    lines.push(
      `[Cross-Character Jealousy: Player recently interacted closely with ${jealousy.rivalName} (score ${jealousy.rivalScore}). Act slightly pouted, tease or playfully question the player about ${jealousy.rivalName}.]`
    );
    if (jealousy.groupAmbush) {
      lines.push(
        `[GROUP CHAT AMBUSH ACTIVE: ${jealousy.rivalName} just barged into this thread! Have BOTH ${npcName} and ${jealousy.rivalName} speak in this turn using multi-speaker tags (e.g. "${npcName} 🔥: ..." and "${jealousy.rivalName} ⚡: ...") demanding the player explain who they choose.]`
      );
    }
  }

  const topEvent = Array.isArray(worldEvents) && worldEvents.length > 0 ? worldEvents[0] : null;
  if (topEvent) {
    lines.push(`[World Stage Buzz: ${topEvent.headline} — ${topEvent.promptDirective || topEvent.content}]`);
  }

  if (st.catalyst) {
    lines.push(`[Active Reality Catalyst: ${st.catalyst.title} — ${st.catalyst.prompt}]`);
  }

  // Magic Academy Quad-Stage Stage Prompt injection if available
  const stagePrompt = selectCharacterStagePrompt(npcName, st.academicYear, st.termSeason);
  if (stagePrompt) {
    lines.push(`[Academic Persona Directive (Year ${st.academicYear || 1} ${st.termSeason || 'autumn'}): ${stagePrompt}]`);
  }
  const aethelgardJealousy = sniffAethelgardCrossJealousy(npcName, jealousy?.rivalId ? [{ affection_target: jealousy.rivalId }] : []);
  if (aethelgardJealousy?.isJealous) {
    lines.push(aethelgardJealousy.promptDirective);
  }
  if ((st.censorshipLevel || 0) >= 2) {
    lines.push(`[Censorship Alert: Edict 42 active. Avoid raw forbidden names; use Aethelgard Coded Slang natively in dialogue.]`);
  }

  return lines.join('\n');
}

/**
 * Generate 3 contextual Quick Action Pills (Reigns-style instant choice shortcuts) matching the live turn state.
 */
export function buildContextualQuickPills({
  npcName = 'Creator',
  realityState,
  jealousy = { active: false, groupAmbush: false },
  isEn = false
} = {}) {
  if (jealousy?.groupAmbush) {
    return isEn
      ? [
          `Wait, let's calm down and talk together`,
          `I care about ${npcName} more than anyone`,
          `Why don't we settle this with a truth game?`
        ]
      : [
          `ใจเย็นก่อนทั้งคู่ มาคุยกันดีๆ นะ 😅`,
          `ยังไงฉันก็เลือกอยู่ข้าง ${npcName} เสมอนั่นแหละ 💖`,
          `งั้นเรามาเล่นเกมความจริงเคลียร์ใจกันเลยไหม? 🎲`
        ];
  }

  if (jealousy?.active) {
    return isEn
      ? [
          `Don't be jealous, I'm right here with you`,
          `I was just asking ${jealousy.rivalName} for advice!`,
          `Wait, are you pouting right now? Cute 💕`
        ]
      : [
          `หึงเหรอเนี่ย? ฉันก็กลับมาคุยกับ ${npcName} แล้วไง 💕`,
          `แค่คุยเรื่องงานกับ ${jealousy.rivalName} เฉยๆ ไม่มีอะไรสักหน่อย`,
          `งอนอยู่หรือเปล่า เดี๋ยวปลอบนะ 🥰`
        ];
  }

  if (realityState?.catalyst?.kind === 'truth_game') {
    return isEn
      ? [
          `Deal! I'll ask my first truth question`,
          `Ask me anything, I won't lie`,
          `Only if the loser sends a secret selfie 😉`
        ]
      : [
          `ตกลง! งั้นฉันขอเป็นฝ่ายถามก่อนนะ 🎲`,
          `ถามมาได้เลย ฉันสัญญาว่าจะไม่โกหก 🤍`,
          `ถ้าใครแพ้ต้องส่งรูปที่ซ่อนไว้ให้ดูนะ 😉`
        ];
  }

  if ((realityState?.stressLevel || 0) >= 60) {
    return isEn
      ? [
          `Take a deep breath, rest and talk to me`,
          `Forget the comments, let's grab a midnight snack`,
          `Tell me what's really bothering you`
        ]
      : [
          `พักผ่อนเถอะนะ ไม่ต้องฝืนหรอก ฉันอยู่ข้างๆ เอง 🛡️`,
          `ช่างคอมเมนต์พวกนั้นเถอะ ไปหาอะไรอร่อยๆ กินกันไหม`,
          `มีอะไรอึดอัดใจเล่าให้ฉันฟังได้หมดเลยนะ 🤍`
        ];
  }

  return isEn
    ? [
        `Let's play a late-night truth game 🎲`,
        `How is your heart feeling right now? ✨`,
        `Did you see what's trending on the feed today?`
      ]
    : [
        `มาเล่นเกมความจริง 3 ข้อกันไหม ห้ามโกหกนะ 🎲`,
        `วันนี้เหนื่อยไหม พักคุยกับฉันก่อนสิ 🤍`,
        `เห็นประกาศล่าสุดบนหน้าฟีดหรือยัง? 👀`
      ];
}

const RIVAL_TEASE_TEMPLATES = [
  (author, rival) => `@${author} แหม... ช่วงนี้ดูสนิทกับคนแถวนี้จังนะ ระวังโดนแย่งตำแหน่งตัวจริงล่ะ 💅`,
  (author, rival) => `โพสต์สวยดีนี่ @${author} แต่เมื่อคืนเห็นมีคนทักแชทมาหา${rival}อยู่นะ หึๆ 😉`,
  (author) => `@${author} ลงรูปถี่เชียวนะช่วงนี้ กำลังอ้อนใครอยู่หรือเปล่า~ 👀`
];

/**
 * Deterministic cross-creator cameo reactions rendered alongside public feed posts.
 */
export function generateCrossCreatorFeedReactions({ post, rivalCreators = [] } = {}) {
  if (!post || !Array.isArray(rivalCreators) || rivalCreators.length === 0) return [];
  const candidates = rivalCreators.filter((r) => r.id && r.id !== post.creatorId);
  if (candidates.length === 0) return [];

  const seedStr = String(post.id || 'p');
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash * 31) + seedStr.charCodeAt(i)) >>> 0;
  }

  const chosen = candidates[hash % candidates.length];
  const tpl = RIVAL_TEASE_TEMPLATES[hash % RIVAL_TEASE_TEMPLATES.length];
  const authorHandle = post.creatorName || post.creatorId || 'creator';
  const rivalName = chosen.name || chosen.id;

  return [
    {
      id: `cross_${post.id}_${chosen.id}`,
      creatorId: chosen.id,
      creatorName: rivalName,
      content: tpl(authorHandle, rivalName)
    }
  ];
}
