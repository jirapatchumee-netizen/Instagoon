import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import worker from '../src/index.mjs';
import { fiveStarRate, poolFromDefinitions, rollOnce } from '../src/gacha.mjs';

const now = Date.now(), raw = 'c'.repeat(64);
const sid = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))), n => n.toString(16).padStart(2, '0')).join('');
const statement = (sql, query, args = []) => ({
  query, args,
  bind: (...next) => statement(sql, query, next),
  first: async () => sql.prepare(query).get(...args) ?? null,
  all: async () => ({ results: sql.prepare(query).all(...args) }),
  run: async () => ({ meta: { changes: sql.prepare(query).run(...args).changes } }),
});
const isRead = q => /^\s*(SELECT|WITH|PRAGMA|VALUES)\b/i.test(q);
const d1 = sql => ({
  prepare: q => statement(sql, q),
  async batch(list) {
    sql.exec('BEGIN');
    try {
      const out = [];
      for (const s of list) {
        out.push(isRead(s.query) ? { results: sql.prepare(s.query).all(...s.args) } : { meta: { changes: sql.prepare(s.query).run(...s.args).changes } });
      }
      sql.exec('COMMIT');
      return out;
    } catch (e) {
      sql.exec('ROLLBACK');
      throw e;
    }
  }
});

function dbOf() {
  const sql = new DatabaseSync(':memory:');
  const dir = new URL('../migrations/', import.meta.url);
  for (const f of readdirSync(dir).sort()) if (f.endsWith('.sql')) sql.exec(readFileSync(new URL(f, dir), 'utf8'));
  sql.prepare("INSERT INTO invites(email) VALUES('u@example.com')").run();
  sql.prepare('INSERT INTO users(id,email,google_id,age_verified_at,consent_version,created_at) VALUES(?,?,?,?,?,?)').run('u', 'u@example.com', 'g', now, 'v1', now);
  sql.prepare('INSERT INTO energy(user_id,free,purchased,diamonds) VALUES(?,30,0,20)').run('u');
  sql.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').run(sid, 'u', now + 100000);

  // Setup sample creator
  sql.prepare("INSERT INTO creators(id,name,bio,avatar_key) VALUES('yuki','Yuki Cosplay','Cosplayer','avatars/mira.webp')").run();
  const npcDef = {
    schemaVersion: '1.0',
    id: 'yuki',
    name: 'Yuki',
    handle: 'yuki.cosplay',
    tagline: 'Cosplay & Model',
    avatar: 'avatars/mira.webp',
    color: '#b18bf4',
    tags: ['cosplay'],
    age: '22',
    biography: 'Cosplayer',
    personality: 'Cute',
    world: 'Modern',
    occupation: 'Cosplayer',
    likes: 'Anime',
    dislikes: 'Spiders',
    goals: 'Be popular',
    immutableFacts: [],
    knowledgeBoundary: '',
    secrets: [],
    initialMemories: [],
    style: { language: 'ไทย', pronouns: 'เค้า / ตัวเอง', tone: 'น่ารัก', length: 'short', emoji: 'some', examples: '', fallback: 'ดีจ้า', levelStyles: ['1','2','3','4','5'] },
    relationship: { weights: { closeness: 40, trust: 40, romance: 20 }, thresholds: [0, 20, 40, 60, 80], romanceEnabled: true },
    rules: [],
    rewards: [
      {
        id: 'yuki-mission-1',
        name: 'เรื่องที่เป็นไปไม่ได้',
        asset: 'assets/yuki_mission_1.webp',
        caption: 'ภาพชุดพิเศษ',
        message: 'ปลดล็อกแล้วนะ',
        rarity: 'SSR',
        unlockType: 'mission',
        hint: 'ปรับความเข้าใจคืนดีกันไว้ใจกัน',
        energyFallback: 5,
        gachaWeight: 100,
        conditions: [
          { field: 'turns', value: 40, eventId: '' },
          { field: 'trust', value: 100, eventId: '' },
          { field: 'romance', value: 50, eventId: '' }
        ]
      },
      {
        id: 'yuki-gacha-ur',
        name: 'ชุดราตรีลับเฉพาะคืนนี้',
        asset: 'assets/yuki_gacha_ur.webp',
        caption: 'ชุดราตรีซีทรูพิเศษ',
        message: 'ชุดนี้เค้าใส่ให้ตัวเองดูคนเดียวนะ ✨',
        rarity: 'UR',
        unlockType: 'diamond_gacha',
        hint: 'ตู้สุ่มเพชรเท่านั้น',
        energyFallback: 8,
        gachaWeight: 50,
        conditions: []
      }
    ]
  };
  sql.prepare("INSERT INTO npc_definitions(creator_id,definition_json,updated_at) VALUES('yuki',?,?)").run(JSON.stringify(npcDef), now);
  sql.prepare("INSERT INTO relationships(user_id,creator_id,score,closeness,trust,romance) VALUES('u','yuki',10,15,20,5)").run();
  return sql;
}

const env = { PUBLIC_ORIGIN: 'https://frost.test' };
const headers = { cookie: `frost_session=${raw}`, origin: 'https://frost.test' };
const call = (sql, method, path, body = null) => worker.fetch(new Request('https://frost.test' + path, {
  method,
  headers: body ? { ...headers, 'content-type': 'application/json' } : headers,
  body: body ? JSON.stringify(body) : undefined
}), { DB: d1(sql), ...env }, { waitUntil: () => {} });

test('missions API: returns creator stats, mission progress bars, and gacha pool', async () => {
  const sql = dbOf();
  const res = await call(sql, 'GET', '/api/creators/yuki/missions');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.creator.name, 'Yuki Cosplay');
  assert.equal(data.stats.trust, 20);
  assert.equal(data.stats.romance, 5);
  assert.equal(data.missions.length, 1);
  assert.equal(data.missions[0].name, 'เรื่องที่เป็นไปไม่ได้');
  assert.equal(data.missions[0].rarity, 'SSR');
  assert.equal(data.missions[0].hint, 'ปรับความเข้าใจคืนดีกันไว้ใจกัน');
  assert.equal(data.gachaPool.length, 1);
  assert.equal(data.gachaPool[0].rarity, 'UR');
  assert.equal(data.diamonds, 20);
});

test('gacha API: refuses pull if diamonds < 10', async () => {
  const sql = dbOf();
  sql.prepare('UPDATE energy SET diamonds = 5 WHERE user_id = ?').run('u');
  const res = await call(sql, 'POST', '/api/creators/yuki/gacha/pull');
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'insufficient_diamonds');
  assert.equal(data.required, 10);
});

test('gacha API: pulls successfully, spends 10 diamonds and grants card or fallback energy', async () => {
  const sql = dbOf();
  const res = await call(sql, 'POST', '/api/creators/yuki/gacha/pull');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.ok);

  const energyRow = sql.prepare('SELECT diamonds, purchased FROM energy WHERE user_id = ?').get('u');
  assert.equal(energyRow.diamonds, 10); // Spent 10 from 20

  if (data.wonCard) {
    assert.equal(data.card.asset, 'assets/yuki_gacha_ur.webp');
    assert.equal(data.energyAwarded, 0);
    const unlock = sql.prepare('SELECT 1 FROM reward_unlocks WHERE user_id = ? AND reward_key = ?').get('u', 'assets/yuki_gacha_ur.webp');
    assert.ok(unlock);
  } else {
    // Fallback or duplicate energy awarded
    assert.ok(data.energyAwarded >= 5);
    assert.equal(energyRow.purchased, data.energyAwarded);
  }
});

test('gacha API: when pulling duplicate card, awards fallback energy instead of salt', async () => {
  const sql = dbOf();
  // Pre-unlock the UR card
  sql.prepare("INSERT INTO reward_unlocks(user_id,creator_id,reward_key,unlocked_at) VALUES('u','yuki','assets/yuki_gacha_ur.webp',?)").run(now);

  const res = await call(sql, 'POST', '/api/creators/yuki/gacha/pull');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.ok);
  assert.equal(data.wonCard, false); // Cannot win duplicate as new card
  assert.ok(data.energyAwarded >= 5, 'awards fallback energy to player');

  const energyRow = sql.prepare('SELECT diamonds, purchased FROM energy WHERE user_id = ?').get('u');
  assert.equal(energyRow.diamonds, 10);
  assert.equal(energyRow.purchased, data.energyAwarded);
});

test('collection API: returns player unlocked cards with creator details', async () => {
  const sql = dbOf();
  sql.prepare("INSERT INTO reward_unlocks(user_id,creator_id,reward_key,unlocked_at) VALUES('u','yuki','assets/yuki_mission_1.webp',?)").run(now);

  const res = await call(sql, 'GET', '/api/user/collection');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.cards.length, 1);
  assert.equal(data.cards[0].name, 'เรื่องที่เป็นไปไม่ได้');
  assert.equal(data.cards[0].rarity, 'SSR');
  assert.equal(data.cards[0].creatorName, 'Yuki Cosplay');
});

test('wish pity math: soft pity ramp, hard pity at 90, 4-star pity at 10, and 50/50 guarantee', () => {
  assert.equal(fiveStarRate(0), 0.006);
  assert.equal(fiveStarRate(72), 0.006);
  assert.ok(fiveStarRate(73) > 0.06);
  assert.equal(fiveStarRate(89), 1);

  const pool = [
    { creatorId: 'c1', creatorName: 'A', asset: 'assets/5_feat.webp', name: 'Featured 5', caption: '', rarity: 'UR', stars: 5, weight: 1, energyFallback: 8 },
    { creatorId: 'c2', creatorName: 'B', asset: 'assets/5_std.webp', name: 'Standard 5', caption: '', rarity: 'SSR', stars: 5, weight: 1, energyFallback: 8 },
    { creatorId: 'c1', creatorName: 'A', asset: 'assets/4.webp', name: 'Card 4', caption: '', rarity: 'SR', stars: 4, weight: 1, energyFallback: 5 },
    { creatorId: 'c1', creatorName: 'A', asset: 'assets/3.webp', name: 'Card 3', caption: '', rarity: 'R', stars: 3, weight: 1, energyFallback: 3 }
  ];
  const banner = { id: 'featured', featured: pool[0] };

  const fourPity = rollOnce({ pity5: 0, pity4: 9, guaranteed: false }, banner, pool, () => 0.99);
  assert.equal(fourPity.card.stars, 4);
  assert.equal(fourPity.state.pity4, 0);
  assert.equal(fourPity.state.pity5, 1);

  const lossSeq = [0.001, 0.99, 0.99];
  const lost5050 = rollOnce({ pity5: 89, pity4: 0, guaranteed: false }, banner, pool, () => lossSeq.shift() ?? 0);
  assert.equal(lost5050.card.asset, 'assets/5_std.webp');
  assert.equal(lost5050.pityAt, 90);
  assert.equal(lost5050.state.pity5, 0);
  assert.equal(lost5050.state.guaranteed, true);

  const guaranteedWin = rollOnce(lost5050.state, banner, pool, () => 0);
  assert.equal(guaranteedWin.card.asset, 'assets/5_feat.webp');
  assert.equal(guaranteedWin.state.guaranteed, false);
});

test('poolFromDefinitions: prefers explicit diamond_gacha rewards and falls back with level-inferred rarity', () => {
  const mixed = poolFromDefinitions([{
    creator_id: 'yuki',
    creator_name: 'Yuki',
    definition_json: JSON.stringify({
      rewards: [
        { asset: 'assets/m.webp', name: 'Mission', unlockType: 'mission', rarity: 'SSR' },
        { asset: 'assets/g.webp', name: 'Gacha', unlockType: 'diamond_gacha', rarity: 'UR' }
      ]
    })
  }]);
  assert.deepEqual(mixed.map(c => c.asset), ['assets/g.webp']);

  const fallback = poolFromDefinitions([{
    creator_id: 'milin',
    creator_name: 'Milin',
    definition_json: JSON.stringify({
      rewards: [
        { asset: 'assets/r.webp', name: 'Lv1', conditions: [{ field: 'level', value: 1 }] },
        { asset: 'assets/sr.webp', name: 'Lv3', conditions: [{ field: 'level', value: 3 }] },
        { asset: 'assets/ssr.webp', name: 'Lv4', conditions: [{ field: 'level', value: 4 }] },
        { asset: 'assets/ur.webp', name: 'Lv5', conditions: [{ field: 'level', value: 5 }] }
      ]
    })
  }]);
  assert.deepEqual(fallback.map(c => [c.rarity, c.stars]), [['R', 3], ['SR', 4], ['SSR', 5], ['UR', 5]]);
});

test('wish API: masks unowned assets, deducts diamonds, guarantees 4-star in 10-pull, tracks pity and history', async () => {
  const sql = dbOf();
  sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify({
    rewards: [
      { id: 'c3', name: 'Three', asset: 'assets/c3.webp', caption: '3*', unlockType: 'diamond_gacha', rarity: 'R', energyFallback: 3, gachaWeight: 100 },
      { id: 'c4', name: 'Four', asset: 'assets/c4.webp', caption: '4*', unlockType: 'diamond_gacha', rarity: 'SR', energyFallback: 5, gachaWeight: 100 },
      { id: 'c5', name: 'Five', asset: 'assets/c5.webp', caption: '5*', unlockType: 'diamond_gacha', rarity: 'UR', energyFallback: 10, gachaWeight: 100 }
    ]
  }), 'yuki');
  sql.prepare('UPDATE energy SET diamonds=120 WHERE user_id=?').run('u');

  const viewBefore = await (await call(sql, 'GET', '/api/wish')).json();
  assert.equal(viewBefore.diamonds, 120);
  assert.equal(viewBefore.collection.total, 3);
  assert.equal(viewBefore.collection.owned, 0);
  assert.equal(viewBefore.cards.every(c => !('asset' in c)), true, 'unowned cards hide asset keys');
  const featBanner = viewBefore.banners.find(b => b.id === 'featured');
  assert.ok(featBanner?.featured);
  assert.equal('asset' in featBanner.featured, false, 'unowned featured card hides asset key');

  const badPull = await call(sql, 'POST', '/api/wish/pull', { banner: 'featured', count: 5 });
  assert.equal(badPull.status, 400);

  const pull1 = await call(sql, 'POST', '/api/wish/pull', { banner: 'featured', count: 1 });
  assert.equal(pull1.status, 200);
  const d1 = await pull1.json();
  assert.equal(d1.results.length, 1);
  assert.equal(d1.energy.diamonds, 110);

  const pull10 = await call(sql, 'POST', '/api/wish/pull', { banner: 'featured', count: 10 });
  assert.equal(pull10.status, 200);
  const d10 = await pull10.json();
  assert.equal(d10.results.length, 10);
  assert.equal(d10.energy.diamonds, 10);
  assert.ok(d10.results.some(r => r.stars >= 4), '10-pull guarantees at least one 4-star or higher card');
  assert.ok(d10.results.some(r => r.isDuplicate && r.energyAwarded > 0), 'duplicate pulls award fallback energy');

  const noDiamonds = await call(sql, 'POST', '/api/wish/pull', { banner: 'featured', count: 10 });
  assert.equal(noDiamonds.status, 400);
  assert.equal((await noDiamonds.json()).error, 'insufficient_diamonds');

  const viewAfter = await (await call(sql, 'GET', '/api/wish')).json();
  assert.equal(viewAfter.history.length, 11);
  assert.ok(viewAfter.collection.owned >= 1);
  assert.ok(viewAfter.cards.some(c => c.owned && typeof c.asset === 'string'));
  const bannerState = sql.prepare('SELECT pity5, pity4 FROM gacha_banner_state WHERE user_id=? AND banner_id=?').get('u', 'featured');
  assert.ok(bannerState && bannerState.pity5 >= 0 && bannerState.pity4 >= 0);
});
