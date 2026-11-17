# 📊 Instagoon Analytics Plane (`analytics.instagoon.app`)

> **Production Intelligence & Creator Dashboard Guide**  
> เอกสารคู่มือนักพัฒนาและ AI Agent (Taychin's Agent, Gemini, Claude Code, Cursor, Codex) สำหรับการปรับปรุง พัฒนาต่อ และดูแลระบบ Analytics ของ Instagoon

---

## 🏛️ 1. สถาปัตยกรรมระบบ (System Architecture)

ระบบ Analytics ถูกแยกขาดเป็น **Worker อิสระ (`instagoon-analytics`)** ไม่ใช้ Worker ร่วมกับเกมหลักเพื่อป้องกัน Performance Impact และ Data Leakage:

- **Domain:** `https://analytics.instagoon.app`
- **Data Source:** Production D1 Database (`froststory`, id: `6a48d2df-a32b-4b13-9148-7ed2abfc0789`)
- **Query Strategy:** **Rollup Only** — ทุกการแสดงผลอ่านจากตารางสรุปรายชั่วโมง (`analytics_rollup`) ที่ถูกคำนวณล่วงหน้าโดย Cron Trigger (`12 * * * *`) **ห้าม query ตารางสดที่ผู้เล่นกำลังเขียน**
- **Hosting Model:** Cloudflare Workers Static Assets (`[assets]`) + API Worker โดยตั้งค่า `run_worker_first = ["/api/*", "/auth/*"]` และ `not_found_handling = "single-page-application"`

---

## 📁 2. โครงสร้างไฟล์ใน Repository

```text
client/
  ├── analytics.html                     # HTML Template หลักของ Analytics SPA (noindex, nofollow)
  ├── vite.analytics.config.ts           # การตั้งค่า Vite แยกเฉพาะสำหรับบิลด์ Analytics
  └── analytics/
        ├── main.tsx                     # Entry Point ของ React
        ├── analytics.css                # สไตล์ Tailwind Dark Theme + Glassmorphism
        ├── types.ts                     # Schema และ TypeScript Interfaces
        ├── AnalyticsApp.tsx             # State Machine (Routing / Auth Verification)
        ├── AdminDashboard.tsx           # หน้าจอผู้ดูแลระบบ (เต็มรูปแบบ + ตัวเลขการเงิน)
        ├── CreatorDashboard.tsx         # หน้าจอ Cosplay Creator (เฉพาะตัวละครตนเอง ไร้ตัวเลขเงิน)
        └── AccessDenied.tsx             # หน้าจอ 401 Unauthorized, 403 Forbidden, 503

server/
  ├── wrangler.analytics.toml            # การตั้งค่า Cloudflare Worker ของ analytics.instagoon.app
  └── src/
        ├── analytics.mjs                # Entry point worker, auth token bridge, asset forwarder
        ├── analytics-api.mjs            # API Endpoints (/api/analytics/overview, /api/analytics/me)
        └── analytics-rollup.mjs         # Cron Rollup Calculation Engine
```

---

## 🔐 3. ระบบสิทธิ์และการยืนยันตัวตน (Authentication & Access)

### 3.1 บัญชีผู้ดูแลระบบ (Admin Users)
บัญชีที่ได้รับสิทธิ์ Admin เต็มรูปแบบบน Production Analytics:
- `jirapat.chumee@gmail.com`
- `taychinsgo@gmail.com`

**ระบบตรวจสอบ 2 ชั้น (Double Guardrail):**
1. ตาราง D1 `user_credentials`: ตรวจสอบคอลัมน์ `role = 'admin'`
2. Worker Secret `ANALYTICS_ADMIN_EMAILS`: รายชื่ออีเมล Break-glass ที่ได้รับสิทธิ์ Admin ทันที

### 3.2 บัญชี Creator
- Creator ที่เป็นเจ้าของตัวละครใน `cosplay_accounts` หรือ `studio_creators` จะเห็นเฉพาะสถิติของตัวละครตนเองเท่านั้น
- **Non-Negotiable Rule:** ข้อมูลทางการเงิน ยอดเติมเงินรวม และข้อมูลตัวละครของผู้อื่น **ต้องไม่รั่วไหลไปยัง Creator Payload โดยเด็ดขาด** (ตรวจจับอัตโนมัติด้วย `server/tests/analytics-plane-isolation.test.mjs`)

### 3.3 วิธีเข้าสู่ระบบ (Session Bridge)
เนื่องจาก Cookie จากเว็บเกม `instagoon.app` เป็น Host-Only Cookie จึงมีระบบ Direct Session Token สำหรับโดเมน `analytics.instagoon.app`:
- **Endpoint:** `GET /auth/session?token=<raw_token>` จะบันทึก `Set-Cookie: frost_session=...` ลงบนโดเมน `analytics.instagoon.app` และ redirect ไปที่ `/`
- มีช่องให้กรอก Token ได้โดยตรงในหน้าจอ 401

---

## 🛠️ 4. คำสั่งสำหรับนักพัฒนาและ AI Agent (Workflow Commands)

### 4.1 บิลด์ Frontend Analytics
```bash
# บิลด์ SPA ไปยัง client/dist-analytics/
pnpm --dir client build:analytics
```

### 4.2 ทดสอบความถูกต้อง (Test Suite)
```bash
# รันชุดทดสอบความปลอดภัยและการแยกโดเมนของ Analytics
node --experimental-strip-types --test server/tests/analytics-plane-isolation.test.mjs

# รันชุดทดสอบทั้งหมดของระบบ
pnpm test
```

### 4.3 Deploy ขึ้น Live Production
AI Agent ของ Taychin และทีมงานสามารถ Deploy เวอร์ชันล่าสุดขึ้น `analytics.instagoon.app` ได้โดยตรงด้วยคำสั่ง:
```bash
cd server && npx wrangler deploy --config wrangler.analytics.toml
```

---

## 💡 5. แนวทางการพัฒนาและปรับปรุงต่อ (Improvement Guidelines for Taychin's Agent)

1. **การปรับแต่ง UI/UX:**
   - สามารถแก้ไข UI ใน `client/analytics/` ได้อิสระ (เพิ่มกราฟ Chart.js/Recharts, Filter ช่วงเวลา, ตัวชี้วัด Retention ฯลฯ)
   - คงความสวยงามในธีม Dark Mode + Neon Accent ตามสไตล์ Instagoon
2. **การเพิ่ม Metric ใหม่ใน Rollup:**
   - หากต้องการสถิติใหม่ ให้เพิ่มการคำนวณลงใน `server/src/analytics-rollup.mjs`
   - ต้องคำนวณแบบ Idempotent (รันซ้ำต้องทับค่าเดิม ไม่ใช่บวกสะสมเบิ้ล)
3. **Traffic Adapter (T6):**
   - ใน `AdminOverviewPayload.meta.traffic` สามารถพัฒนาตัวเชื่อมต่อ Cloudflare Insights API หรือ GA4 Data API เพิ่มเติมได้
4. **ความปลอดภัย:**
   - ห้ามลบ Header `X-Robots-Tag: noindex, nofollow` หรือแก้ `robots.txt` ให้ Search Engine เข้าถึง
   - ห้าม commit Token หรือ Secret ลง git เด็ดขาด
