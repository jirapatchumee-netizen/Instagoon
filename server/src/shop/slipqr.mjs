// Thai bank transfer slips carry a small "mini QR" (Bank of Thailand slip verification format):
//   00 <len> { 00 06 "000001" API id, 01 03 sending bank code, 02 <len> transaction reference }
//   51 02 "TH"   91 04 CRC-16/CCITT-FALSE over everything up to and including "9104"
// The player app decodes the QR from the slip image and sends the text. The CRC only proves the
// text was not mistyped, not that money moved: the daily KBank statement is the real check.
import { crc16 } from './promptpay.mjs';

const BANKS = { '002': 'BBL', '004': 'KBANK', '006': 'KTB', '011': 'TTB', '014': 'SCB', '022': 'CIMBT', '024': 'UOBT', '025': 'BAY', '030': 'GSB', '033': 'GHB', '034': 'BAAC', '065': 'TBANK', '066': 'IBANK', '067': 'TISCO', '069': 'KKP', '070': 'ICBCT', '071': 'TCRB', '073': 'LHB' };

function tlvs(text) {
  const out = {};
  for (let i = 0; i < text.length;) {
    const tag = text.slice(i, i + 2), len = Number(text.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || !Number.isInteger(len) || i + 4 + len > text.length) return null;
    out[tag] = text.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

export function parseSlipQr(raw) {
  const text = String(raw || '').trim();
  if (text.length < 20 || text.length > 200 || !/^[\x20-\x7e]+$/.test(text)) return null;
  const top = tlvs(text);
  if (!top?.['00'] || !top['91']) return null;
  if (!text.endsWith('91' + '04' + top['91']) || crc16(text.slice(0, -4)).toUpperCase() !== top['91'].toUpperCase()) return null;
  const inner = tlvs(top['00']);
  if (inner?.['00'] !== '000001' || !/^\d{3}$/.test(inner['01'] || '')) return null;
  const transRef = inner['02'] || '';
  if (!/^[A-Za-z0-9]{8,40}$/.test(transRef)) return null;
  return { bankCode: inner['01'], bank: BANKS[inner['01']] || inner['01'], transRef };
}

// Builds a slip QR; used by tests and the local fake-slip helper, never by the payment path.
export function buildSlipQr(bankCode, transRef) {
  const tlv = (tag, value) => tag + String(value.length).padStart(2, '0') + value;
  const body = tlv('00', tlv('00', '000001') + tlv('01', bankCode) + tlv('02', transRef)) + tlv('51', 'TH') + '9104';
  return body + crc16(body);
}
