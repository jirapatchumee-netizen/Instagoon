import test from 'node:test';
import assert from 'node:assert/strict';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';
import {
  computeRealityState,
  sniffCrossCharacterJealousy,
  getActiveWorldSeasonContext,
  recordRippleWorldEvent,
  buildLivingRealityPromptBlock,
  buildContextualQuickPills,
  generateCrossCreatorFeedReactions
} from '../src/ai/living-reality-engine.mjs';

test('Micro-state transitions track stress, affection, clout and advance through 5 episodes without Game Over', () => {
  const s1 = computeRealityState({
    relRow: { current_episode: 1, stress_level: 50, affection_level: 10, clout_level: 50, is_close_friend: 0, emotional_milestones: '[]' },
    score: 4,
    turns: 1,
    affectionDelta: 1,
    userText: 'สวัสดีครับ',
    npcName: 'มิลิน'
  });
  assert.equal(s1.currentEpisode, 1);
  assert.equal(s1.episodeChanged, false);
  assert.equal(s1.isCloseFriend, 0);

  const comfort = computeRealityState({
    relRow: { current_episode: 1, stress_level: 60, affection_level: 20, clout_level: 50, is_close_friend: 0, emotional_milestones: '[]' },
    score: 20,
    turns: 5,
    affectionDelta: 2,
    userText: 'พักผ่อนเถอะนะ ฉันเป็นห่วงและอยู่ข้างๆ เสมอ',
    npcName: 'มิลิน'
  });
  assert.equal(comfort.currentEpisode, 2);
  assert.equal(comfort.episodeChanged, true);
  assert.equal(comfort.episodeBanner.title, 'Midnight Cracks');
  assert.ok(comfort.stressLevel < 60, 'comforting message reduces stress');
  assert.ok(comfort.affectionLevel > 20, 'comforting message boosts affection');

  const advice = computeRealityState({
    relRow: { current_episode: 2, stress_level: 30, affection_level: 40, clout_level: 50, is_close_friend: 0, emotional_milestones: '["ep_2"]' },
    score: 40,
    turns: 9,
    affectionDelta: 2,
    userText: 'แนะนำให้โพสต์ลงรูปชุดนี้และตั้งแฮชแท็กเลย!',
    npcName: 'มิลิน'
  });
  assert.equal(advice.currentEpisode, 3);
  assert.equal(advice.isCloseFriend, 1);
  assert.ok(advice.cloutLevel > 50, 'career/post advice boosts clout');
  assert.equal(advice.catalyst?.kind, 'truth_game');
  assert.ok(advice.rippleEvent, 'bold advice triggers a ripple world event');
});

test('DM turns persist Ghost Draft, Episode Banner, Catalyst, Quick Pills, and Ripple World Events', async () => {
  const f = await narrativeFixture();
  const inline = { ...f.npc, id: 'milin-sim', name: 'มิลิน', world: 'ห้องพักครีเอเตอร์' };
  delete inline.narrative;
  f.sql.prepare('INSERT INTO creators(id,name,bio) VALUES(?,?,?)').run(inline.id, inline.name, inline.tagline);
  f.sql.prepare('INSERT INTO npc_definitions(creator_id,definition_json,updated_at) VALUES(?,?,?)').run(inline.id, JSON.stringify(inline), Date.now());
  // Seed relationship at score 34 so +2 moves it past 35 (Episode 3 + Close Friend unlock)
  f.sql.prepare('INSERT INTO relationships(user_id, creator_id, score, closeness, trust, romance, turns, current_episode, stress_level, affection_level, clout_level) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
    .run('one', inline.id, 34, 34, 34, 34, 8, 2, 65, 35, 50);

  let capturedSystem = '';
  f.env.PRIMARY_AI_PROVIDER = 'workers-ai';
  f.env.AI = {
    async run(_model, input) {
      capturedSystem = input.messages[0].content;
      return {
        response: JSON.stringify({
          reply: 'งั้นเรามาเล่นเกมความจริงกันคืนนี้เลยนะ!',
          innerThought: 'กลัวหลุดปากจัง แต่ก็อยากเล่าให้ฟัง',
          action: 'ขยับมานั่งใกล้ๆ บนโซฟา',
          ghostDraft: 'จริงๆ วันนี้ฉันเกือบร้องไห้กลางไลฟ์เลย...',
          beats: [
            { kind: 'action', text: 'ขยับมานั่งใกล้ๆ บนโซฟา' },
            { kind: 'dialogue', text: 'งั้นเรามาเล่นเกมความจริงกันคืนนี้เลยนะ!' }
          ],
          sceneTime: '23:30 น.',
          sceneLocation: 'ห้องพักครีเอเตอร์ (โซฟา)',
          affectionDelta: 2
        })
      };
    }
  };

  const res = await f.request('มาเล่นเกมความจริงกัน และฉันแนะนำให้โพสต์ชุดนี้เลย!', {
    path: `/api/chats/${inline.id}/message`,
    action: 'message',
    data: { message: 'มาเล่นเกมความจริงกัน และฉันแนะนำให้โพสต์ชุดนี้เลย!' }
  });

  assert.equal(res.status, 200);
  assert.match(capturedSystem, /\[Living Reality State: Episode 3\/5/);
  assert.match(capturedSystem, /Ghost Draft Cue/);
  assert.equal(res.payload.realityState.currentEpisode, 3);
  assert.equal(res.payload.realityState.episodeChanged, true);
  assert.equal(res.payload.realityState.isCloseFriend, true);
  assert.equal(res.payload.realityState.rippleTriggered, true);
  assert.equal(res.payload.realityState.catalyst.kind, 'truth_game');
  assert.equal(res.payload.suggestedReplies.length, 3);

  const stored = f.sql.prepare("SELECT content FROM ai_chat_messages WHERE role='assistant' AND creator_id=? ORDER BY created_at DESC LIMIT 1").get(inline.id);
  assert.match(stored.content, /\[episode:\{"number":3/);
  assert.match(stored.content, /\[draft:จริงๆ วันนี้ฉันเกือบร้องไห้กลางไลฟ์เลย…\]|\[draft:จริงๆ วันนี้ฉันเกือบร้องไห้กลางไลฟ์เลย\.\.\.\]/);
  assert.match(stored.content, /\[catalyst:\{"kind":"truth_game"/);

  const row = f.sql.prepare('SELECT current_episode, is_close_friend FROM relationships WHERE user_id=? AND creator_id=?').get('one', inline.id);
  assert.equal(row.current_episode, 3);
  assert.equal(row.is_close_friend, 1);

  const rippleRows = f.sql.prepare("SELECT * FROM world_season_events WHERE event_kind='ripple'").all();
  assert.equal(rippleRows.length, 1);
  assert.match(rippleRows[0].headline, /Ripple News/);

  const opened = await f.request('', { path: `/api/chats/${inline.id}`, action: '' });
  assert.equal(opened.status, 200);
  assert.equal(opened.payload.chat.realityState.currentEpisode, 3);
  assert.equal(opened.payload.chat.realityState.isCloseFriend, true);
  assert.equal(opened.payload.chat.suggestedReplies.length, 3);
});

test('Cross-Character Jealousy Sniffer and Group Chat Ambush trigger when alternating between high-affinity creators', async () => {
  const f = await narrativeFixture();
  const iris = { ...f.npc, id: 'iris', name: 'ไอริส' };
  const serena = { ...f.npc, id: 'serena', name: 'เซเรน่า' };
  delete iris.narrative;
  delete serena.narrative;

  for (const c of [iris, serena]) {
    f.sql.prepare('INSERT INTO creators(id,name,bio) VALUES(?,?,?)').run(c.id, c.name, c.tagline);
    f.sql.prepare('INSERT INTO npc_definitions(creator_id,definition_json,updated_at) VALUES(?,?,?)').run(c.id, JSON.stringify(c), Date.now());
  }

  const now = Date.now();
  f.sql.prepare('INSERT INTO relationships(user_id, creator_id, score, closeness, romance) VALUES(?,?,?,?,?)').run('one', 'iris', 55, 50, 45);
  f.sql.prepare("INSERT INTO ai_chat_messages(id, user_id, creator_id, role, content, created_at) VALUES('m_iris', 'one', 'iris', 'user', 'คิดถึงไอริสนะ', ?)").run(now - 60000);

  const jealousy = await sniffCrossCharacterJealousy(f.env, 'one', 'serena', 'เดี๋ยวดึงเข้ากลุ่มคุยพร้อมกันเลยไหม', now);
  assert.equal(jealousy.active, true);
  assert.equal(jealousy.rivalId, 'iris');
  assert.equal(jealousy.rivalName, 'ไอริส');
  assert.equal(jealousy.groupAmbush, true);

  const promptBlock = buildLivingRealityPromptBlock({
    npcName: 'เซเรน่า',
    realityState: computeRealityState({ npcName: 'เซเรน่า' }),
    jealousy,
    worldEvents: await getActiveWorldSeasonContext(f.env, now)
  });
  assert.match(promptBlock, /Cross-Character Jealousy/);
  assert.match(promptBlock, /GROUP CHAT AMBUSH ACTIVE/);

  const ambushPills = buildContextualQuickPills({ npcName: 'เซเรน่า', realityState: computeRealityState({ npcName: 'เซเรน่า' }), jealousy });
  assert.equal(ambushPills.length, 3);
  assert.match(ambushPills[1], /เซเรน่า/);
});

test('Shared Public Feed exposes worldEvents, crossComments without polluting player comments, Close Friends story flag, and rivalReaction', async () => {
  const f = await narrativeFixture();
  const now = Date.now();
  const iris = { ...f.npc, id: 'iris-feed', name: 'ไอริส' };
  const serena = { ...f.npc, id: 'serena-feed', name: 'เซเรน่า' };

  for (const c of [iris, serena]) {
    f.sql.prepare('INSERT INTO creators(id,name,bio) VALUES(?,?,?)').run(c.id, c.name, c.tagline);
    f.sql.prepare('INSERT INTO follows(user_id,creator_id,created_at) VALUES(?,?,?)').run('one', c.id, now);
  }

  f.sql.prepare('INSERT INTO relationships(user_id, creator_id, score) VALUES(?,?,?)').run('one', serena.id, 30);
  f.sql.prepare("INSERT INTO posts(id, creator_id, caption, published_at, status) VALUES('post_iris', ?, 'ชุดงานเต้นรำคืนนี้เป็นไงบ้างคะ', ?, 'published')").run(iris.id, now - 1000);
  f.sql.prepare("INSERT INTO stories(id, creator_id, type, media_key, published_at, relationship_required, status) VALUES('story_cf', ?, 'unlockable', 'assets/cf.webp', ?, 0, 'published')").run(iris.id, now - 1000);

  await recordRippleWorldEvent(f.env, iris.id, {
    headline: '🦋 Ripple News: ไอริสเตรียมเซอร์ไพรส์',
    content: 'ไอริสกำลังซ้อมร่ายเวทมนตร์บทใหม่ตามคำแนะนำ',
    promptDirective: 'Iris surprise'
  }, now);

  const feedRes = await f.request('', { path: '/api/feed', action: '' });
  assert.equal(feedRes.status, 200);
  assert.ok(Array.isArray(feedRes.payload.worldEvents) && feedRes.payload.worldEvents.length >= 1);
  const irisPost = feedRes.payload.posts.find(p => p.id === 'post_iris');
  assert.ok(irisPost);
  assert.deepEqual(irisPost.comments, [], 'player comments remain separate from crossComments');
  assert.equal(irisPost.crossComments.length, 1);
  assert.equal(irisPost.crossComments[0].creatorId, serena.id);

  const commentRes = await f.request('', {
    path: '/api/posts/post_iris/comments',
    action: 'message',
    data: { requestId: 'req_cross_1', content: 'น่ารักมากครับ!' }
  });
  assert.equal(commentRes.status, 200);
  assert.ok(commentRes.payload.rivalReaction);
  assert.equal(commentRes.payload.rivalReaction.creatorId, serena.id);

  const storiesRes = await f.request('', { path: '/api/stories', action: '' });
  assert.equal(storiesRes.status, 200);
  const cfStory = storiesRes.payload.stories.find(s => s.id === 'story_cf');
  assert.equal(cfStory.isCloseFriend, true);

  const reactions = generateCrossCreatorFeedReactions({ post: { id: 'p1', creatorId: 'a', creatorName: 'A' }, rivalCreators: [{ id: 'b', name: 'B' }] });
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0].creatorId, 'b');
});
