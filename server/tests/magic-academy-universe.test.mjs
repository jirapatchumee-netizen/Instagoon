import test from 'node:test';
import assert from 'node:assert/strict';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';
import {
  selectCharacterStagePrompt,
  evaluateCurfewState,
  generateProceduralCampusMeme,
  applySmartEdict42Filter,
  recordFeedQuickReply,
  getAcademicYearContext,
  computeRealityState,
  buildLivingRealityPromptBlock
} from '../src/ai/living-reality-engine.mjs';

test('Magic Academy: Quad-Stage Stage Prompt Selection properly separates Year 4 Gala vs Shatter', () => {
  // Years 1-3: Tone A (Whimsical Rom-Com)
  const y1 = selectCharacterStagePrompt('evelyn', 1, 'autumn');
  assert.ok(y1.includes('brilliant but socially flustered Zephyr-Crown alchemist'));
  assert.ok(y1.includes('minor cauldron mishaps'));

  const y3 = selectCharacterStagePrompt('cassian', 3, 'winter');
  assert.ok(y3.includes('sharp-tongued heir to an ancient Nocturn-Coil bloodline'));
  assert.ok(y3.includes('rare Rune-Logic notes in their bag'));

  // Year 4: Tone B1 (Winter Solstice Gala Fever)
  const y4Gala = selectCharacterStagePrompt('evelyn', 4, 'winter');
  assert.ok(y4Gala.includes('Solstice Gala Fever'));
  assert.ok(y4Gala.includes('No tragedy has occurred yet'));

  const y4FayeGala = selectCharacterStagePrompt('faye', 4, 'autumn');
  assert.ok(y4FayeGala.includes('Solstice Gala Fever'));
  assert.ok(y4FayeGala.includes('crimson silk dress'));

  // Year 4: Tone B2 (Summer: The Shattering)
  const y4Shatter = selectCharacterStagePrompt('evelyn', 4, 'summer');
  assert.ok(y4Shatter.includes('Summer: The Shattering'));
  assert.ok(y4Shatter.includes('academic optimism cracks'));

  const y4FayeShatter = selectCharacterStagePrompt('faye', 4, 'summer');
  assert.ok(y4FayeShatter.includes('CRITICAL GRIEF'));
  assert.ok(y4FayeShatter.includes('childhood best friend just died'));

  // Years 5-7: Tone C (Inquisitorial Lockdown & War)
  const y5 = selectCharacterStagePrompt('evelyn', 5, 'winter');
  assert.ok(y5.includes('Inquisitorial Lockdown & Siege'));
  assert.ok(y5.includes('The Winter Knitting Circle'));

  const y6Cassian = selectCharacterStagePrompt('cassian', 6, 'spring');
  assert.ok(y6Cassian.includes('Divided Bloodlines & Siege'));
  assert.ok(y6Cassian.includes('Fitting the Heirloom Coat'));

  const y7Rowan = selectCharacterStagePrompt('rowan', 7, 'summer');
  assert.ok(y7Rowan.includes('Underground Railroad & Siege'));
  assert.ok(y7Rowan.includes('Botanical Field Transfers'));
});

test('Magic Academy: Curfew Evaluation respects in-game day phase and Somno-Truffles bypass', () => {
  // Daytime is completely free
  const morning = evaluateCurfewState('morning', 2, false);
  assert.equal(morning.isCurfewActive, false);
  assert.equal(morning.reason, 'daytime_unrestricted');

  const midday = evaluateCurfewState('midday', 6, false);
  assert.equal(midday.isCurfewActive, false);

  const evening = evaluateCurfewState('evening', 4, false);
  assert.equal(evening.isCurfewActive, false);

  // Night Curfew triggers active patrol
  const nightY2 = evaluateCurfewState('night_curfew', 2, false);
  assert.equal(nightY2.isCurfewActive, true);
  assert.equal(nightY2.curfewHour, '20:00');
  assert.equal(nightY2.bypassed, false);

  const nightY7 = evaluateCurfewState('night_curfew', 7, false);
  assert.equal(nightY7.isCurfewActive, true);
  assert.equal(nightY7.curfewHour, '18:00');

  // Somno-Truffles item bypasses curfew restrictions
  const nightBypassed = evaluateCurfewState('night_curfew', 2, true);
  assert.equal(nightBypassed.isCurfewActive, false);
  assert.equal(nightBypassed.bypassed, true);
  assert.equal(nightBypassed.reason, 'somno_truffles_active');
});

test('Magic Academy: Procedural Campus Meme generates dynamic content and silences during Y4 Summer', () => {
  // Year 1-3 generates valid memes
  const memeY1 = generateProceduralCampusMeme(1, 'autumn');
  assert.ok(memeY1);
  assert.ok(memeY1.content.length > 20);
  assert.ok(!memeY1.content.includes('{{')); // Variables are interpolated
  assert.ok(memeY1.quickReplies.length > 0);

  const memeY2 = generateProceduralCampusMeme(2, 'winter');
  assert.ok(memeY2);

  // Year 4 Autumn/Winter generates memes
  const memeY4Gala = generateProceduralCampusMeme(4, 'winter');
  assert.ok(memeY4Gala);

  // Year 4 Summer (The Shattering) is EXCLUDED from lighthearted procedural memes
  const memeY4Summer = generateProceduralCampusMeme(4, 'summer');
  assert.equal(memeY4Summer, null, 'comedic memes must be silenced during Year 4 Summer grief');

  // Year 5+ (War Era) is not in allowed years
  const memeY5 = generateProceduralCampusMeme(5, 'autumn');
  assert.equal(memeY5, null);
});

test('Magic Academy: Smart Edict 42 Filter redacts forbidden words and respects Origami Crane immunity', () => {
  // Censorship Level 0 (Years 1-4): No censorship
  const clean0 = applySmartEdict42Filter('We talk about the sovereign of ash openly', 0);
  assert.equal(clean0.violationDetected, false);
  assert.equal(clean0.filteredMessage, 'We talk about the sovereign of ash openly');

  // Censorship Level 2 (Years 5-6): Catches dark lord and resistance keywords
  const red2 = applySmartEdict42Filter('Are you joining the resistance against the sovereign of ash?', 2);
  assert.equal(red2.violationDetected, true);
  assert.ok(red2.filteredMessage.includes('[REDACTED BY EDICT 42]'));
  assert.ok(red2.flaggedKeywords.includes('resistance'));
  assert.ok(red2.flaggedKeywords.includes('sovereign of ash'));
  assert.ok(red2.warningToast.includes('HARMONY VIOLATION'));

  // Whispering Origami Crane item provides immunity for the turn
  const craneImmune = applySmartEdict42Filter('Are you joining the resistance against the sovereign of ash?', 2, null, true);
  assert.equal(craneImmune.violationDetected, false);
  assert.equal(craneImmune.filteredMessage, 'Are you joining the resistance against the sovereign of ash?');
  assert.equal(craneImmune.warningToast, null);
});

test('Magic Academy: Micro-state and Prompt Block integrate 7-year progression and Edict 42 alerts', () => {
  const stY5 = computeRealityState({
    relRow: {
      current_episode: 4,
      academic_year: 5,
      term_season: 'winter',
      bastion_house: 'Zephyr-Crown',
      censorship_level: 2,
      stress_level: 65,
      affection_level: 55,
      is_close_friend: 1
    },
    npcName: 'Evelyn',
    userText: 'เธอโอเคไหม ดูแลตัวเองนะ'
  });

  assert.equal(stY5.academicYear, 5);
  assert.equal(stY5.censorshipLevel, 2);
  assert.equal(stY5.bastionHouse, 'Zephyr-Crown');

  const promptBlock = buildLivingRealityPromptBlock({
    npcName: 'Evelyn',
    realityState: stY5,
    isEn: false
  });

  assert.ok(promptBlock.includes('Academic Persona Directive (Year 5 winter)'));
  assert.ok(promptBlock.includes('Censorship Alert: Edict 42 active'));
  assert.ok(promptBlock.includes('The Winter Knitting Circle'));
});

test('Magic Academy: Database Migration 0039 tables and seed data populate correctly', async () => {
  const f = await narrativeFixture();
  // Apply migration 0039 to the test fixture DB
  const fs = await import('node:fs');
  const sql = fs.readFileSync(new URL('../migrations/0039_magic_academy_universe.sql', import.meta.url), 'utf8');

  // Split and execute statements
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      f.sql.prepare(stmt).run();
    } catch (err) {
      // Ignore column duplicate errors if already present in fixture
      if (!String(err).includes('duplicate column')) {
        throw err;
      }
    }
  }

  // Verify house points standings
  const houses = f.sql.prepare('SELECT * FROM academy_house_points ORDER BY points DESC').all();
  assert.equal(houses.length, 4);
  assert.equal(houses[0].bastion_name, 'Nocturn-Coil');
  assert.equal(houses[1].bastion_name, 'Aethel-Pyre');

  // Verify courses
  const courses = f.sql.prepare('SELECT * FROM academy_courses').all();
  assert.equal(courses.length, 5);
  const alchemy = courses.find((c) => c.partner_npc_slug === 'evelyn');
  assert.equal(alchemy.course_name, 'Volatile Crucibles & Subtleties');

  // Verify secondary NPCs
  const secondary = f.sql.prepare('SELECT * FROM academy_secondary_npcs').all();
  assert.equal(secondary.length, 8);
  assert.ok(secondary.some((n) => n.npc_handle === '@cipher_moth'));
  assert.ok(secondary.some((n) => n.npc_handle === '@inquisitor_vespera'));

  // Test feed quick reply
  f.sql.prepare('INSERT OR IGNORE INTO creators(id,name,bio) VALUES(?,?,?)').run('evelyn', 'Evelyn Vane', 'Alchemist');
  f.sql.prepare('INSERT OR IGNORE INTO relationships(user_id, creator_id, affection_level) VALUES(?,?,?)').run('one', 'evelyn', 40);
  const qres = await recordFeedQuickReply(f.env.DB, {
    replyId: 'QR_M02_EVELYN',
    ownerId: 'one',
    targetNpcSlug: 'evelyn',
    delta: 4,
    followupTrigger: 'evelyn_study_notes'
  });
  assert.equal(qres.success, true);
  assert.equal(qres.delta, 4);

  const updatedRel = f.sql.prepare('SELECT affection_level FROM relationships WHERE user_id=? AND creator_id=?').get('one', 'evelyn');
  assert.equal(updatedRel.affection_level, 44);
});

test('Magic Academy: Cross-Character Jealousy Matrix triggers when player interacts with rival NPC', async () => {
  const { sniffAethelgardCrossJealousy } = await import('../src/ai/living-reality-engine.mjs');

  // Cassian is jealous when player flirts with Faye
  const cassianJealousy = sniffAethelgardCrossJealousy('cassian', [{ affection_target: 'faye' }]);
  assert.equal(cassianJealousy?.isJealous, true);
  assert.equal(cassianJealousy?.rivalSlug, 'faye');
  assert.ok(cassianJealousy?.promptDirective.includes('cheering for Faye at Aero-Jousting practice'));

  // Evelyn is jealous when player studies late with Rowan
  const evelynJealousy = sniffAethelgardCrossJealousy('evelyn', [{ affection_target: 'rowan' }]);
  assert.equal(evelynJealousy?.isJealous, true);
  assert.equal(evelynJealousy?.rivalSlug, 'rowan');

  // No jealousy when interaction is with non-rival
  const noJealousy = sniffAethelgardCrossJealousy('cassian', [{ affection_target: 'evelyn' }]);
  assert.equal(noJealousy, null);
});

test('Magic Academy: Year 7 Endgame Fate and Anti-Cheat Feed Interactions verify properly', async () => {
  const { evaluateYear7EndgameFate } = await import('../src/ai/living-reality-engine.mjs');
  const f = await narrativeFixture();
  const fs = await import('node:fs');

  // Apply migration 0040
  const sql40 = fs.readFileSync(new URL('../migrations/0040_academy_feed_interactions.sql', import.meta.url), 'utf8');
  for (const stmt of sql40.split(';').map((s) => s.trim()).filter((s) => s.length > 0 && !s.startsWith('--'))) {
    f.sql.prepare(stmt).run();
  }

  // 1. Year 7 Endgame Fate
  const golden = evaluateYear7EndgameFate({ affectionLevel: 85, stressLevel: 40, keyQuestProtected: true });
  assert.equal(golden, 'GOLDEN_ENDING');

  const tragicHighStress = evaluateYear7EndgameFate({ affectionLevel: 85, stressLevel: 70, keyQuestProtected: true });
  assert.equal(tragicHighStress, 'TRAGIC_ENDING');

  const tragicUnprotected = evaluateYear7EndgameFate({ affectionLevel: 90, stressLevel: 30, keyQuestProtected: false });
  assert.equal(tragicUnprotected, 'TRAGIC_ENDING');

  // 2. Anti-Cheat: Repeated meme replies rejected
  f.sql.prepare('INSERT OR IGNORE INTO creators(id,name,bio) VALUES(?,?,?)').run('faye', 'Faye', 'Chaser');
  f.sql.prepare('INSERT OR IGNORE INTO relationships(user_id, creator_id, affection_level) VALUES(?,?,?)').run('one', 'faye', 20);

  const firstReply = await recordFeedQuickReply(f.env.DB, {
    replyId: 'OPT_FAYE_CHEER',
    postInstanceId: 'MEME_001_Y1_autumn',
    ownerId: 'one',
    targetNpcSlug: 'faye',
    delta: 5
  });
  assert.equal(firstReply.success, true);

  const duplicateReply = await recordFeedQuickReply(f.env.DB, {
    replyId: 'OPT_FAYE_CHEER',
    postInstanceId: 'MEME_001_Y1_autumn',
    ownerId: 'one',
    targetNpcSlug: 'faye',
    delta: 5
  });
  assert.equal(duplicateReply.success, false);
  assert.equal(duplicateReply.reason, 'already_interacted');

  // Affection should only increment once (+5, total 25)
  const rel = f.sql.prepare('SELECT affection_level FROM relationships WHERE user_id=? AND creator_id=?').get('one', 'faye');
  assert.equal(rel.affection_level, 25);
});
