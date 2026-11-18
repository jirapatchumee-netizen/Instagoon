// Magic Academy Helpers for Aethelgard Universe
// Provides stage prompt selection, curfew evaluation, procedural meme generation, Edict 42 censorship, and feed quick replies.

import {
  WORLD_TIMELINE_7YEARS,
  ARCANE_ITEMS_AND_SLANG,
  AETHELGARD_CORE_QUARTET_PROMPTS,
  PROCEDURAL_MEMES
} from './magic-universe-data.mjs';

const CURFEW_HOURS_BY_YEAR = Object.freeze({
  1: '22:00',
  2: '20:00',
  3: '21:00',
  4: '23:00',
  5: '19:30',
  6: '19:00',
  7: '18:00'
});

/**
 * 1. Selects character system prompt according to Academic Year and Term Season.
 * Automatically splits Year 4 into Gala (Autumn/Winter/Spring) vs Shattering (Summer).
 */
export function selectCharacterStagePrompt(characterOrSlug, academicYear = 1, termSeason = 'autumn') {
  let profile = characterOrSlug;
  if (typeof characterOrSlug === 'string') {
    const slug = characterOrSlug.toLowerCase().trim();
    profile = AETHELGARD_CORE_QUARTET_PROMPTS.characters.find(
      (c) => c.npc_slug === slug || c.handle === slug || c.full_name?.toLowerCase() === slug
    );
  }

  if (!profile || !profile.quad_stage_system_prompts) {
    return '';
  }

  const prompts = profile.quad_stage_system_prompts;
  const year = Number(academicYear) || 1;
  const season = String(termSeason || '').toLowerCase().trim();

  let stageKey = 'tone_a_years_1_3';
  let promptText = prompts.tone_a_years_1_3;

  if (year <= 3) {
    stageKey = 'tone_a_years_1_3';
    promptText = prompts.tone_a_years_1_3;
  } else if (year === 4) {
    if (season === 'summer') {
      stageKey = 'tone_b2_year_4_shatter';
      promptText = prompts.tone_b2_year_4_shatter;
    } else {
      stageKey = 'tone_b1_year_4_gala';
      promptText = prompts.tone_b1_year_4_gala;
    }
  } else {
    stageKey = 'tone_c_years_5_7';
    promptText = prompts.tone_c_years_5_7;
  }

  return promptText;
}

/**
 * 2. Evaluates curfew restriction based on in-game day phase, academic year, and inventory items.
 * Curfew restrictions apply ONLY when day_phase === 'night_curfew'.
 */
export function evaluateCurfewState(dayPhase = 'morning', academicYear = 1, playerHasSomnoTruffles = false) {
  const year = Math.max(1, Math.min(7, Number(academicYear) || 1));
  const curfewHour = CURFEW_HOURS_BY_YEAR[year] || '22:00';

  if (dayPhase !== 'night_curfew') {
    return {
      isCurfewActive: false,
      curfewHour,
      bypassed: false,
      reason: 'daytime_unrestricted'
    };
  }

  if (playerHasSomnoTruffles) {
    return {
      isCurfewActive: false,
      curfewHour,
      bypassed: true,
      reason: 'somno_truffles_active'
    };
  }

  return {
    isCurfewActive: true,
    curfewHour,
    bypassed: false,
    reason: 'patrol_active'
  };
}

/**
 * 3. Procedural Campus Meme Generator.
 * Generates dynamic memes with variable interpolation for Years 1-4 (excluding Year 4 Summer).
 */
export function generateProceduralCampusMeme(academicYear = 1, termSeason = 'autumn', customTemplates = null) {
  const year = Number(academicYear) || 1;
  const season = String(termSeason || '').toLowerCase().trim();

  const allowedYears = PROCEDURAL_MEMES.allowed_academic_years || [1, 2, 3, 4];
  if (!allowedYears.includes(year)) {
    return null;
  }

  const excludedSeasons = PROCEDURAL_MEMES.excluded_seasons_by_year?.[String(year)] || [];
  if (excludedSeasons.includes(season)) {
    return null;
  }

  const templates = Array.isArray(customTemplates) && customTemplates.length > 0
    ? customTemplates
    : PROCEDURAL_MEMES.meme_templates;

  if (!templates || templates.length === 0) return null;

  // Pick random template
  const idx = Math.floor(Math.random() * templates.length);
  const tpl = templates[idx];

  // Interpolate variables
  let content = tpl.text_pattern;
  if (tpl.variables) {
    for (const [varName, options] of Object.entries(tpl.variables)) {
      if (Array.isArray(options) && options.length > 0) {
        const choice = options[Math.floor(Math.random() * options.length)];
        const placeholder = `{{${varName}}}`;
        content = content.replaceAll(placeholder, choice);
      }
    }
  }

  return {
    templateId: tpl.template_id,
    authorHandle: tpl.author_handle,
    channel: tpl.channel,
    content,
    npcComments: tpl.npc_comments || [],
    quickReplies: tpl.quick_replies || []
  };
}

/**
 * 4. Smart Edict 42 Censorship Filter.
 * Detects forbidden keywords when censorship is active and replaces them with [REDACTED BY EDICT 42].
 * Whispering Origami Crane gives complete immunity for 1 turn.
 */
export function applySmartEdict42Filter(
  playerMessage = '',
  censorshipLevel = 0,
  edict42Rules = null,
  playerUsedOrigamiCrane = false
) {
  if (playerUsedOrigamiCrane || Number(censorshipLevel) < 1) {
    return {
      filteredMessage: playerMessage,
      violationDetected: false,
      flaggedKeywords: [],
      warningToast: null
    };
  }

  const rules = Array.isArray(edict42Rules) && edict42Rules.length > 0
    ? edict42Rules
    : ARCANE_ITEMS_AND_SLANG.edict_42_lexicon.coded_slang_dictionary;

  let filtered = String(playerMessage || '');
  const flagged = [];

  for (const rule of rules) {
    const minLevel = rule.min_censorship_level || 1;
    if (Number(censorshipLevel) < minLevel) continue;

    const triggers = rule.forbidden_triggers || (rule.forbidden_pattern ? [rule.forbidden_pattern] : []);
    for (const trigger of triggers) {
      if (!trigger) continue;
      const regex = new RegExp(`\\b${escapeRegExp(trigger)}\\b`, 'gi');
      if (regex.test(filtered)) {
        flagged.push(trigger);
        filtered = filtered.replace(regex, ARCANE_ITEMS_AND_SLANG.edict_42_lexicon.replacement_banner || '[REDACTED BY EDICT 42]');
      }
    }
  }

  const violationDetected = flagged.length > 0;
  return {
    filteredMessage: filtered,
    violationDetected,
    flaggedKeywords: flagged,
    warningToast: violationDetected ? ARCANE_ITEMS_AND_SLANG.edict_42_lexicon.warning_toast : null
  };
}

/**
 * 5. Records Feed Quick Reply interaction and handles Affection delta + DM follow-up.
 */
export async function recordFeedQuickReply(db, { replyId, ownerId = 'player_main', userId, targetNpcSlug, delta = 3, followupTrigger }) {
  const npc = String(targetNpcSlug || '').toLowerCase().trim();
  const points = Number(delta) || 3;
  const uid = userId || ownerId;

  if (db && npc) {
    try {
      await db.prepare(`
        UPDATE relationships 
        SET affection_level = MIN(100, COALESCE(affection_level, 0) + ?)
        WHERE user_id = ? AND creator_id = ?
      `).bind(points, uid, npc).run();
    } catch (err) {
      console.warn('recordFeedQuickReply db update warning:', err.message);
    }
  }

  return {
    success: true,
    replyId,
    targetNpcSlug: npc,
    delta: points,
    followupTrigger: followupTrigger || null
  };
}

/**
 * Retrieves Academic Year Context (Macro parody event, decrees, feeds, romance milestone).
 */
export function getAcademicYearContext(academicYear = 1, termSeason = 'autumn') {
  const year = Math.max(1, Math.min(7, Number(academicYear) || 1));
  const yearData = WORLD_TIMELINE_7YEARS.academic_years.find((y) => y.academic_year === year);
  if (!yearData) return null;

  const decrees = (yearData.campus_decrees || []).filter(
    (d) => !termSeason || d.term_season === termSeason || d.term_season === 'all'
  );

  return {
    academicYear: year,
    title: yearData.title,
    arcPhase: yearData.arc_phase,
    systemModifiers: yearData.system_modifiers,
    macroParodyEvent: yearData.macro_parody_event,
    campusDecrees: decrees,
    mediaFeeds: yearData.media_feeds,
    romanceMilestone: yearData.romance_milestone
  };
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
