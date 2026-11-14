// ตรวจว่า CSS ที่ build แล้วมี Tailwind utility จริง (กันบั๊ก Home Hub ไม่มีสไตล์ซ้ำ)
// ใช้: node scripts/check-css-bundle.mjs [distDir]  (default client/dist)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.argv[2] ?? 'client/dist', 'assets');
const css = readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
const required = ['.object-cover', '.rounded-full', '.bg-panel', '.player-home-scope', '--tw-shadow'];
const missing = required.filter((s) => !css.includes(s));
if (missing.length) {
  console.error(`CSS bundle ไม่มี: ${missing.join(', ')} — Tailwind อาจไม่ถูก compile (เช็ก @tailwind ใน client/player/home/home.css)`);
  process.exit(1);
}
console.log(`CSS bundle OK (${required.length} checks)`);
