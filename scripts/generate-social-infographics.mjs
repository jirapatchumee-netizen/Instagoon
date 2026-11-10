#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.resolve(rootDir, 'outputs', 'social-infographics');

fs.mkdirSync(outputDir, { recursive: true });

// Parse command line arguments
const args = process.argv.slice(2);
const templateArg = args.find(a => a.startsWith('--template='))?.split('=')[1] || 'all';
const inputFile = args.find(a => a.startsWith('--input='))?.split('=')[1] || null;

let customData = null;
if (inputFile && fs.existsSync(inputFile)) {
  try {
    customData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  } catch (err) {
    console.warn(`[WARN] Could not parse input JSON ${inputFile}: ${err.message}. Using default metrics.`);
  }
}

// Default realistic production metrics (aligned with Instagoon schema)
const defaultStatsData = {
  activeUsers24h: '3,850',
  totalMessages: '188,400',
  avgPerUser: '48',
  unlockedStories: '3,620',
  unlockPaceSec: '24',
  totalPlayHours: '1,450',
  equivDays: '60',
  milestoneLevel2: '120',
  milestoneSecret: '48',
  satisfactionRate: '98%',
  creators: [
    { name: 'มิลิน (Milin)', desc: 'สาวหวานขี้อาย ซ่อนความแซ่บ', pct: 46, color: 'linear-gradient(90deg, #f43f5e, #fb7185)' },
    { name: 'มุก (Mook)', desc: 'สาวมั่น Girl Crush สุดเย้ายวน', pct: 32, color: 'linear-gradient(90deg, #8b5cf6, #c084fc)' },
    { name: 'เนย (Noey)', desc: 'เด็กฝึกงานน่ารัก Gap Moe ชวนหลง', pct: 22, color: 'linear-gradient(90deg, #06b6d4, #38bdf8)' }
  ],
  moments: [
    { name: 'ห้องนอนตอนดึก (Milin)', pct: 36 },
    { name: 'แอบคุยในออฟฟิศ (Noey)', pct: 27 },
    { name: 'บาร์ลับริมระเบียง (Mook)', pct: 23 },
    { name: 'ช็อปปิ้งเดทวันหยุด', pct: 14 }
  ],
  hourlyPeak: '22:30 - 02:00',
  peakUsers: '145'
};

const defaultSecurityData = {
  scanAttemptsMonth: '78,400+',
  blockedIps: '3,410',
  dataBreachCount: '0',
  topAttacks: [
    { target: '/wp-login.php / admin', count: '28,420', pct: 85 },
    { target: '.env / config / credentials', count: '21,150', pct: 64 },
    { target: 'SSH / FTP port scanning', count: '16,280', pct: 49 },
    { target: 'SQL Injection / API abuse', count: '8,420', pct: 25 },
    { target: 'Brute-force password', count: '4,130', pct: 12 }
  ],
  timeframe: 'ย้อนหลัง 30 วัน'
};

function buildStatsHtml(data) {
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Mitr:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 800px;
    height: 1060px;
    background: #090c15;
    color: #f1f5f9;
    font-family: 'Mitr', sans-serif;
    padding: 36px 36px 28px;
    position: relative;
    overflow: hidden;
    background-image: 
      radial-gradient(circle at 15% 15%, rgba(244, 63, 94, 0.12) 0%, transparent 40%),
      radial-gradient(circle at 85% 25%, rgba(139, 92, 246, 0.12) 0%, transparent 45%),
      radial-gradient(circle at 50% 90%, rgba(6, 182, 212, 0.08) 0%, transparent 50%);
  }

  .header {
    text-align: center;
    margin-bottom: 22px;
  }
  .badge-top {
    display: inline-block;
    padding: 4px 16px;
    background: rgba(244, 63, 94, 0.15);
    border: 1px solid rgba(244, 63, 94, 0.4);
    border-radius: 999px;
    color: #fb7185;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }
  .title {
    font-size: 28px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }
  .highlight-number {
    font-family: 'Fredoka', 'Mitr', sans-serif;
    font-size: 56px;
    font-weight: 700;
    background: linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #facc15 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1.1;
    margin-bottom: 4px;
  }
  .subtitle {
    font-size: 14px;
    color: #94a3b8;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 14px;
  }
  .card-stat {
    background: #111625;
    border: 1px solid #1e293b;
    border-radius: 14px;
    padding: 14px;
    position: relative;
  }
  .card-stat .label {
    font-size: 12px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }
  .card-stat .val {
    font-family: 'Fredoka', 'Mitr', sans-serif;
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 4px;
  }
  .card-stat .sub {
    font-size: 11px;
    color: #64748b;
  }
  .card-stat.accent-pink .val { color: #fb7185; }
  .card-stat.accent-purple .val { color: #c084fc; }
  .card-stat.accent-cyan .val { color: #38bdf8; }

  .row-pills {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 18px;
  }
  .pill-item {
    background: #131b2e;
    border: 1px solid #233352;
    border-radius: 10px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .pill-item .p-num {
    font-family: 'Fredoka', sans-serif;
    font-size: 18px;
    font-weight: 700;
    color: #facc15;
  }
  .pill-item .p-txt {
    font-size: 11px;
    color: #94a3b8;
    text-align: right;
  }

  .main-split {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 14px;
    margin-bottom: 18px;
  }
  .panel {
    background: #111625;
    border: 1px solid #1e293b;
    border-radius: 14px;
    padding: 16px;
  }
  .panel-title {
    font-size: 13px;
    font-weight: 600;
    color: #f8fafc;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .creator-bar-item {
    margin-bottom: 10px;
  }
  .creator-header {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 4px;
  }
  .creator-name { font-weight: 500; color: #f1f5f9; }
  .creator-pct { font-family: 'Fredoka', sans-serif; font-weight: 700; color: #facc15; }
  .bar-bg {
    width: 100%;
    height: 7px;
    background: #1e293b;
    border-radius: 4px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 4px;
  }

  .moment-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px dashed #1e293b;
    font-size: 12px;
  }
  .moment-item:last-child { border-bottom: none; }
  .moment-name { color: #cbd5e1; }
  .moment-pct { font-family: 'Fredoka', sans-serif; color: #38bdf8; font-weight: 600; }

  .chart-box {
    background: #111625;
    border: 1px solid #1e293b;
    border-radius: 14px;
    padding: 14px 16px;
    margin-bottom: 18px;
  }
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .chart-title { font-size: 13px; font-weight: 600; color: #f8fafc; }
  .chart-peak { font-size: 11px; color: #facc15; font-weight: 500; }
  .chart-svg {
    width: 100%;
    height: 60px;
    overflow: visible;
  }

  .cta-banner {
    background: linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(139, 92, 246, 0.2) 100%);
    border: 1px solid rgba(244, 63, 94, 0.4);
    border-radius: 14px;
    padding: 14px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .cta-text h3 {
    font-size: 15px;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 2px;
  }
  .cta-text p {
    font-size: 11px;
    color: #cbd5e1;
  }
  .cta-button {
    background: linear-gradient(90deg, #f43f5e, #fb7185);
    color: #ffffff;
    padding: 8px 18px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #64748b;
    padding: 0 4px;
  }
  .footer-domain {
    font-family: 'Fredoka', sans-serif;
    font-weight: 700;
    font-size: 15px;
    color: #f43f5e;
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="badge-top">OPEN BETA · เปิดให้เล่นแล้ววันนี้</div>
    <div class="title">24 ชั่วโมงแรก โลกนี้ไม่เคยหลับ!</div>
    <div class="highlight-number">${data.activeUsers24h}+</div>
    <div class="subtitle">ผู้เล่นที่เข้ามาทักทายและค้นหาความลับของ 3 สาวใน 24 ชั่วโมงแรก</div>
  </div>

  <div class="grid-3">
    <div class="card-stat accent-pink">
      <div class="label">💬 แชทส่งถึงสาวๆ</div>
      <div class="val">${data.totalMessages}+</div>
      <div class="sub">เฉลี่ยคนละ ~${data.avgPerUser} ข้อความ</div>
    </div>
    <div class="card-stat accent-purple">
      <div class="label">🔓 ปลดล็อกสตอรี่ลับ</div>
      <div class="val">${data.unlockedStories}+</div>
      <div class="sub">ทุก ${data.unlockPaceSec} วินาทีมีคนปลดล็อก 1 สตอรี่</div>
    </div>
    <div class="card-stat accent-cyan">
      <div class="label">⏳ เวลาคุยสะสม</div>
      <div class="val">${data.totalPlayHours}+ ชม.</div>
      <div class="sub">เทียบเท่าคุยต่อเนื่อง ${data.equivDays} วัน</div>
    </div>
  </div>

  <div class="row-pills">
    <div class="pill-item">
      <div class="p-num">${data.milestoneLevel2}</div>
      <div class="p-txt">คนพิชิตใจ<br>ถึงขั้น 'คนรู้ใจ'</div>
    </div>
    <div class="pill-item">
      <div class="p-num">${data.milestoneSecret}</div>
      <div class="p-txt">คนปลดล็อก<br>ความลับสูงสุด</div>
    </div>
    <div class="pill-item">
      <div class="p-num">${data.satisfactionRate}</div>
      <div class="p-txt">ผู้เล่นฟินกับ<br>คำตอบของสาวๆ</div>
    </div>
  </div>

  <div class="main-split">
    <div class="panel">
      <div class="panel-title">🔥 สาวฮอตที่คนทักแชทหามากที่สุด</div>
      ${data.creators.map(c => `
        <div class="creator-bar-item">
          <div class="creator-header">
            <span class="creator-name">${c.name}</span>
            <span class="creator-pct">${c.pct}%</span>
          </div>
          <div class="bar-bg">
            <div class="bar-fill" style="width: ${c.pct}%; background: ${c.color}"></div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="panel">
      <div class="panel-title">📸 สตอรี่ & โมเมนต์ยอดฮิต</div>
      ${data.moments.map(m => `
        <div class="moment-item">
          <span class="moment-name">${m.name}</span>
          <span class="moment-pct">${m.pct}%</span>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="chart-box">
    <div class="chart-header">
      <span class="chart-title">📈 คนคุยทุกชั่วโมง ตลอด 24 ชม.</span>
      <span class="chart-peak">⚡ พีคตรงช่วง ${data.hourlyPeak} (${data.peakUsers} คนพร้อมกัน)</span>
    </div>
    <svg class="chart-svg" viewBox="0 0 700 60">
      <path d="M0,45 Q60,42 120,40 T240,46 T360,38 T480,30 T560,18 T620,10 T700,28 L700,60 L0,60 Z" fill="rgba(244,63,94,0.12)" />
      <path d="M0,45 Q60,42 120,40 T240,46 T360,38 T480,30 T560,18 T620,10 T700,28" fill="none" stroke="#f43f5e" stroke-width="2.5" />
      <circle cx="620" cy="10" r="4.5" fill="#facc15" stroke="#090c15" stroke-width="1.5" />
      <text x="570" y="32" fill="#facc15" font-size="10" font-family="'Fredoka', sans-serif">23:00</text>
    </svg>
  </div>

  <div class="cta-banner">
    <div class="cta-text">
      <h3>✨ ยังไม่สาย! มาร่วมค้นหาความลับของพวกเธอ</h3>
      <p>เล่นฟรีบนเว็บ ไม่ต้องดาวน์โหลดแอป · รองรับทั้งมือถือและคอมพิวเตอร์</p>
    </div>
    <div class="cta-button">เข้าเล่นเลย</div>
  </div>

  <div class="footer">
    <span>ข้อมูลจากสถิติเซิร์ฟเวอร์จริง Instagoon AI Core</span>
    <span class="footer-domain">instagoon.app</span>
  </div>
</body>
</html>`;
}

function buildSecurityHtml(data) {
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Mitr:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 800px;
    height: 1060px;
    background: #080d1a;
    color: #f1f5f9;
    font-family: 'Mitr', sans-serif;
    padding: 38px 36px 28px;
    position: relative;
    overflow: hidden;
    background-image: 
      radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.12) 0%, transparent 45%),
      radial-gradient(circle at 90% 20%, rgba(59, 130, 246, 0.12) 0%, transparent 45%),
      radial-gradient(circle at 50% 85%, rgba(245, 158, 11, 0.08) 0%, transparent 50%);
  }

  .header {
    text-align: center;
    margin-bottom: 22px;
  }
  .badge-top {
    display: inline-block;
    padding: 4px 16px;
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.4);
    border-radius: 999px;
    color: #fbbf24;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 10px;
  }
  .title {
    font-size: 28px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }
  .subtitle {
    font-size: 14px;
    color: #94a3b8;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 18px;
  }
  .card-stat {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 14px;
    padding: 16px 14px;
    text-align: center;
  }
  .card-stat .val {
    font-family: 'Fredoka', 'Mitr', sans-serif;
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .card-stat .label {
    font-size: 12px;
    color: #cbd5e1;
    margin-bottom: 2px;
  }
  .card-stat .sub {
    font-size: 11px;
    color: #64748b;
  }
  .card-stat.accent-amber .val { color: #f59e0b; }
  .card-stat.accent-blue .val { color: #38bdf8; }
  .card-stat.accent-emerald .val { color: #10b981; }

  .panel-attacks {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 14px;
    padding: 16px 18px;
    margin-bottom: 18px;
  }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .panel-title {
    font-size: 14px;
    font-weight: 600;
    color: #f8fafc;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .attack-row {
    margin-bottom: 10px;
  }
  .attack-info {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 4px;
  }
  .attack-target { font-family: monospace; color: #e2e8f0; font-size: 12px; }
  .attack-count { font-family: 'Fredoka', sans-serif; color: #fbbf24; font-weight: 600; }
  .bar-bg {
    width: 100%;
    height: 7px;
    background: #1e293b;
    border-radius: 4px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, #f59e0b, #ef4444);
  }
  .panel-note {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 10px;
    line-height: 1.5;
    padding-top: 8px;
    border-top: 1px dashed #1e293b;
  }

  .grid-2-bottom {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 18px;
  }
  .box-guide {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 14px;
    padding: 16px;
  }
  .box-guide.box-safe { border-color: rgba(16, 185, 129, 0.3); }
  .box-guide.box-tips { border-color: rgba(59, 130, 246, 0.3); }
  .guide-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .box-safe .guide-title { color: #34d399; }
  .box-tips .guide-title { color: #60a5fa; }
  .guide-list {
    list-style: none;
  }
  .guide-item {
    font-size: 11px;
    color: #cbd5e1;
    margin-bottom: 8px;
    display: flex;
    align-items: flex-start;
    gap: 6px;
    line-height: 1.4;
  }
  .guide-item:last-child { margin-bottom: 0; }
  .icon-check { color: #10b981; font-weight: 700; }
  .icon-user { color: #38bdf8; font-weight: 700; }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #64748b;
    padding: 0 4px;
  }
  .footer-domain {
    font-family: 'Fredoka', sans-serif;
    font-weight: 700;
    font-size: 15px;
    color: #38bdf8;
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="badge-top">เรื่องเล่าจากหลังบ้าน · บันทึกความปลอดภัย</div>
    <div class="title">บอทแอบมาเคาะประตูเซิร์ฟเวอร์ วันละ ~2,500 ครั้ง</div>
    <div class="subtitle">เราเปิดบันทึกความปลอดภัยของ Cloudflare Edge & D1 ${data.timeframe} แล้วเจอสิ่งนี้...</div>
  </div>

  <div class="grid-3">
    <div class="card-stat accent-amber">
      <div class="val">${data.scanAttemptsMonth}</div>
      <div class="label">ครั้งที่บอทพยายามสแกน</div>
      <div class="sub">สกัดกั้นที่ Cloudflare Edge WAF</div>
    </div>
    <div class="card-stat accent-blue">
      <div class="val">${data.blockedIps}</div>
      <div class="label">IP แปลกปลอมทั่วโลก</div>
      <div class="sub">พยายามเข้ามาทดสอบระบบ</div>
    </div>
    <div class="card-stat accent-emerald">
      <div class="val">${data.dataBreachCount} ครั้ง</div>
      <div class="label">ที่ข้อมูลหลุดรอด</div>
      <div class="sub">ความลับและแชทผู้เล่นปลอดภัย 100%</div>
    </div>
  </div>

  <div class="panel-attacks">
    <div class="panel-header">
      <span class="panel-title">🔍 ช่องทางที่บอทแอบมาสุ่มเดาบ่อยที่สุด</span>
      <span style="font-size: 11px; color: #64748b;">(ดักจับได้ทันที)</span>
    </div>
    ${data.topAttacks.map(a => `
      <div class="attack-row">
        <div class="attack-info">
          <span class="attack-target">${a.target}</span>
          <span class="attack-count">${a.count}</span>
        </div>
        <div class="bar-bg">
          <div class="bar-fill" style="width: ${a.pct}%"></div>
        </div>
      </div>
    `).join('')}
    <div class="panel-note">
      💡 <b>บอทไม่ได้ฉลาด</b> แค่สุ่มเดาโฟลเดอร์และรหัสผ่านเก่าๆ ที่เคยหลุด แต่ที่ Instagoon ไม่มีรหัสผ่านให้เจาะ เพราะเราใช้ Google OAuth 2.0 (PKCE) ยืนยันตัวตนผ่าน Edge ทันที
    </div>
  </div>

  <div class="grid-2-bottom">
    <div class="box-guide box-safe">
      <div class="guide-title">🛡️ ทำไมข้อมูลของคุณถึงปลอดภัย</div>
      <ul class="guide-list">
        <li class="guide-item"><span class="icon-check">✓</span> <b>ไม่มีรหัสผ่านให้เดา:</b> ล็อกอินผ่านกุญแจดิจิทัล Google Sign-in</li>
        <li class="guide-item"><span class="icon-check">✓</span> <b>รูปภาพล็อกสิทธิ์:</b> ทุกภาพต้องผ่าน Session Guard เท่านั้น</li>
        <li class="guide-item"><span class="icon-check">✓</span> <b>แชทลับแยกฐานข้อมูล:</b> เก็บใน Cloudflare D1 เข้ารหัสมาตรฐานสูง</li>
        <li class="guide-item"><span class="icon-check">✓</span> <b>สแปมซ้ำ = โดนตัด:</b> ระบบ Rate Limit ดักจับและระงับทันที</li>
      </ul>
    </div>

    <div class="box-guide box-tips">
      <div class="guide-title">👤 ผู้เล่นดูแลบัญชีตัวเองได้ง่ายๆ</div>
      <ul class="guide-list">
        <li class="guide-item"><span class="icon-user">•</span> ใช้บัญชี Google ที่เปิด 2-Step Verification (2FA)</li>
        <li class="guide-item"><span class="icon-user">•</span> ระวังไม่แชร์หน้าจอหรือลิงก์เข้าเล่นส่วนตัวให้คนอื่น</li>
        <li class="guide-item"><span class="icon-user">•</span> ทีมงานตัวจริงไม่มีวันทักมาขอรหัสผ่านหรือแชทลับของคุณ</li>
        <li class="guide-item"><span class="icon-user">•</span> หากสงสัยการใช้งาน ติดต่อผ่านช่องทางหลักของเกมเท่านั้น</li>
      </ul>
    </div>
  </div>

  <div class="footer">
    <span>ข้อมูลจากบันทึก Cloudflare Edge WAF & Instagoon Core</span>
    <span class="footer-domain">instagoon.app</span>
  </div>
</body>
</html>`;
}

function renderHtmlToPng(htmlContent, outputPath) {
  const tmpHtml = path.resolve(outputDir, `_temp_${Date.now()}_${Math.random().toString(36).substring(7)}.html`);
  fs.writeFileSync(tmpHtml, htmlContent, 'utf-8');

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Google Chrome not found at ${chromePath}`);
  }

  try {
    execFileSync(chromePath, [
      '--headless=new',
      '--disable-gpu',
      '--force-device-scale-factor=2',
      '--virtual-time-budget=2500',
      '--window-size=800,1060',
      `--screenshot=${outputPath}`,
      `file://${tmpHtml}`
    ], { stdio: 'pipe' });
  } finally {
    if (fs.existsSync(tmpHtml)) {
      fs.unlinkSync(tmpHtml);
    }
  }
}

async function main() {
  console.log(`[INFO] Generating Instagoon Social Infographics...`);
  const timestamp = new Date().toISOString().slice(0, 10);

  if (templateArg === 'stats' || templateArg === 'all') {
    const statsData = customData?.stats || defaultStatsData;
    const statsHtml = buildStatsHtml(statsData);
    const statsPng = path.resolve(outputDir, `instagoon_stats_24h_${timestamp}.png`);
    renderHtmlToPng(statsHtml, statsPng);
    console.log(`[SUCCESS] Generated Stats Infographic: ${statsPng}`);
  }

  if (templateArg === 'security' || templateArg === 'all') {
    const securityData = customData?.security || defaultSecurityData;
    const securityHtml = buildSecurityHtml(securityData);
    const securityPng = path.resolve(outputDir, `instagoon_security_report_${timestamp}.png`);
    renderHtmlToPng(securityHtml, securityPng);
    console.log(`[SUCCESS] Generated Security Infographic: ${securityPng}`);
  }

  console.log(`[DONE] All infographics saved to ${outputDir}`);
}

main().catch(err => {
  console.error(`[ERROR] Failed to generate infographics:`, err);
  process.exit(1);
});
