// Conservative display validation, not another model or a general Thai intent classifier.
export const PLAYER_ACTION_POLICY = 'grounded-actions-v1';
export const PLAYER_ACTION_INSTRUCTION = 'For playerActions, copy only clearly stated physical actions or physical-action requests. Ordinary speech, questions, boasts and refusals use []. Requests are not completed actions; keep their request wording.';
const verbs = '(?:เดิน|นั่ง|ยืน|วาง|หยิบ|ยื่น|เลื่อน|เปิด|ปิด|หัน|มอง|ยิ้ม|หัวเราะ|โบก|ยก|ก้ม|พยักหน้า|กอดอก|ถอย|ขยับ|สะพาย|กด|จับ|เก็บ|แตะ|ถือ|ส่ง|เขียน|อ่าน|walk|sit|stand|put|pick|hand|move|open|close|turn|look|smile|wave|lift|nod|hold|write|read)';
const request = new RegExp(`^(?:(?:พี่(?:เชียร์)?|เชียร์)\\s*)?(?:ช่วย|กรุณา|โปรด|ลอง|please\\s+)\\s*${verbs}`, 'i');
const completed = new RegExp(`^(?:ผม|ฉัน|เรา|กู|ข้า|I\\s+|we\\s+)\\s*${verbs}`, 'i');
function hypotheticalOrQuoted(input, quote) {
  const at = input.indexOf(quote), before = input.slice(0, at);
  const lineBefore = before.slice(before.lastIndexOf('\n') + 1);
  return /ถ้า|หาก|สมมติ|ตัวอย่าง|คำว่า|\bif\b|\bsuppose\b/i.test(lineBefore + quote)
    || (before.match(/"/g) || []).length % 2 === 1
    || before.lastIndexOf('“') > before.lastIndexOf('”')
    || before.lastIndexOf('「') > before.lastIndexOf('」');
}
export function groundedPlayerActionEntries(input, supplied, marked) {
  const entries = new Map(marked.map(quote => [quote, { text: quote, kind: request.test(quote) ? 'request' : 'action' }]));
  for (const quote of supplied) {
    if (entries.has(quote) || hypotheticalOrQuoted(input, quote)) continue;
    if (request.test(quote)) entries.set(quote, { text: quote, kind: 'request' });
    else if (completed.test(quote) && !/ไหม|มั้ย|หรือเปล่า|เหรอ|หรอ|ยังไง|[?？]|\b(?:would|could|should)\b/i.test(quote)) entries.set(quote, { text: quote, kind: 'action' });
  }
  return [...entries.values()].sort((a, b) => input.indexOf(a.text) - input.indexOf(b.text));
}
