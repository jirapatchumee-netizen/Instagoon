import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import worker from '../worker/src/index.mjs';

const db = new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../worker/migrations/0001_init.sql', import.meta.url), 'utf8'));
const statement = (query, args = []) => ({
  bind(...a) {
    return statement(query, a);
  },
  async first() {
    return db.prepare(query).get(...args) ?? null;
  },
  async all() {
    return { results: db.prepare(query).all(...args) };
  },
  async run() {
    return { meta: { changes: db.prepare(query).run(...args).changes } };
  },
});
const DB = {
  prepare: statement,
  async batch(statements) {
    db.exec('BEGIN');
    try {
      const out = [];
      for (const s of statements) out.push(await s.run());
      db.exec('COMMIT');
      return out;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  },
};

const publicRoot = new URL('../../../public/', import.meta.url);
const MEDIA = {
  async get(key) {
    const mapped = key === 's.webp' ? 'art/cg/bg_cg_noey_catmaid_playful_083.v1.webp' : key;
    const fileUrl = new URL(mapped.replace(/^\/+/, ''), publicRoot);
    if (!existsSync(fileUrl)) return null;
    const bytes = readFileSync(fileUrl);
    return {
      body: bytes,
      httpMetadata: { contentType: 'image/webp' },
    };
  },
  async head() {
    return null;
  },
  async list() {
    return { objects: [] };
  },
};

const env = { DB, MEDIA, PUBLIC_ORIGIN: 'http://127.0.0.1:5174', ADMIN_EMAIL: 'admin@example.com' };
const raw = 'a'.repeat(64);
const sid = Array.from(
  new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))),
  (x) => x.toString(16).padStart(2, '0')
).join('');
const now = Date.now();

db.prepare("INSERT INTO invites(email) VALUES('u@example.com')").run();
db.prepare(
  "INSERT INTO users(id,email,google_id,age_verified_at,consent_version,created_at) VALUES('u','u@example.com','g',?,'v1',?)"
).run(now, now);
db.prepare("INSERT INTO energy(user_id) VALUES('u')").run();
db.prepare("INSERT INTO sessions(id,user_id,expires_at) VALUES(?,'u',?)").run(sid, now + 365 * 86400000);

// Creators (including original 'c' + InstaChat characters)
db.prepare(
  "INSERT INTO creators(id,name,bio,avatar_key) VALUES('noey','น้องเนย 🐱','Marketing Intern 🌸 แอบชอบแมวและชานมไข่มุก | อย่าฟ้องหัวหน้านะคะว่าแอบอู้ 🤫','art/cg/bg_cg_noey_catmaid_sweet_081.v1.webp')"
).run();
db.prepare(
  "INSERT INTO creators(id,name,bio,avatar_key) VALUES('pim','คุณพิมพ์ (HR Manager) 💼','Head of Human Resources @ YG Tower | ความเป็นมืออาชีพคือหัวใจ ⚖️ | Wine & Jazz lover 🍷','art/stage1/Cutscene_S1_02_Noey_Screen_Fixed_00001_.webp')"
).run();
db.prepare(
  "INSERT INTO creators(id,name,bio,avatar_key) VALUES('rhea','คุณหนู เร-อา (Rhea) ✨','Executive Director | Minimalist & Art Collector | Actions speak louder than titles. 💎','art/stage1/Cutscene_S1_02_Corporate_HQ_YG_00001_.webp')"
).run();
db.prepare(
  "INSERT INTO creators(id,name,bio,avatar_key) VALUES('c','มิน','ยินดีที่ได้รู้จัก ไว้มาคุยกันใน DM นะคะ ✨','art/stage1/Cutscene_S1_02_Noey_Welcome_EyeLevel_00001_.webp')"
).run();

// Feed Posts
db.prepare(
  "INSERT INTO posts(id,creator_id,caption,media_key,published_at,simulated_likes,status) VALUES('post_noey_1','noey','แอบมาถ่ายรูปคอสเพลย์แมวเหมียวในสตูดิโอลับตอนกะดึก 🐾 หวังว่าพี่อาร์ม IT จะไม่เอาความลับนี้ไปบอกใครนะคะ... #catmaid #secret #cosplay #overtime','art/cg/bg_cg_noey_catmaid_sweet_081.v1.webp',?,1284,'published')"
).run(now - 3600000);
db.prepare(
  "INSERT INTO posts(id,creator_id,caption,media_key,published_at,simulated_likes,status) VALUES('post_noey_2','noey','ทำกระเป๋าสตางค์หล่นใต้โต๊ะทำงาน ดีนะที่มีคนใจดีช่วยเก็บให้ ขอบคุณนะคะคุณ IT คนขยัน ☕✨ #grateful #officelife','art/cg/bg_noey_wallet_discovery_040.v3.webp',?,942,'published')"
).run(now - 7200000);
db.prepare(
  "INSERT INTO posts(id,creator_id,caption,media_key,published_at,simulated_likes,status) VALUES('post_pim_1','pim','ความสมบูรณ์แบบไม่ได้สร้างในวันเดียว แต่สร้างจากวินัยในทุกๆ วัน คืนนี้อยู่เคลียร์แฟ้มประเมินผลงานต่ออีกนิด 📑✨ #workmode #leadership','art/stage1/Cutscene_S1_02_Corporate_HQ_YG_00001_.webp',?,2840,'published')"
).run(now - 10800000);
db.prepare(
  "INSERT INTO posts(id,creator_id,caption,media_key,published_at,simulated_likes,status) VALUES('p','c','สวัสดีทุกคน วันนี้แวะมาทักทายในฟีดใหม่ของ FrostStory นะคะ 💖','art/stage1/Cutscene_S1_02_Noey_Welcome_EyeLevel_00001_.webp',?,412,'published')"
).run(now - 10000);

// Stories
db.prepare(
  "INSERT INTO stories(id,creator_id,type,media_key,published_at,status) VALUES('story_noey','noey','broadcast','art/cg/bg_cg_noey_catmaid_playful_083.v1.webp',?,'published')"
).run(now - 7200000);
db.prepare(
  "INSERT INTO stories(id,creator_id,type,media_key,published_at,status) VALUES('story_rhea','rhea','unlockable','art/cg/bg_cg_noey_catmaid_sultry_082.v1.webp',?,'published')"
).run(now - 5400000);
db.prepare(
  "INSERT INTO stories(id,creator_id,type,media_key,published_at,status) VALUES('s','c','unlockable','s.webp',?,'published')"
).run(now - 10000);

// DM Episodes & Revisions
db.prepare(
  "INSERT INTO episodes(id,creator_id,title,relationship_required,position) VALUES('ep_noey_1','noey','ความลับใต้โต๊ะทำงาน',0,1),('ep_noey_2','noey','สตูดิโอคอสเพลย์กะดึก',1,2),('ep_pim_1','pim','เรียกพบที่ห้อง HR ชั้น 4',0,1),('ep_rhea_1','rhea','คำสั่งตรงจากผู้บริหาร',0,1),('ep1','c','ตอนแรก',0,1),('ep2','c','ตอนที่สอง',1,2)"
).run();

const noeyNodes = JSON.stringify([
  {
    id: 'start',
    text: 'รุ่นพี่อาร์มคะ... เรื่องเมื่อคืนที่แอบใต้โต๊ะ ห้ามเอาไปเล่าให้ใครฟังเด็ดขาดเลยนะคะ! 🙈',
    choices: [
      { id: 'c1', text: 'ไม่บอกใครแน่นอน สบายใจได้ครับ', nextNodeId: 'n2' },
      { id: 'c2', text: 'แล้วมีอะไรมาแลกกับการปิดปากล่ะ? 😏', nextNodeId: 'n2' },
    ],
    end: false,
  },
  {
    id: 'n2',
    text: 'หนูแอบลงรูปชุดคอสเพลย์แมวในไอจีแล้วด้วย รุ่นพี่เห็นหรือยังคะ? 🐾',
    choices: [
      { id: 'c3', text: 'เห็นแล้วครับ น่ารักมากจนใจละลายเลย', nextNodeId: 'end' },
      { id: 'c4', text: 'แอบเซ็กซี่เกินไปนะ เดี๋ยวหัวหน้าเห็นเข้าหรอก', nextNodeId: 'end' },
    ],
    end: false,
  },
  {
    id: 'end',
    text: 'งื้ออ เขินจังเลยค่ะ ไว้เลิกงานคืนนี้แวะมาหาหนูที่สตูดิโอชั้นใต้ดินอีกนะคะ 💖',
    choices: [],
    end: true,
  },
]);

const pimNodes = JSON.stringify([
  {
    id: 'start',
    text: 'คุณอาร์ม รบกวนขึ้นมาตรวจสอบระบบแอร์และปรินเตอร์ที่ห้องฝ่ายบุคคลชั้น 4 หน่อยนะคะ',
    choices: [
      { id: 'p1', text: 'รับทราบครับคุณพิมพ์ กำลังขึ้นไปครับ', nextNodeId: 'end' },
      { id: 'p2', text: 'แอร์ไม่เย็นหรือคนในห้องร้อนแรงเกินไปครับ?', nextNodeId: 'end' },
    ],
    end: false,
  },
  {
    id: 'end',
    text: 'พูดจาแบบนี้ระวังโดนหักคะแนนความประพฤตินะคะ... แต่ขึ้นมาเร็วๆ ล่ะ ฉันรออยู่คนเดียว',
    choices: [],
    end: true,
  },
]);

const rheaNodes = JSON.stringify([
  {
    id: 'start',
    text: 'คืนนี้ฉันต้องการตรวจรายงานความปลอดภัยระบบเซิร์ฟเวอร์ด้วยตัวเอง คุณยังอยู่ที่ออฟฟิศใช่ไหม?',
    choices: [
      { id: 'r1', text: 'ยังอยู่ครับคุณหนูเร-อา เดี๋ยวผมเตรียมข้อมูลไว้ให้', nextNodeId: 'end' },
    ],
    end: false,
  },
  {
    id: 'end',
    text: 'ดีมาก ขึ้นมาพบฉันที่ห้องบริหารชั้น 18 ตอนสี่ทุ่มตรง ห้ามสายแม้แต่นาทีเดียว',
    choices: [],
    end: true,
  },
]);

const nodes = JSON.stringify([
  {
    id: 'start',
    text: 'วันนี้เป็นอย่างไรบ้าง?',
    choices: [{ id: 'go', text: 'สบายดี', nextNodeId: 'end' }],
    end: false,
  },
  { id: 'end', text: 'ดีใจที่ได้คุยกัน', choices: [], end: true },
]);

db.prepare(
  "INSERT INTO revisions(id,creator_id,episode_id,nodes,status,created_at) VALUES('r_noey_1','noey','ep_noey_1',?,'published',?),('r_noey_2','noey','ep_noey_2',?,'published',?),('r_pim_1','pim','ep_pim_1',?,'published',?),('r_rhea_1','rhea','ep_rhea_1',?,'published',?),('r1','c','ep1',?,'published',?),('r2','c','ep2',?,'published',?)"
).run(
  noeyNodes,
  now - 10000,
  JSON.stringify([{ id: 'start', text: 'ขอบคุณที่ปลดล็อกตอนพิเศษของเนยนะคะ 🐱💖', choices: [], end: true }]),
  now - 10000,
  pimNodes,
  now - 10000,
  rheaNodes,
  now - 10000,
  nodes,
  now - 10000,
  JSON.stringify([{ id: 'start', text: 'เรื่องราวตอนที่สอง', choices: [], end: true }]),
  now - 10000
);

createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const headers = new Headers(req.headers);
    headers.set('cookie', `frost_session=${raw}`);
    const body = Buffer.concat(chunks);
    const request = new Request(env.PUBLIC_ORIGIN + req.url, {
      method: req.method,
      headers,
      body: body.length ? body : undefined,
      duplex: 'half',
    });
    const response = await worker.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
}).listen(8787, '127.0.0.1', () =>
  console.log('TEST ONLY: synthetic in-memory user authenticated at 127.0.0.1:8787; do not expose')
);
