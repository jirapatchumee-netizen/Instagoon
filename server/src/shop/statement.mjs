// KBank statement CSV -> deposits. K BIZ / K PLUS exports differ by channel and change over time,
// so columns are found by header name (Thai or English) instead of position. Verify against a
// real export before relying on it; unknown layouts fail loudly with 'statement_unrecognized'.

const DAY = 86400000, BKK = 7 * 3600000;

function rows(text) {
  const out = [];
  let row = [], cell = '', quoted = false;
  const src = String(text).replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell.trim()); out.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell.trim()); out.push(row); }
  return out.filter(r => r.some(Boolean));
}

const find = (header, re, not) => header.findIndex(h => re.test(h) && !(not && not.test(h)));

function columns(header) {
  const h = header.map(x => x.toLowerCase());
  const date = find(h, /วันที่|^date|transaction date|value date/);
  const time = find(h, /เวลา|^time/);
  const deposit = find(h, /ฝาก|deposit|credit|เงินเข้า|รับเงิน/, /ถอน|withdraw|debit/);
  const amount = find(h, /จำนวนเงิน|^amount/);
  if (date < 0 || (deposit < 0 && amount < 0)) return null;
  return { date, time, deposit, amount };
}

export function satangOf(text) {
  const s = String(text || '').replace(/[,\s฿]/g, '').replace(/^\((.*)\)$/, '-$1');
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.replace('-', '').split('.');
  const v = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return s.startsWith('-') ? -v : v;
}

// Bangkok wall-clock -> epoch ms. Years: 4-digit >= 2400 is Buddhist Era; 2-digit >= 50 is BE
// (69 = 2569 = 2026), otherwise CE (26 = 2026).
export function bangkokTime(dateText, timeText = '') {
  const both = `${dateText} ${timeText}`.trim();
  let y, mo, d;
  let m = both.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = both.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else return null;
  if (y < 100) y = y >= 50 ? 2500 + y - 543 : 2000 + y;
  else if (y >= 2400) y -= 543;
  const t = both.slice(m.index + m[0].length).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/) || [0, 0, 0, 0];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || +t[1] > 23 || +t[2] > 59) return null;
  return Date.UTC(y, mo - 1, d, +t[1], +t[2], +(t[3] || 0)) - BKK;
}

async function sha(text) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), n => n.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export async function parseStatement(text) {
  const all = rows(text);
  const at = all.slice(0, 40).findIndex(r => columns(r));
  if (at < 0) return { ok: false, error: 'statement_unrecognized' };
  const col = columns(all[at]);
  const deposits = [], seen = new Map();
  for (const r of all.slice(at + 1)) {
    const value = col.deposit >= 0 ? satangOf(r[col.deposit]) : satangOf(r[col.amount]);
    if (!value || value <= 0) continue;
    const when = bangkokTime(r[col.date], col.time >= 0 ? r[col.time] : '');
    if (when == null) continue;
    const line = r.join('|');
    const k = (seen.get(line) || 0) + 1;
    seen.set(line, k);
    deposits.push({ id: await sha(`${line}#${k}`), amountSatang: value, depositedAt: when });
  }
  return { ok: true, deposits };
}

export const bangkokDayStart = now => now - ((now + BKK) % DAY);
