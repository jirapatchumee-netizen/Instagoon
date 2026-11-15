import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import worker from '../src/index.mjs';

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
