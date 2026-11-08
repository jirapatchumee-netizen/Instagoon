// Daily summary for accounting: one per Bangkok day. See docs/ACCOUNTING_DAILY_CLOSE.md.
// Each pack's row is the money that actually arrived for it (price + satang tails), so the day's
// total equals the statement. Prices include VAT: it is carved out of the day's total once,
// never added on top and never rounded per row. Money is integer satang throughout.

const BKK = 7 * 3600000;

export const dayStartOf = day => Date.parse(`${day}T00:00:00+07:00`);
export const dayKeyOf = ms => new Date(ms + BKK).toISOString().slice(0, 10);
export const isDayKey = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(dayStartOf(s)) && dayKeyOf(dayStartOf(s)) === s;

// total x 100/107 rounded half-up, in integers so no float ever touches the amount.
export const vatBaseOf = total => Math.floor((total * 200 + 107) / 214);

const money = s => `${Math.trunc(s / 100)}.${String(Math.abs(s) % 100).padStart(2, '0')}`;
const baht = s => (s % 100 ? money(s) : String(s / 100));

// products: every catalog row ordered by position; inactive packs appear only on days they sold.
// rows: one per payment that day, { sku, price_satang, deposit_satang } (deposit = amount paid).
export function buildDailyClose(day, products, rows) {
  const known = new Set(products.map(p => p.sku));
  for (const r of rows) if (!known.has(r.sku)) throw new Error(`unknown_sku: ${r.sku}`);
  const lines = products.map(p => {
    const mine = rows.filter(r => r.sku === p.sku);
    return {
      sku: p.sku, priceSatang: p.price_satang, count: mine.length,
      totalSatang: mine.reduce((s, r) => s + r.deposit_satang, 0),
      nominalSatang: mine.reduce((s, r) => s + r.price_satang, 0),
      active: !!p.active,
    };
  }).filter(l => l.active || l.count).map(({ active, ...l }) => l);
  const totalSatang = lines.reduce((s, l) => s + l.totalSatang, 0);
  const vatBaseSatang = vatBaseOf(totalSatang);
  return {
    day, lines, totalSatang,
    nominalSatang: lines.reduce((s, l) => s + l.nominalSatang, 0),
    vatBaseSatang, vatSatang: totalSatang - vatBaseSatang,
  };
}

// The exact text accounting asked for (2569-11-08): date, one row per pack, then the VAT split.
export function formatDailyClose(c) {
  const labels = c.lines.map((l, i) => `${i + 1}. ยอดรวมสินค้าราคา ${baht(l.priceSatang)} บาท (${l.count} ชิ้น)`);
  const width = Math.max(0, ...labels.map(s => s.length));
  return [
    `วันที่ ${c.day.replaceAll('-', '/')}`,
    ...labels.map((s, i) => `${s.padEnd(width)}   ${money(c.lines[i].totalSatang)}`),
    `มูลค่าก่อน VAT ${money(c.vatBaseSatang)} · VAT ${money(c.vatSatang)} · รวมทั้งสิ้น ${money(c.totalSatang)}`,
  ].join('\n');
}
