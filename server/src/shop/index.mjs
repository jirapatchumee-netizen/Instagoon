// Energy top-up through the in-game shop chat. See docs/ENERGY_TOPUP.md.
//   1. The player picks a pack; the order gets a unique satang tail (29.00 -> 29.37). The chat
//      shows a payment card with that amount and the company bank account to transfer to,
//      payable for 30 minutes. One pack per Bangkok day.
//   2. After paying, the player sends the slip; the app reads the slip's mini QR and the Worker
//      credits at once if the transaction reference was never used before (optimistic).
//   3. Daily, an admin uploads the KBank statement CSV. Each deposit is matched to its order by
//      amount and time: matched orders are confirmed, paid-but-never-slipped orders are credited,
//      and slipped orders with no deposit are listed for revoking.
import { parseSlipQr } from './slipqr.mjs';
import { parseStatement, bangkokDayStart } from './statement.mjs';
import { buildDailyClose, dayKeyOf, dayStartOf, formatDailyClose, isDayKey } from './dailyclose.mjs';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const err = (error, status = 400, extra = {}) => json({ error, ...extra }, status);

const DAY_MS = 86400000;
const ORDER_TTL_MS = 30 * 60000;
// An amount stays reserved this long after its order expires, so a late transfer from a saved
// card can never be matched to the next player who drew the same tail.
const AMOUNT_COOLDOWN_MS = DAY_MS;
const MATCH_SKEW_MS = 10 * 60000;
const MAX_SLIP_ATTEMPTS = 5;
const MAX_STATEMENT_BYTES = 2 * 1024 * 1024;

// The account players transfer to, shown on the payment card. The shop stays closed until all
// three are set and the number is a 10-digit Thai bank account.
const payTo = env => {
  const accountNo = String(env.BANK_ACCOUNT_NO || '').replace(/[\s-]/g, '');
  const bank = String(env.BANK_NAME || '').trim(), accountName = String(env.BANK_ACCOUNT_NAME || '').trim();
  return /^\d{10}$/.test(accountNo) && bank && accountName ? { bank, accountNo, accountName } : null;
};

export const shopReady = env => !!payTo(env);

const orderShape = (o, env) => ({
  id: o.id, sku: o.sku, priceSatang: o.price_satang, amountSatang: o.amount_satang, energy: o.energy, diamonds: o.diamonds ?? o.energy, status: o.status,
  createdAt: o.created_at, expiresAt: o.expires_at, paidAt: o.paid_at, confirmed: !!o.reconciled_at,
  payTo: o.status === 'pending' ? payTo(env) : null,
});

async function energyOf(env, uid) {
  const row = await env.DB.prepare('SELECT free,purchased,COALESCE(diamonds,0) diamonds FROM energy WHERE user_id=?').bind(uid).first();
  return { free: row?.free ?? 0, purchased: row?.purchased ?? 0, diamonds: row?.diamonds ?? 0, nextRefillAt: null };
}

async function expireStale(env, uid, now) {
  await env.DB.prepare("UPDATE orders SET status='expired' WHERE user_id=? AND status='pending' AND expires_at<=?").bind(uid, now).run();
}

// Revoked and refunded purchases still count: the limit is on attempts to buy, not on outcomes.
async function dailyState(env, uid, now) {
  const start = bangkokDayStart(now);
  const { results } = await env.DB.prepare(
    "SELECT DISTINCT sku FROM orders WHERE user_id=? AND status IN ('paid','refunded','revoked') AND paid_at>=?"
  ).bind(uid, start).all();
  const purchasedSkusToday = (results || []).map(r => r.sku);
  return { purchasedSkusToday, nextAvailableAt: start + DAY_MS };
}

async function pickAmount(env, priceSatang, now) {
  const { results } = await env.DB.prepare(
    "SELECT amount_satang a FROM orders WHERE amount_satang BETWEEN ? AND ? AND (status='pending' OR (status='paid' AND reconciled_at IS NULL) OR (status='expired' AND expires_at>?))"
  ).bind(priceSatang + 1, priceSatang + 99, now - AMOUNT_COOLDOWN_MS).all();
  const used = new Set(results.map(r => r.a));
  const free = [];
  for (let tail = 1; tail <= 99; tail++) if (!used.has(priceSatang + tail)) free.push(priceSatang + tail);
  if (!free.length) return null;
  return free[crypto.getRandomValues(new Uint32Array(1))[0] % free.length];
}

async function createOrder(req, env, user, now) {
  let b;
  try { b = await req.json(); } catch { return err('invalid_json'); }
  const sku = typeof b?.sku === 'string' ? b.sku : '';
  const requestId = typeof b?.requestId === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(b.requestId) ? b.requestId : null;
  if (!requestId) return err('invalid_request_id');

  const previous = await env.DB.prepare('SELECT * FROM orders WHERE user_id=? AND request_id=?').bind(user.id, requestId).first();
  if (previous) return previous.sku === sku ? json({ order: orderShape(previous, env) }) : err('idempotency_conflict', 409);
  if (user.shop_blocked_at) return err('shop_blocked', 403);

  // Under 20 a purchase is voidable without guardian consent (Civil and Commercial Code s.19-21).
  if (!user.purchase_age_confirmed_at) {
    if (b.confirmAge20 !== true) return err('age_confirmation_required', 403);
    await env.DB.prepare('UPDATE users SET purchase_age_confirmed_at=? WHERE id=? AND purchase_age_confirmed_at IS NULL').bind(now, user.id).run();
  }

  const product = await env.DB.prepare('SELECT * FROM products WHERE sku=? AND active=1').bind(sku).first();
  if (!product) return err('unknown_product', 404);
  const daily = await dailyState(env, user.id, now);
  if (daily.purchasedSkusToday.includes(sku)) return err('daily_limit_reached', 429, { nextAvailableAt: daily.nextAvailableAt });

  await expireStale(env, user.id, now);
  // One open order per player. Picking the same pack again returns it; picking another replaces it.
  const open = await env.DB.prepare("SELECT * FROM orders WHERE user_id=? AND status='pending' ORDER BY created_at DESC LIMIT 1").bind(user.id).first();
  if (open?.sku === sku) return json({ order: orderShape(open, env) });
  if (open) await env.DB.prepare("UPDATE orders SET status='expired', note='replaced' WHERE id=? AND status='pending'").bind(open.id).run();

  for (let attempt = 0; attempt < 3; attempt++) {
    const amount = await pickAmount(env, product.price_satang, now);
    if (!amount) return err('shop_busy', 503);
    const id = crypto.randomUUID();
    try {
      await env.DB.prepare('INSERT INTO orders(id,user_id,request_id,sku,price_satang,amount_satang,energy,diamonds,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .bind(id, user.id, requestId, sku, product.price_satang, amount, product.energy, product.diamonds ?? 0, now, now + ORDER_TTL_MS).run();
    } catch (e) {
      if (/orders_pending_amount|amount_satang/.test(String(e?.message))) continue;
      throw e;
    }
    const order = await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
    return json({ order: orderShape(order, env) }, 201);
  }
  return err('shop_busy', 503);
}

// Order -> paid, ledger row, energy credit: one D1 batch, so either all three happen or none.
// The order_id unique index on token_ledger and the UNIQUE trans_ref on orders make a replayed or
// concurrent submission fail the whole batch instead of crediting twice.
// Member system gives diamonds equal to energy topped up (10 diamonds = 1 energy).
async function credit(env, order, transRef, bank, now) {
  const ledgerId = crypto.randomUUID();
  try {
    const [paid] = await env.DB.batch([
      env.DB.prepare("UPDATE orders SET status='paid', paid_at=?, trans_ref=?, slip_bank=? WHERE id=? AND status='pending'").bind(now, transRef, bank, order.id),
      env.DB.prepare("INSERT INTO token_ledger(id,user_id,delta_free,delta_purchased,delta_diamonds,reason,order_id,created_at) SELECT ?,user_id,0,energy,diamonds,'purchase',id,? FROM orders WHERE id=? AND status='paid' AND trans_ref=?").bind(ledgerId, now, order.id, transRef),
      env.DB.prepare('UPDATE energy SET purchased=purchased+?, diamonds=diamonds+? WHERE user_id=? AND EXISTS(SELECT 1 FROM token_ledger WHERE id=?)').bind(order.energy, order.diamonds ?? order.energy, order.user_id, ledgerId),
    ]);
    return paid.meta.changes ? 'credited' : 'not_pending';
  } catch (e) {
    const msg = String(e?.message || '');
    if (/trans_ref/.test(msg)) return 'slip_already_used';
    if (/token_ledger/.test(msg)) return 'not_pending';
    throw e;
  }
}

async function exchangeDiamonds(req, env, user, now) {
  if (user.shop_blocked_at) return err('shop_blocked', 403);
  let b = {};
  try { b = await req.json(); } catch { /* allow empty to exchange max */ }
  const cur = await energyOf(env, user.id);
  const maxExchangeable = Math.floor(cur.diamonds / 10) * 10;
  if (maxExchangeable < 10) return err('insufficient_diamonds', 400, { minRequired: 10, diamonds: cur.diamonds });

  let requested = b?.diamonds != null ? Number(b.diamonds) : maxExchangeable;
  if (!Number.isInteger(requested) || requested < 10 || requested % 10 !== 0) {
    return err('invalid_amount', 400);
  }
  if (requested > cur.diamonds) {
    return err('insufficient_diamonds', 400, { diamonds: cur.diamonds });
  }

  const energyGain = Math.floor(requested / 10);
  const ledgerId = crypto.randomUUID();
  const [ledger] = await env.DB.batch([
    env.DB.prepare("INSERT INTO token_ledger(id,user_id,delta_free,delta_purchased,delta_diamonds,reason,created_at) VALUES(?,?,?,?,?,'diamond_exchange',?)")
      .bind(ledgerId, user.id, 0, energyGain, -requested, now),
    env.DB.prepare('UPDATE energy SET purchased=purchased+?, diamonds=diamonds-? WHERE user_id=? AND diamonds>=? AND EXISTS(SELECT 1 FROM token_ledger WHERE id=?)')
      .bind(energyGain, requested, user.id, requested, ledgerId),
  ]);
  if (!ledger.meta.changes) return err('exchange_failed', 500);
  const updatedEnergy = await energyOf(env, user.id);
  return json({
    ok: true,
    exchangedDiamonds: requested,
    energyGained: energyGain,
    energy: updatedEnergy,
  });
}

async function submitSlip(req, env, user, orderId, now) {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').bind(orderId, user.id).first();
  if (!order) return err('not_found', 404);
  if (order.status === 'paid') return json({ order: orderShape(order, env), energy: await energyOf(env, user.id) });
  if (order.status !== 'pending' || order.expires_at <= now) {
    await expireStale(env, user.id, now);
    return err('order_expired', 409);
  }
  if (order.slip_attempts >= MAX_SLIP_ATTEMPTS) return err('too_many_slip_attempts', 429);
  let b;
  try { b = await req.json(); } catch { return err('invalid_json'); }
  await env.DB.prepare('UPDATE orders SET slip_attempts=slip_attempts+1 WHERE id=?').bind(order.id).run();
  const slip = parseSlipQr(b?.slipQr);
  if (!slip) return err('slip_unreadable', 422);

  const outcome = await credit(env, order, slip.transRef, slip.bank, now);
  if (outcome === 'slip_already_used') return err(outcome, 409);
  const after = await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(order.id).first();
  if (after.status !== 'paid') return err('order_expired', 409);
  return json({ order: orderShape(after, env), energy: await energyOf(env, user.id) });
}

export async function shopPlayer(req, env, user, path, now) {
  const method = req.method;
  if (path === '/api/shop' && method === 'GET') {
    const ready = shopReady(env);
    if (!ready) return json({ enabled: false, products: [] });
    await expireStale(env, user.id, now);
    const { results } = await env.DB.prepare('SELECT * FROM products WHERE active=1 AND is_offer=0 ORDER BY position').all();
    const open = await env.DB.prepare("SELECT * FROM orders WHERE user_id=? AND status='pending' ORDER BY created_at DESC LIMIT 1").bind(user.id).first();
    const daily = await dailyState(env, user.id, now);
    const allPurchased = results.length > 0 && results.every(p => daily.purchasedSkusToday.includes(p.sku));
    const userEnergy = await energyOf(env, user.id);
    return json({
      enabled: true,
      blocked: !!user.shop_blocked_at,
      ageConfirmed: !!user.purchase_age_confirmed_at,
      purchasedToday: allPurchased,
      purchasedSkusToday: daily.purchasedSkusToday,
      nextAvailableAt: daily.nextAvailableAt,
      diamonds: userEnergy.diamonds,
      products: results.map(p => ({
        sku: p.sku,
        name: p.name,
        priceSatang: p.price_satang,
        energy: p.energy,
        diamonds: p.diamonds ?? 0,
        purchasedToday: daily.purchasedSkusToday.includes(p.sku),
      })),
      openOrder: open ? orderShape(open, env) : null,
    });
  }
  if (!path.startsWith('/api/shop/')) return null;
  if (!shopReady(env)) return err('shop_unavailable', 503);
  if (path === '/api/shop/exchange' && method === 'POST') return exchangeDiamonds(req, env, user, now);
  if (path === '/api/shop/orders' && method === 'POST') return createOrder(req, env, user, now);
  if (path === '/api/shop/orders' && method === 'GET') {
    await expireStale(env, user.id, now);
    const { results } = await env.DB.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 20').bind(user.id).all();
    return json({ orders: results.map(o => orderShape(o, env)) });
  }
  let m = path.match(/^\/api\/shop\/orders\/([a-f0-9-]{36})$/);
  if (m && method === 'GET') {
    await expireStale(env, user.id, now);
    const order = await env.DB.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').bind(m[1], user.id).first();
    return order ? json({ order: orderShape(order, env) }) : err('not_found', 404);
  }
  m = path.match(/^\/api\/shop\/orders\/([a-f0-9-]{36})\/slip$/);
  if (m && method === 'POST') return submitSlip(req, env, user, m[1], now);
  return err('not_found', 404);
}

// --- Admin ----------------------------------------------------------------------------------

const adminOrder = o => ({ id: o.id, userId: o.user_id, email: o.email, sku: o.sku, amountSatang: o.amount_satang, energy: o.energy, status: o.status, createdAt: o.created_at, paidAt: o.paid_at, transRef: o.trans_ref, slipBank: o.slip_bank, confirmed: !!o.reconciled_at, note: o.note });

// Takes back only the purchased energy and diamonds, never relationship or content.
async function reverse(env, order, status, note, now) {
  const stmts = [
    env.DB.prepare("UPDATE orders SET status=?, note=? WHERE id=? AND status='paid'").bind(status, note, order.id),
    env.DB.prepare("INSERT INTO token_ledger(id,user_id,delta_free,delta_purchased,delta_diamonds,reason,order_id,created_at) SELECT ?,user_id,0,-energy,-diamonds,?,id,? FROM orders WHERE id=? AND status=?").bind(crypto.randomUUID(), status, now, order.id, status),
    env.DB.prepare('UPDATE energy SET purchased=purchased-?, diamonds=MAX(0, diamonds-?) WHERE user_id=? AND EXISTS(SELECT 1 FROM orders WHERE id=? AND status=?)').bind(order.energy, order.diamonds ?? order.energy, order.user_id, order.id, status),
  ];
  if (status === 'revoked') stmts.push(env.DB.prepare('UPDATE users SET shop_blocked_at=? WHERE id=? AND EXISTS(SELECT 1 FROM orders WHERE id=? AND status=?)').bind(now, order.user_id, order.id, status));
  const [changed] = await env.DB.batch(stmts);
  return changed.meta.changes > 0;
}

async function reconcile(req, env, now) {
  const text = await req.text();
  if (!text || text.length > MAX_STATEMENT_BYTES) return err('invalid_statement');
  const parsed = await parseStatement(text);
  if (!parsed.ok) return err(parsed.error, 422);
  if (!parsed.deposits.length) return err('statement_has_no_deposits', 422);

  let imported = 0;
  for (const d of parsed.deposits) {
    const r = await env.DB.prepare('INSERT OR IGNORE INTO bank_deposits(id,amount_satang,deposited_at,imported_at) VALUES(?,?,?,?)').bind(d.id, d.amountSatang, d.depositedAt, now).run();
    imported += r.meta.changes;
  }

  const confirmed = [], credited = [], unmatched = [];
  for (const d of parsed.deposits) {
    const row = await env.DB.prepare('SELECT * FROM bank_deposits WHERE id=?').bind(d.id).first();
    if (row.order_id) continue;
    const order = await env.DB.prepare(
      `SELECT * FROM orders WHERE amount_satang=? AND reconciled_at IS NULL AND status IN ('paid','pending','expired')
         AND created_at-?<=? AND ?<=COALESCE(paid_at, expires_at+?)+? ORDER BY ABS(created_at-?) LIMIT 1`
    ).bind(d.amountSatang, MATCH_SKEW_MS, d.depositedAt, d.depositedAt, AMOUNT_COOLDOWN_MS, MATCH_SKEW_MS, d.depositedAt).first();
    if (!order) { unmatched.push({ amountSatang: d.amountSatang, depositedAt: d.depositedAt }); continue; }
    if (order.status !== 'paid') {
      // Paid at the bank but the slip never reached us: the statement is proof enough to credit.
      if (order.status === 'expired') {
        try { await env.DB.prepare("UPDATE orders SET status='pending' WHERE id=? AND status='expired'").bind(order.id).run(); }
        catch { unmatched.push({ amountSatang: d.amountSatang, depositedAt: d.depositedAt }); continue; }
      }
      const outcome = await credit(env, order, `BANK-${d.id.slice(0, 24)}`, null, now);
      if (outcome !== 'credited') { unmatched.push({ amountSatang: d.amountSatang, depositedAt: d.depositedAt }); continue; }
      credited.push(order.id);
    } else confirmed.push(order.id);
    await env.DB.batch([
      env.DB.prepare('UPDATE bank_deposits SET order_id=? WHERE id=? AND order_id IS NULL').bind(order.id, d.id),
      env.DB.prepare('UPDATE orders SET reconciled_at=? WHERE id=?').bind(now, order.id),
    ]);
  }

  // Slipped orders inside the statement's span with no deposit. Not revoked automatically: the
  // admin checks the list first (a transfer can land minutes after the export).
  const from = bangkokDayStart(Math.min(...parsed.deposits.map(d => d.depositedAt)));
  const to = Math.max(...parsed.deposits.map(d => d.depositedAt)) - MATCH_SKEW_MS;
  const { results: suspects } = await env.DB.prepare(
    "SELECT o.*, u.email FROM orders o LEFT JOIN users u ON u.id=o.user_id WHERE o.status='paid' AND o.reconciled_at IS NULL AND o.paid_at BETWEEN ? AND ? ORDER BY o.paid_at"
  ).bind(from, to).all();
  return json({ imported, alreadyImported: parsed.deposits.length - imported, confirmed, credited, unmatchedDeposits: unmatched, suspects: suspects.map(adminOrder), coverage: { from, to } });
}

// --- Daily summary for accounting (docs/ACCOUNTING_DAILY_CLOSE.md) --------------------------
// Read straight from the order records whenever asked: no snapshot, no closing step. A payment is
// an order whose slip was accepted; it lands on the Bangkok day of paid_at.

async function paymentsOf(env, from, to) {
  const { results } = await env.DB.prepare(
    "SELECT id, sku, price_satang, amount_satang, paid_at FROM orders WHERE status='paid' AND paid_at>=? AND paid_at<? ORDER BY paid_at, id"
  ).bind(from, to).all();
  return results;
}

async function dailySummary(env, day) {
  const from = dayStartOf(day);
  const payments = await paymentsOf(env, from, from + DAY_MS);
  const { results: products } = await env.DB.prepare('SELECT sku,price_satang,active,COALESCE(is_offer,0) is_offer FROM products ORDER BY position, sku').all();
  const summary = buildDailyClose(day, products.map(p => ({ sku: p.sku, price_satang: p.price_satang, active: p.active && !p.is_offer })), payments.map(p => ({ sku: p.sku, price_satang: p.price_satang, deposit_satang: p.amount_satang })));
  return { summary, text: formatDailyClose(summary), payments };
}

const reportFile = (day, text) => new Response(text + '\n', { headers: {
  'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store',
  'content-disposition': `attachment; filename="daily_${day.replaceAll('-', '')}.txt"`,
} });

// Cron, after midnight Bangkok: writes the file for every finished day since the first payment
// that has none yet, at most a week back, so a missed run catches up on the next one.
export async function writeDailyReports(env, now) {
  const first = (await env.DB.prepare("SELECT MIN(paid_at) m FROM orders WHERE status='paid'").first())?.m;
  if (first == null) return { written: [] };
  const yesterday = bangkokDayStart(now) - DAY_MS, written = [];
  for (let at = Math.max(bangkokDayStart(first), yesterday - 6 * DAY_MS); at <= yesterday; at += DAY_MS) {
    const day = dayKeyOf(at), { summary, text } = await dailySummary(env, day);
    const r = await env.DB.prepare('INSERT OR IGNORE INTO shop_daily_reports(day,text,total_satang,created_at) VALUES(?,?,?,?)').bind(day, text, summary.totalSatang, now).run();
    if (r.meta.changes) written.push(day);
  }
  return { written };
}

// sub is the path after the prefix: shared by /api/admin/shop/ (admin session) and /api/reports/
// (read-only API key for the owner's agent).
async function shopSummary(req, env, sub) {
  if (req.method !== 'GET') return err('not_found', 404);
  const url = new URL(req.url);
  if (sub === 'daily') {
    const day = url.searchParams.get('day');
    if (!isDayKey(day)) return err('invalid_day');
    const { summary, text, payments } = await dailySummary(env, day);
    return json({ day, text, summary, payments: payments.map(p => ({ orderId: p.id, sku: p.sku, amountSatang: p.amount_satang, paidAt: p.paid_at })) });
  }
  if (sub === 'reports') {
    const { results } = await env.DB.prepare('SELECT day, total_satang totalSatang, created_at createdAt FROM shop_daily_reports ORDER BY day DESC LIMIT 400').all();
    return json({ reports: results });
  }
  const file = sub.match(/^reports\/(\d{4}-\d{2}-\d{2})\.txt$/);
  if (file) {
    const r = await env.DB.prepare('SELECT text FROM shop_daily_reports WHERE day=?').bind(file[1]).first();
    return r ? reportFile(file[1], r.text) : err('not_found', 404);
  }
  if (sub === 'daily.txt') {
    const month = url.searchParams.get('month');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) return err('invalid_month');
    const texts = [];
    for (let at = dayStartOf(`${month}-01`); dayKeyOf(at).startsWith(month); at += DAY_MS) texts.push((await dailySummary(env, dayKeyOf(at))).text);
    return new Response(texts.join('\n\n') + '\n', { headers: {
      'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store',
      'content-disposition': `attachment; filename="daily_${month.replace('-', '')}.txt"`,
    } });
  }
  return err('not_found', 404);
}

export async function shopAdmin(req, env, path, now) {
  const method = req.method;
  if (path.startsWith('/api/admin/shop/')) return shopSummary(req, env, path.slice('/api/admin/shop/'.length));
  if (path === '/api/admin/orders' && method === 'GET') {
    const status = new URL(req.url).searchParams.get('status');
    const stmt = status
      ? env.DB.prepare('SELECT o.*, u.email FROM orders o LEFT JOIN users u ON u.id=o.user_id WHERE o.status=? ORDER BY o.created_at DESC LIMIT 200').bind(status)
      : env.DB.prepare('SELECT o.*, u.email FROM orders o LEFT JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 200');
    const { results } = await stmt.all();
    return json({ orders: results.map(adminOrder) });
  }
  if (path === '/api/admin/orders/reconcile' && method === 'POST') return reconcile(req, env, now);
  const m = path.match(/^\/api\/admin\/orders\/([a-f0-9-]{36})\/(credit|refund|revoke)$/);
  if (!m || method !== 'POST') return null;
  let b;
  try { b = await req.json(); } catch { return err('invalid_json'); }
  const reason = typeof b?.reason === 'string' && b.reason.trim() && b.reason.length <= 500 ? b.reason.trim() : null;
  if (!reason) return err('reason_required');
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(m[1]).first();
  if (!order || !order.user_id) return err('not_found', 404);

  if (m[2] === 'credit') {
    const transRef = typeof b.transRef === 'string' && /^[A-Za-z0-9-]{6,64}$/.test(b.transRef) ? b.transRef : null;
    if (!transRef) return err('trans_ref_required');
    if (order.status === 'expired') await env.DB.prepare("UPDATE orders SET status='pending' WHERE id=? AND status='expired'").bind(order.id).run();
    else if (order.status !== 'pending') return err('not_pending', 409);
    const outcome = await credit(env, order, transRef, null, now);
    if (outcome !== 'credited') return err(outcome, 409);
    await env.DB.prepare('UPDATE orders SET note=?, reconciled_at=? WHERE id=?').bind(`manual credit: ${reason}`, now, order.id).run();
    return json({ ok: true });
  }
  if (order.status !== 'paid') return err('not_paid', 409);
  if (m[2] === 'revoke' && order.reconciled_at) return err('already_confirmed', 409);
  const ok = await reverse(env, order, m[2] === 'refund' ? 'refunded' : 'revoked', `${m[2]}: ${reason}`, now);
  return ok ? json({ ok: true }) : err('not_paid', 409);
}

// Read-only access for the owner's AI agent: `Authorization: Bearer <REPORTS_API_TOKEN>`. It can
// only read the summaries and payment records, never change an order. Off until the secret is set.
const sha256 = async text => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

export async function shopReportsApi(req, env, path) {
  const secret = String(env.REPORTS_API_TOKEN || '');
  if (secret.length < 32) return err('not_found', 404);
  const given = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1] || '';
  // Compare digests so the check takes the same time whatever the guess.
  const [a, b] = await Promise.all([sha256(given), sha256(secret)]);
  if (!a.every((x, i) => x === b[i])) return err('unauthorized', 401);
  return shopSummary(req, env, path.slice('/api/reports/'.length));
}
