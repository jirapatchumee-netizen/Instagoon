// Energy top-up: PromptPay payload, slip QR, statement parsing, unique amounts, the daily limit,
// the one-credit-per-payment guarantee and statement reconciliation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { crc16, promptpayPayload, promptpayTarget } from '../src/shop/promptpay.mjs';
import { buildSlipQr, parseSlipQr } from '../src/shop/slipqr.mjs';
import { bangkokDayStart, bangkokTime, parseStatement, satangOf } from '../src/shop/statement.mjs';
import { buildDailyClose, dayKeyOf, formatDailyClose, isDayKey, vatBaseOf } from '../src/shop/dailyclose.mjs';
import { writeDailyReports } from '../src/shop/index.mjs';
import worker from '../src/index.mjs';

// --- PromptPay payload -------------------------------------------------------------

test('promptpay: CRC-16/CCITT-FALSE check value and payload structure', () => {
  assert.equal(crc16('123456789'), '29B1');
  assert.deepEqual(promptpayTarget('081-234-5678'), { tag: '01', value: '0066812345678' });
  assert.deepEqual(promptpayTarget('0105561234567'), { tag: '02', value: '0105561234567' });
  assert.equal(promptpayTarget('12345'), null);
  const p = promptpayPayload('0105561234567', 2900);
  assert.ok(p.startsWith('000201010212'), 'dynamic QR (amount locked)');
  assert.ok(p.includes('29370016A00000067701011102130105561234567'), 'PromptPay AID + tax ID');
  assert.ok(p.includes('5303764') && p.includes('540529.00') && p.includes('5802TH'));
  assert.equal(p.slice(-4), crc16(p.slice(0, -4)), 'trailing CRC covers everything before it');
  assert.throws(() => promptpayPayload('0105561234567', 0), /invalid_amount/);
  assert.throws(() => promptpayPayload('nope', 100), /invalid_promptpay_id/);
});

// --- Worker ------------------------------------------------------------------------

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
const d1 = sql => ({ prepare: q => statement(sql, q), async batch(list) { sql.exec('BEGIN'); try { const out = []; for (const s of list) out.push(isRead(s.query) ? { results: sql.prepare(s.query).all(...s.args) } : { meta: { changes: sql.prepare(s.query).run(...s.args).changes } }); sql.exec('COMMIT'); return out; } catch (e) { sql.exec('ROLLBACK'); throw e; } } });
function dbOf() {
  const sql = new DatabaseSync(':memory:');
  const dir = new URL('../migrations/', import.meta.url);
  for (const f of readdirSync(dir).sort()) if (f.endsWith('.sql')) sql.exec(readFileSync(new URL(f, dir), 'utf8'));
  sql.prepare("INSERT INTO invites(email) VALUES('u@example.com')").run();
  sql.prepare('INSERT INTO users(id,email,google_id,age_verified_at,consent_version,created_at) VALUES(?,?,?,?,?,?)').run('u', 'u@example.com', 'g', now, 'v1', now);
  sql.prepare('INSERT INTO energy(user_id,free) VALUES(?,30)').run('u');
  sql.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').run(sid, 'u', now + 100000);
  return sql;
}
const shopEnv = { PUBLIC_ORIGIN: 'https://frost.test', ADMIN_EMAIL: 'u@example.com', BANK_NAME: 'ธนาคารกสิกรไทย', BANK_ACCOUNT_NO: '177-1-50013-3', BANK_ACCOUNT_NAME: 'บจก. แมช มูฟ อัลฟ่า' };
const headers = { cookie: `frost_session=${raw}`, origin: 'https://frost.test' };
const call = (sql, method, path, body, env = shopEnv) => worker.fetch(new Request(`https://frost.test${path}`, {
  method,
  headers: body && !(body instanceof FormData) ? { ...headers, 'content-type': 'application/json' } : headers,
  body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
}), { DB: d1(sql), ...env }, {});
const energyOf = sql => ({ ...sql.prepare('SELECT free,purchased,COALESCE(diamonds,0) diamonds FROM energy WHERE user_id=?').get('u') });
let n = 0;
const rid = () => `req-${++n}-${'x'.repeat(8)}`;
async function order(sql, sku = 'energy_59', extra = { confirmAge20: true }) {
  const res = await call(sql, 'POST', '/api/shop/orders', { sku, requestId: rid(), ...extra });
  return { res, body: await res.json() };
}

test('slip QR: round-trips, and a mistyped, foreign or truncated code is refused', () => {
  const qr = buildSlipQr('004', '015311123456ABC0012');
  assert.deepEqual(parseSlipQr(qr), { bankCode: '004', bank: 'KBANK', transRef: '015311123456ABC0012' });
  assert.deepEqual(parseSlipQr(` ${qr}\n`), parseSlipQr(qr), 'surrounding whitespace is ignored');
  const flipped = qr.slice(0, 20) + (qr[20] === '1' ? '2' : '1') + qr.slice(21);
  assert.equal(parseSlipQr(flipped), null, 'CRC catches a changed character');
  assert.equal(parseSlipQr(qr.slice(0, -1)), null);
  assert.equal(parseSlipQr(promptpayPayload('0105561234567', 2900)), null, 'a payment QR is not a slip');
  assert.equal(parseSlipQr(buildSlipQr('004', 'short')), null);
  assert.equal(parseSlipQr(''), null);
});

test('statement: Thai and English KBank-style headers, Buddhist-era dates, deposits only', async () => {
  assert.equal(satangOf('1,234.5'), 123450);
  assert.equal(satangOf('29.07'), 2907);
  assert.equal(satangOf('abc'), null);
  assert.equal(bangkokTime('07/11/69', '14:35'), Date.parse('2026-11-07T14:35:00+07:00'));
  assert.equal(bangkokTime('07/11/2569 14:35:09'), Date.parse('2026-11-07T14:35:09+07:00'));
  assert.equal(bangkokTime('2026-11-07', '08:00'), Date.parse('2026-11-07T08:00:00+07:00'));
  assert.equal(bangkokDayStart(Date.parse('2026-11-07T00:30:00+07:00')), Date.parse('2026-11-07T00:00:00+07:00'));
  const th = await parseStatement('﻿บัญชี,xxx-x-x4567-x\n\nวันที่,เวลา,รายการ,ถอนเงิน,ฝากเงิน,ยอดคงเหลือ\n07/11/69,14:35,รับโอนเงิน,,29.37,"1,029.37"\n07/11/69,15:00,โอนเงิน,100.00,,929.37\n07/11/69,16:10,รับโอนเงิน,,"59.02","988.39"\n');
  assert.ok(th.ok);
  assert.deepEqual(th.deposits.map(d => [d.amountSatang, d.depositedAt]), [[2937, Date.parse('2026-11-07T14:35:00+07:00')], [5902, Date.parse('2026-11-07T16:10:00+07:00')]]);
  const en = await parseStatement('Date,Time,Description,Withdrawal,Deposit,Balance\n2026-11-07,09:00,Transfer,,99.50,1000\n');
  assert.deepEqual(en.deposits.map(d => d.amountSatang), [9950]);
  assert.deepEqual(await parseStatement('a,b\n1,2\n'), { ok: false, error: 'statement_unrecognized' });
});

test('shop: closed until the bank account is configured; catalog is 29/59/99 at energy = price x 2', async () => {
  const sql = dbOf();
  for (const env of [{ ...shopEnv, BANK_ACCOUNT_NO: undefined }, { ...shopEnv, BANK_ACCOUNT_NO: '12345' }, { ...shopEnv, BANK_ACCOUNT_NAME: ' ' }]) {
    assert.equal((await (await call(sql, 'GET', '/api/shop', null, env)).json()).enabled, false);
    assert.equal((await call(sql, 'POST', '/api/shop/orders', { sku: 'energy_29', requestId: rid(), confirmAge20: true }, env)).status, 503);
  }
  const info = await (await call(sql, 'GET', '/api/shop')).json();
  assert.equal(info.enabled, true);
  assert.equal(info.purchasedToday, false);
  assert.deepEqual(info.products.map(p => [p.sku, p.priceSatang, p.energy]), [['energy_29', 2900, 58], ['energy_59', 5900, 118], ['energy_99', 9900, 198]]);
});

test('order: 20+ confirmation once, amount = price + a 1..99 satang tail, 30-minute payment card, idempotent', async () => {
  const sql = dbOf();
  assert.equal((await order(sql, 'energy_29', {})).res.status, 403);
  const { res, body } = await order(sql, 'energy_29');
  assert.equal(res.status, 201);
  const o = body.order;
  assert.ok(o.amountSatang > 2900 && o.amountSatang < 3000, `tail added: ${o.amountSatang}`);
  assert.equal(o.priceSatang, 2900);
  assert.equal(o.energy, 58);
  assert.ok(Math.abs(o.expiresAt - o.createdAt - 30 * 60000) < 5);
  assert.deepEqual(o.payTo, { bank: 'ธนาคารกสิกรไทย', accountNo: '1771500133', accountName: 'บจก. แมช มูฟ อัลฟ่า' }, 'card carries the account, digits only');
  assert.equal((await (await call(sql, 'GET', '/api/shop')).json()).openOrder.id, o.id, 'reopening the chat shows the same card');
  assert.equal((await order(sql, 'energy_29', {})).body.order.id, o.id, 'same pack returns the open order; age asked only once');
  const other = (await order(sql, 'energy_99', {})).body.order;
  assert.notEqual(other.id, o.id);
  assert.equal(sql.prepare('SELECT status FROM orders WHERE id=?').get(o.id).status, 'expired', 'picking another pack replaces the open order');
  const first = await call(sql, 'POST', '/api/shop/orders', { sku: 'energy_29', requestId: 'fixed-request-1' });
  const retry = await call(sql, 'POST', '/api/shop/orders', { sku: 'energy_29', requestId: 'fixed-request-1' });
  assert.equal(first.status, 201);
  assert.equal((await first.json()).order.id, (await retry.json()).order.id, 'a retried request returns the same order');
  assert.equal((await call(sql, 'POST', '/api/shop/orders', { sku: 'energy_99', requestId: 'fixed-request-1' })).status, 409);
});

test('amounts: never shared with a live order or one expired within 24 h; busy when all 99 are taken', async () => {
  const sql = dbOf();
  sql.prepare('INSERT INTO users(id,email,google_id,age_verified_at,consent_version,created_at) VALUES(?,?,?,?,?,?)').run('o', 'o@example.com', 'g2', now, 'v1', now);
  const put = sql.prepare("INSERT INTO orders(id,user_id,request_id,sku,price_satang,amount_satang,energy,status,created_at,expires_at,paid_at,reconciled_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)");
  for (let tail = 1; tail <= 98; tail++) {
    const status = ['pending', 'paid', 'expired'][tail % 3];
    put.run(`seed-${tail}`, 'o', `seed-${tail}-xxxxxxxx`, 'energy_29', 2900, 2900 + tail, 58, status, now - 60000, status === 'expired' ? now - 3600000 : now + 60000, status === 'paid' ? now : null, null);
  }
  const { body } = await order(sql, 'energy_29');
  assert.equal(body.order.amountSatang, 2999, 'only the one free tail is handed out');
  // The player lets it lapse: 29.99 stays reserved for 24 h, so nothing is left.
  sql.prepare("UPDATE orders SET status='expired', expires_at=? WHERE id=?").run(now - 1000, body.order.id);
  const busy = await order(sql, 'energy_29');
  assert.equal(busy.res.status, 503);
  assert.equal(busy.body.error, 'shop_busy');
  // seed-2 expired over 24 h ago: its amount is free again.
  sql.prepare("UPDATE orders SET expires_at=? WHERE id='seed-2'").run(now - 25 * 3600000);
  assert.equal((await order(sql, 'energy_29')).body.order.amountSatang, 2902);
});

test('slip: a valid slip QR credits once; reused, unreadable or late slips are refused', async () => {
  const sql = dbOf();
  const o = (await order(sql)).body.order;
  const bad = await call(sql, 'POST', `/api/shop/orders/${o.id}/slip`, { slipQr: 'not a slip' });
  assert.equal(bad.status, 422);
  assert.equal((await bad.json()).error, 'slip_unreadable');
  const qr = buildSlipQr('004', '015311000000ABC0001');
  const ok = await call(sql, 'POST', `/api/shop/orders/${o.id}/slip`, { slipQr: qr });
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.order.status, 'paid');
  assert.equal(body.order.confirmed, false, 'not confirmed until the statement shows the deposit');
  assert.deepEqual(body.energy, { free: 30, purchased: 118, diamonds: 118, nextRefillAt: null });
  assert.equal(sql.prepare('SELECT slip_bank b FROM orders WHERE id=?').get(o.id).b, 'KBANK');
  assert.equal((await call(sql, 'POST', `/api/shop/orders/${o.id}/slip`, { slipQr: qr })).status, 200, 'resubmitting a paid order is a no-op');
  assert.equal(energyOf(sql).purchased, 118);
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM token_ledger WHERE order_id=? AND reason='purchase'").get(o.id).n, 1);

  // Same slip on a new order (next day): refused.
  sql.prepare('UPDATE orders SET paid_at=? WHERE id=?').run(bangkokDayStart(now) - 1000, o.id);
  const o2 = (await order(sql, 'energy_29')).body.order;
  const reused = await call(sql, 'POST', `/api/shop/orders/${o2.id}/slip`, { slipQr: qr });
  assert.equal(reused.status, 409);
  assert.equal((await reused.json()).error, 'slip_already_used');
  sql.prepare('UPDATE orders SET expires_at=? WHERE id=?').run(now - 1, o2.id);
  assert.equal((await call(sql, 'POST', `/api/shop/orders/${o2.id}/slip`, { slipQr: buildSlipQr('014', '2026110700000SCB01') })).status, 409, 'expired order');
});

test('slip: concurrent submissions of the same slip credit exactly once', async () => {
  const sql = dbOf();
  const o = (await order(sql)).body.order;
  const qr = buildSlipQr('004', '015311000000ABC0002');
  const results = await Promise.all([1, 2, 3].map(() => call(sql, 'POST', `/api/shop/orders/${o.id}/slip`, { slipQr: qr })));
  assert.ok(results.every(r => r.status === 200));
  assert.equal(energyOf(sql).purchased, 118);
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM token_ledger WHERE order_id=?").get(o.id).n, 1);
});

test('daily limit: one pack per tier per Bangkok calendar day, then open again after midnight', async () => {
  const sql = dbOf();
  const o29 = (await order(sql, 'energy_29')).body.order;
  await call(sql, 'POST', `/api/shop/orders/${o29.id}/slip`, { slipQr: buildSlipQr('004', '015311000000ABC0003') });
  const info = await (await call(sql, 'GET', '/api/shop')).json();
  assert.equal(info.purchasedToday, false, 'not all packs purchased yet');
  assert.equal(info.products.find(p => p.sku === 'energy_29').purchasedToday, true);
  assert.equal(info.products.find(p => p.sku === 'energy_59').purchasedToday, false);
  assert.equal(info.nextAvailableAt, bangkokDayStart(now) + 86400000);

  // energy_29 again today: refused
  const blocked29 = await order(sql, 'energy_29');
  assert.equal(blocked29.res.status, 429);
  assert.equal(blocked29.body.error, 'daily_limit_reached');

  // energy_59 and energy_99 can still be bought today
  const o59 = (await order(sql, 'energy_59')).body.order;
  await call(sql, 'POST', `/api/shop/orders/${o59.id}/slip`, { slipQr: buildSlipQr('004', '015311000000ABC0004') });
  const o99 = (await order(sql, 'energy_99')).body.order;
  await call(sql, 'POST', `/api/shop/orders/${o99.id}/slip`, { slipQr: buildSlipQr('004', '015311000000ABC0005') });

  // Now all 3 packs have been bought today
  const infoAll = await (await call(sql, 'GET', '/api/shop')).json();
  assert.equal(infoAll.purchasedToday, true, 'all packs purchased today');

  // Next calendar day: open again
  sql.prepare("UPDATE orders SET paid_at=? WHERE sku='energy_29'").run(bangkokDayStart(now) - 1);
  assert.equal((await order(sql, 'energy_29')).res.status, 201);
});

test('member diamonds: earn 1:1 on topup and exchange 10 diamonds for 1 energy', async () => {
  const sql = dbOf();
  const o = (await order(sql, 'energy_29')).body.order;
  await call(sql, 'POST', `/api/shop/orders/${o.id}/slip`, { slipQr: buildSlipQr('004', '015311000000ABC0010') });
  let e = energyOf(sql);
  assert.equal(e.purchased, 58);
  assert.equal(e.diamonds, 58);

  // Exchange 50 diamonds -> 5 energy
  const ex = await call(sql, 'POST', '/api/shop/exchange', { diamonds: 50 });
  assert.equal(ex.status, 200);
  const exBody = await ex.json();
  assert.equal(exBody.ok, true);
  assert.equal(exBody.exchangedDiamonds, 50);
  assert.equal(exBody.energyGained, 5);
  assert.equal(exBody.energy.diamonds, 8);
  assert.equal(exBody.energy.purchased, 63);

  // Trying to exchange remaining 8 diamonds fails (min 10)
  const fail1 = await call(sql, 'POST', '/api/shop/exchange', { diamonds: 8 });
  assert.equal(fail1.status, 400);

  // Non-multiple of 10 fails
  const fail2 = await call(sql, 'POST', '/api/shop/exchange', { diamonds: 15 });
  assert.equal(fail2.status, 400);
});

async function callText(sql, path, text) {
  return worker.fetch(new Request(`https://frost.test${path}`, { method: 'POST', headers: { ...headers, 'content-type': 'text/csv' }, body: text }), { DB: d1(sql), ...shopEnv }, {});
}
const bkk = ms => { const d = new Date(ms + 7 * 3600000); const p = n => String(n).padStart(2, '0'); return [`${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear() + 543}`, `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`]; };
const csv = deposits => 'วันที่,เวลา,รายการ,ถอนเงิน,ฝากเงิน,ยอดคงเหลือ\n' + deposits.map(([at, satang], i) => `${bkk(at).join(',')},รับโอนเงิน,,${(satang / 100).toFixed(2)},${1000 + i}`).join('\n') + '\n';

test('reconcile: confirms slipped orders, credits paid-but-unslipped ones, lists suspects; idempotent', async () => {
  const sql = dbOf();
  sql.prepare('INSERT INTO users(id,email,google_id,age_verified_at,consent_version,created_at) VALUES(?,?,?,?,?,?)').run('v', 'v@example.com', 'g3', now, 'v1', now);
  sql.prepare('INSERT INTO energy(user_id,free) VALUES(?,0)').run('v');
  const put = sql.prepare("INSERT INTO orders(id,user_id,request_id,sku,price_satang,amount_satang,energy,status,created_at,expires_at,paid_at,trans_ref) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)");
  const t0 = now - 3 * 3600000;
  put.run('aaaaaaaa-0000-4000-8000-000000000001', 'v', 'r-aaaaaaaa1', 'energy_29', 2900, 2911, 58, 'paid', t0, t0 + 1800000, t0 + 120000, 'SLIPREF00001');
  put.run('aaaaaaaa-0000-4000-8000-000000000002', 'v', 'r-aaaaaaaa2', 'energy_59', 5900, 5922, 118, 'expired', t0, t0 + 1800000, null, null);
  put.run('aaaaaaaa-0000-4000-8000-000000000003', 'v', 'r-aaaaaaaa3', 'energy_99', 9900, 9933, 198, 'paid', t0, t0 + 1800000, t0 + 60000, 'SLIPREF00003');
  sql.prepare('UPDATE energy SET purchased=? WHERE user_id=?').run(58 + 198, 'v');
  const statement = csv([[t0 + 60000, 2911], [t0 + 600000, 5922], [now - 60 * 60000, 4444]]);
  const res = await callText(sql, '/api/admin/orders/reconcile', statement);
  assert.equal(res.status, 200);
  const r = await res.json();
  assert.equal(r.imported, 3);
  assert.deepEqual(r.confirmed, ['aaaaaaaa-0000-4000-8000-000000000001']);
  assert.deepEqual(r.credited, ['aaaaaaaa-0000-4000-8000-000000000002'], 'paid at the bank, slip never sent');
  assert.deepEqual(r.unmatchedDeposits.map(d => d.amountSatang), [4444]);
  assert.deepEqual(r.suspects.map(s => s.id), ['aaaaaaaa-0000-4000-8000-000000000003'], 'slipped but no money arrived');
  assert.equal(sql.prepare('SELECT purchased FROM energy WHERE user_id=?').get('v').purchased, 58 + 198 + 118);

  const again = await (await callText(sql, '/api/admin/orders/reconcile', statement)).json();
  assert.equal(again.imported, 0);
  assert.equal(again.alreadyImported, 3);
  assert.deepEqual([again.confirmed, again.credited], [[], []], 're-upload changes nothing');
  assert.equal(sql.prepare('SELECT purchased FROM energy WHERE user_id=?').get('v').purchased, 58 + 198 + 118);

  assert.equal((await call(sql, 'POST', '/api/admin/orders/aaaaaaaa-0000-4000-8000-000000000001/revoke', { reason: 'x' })).status, 409, 'a confirmed order cannot be revoked');
  assert.equal((await call(sql, 'POST', '/api/admin/orders/aaaaaaaa-0000-4000-8000-000000000003/revoke', { reason: 'no deposit on 7 Nov statement' })).status, 200);
  assert.equal(sql.prepare('SELECT purchased FROM energy WHERE user_id=?').get('v').purchased, 58 + 118);
  assert.ok(sql.prepare('SELECT shop_blocked_at b FROM users WHERE id=?').get('v').b, 'revoking blocks the shop for that player');
  assert.equal(sql.prepare("SELECT delta_purchased d FROM token_ledger WHERE reason='revoked'").get().d, -198);
  assert.equal((await callText(sql, '/api/admin/orders/reconcile', 'nothing,here\n1,2\n')).status, 422);
});

test('revoked player: shop closed to them', async () => {
  const sql = dbOf();
  sql.prepare('UPDATE users SET shop_blocked_at=? WHERE id=?').run(now, 'u');
  const r = await order(sql);
  assert.equal(r.res.status, 403);
  assert.equal(r.body.error, 'shop_blocked');
  assert.equal((await (await call(sql, 'GET', '/api/shop')).json()).blocked, true);
});

test('admin: manual credit needs a bank reference, refund takes back only purchased energy', async () => {
  const sql = dbOf();
  const o = (await order(sql, 'energy_99')).body.order;
  assert.equal((await call(sql, 'POST', `/api/admin/orders/${o.id}/credit`, { reason: 'checked statement' })).status, 400);
  assert.equal((await call(sql, 'POST', `/api/admin/orders/${o.id}/credit`, { reason: 'checked statement', transRef: 'BANK123456' })).status, 200);
  assert.equal(energyOf(sql).purchased, 198);
  assert.equal((await call(sql, 'POST', `/api/admin/orders/${o.id}/credit`, { reason: 'twice', transRef: 'BANK999999' })).status, 409);
  const list = await (await call(sql, 'GET', '/api/admin/orders?status=paid')).json();
  assert.equal(list.orders[0].transRef, 'BANK123456');
  assert.equal(list.orders[0].confirmed, true, 'a manual credit is already checked against the bank');
  sql.prepare('UPDATE energy SET purchased=100 WHERE user_id=?').run('u');
  assert.equal((await call(sql, 'POST', `/api/admin/orders/${o.id}/refund`, { reason: 'customer request' })).status, 200);
  assert.deepEqual(energyOf(sql), { free: 30, purchased: -98, diamonds: 0 }, 'balance may go negative, free energy untouched');
  assert.equal((await call(sql, 'POST', `/api/admin/orders/${o.id}/refund`, { reason: 'again' })).status, 409);
  assert.equal(sql.prepare("SELECT delta_purchased d FROM token_ledger WHERE reason='refunded'").get().d, -198);
});

test('admin endpoints refuse players', async () => {
  const sql = dbOf();
  const env = { ...shopEnv, ADMIN_EMAIL: 'boss@example.com' };
  assert.equal((await call(sql, 'GET', '/api/admin/orders', null, env)).status, 403);
  const res = await worker.fetch(new Request('https://frost.test/api/admin/orders/reconcile', { method: 'POST', headers, body: 'x' }), { DB: d1(sql), ...env }, {});
  assert.equal(res.status, 403);
});

// --- Daily close for accounting (docs/ACCOUNTING_DAILY_CLOSE.md) ---------------------

const CATALOG = [
  { sku: 'energy_29', price_satang: 2900, active: 1 },
  { sku: 'energy_59', price_satang: 5900, active: 1 },
  { sku: 'energy_99', price_satang: 9900, active: 1 },
];
// Tails sum to 4.61 / 4.37 / 0.61: the accountant's example day.
const GOLDEN = [['energy_29', 2900, [64, 12, 87, 5, 33, 71, 48, 9, 56, 76]], ['energy_59', 5900, [99, 97, 95, 88, 58]], ['energy_99', 9900, [25, 36]]];
const goldenRows = () => GOLDEN.flatMap(([sku, price, tails]) => tails.map(t => ({ sku, price_satang: price, deposit_satang: price + t })));
const ACCOUNTANT_SAMPLE = [
  'วันที่ 2026/11/08',
  '1. ยอดรวมสินค้าราคา 29 บาท (10 ชิ้น)   294.61',
  '2. ยอดรวมสินค้าราคา 59 บาท (5 ชิ้น)    299.37',
  '3. ยอดรวมสินค้าราคา 99 บาท (2 ชิ้น)    198.61',
  'มูลค่าก่อน VAT 740.74 · VAT 51.85 · รวมทั้งสิ้น 792.59',
].join('\n');

test('daily close: rows are money received per pack, VAT carved out of the day total once', () => {
  const c = buildDailyClose('2026-11-08', CATALOG, goldenRows());
  assert.deepEqual(c.lines.map(l => [l.sku, l.count, l.totalSatang, l.nominalSatang]), [['energy_29', 10, 29461, 29000], ['energy_59', 5, 29937, 29500], ['energy_99', 2, 19861, 19800]]);
  assert.deepEqual([c.totalSatang, c.nominalSatang, c.vatBaseSatang, c.vatSatang], [79259, 78300, 74074, 5185]);
  assert.equal(formatDailyClose(c), ACCOUNTANT_SAMPLE, 'exactly the format accounting asked for');
  const empty = buildDailyClose('2026-11-09', CATALOG, []);
  assert.equal(formatDailyClose(empty).split('\n')[1], '1. ยอดรวมสินค้าราคา 29 บาท (0 ชิ้น)   0.00', 'a day with no sales still lists every pack');
  assert.equal(vatBaseOf(2964), 2770, '29.64 -> 27.70 + 1.94');
  assert.equal(vatBaseOf(10700), 10000);
  assert.throws(() => buildDailyClose('2026-11-08', CATALOG, [{ sku: 'nope', price_satang: 1, deposit_satang: 1 }]), /unknown_sku/);
  assert.equal(isDayKey('2026-11-08'), true);
  assert.equal(isDayKey('2026-02-30'), false);
  assert.equal(dayKeyOf(Date.parse('2026-11-08T23:59:59+07:00')), '2026-11-08');
  assert.equal(dayKeyOf(Date.parse('2026-11-09T00:00:00+07:00')), '2026-11-09');
});

const oid = i => `bbbbbbbb-0000-4000-8000-${String(i).padStart(12, '0')}`;
const putPaid = (sql, i, sku, price, amount, paidAt, status = 'paid') => sql.prepare('INSERT INTO orders(id,user_id,request_id,sku,price_satang,amount_satang,energy,status,created_at,expires_at,paid_at,trans_ref) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
  .run(oid(i), 'u', `pay-${i}-xxxxxxxx`, sku, price, amount, price / 50, status, paidAt - 60000, paidAt + 1800000, paidAt, `SLIPPAY${i}`);

test('daily summary: read from the payment records on demand, in the format accounting asked for', async () => {
  const sql = dbOf();
  const start = bangkokDayStart(now) - 86400000, day = dayKeyOf(start);
  goldenRows().forEach((r, i) => putPaid(sql, i + 1, r.sku, r.price_satang, r.deposit_satang, start + 3600000 + i * 60000));
  putPaid(sql, 900, 'energy_29', 2900, 2999, start + 7200000, 'revoked');
  putPaid(sql, 901, 'energy_29', 2900, 2998, start - 1, 'paid');
  const res = await call(sql, 'GET', `/api/admin/shop/daily?day=${day}`);
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.equal(d.text, ACCOUNTANT_SAMPLE.replace('2026/11/08', day.replaceAll('-', '/')), 'a fake slip and the day before are left out');
  assert.equal(d.payments.length, 17);
  assert.deepEqual(Object.keys(d.payments[0]), ['orderId', 'sku', 'amountSatang', 'paidAt'], 'each payment: amount, date and time');
  assert.equal((await call(sql, 'GET', '/api/admin/shop/daily?day=2026-13-01')).status, 400);

  const month = await call(sql, 'GET', `/api/admin/shop/daily.txt?month=${day.slice(0, 7)}`);
  assert.match(month.headers.get('content-disposition'), new RegExp(`daily_${day.slice(0, 7).replace('-', '')}\\.txt`));
  const days = (await month.text()).trim().split('\n\n');
  assert.equal(days.length, new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7), 0)).getUTCDate(), 'one summary per day of the month');
  assert.ok(days.includes(d.text));
  const env = { ...shopEnv, ADMIN_EMAIL: 'boss@example.com' };
  assert.equal((await call(sql, 'GET', `/api/admin/shop/daily?day=${day}`, null, env)).status, 403, 'admins only');
});

test('daily report file: the cron writes yesterday after midnight, catches up missed days, once per day', async () => {
  const sql = dbOf();
  const today = bangkokDayStart(now), DAY = 86400000;
  assert.deepEqual(await writeDailyReports({ DB: d1(sql) }, now), { written: [] }, 'nothing before the first payment');
  putPaid(sql, 990, 'energy_59', 5900, 5937, today - 3 * DAY + 3600000);
  putPaid(sql, 991, 'energy_29', 2900, 2911, today + 60000);
  const days = [3, 2, 1].map(n => dayKeyOf(today - n * DAY));
  assert.deepEqual(await writeDailyReports({ DB: d1(sql) }, now), { written: days }, 'today is still open');
  assert.deepEqual(await writeDailyReports({ DB: d1(sql) }, now), { written: [] }, 'a second run writes nothing');

  const list = await (await call(sql, 'GET', '/api/admin/shop/reports')).json();
  assert.deepEqual(list.reports.map(r => [r.day, r.totalSatang]), [[days[2], 0], [days[1], 0], [days[0], 5937]]);
  const file = await call(sql, 'GET', `/api/admin/shop/reports/${days[0]}.txt`);
  assert.match(file.headers.get('content-disposition'), new RegExp(`daily_${days[0].replaceAll('-', '')}\\.txt`));
  const text = await file.text();
  assert.ok(text.startsWith(`วันที่ ${days[0].replaceAll('-', '/')}\n`));
  assert.ok(text.includes('2. ยอดรวมสินค้าราคา 59 บาท (1 ชิ้น)   59.37'));
  assert.equal((await call(sql, 'GET', `/api/admin/shop/reports/${dayKeyOf(today)}.txt`)).status, 404);
});

test('reports API: read-only access for the owner\'s agent with a bearer key, off until the secret is set', async () => {
  const sql = dbOf();
  const today = bangkokDayStart(now), day = dayKeyOf(today - 86400000);
  putPaid(sql, 995, 'energy_29', 2900, 2944, today - 86400000 + 3600000);
  await writeDailyReports({ DB: d1(sql) }, now);
  const key = 'k'.repeat(40);
  const get = (path, auth, env = { ...shopEnv, REPORTS_API_TOKEN: key }) => worker.fetch(new Request(`https://frost.test${path}`, { headers: auth ? { authorization: auth } : {} }), { DB: d1(sql), ...env }, {});
  assert.equal((await get('/api/reports/reports', `Bearer ${key}`, shopEnv)).status, 404, 'off without the secret');
  assert.equal((await get('/api/reports/reports', `Bearer ${key}`, { ...shopEnv, REPORTS_API_TOKEN: 'short' })).status, 404, 'a weak secret keeps it off');
  assert.equal((await get('/api/reports/reports')).status, 401);
  assert.equal((await get('/api/reports/reports', 'Bearer wrong')).status, 401);
  const list = await get('/api/reports/reports', `Bearer ${key}`);
  assert.equal(list.status, 200);
  assert.deepEqual((await list.json()).reports.map(r => [r.day, r.totalSatang]), [[day, 2944]]);
  assert.ok((await (await get(`/api/reports/reports/${day}.txt`, `Bearer ${key}`)).text()).includes('(1 ชิ้น)   29.44'));
  const live = await (await get(`/api/reports/daily?day=${day}`, `Bearer ${key}`)).json();
  assert.deepEqual(live.payments.map(p => [p.amountSatang, p.paidAt]), [[2944, today - 86400000 + 3600000]], 'amount, date and time of each payment');
  const write = await worker.fetch(new Request('https://frost.test/api/reports/reports', { method: 'POST', headers: { authorization: `Bearer ${key}`, origin: 'https://frost.test' } }), { DB: d1(sql), ...shopEnv, REPORTS_API_TOKEN: key }, {});
  assert.equal(write.status, 404, 'read-only');
  assert.equal((await get('/api/admin/orders', `Bearer ${key}`)).status, 401, 'the key opens nothing else');
});
