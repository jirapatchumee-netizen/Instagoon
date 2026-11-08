// PromptPay "Tag 30/29" QR payload (EMVCo merchant-presented, Thai QR Payment standard).
// Pure functions: the Worker builds the payload, the player app only draws it.

const tlv = (tag, value) => tag + String(value.length).padStart(2, '0') + value;

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) over the payload including "6304".
export function crc16(text) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Accepts a mobile number (0812345678), a 13-digit tax/national ID, or a 15-digit e-wallet ID.
export function promptpayTarget(id) {
  const digits = String(id || '').replace(/\D/g, '');
  if (/^0\d{9}$/.test(digits)) return { tag: '01', value: '0066' + digits.slice(1) };
  if (/^66\d{9}$/.test(digits)) return { tag: '01', value: '00' + digits };
  if (/^\d{13}$/.test(digits)) return { tag: '02', value: digits };
  if (/^\d{15}$/.test(digits)) return { tag: '03', value: digits };
  return null;
}

export function promptpayPayload(id, amountSatang) {
  const target = promptpayTarget(id);
  if (!target) throw new Error('invalid_promptpay_id');
  if (!Number.isSafeInteger(amountSatang) || amountSatang <= 0) throw new Error('invalid_amount');
  const merchant = tlv('00', 'A000000677010111') + tlv(target.tag, target.value);
  // Same tag order as the widely used promptpay-qr reference, so bank apps see a familiar payload.
  const body = tlv('00', '01') + tlv('01', '12') + tlv('29', merchant) + tlv('58', 'TH') + tlv('53', '764')
    + tlv('54', (amountSatang / 100).toFixed(2)) + '6304';
  return body + crc16(body);
}
