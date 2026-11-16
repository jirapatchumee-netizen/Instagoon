export const COST = { single: 10, ten: 100 };
export const RATES = { five: 0.006, four: 0.051, softPityStart: 74, softPityStep: 0.06, hardPity: 90, fourPity: 10, featuredChance: 0.5 };
const STARS = { R: 3, SR: 4, SSR: 5, UR: 5 };
const WEEK_MS = 7 * 86400000;
export const cardKey = card => `${card.creatorId}:${card.asset}`;

export function fiveStarRate(pity5) {
  const pull = pity5 + 1;
  if (pull >= RATES.hardPity) return 1;
  if (pull >= RATES.softPityStart) return Math.min(1, RATES.five + (pull - RATES.softPityStart + 1) * RATES.softPityStep);
  return RATES.five;
}

function inferRarity(r) {
  if (r.unlockType !== 'diamond_gacha') {
    const lv = (Array.isArray(r.conditions) ? r.conditions : []).find(c => c?.field === 'level')?.value ?? 0;
    if (lv >= 5) return 'UR';
    if (lv === 4) return 'SSR';
    if (lv >= 2) return 'SR';
    if (lv >= 1) return 'R';
  }
  return r.rarity in STARS ? r.rarity : 'R';
}

export function poolFromDefinitions(rows) {
  const gachaCards = [];
  const fallbackCards = [];
  for (const row of rows) {
    let def;
    try { def = JSON.parse(row.definition_json); } catch { continue; }
    for (const r of Array.isArray(def?.rewards) ? def.rewards : []) {
      if (!r?.asset || !r?.name) continue;
      const rarity = inferRarity(r);
      const card = {
        creatorId: row.creator_id, creatorName: row.creator_name || row.creator_id, creatorAvatar: row.creator_avatar || '',
        asset: r.asset, name: r.name, caption: r.caption || '', rarity, stars: STARS[rarity],
        weight: Number(r.gachaWeight) > 0 ? Number(r.gachaWeight) : 1,
        energyFallback: Number.isFinite(Number(r.energyFallback)) && Number(r.energyFallback) > 0 ? Math.round(Number(r.energyFallback)) : 5
      };
      if (r.unlockType === 'diamond_gacha') gachaCards.push(card);
      else fallbackCards.push(card);
    }
  }
  return gachaCards.length ? gachaCards : fallbackCards;
}

export function buildBanners(pool, now) {
  const fives = pool.filter(c => c.stars === 5).sort((a, b) => cardKey(a).localeCompare(cardKey(b)));
  const featured = fives.length ? fives[Math.floor(now / WEEK_MS) % fives.length] : null;
  return [{ id: 'standard', featured: null }, ...(featured ? [{ id: 'featured', featured }] : [])];
}

function weighted(cards, rng) {
  let roll = rng() * cards.reduce((sum, c) => sum + c.weight, 0);
  for (const c of cards) { roll -= c.weight; if (roll < 0) return c; }
  return cards[cards.length - 1];
}

function tierCards(pool, stars) {
  for (const s of [stars, ...[5, 4, 3].filter(x => x < stars), ...[3, 4, 5].filter(x => x > stars)]) {
    const cards = pool.filter(c => c.stars === s);
    if (cards.length) return cards;
  }
  return [];
}

export function rollOnce(state, banner, pool, rng) {
  const rolled = rng() < fiveStarRate(state.pity5) ? 5 : (state.pity4 + 1 >= RATES.fourPity || rng() < RATES.four ? 4 : 3);
  const cards = tierCards(pool, rolled);
  const pityAt = state.pity5 + 1;
  let guaranteed = state.guaranteed;
  let card;
  if (rolled === 5 && banner.featured && cards.some(c => cardKey(c) === cardKey(banner.featured))) {
    const others = cards.filter(c => cardKey(c) !== cardKey(banner.featured));
    if (state.guaranteed || !others.length || rng() < RATES.featuredChance) { card = banner.featured; guaranteed = false; }
    else { card = weighted(others, rng); guaranteed = true; }
  } else {
    card = weighted(cards, rng);
  }
  return {
    card, pityAt,
    state: { pity5: rolled === 5 ? 0 : state.pity5 + 1, pity4: rolled >= 4 ? 0 : state.pity4 + 1, guaranteed: rolled === 5 ? guaranteed : state.guaranteed }
  };
}

const db = env => env.DB;
const first = (env, sql, ...v) => db(env).prepare(sql).bind(...v).first();
const rows = async (env, sql, ...v) => (await db(env).prepare(sql).bind(...v).all()).results;

export async function loadPool(env) {
  return poolFromDefinitions(await rows(env, 'SELECT n.creator_id, n.definition_json, c.name creator_name, c.avatar_key creator_avatar FROM npc_definitions n JOIN creators c ON c.id=n.creator_id ORDER BY n.creator_id'));
}

async function loadState(env, userId, bannerId) {
  const r = await first(env, 'SELECT pity5,pity4,guaranteed FROM gacha_banner_state WHERE user_id=? AND banner_id=?', userId, bannerId);
  return { pity5: r?.pity5 || 0, pity4: r?.pity4 || 0, guaranteed: !!r?.guaranteed };
}

const cardView = c => c && { key: cardKey(c), creatorId: c.creatorId, creatorName: c.creatorName, creatorAvatar: c.creatorAvatar || '', asset: c.asset, name: c.name, caption: c.caption, rarity: c.rarity, stars: c.stars };

export async function wishView(env, userId, now) {
  const pool = await loadPool(env);
  const owned = new Set((await rows(env, 'SELECT creator_id, reward_key FROM reward_unlocks WHERE user_id=?', userId)).map(r => `${r.creator_id}:${r.reward_key}`));
  const banners = [];
  for (const b of buildBanners(pool, now)) {
    const s = await loadState(env, userId, b.id);
    const featured = b.featured ? {
      key: cardKey(b.featured), creatorId: b.featured.creatorId, creatorName: b.featured.creatorName,
      creatorAvatar: b.featured.creatorAvatar || '', name: b.featured.name, caption: b.featured.caption,
      rarity: b.featured.rarity, stars: b.featured.stars, owned: owned.has(cardKey(b.featured)),
      ...(owned.has(cardKey(b.featured)) ? { asset: b.featured.asset } : {})
    } : null;
    banners.push({ id: b.id, featured, pity5: s.pity5, pity4: s.pity4, guaranteed: s.guaranteed, nextFiveRate: fiveStarRate(s.pity5) });
  }
  const byKey = new Map(pool.map(c => [cardKey(c), c]));
  const history = (await rows(env, 'SELECT creator_id, reward_key, banner_id, rarity, pity_at, is_duplicate, created_at FROM gacha_pulls WHERE user_id=? AND banner_id IS NOT NULL ORDER BY created_at DESC, rowid DESC LIMIT 40', userId))
    .map(r => ({ bannerId: r.banner_id, rarity: r.rarity, stars: STARS[r.rarity] || 3, pityAt: r.pity_at, isDuplicate: !!r.is_duplicate, createdAt: r.created_at, card: cardView(byKey.get(`${r.creator_id}:${r.reward_key}`)) }));
  const energy = await first(env, 'SELECT free,purchased,COALESCE(diamonds,0) diamonds FROM energy WHERE user_id=?', userId);
  return {
    diamonds: energy?.diamonds || 0, cost: COST, rates: RATES, banners, history,
    collection: { owned: pool.filter(c => owned.has(cardKey(c))).length, total: pool.length },
    cards: pool.map(c => owned.has(cardKey(c)) ? { ...cardView(c), owned: true } : { key: cardKey(c), creatorName: c.creatorName, creatorAvatar: c.creatorAvatar || '', rarity: c.rarity, stars: c.stars, owned: false })
  };
}

export async function wishPull(env, userId, { bannerId, count }, now, rng = Math.random) {
  if (count !== 1 && count !== 10) return { status: 400, body: { error: 'invalid_count' } };
  const pool = await loadPool(env);
  if (!pool.length) return { status: 409, body: { error: 'empty_pool' } };
  const banner = buildBanners(pool, now).find(b => b.id === bannerId);
  if (!banner) return { status: 404, body: { error: 'banner_not_found' } };

  const cost = count === 10 ? COST.ten : COST.single;
  const owned = new Set((await rows(env, 'SELECT creator_id, reward_key FROM reward_unlocks WHERE user_id=?', userId)).map(r => `${r.creator_id}:${r.reward_key}`));
  let state = await loadState(env, userId, banner.id);
  const results = [];
  for (let i = 0; i < count; i++) {
    const step = rollOnce(state, banner, pool, rng);
    state = step.state;
    const key = cardKey(step.card);
    const isDuplicate = owned.has(key);
    owned.add(key);
    results.push({ ...cardView(step.card), isNew: !isDuplicate, isDuplicate, energyAwarded: isDuplicate ? step.card.energyFallback : 0, pityAt: step.card.stars === 5 ? step.pityAt : null });
  }

  const spent = await db(env).prepare('UPDATE energy SET diamonds=diamonds-? WHERE user_id=? AND COALESCE(diamonds,0)>=?').bind(cost, userId, cost).run();
  if (!spent.meta?.changes) {
    const row = await first(env, 'SELECT COALESCE(diamonds,0) diamonds FROM energy WHERE user_id=?', userId);
    return { status: 400, body: { error: 'insufficient_diamonds', required: cost, current: row?.diamonds || 0 } };
  }

  const energyTotal = results.reduce((sum, r) => sum + r.energyAwarded, 0);
  const statements = [
    db(env).prepare("INSERT INTO token_ledger(id,user_id,delta_free,delta_purchased,delta_diamonds,reason,created_at) VALUES(?,?,0,?,?,'wish_pull',?)").bind(crypto.randomUUID(), userId, energyTotal, -cost, now),
    db(env).prepare('INSERT INTO gacha_banner_state(user_id,banner_id,pity5,pity4,guaranteed,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,banner_id) DO UPDATE SET pity5=excluded.pity5,pity4=excluded.pity4,guaranteed=excluded.guaranteed,updated_at=excluded.updated_at').bind(userId, banner.id, state.pity5, state.pity4, state.guaranteed ? 1 : 0, now)
  ];
  if (energyTotal) statements.push(db(env).prepare('UPDATE energy SET purchased=purchased+? WHERE user_id=?').bind(energyTotal, userId));
  const perPull = Math.round(cost / count);
  results.forEach((r, i) => {
    if (r.isNew) statements.push(db(env).prepare('INSERT OR IGNORE INTO reward_unlocks(user_id,creator_id,reward_key,unlocked_at) VALUES(?,?,?,?)').bind(userId, r.creatorId, r.asset, now));
    statements.push(db(env).prepare('INSERT INTO gacha_pulls(id,user_id,creator_id,diamonds_spent,reward_key,energy_awarded,is_duplicate,created_at,banner_id,rarity,pity_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), userId, r.creatorId, perPull, r.asset, r.energyAwarded, r.isDuplicate ? 1 : 0, now + i, banner.id, r.rarity, r.pityAt));
  });
  try {
    await db(env).batch(statements);
  } catch (error) {
    await db(env).prepare('UPDATE energy SET diamonds=diamonds+? WHERE user_id=?').bind(cost, userId).run();
    throw error;
  }

  const energy = await first(env, 'SELECT free,purchased,COALESCE(diamonds,0) diamonds FROM energy WHERE user_id=?', userId);
  return { status: 200, body: { ok: true, bannerId: banner.id, results, pity: { pity5: state.pity5, pity4: state.pity4, guaranteed: state.guaranteed }, energy: { free: energy.free, purchased: energy.purchased, diamonds: energy.diamonds } } };
}
