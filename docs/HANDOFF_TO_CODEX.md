# 📦 สรุปส่งต่องานสถาปัตยกรรมและแผนสร้างระบบ Social Story Platform (FrostStory)

> **อัปเดต 29 ตุลาคม 2026:** handoff นี้เป็นข้อมูลเดิม ดู [ข้อตกลง MVP สำหรับ closed beta](froststory-beta-mvp.md) สำหรับขอบเขตและกติกาล่าสุด โดยเฉพาะการล็อกอิน คอมเมนต์ revision และการสำรองข้อมูล


> **เอกสารอ้างอิงหลักในโปรเจกต์:**
> - แผนพัฒนาฉบับสมบูรณ์: [`docs/social-story-platform-plan.md`](./docs/social-story-platform-plan.md)
> - บันทึกการออกแบบ: [`docs/social-story-platform-discovery.md`](./docs/social-story-platform-discovery.md)
> - คำศัพท์โดเมนมาตรฐาน: [`GLOSSARY.md`](./GLOSSARY.md)
> - การตัดสินใจสถาปัตยกรรม: [ADR-0004](./docs/adr/0004-script-revision-pinning-and-per-post-comment-cap.md) และ [ADR-0005](./docs/adr/0005-cloudflare-zero-cost-stack-and-offsite-backup.md)

---

## 1. ขอบเขตและบริบทของระบบ (Project Context)
- **ชื่อโครงการ:** `FrostStory` (สร้างเป็นแอปพลิเคชันแยกอิสระใน Monorepo ไม่ผูกกับเกม Overtime Secrets)
- **กลุ่มเป้าหมาย:** ประเทศไทย (ภาษาไทยเป็นหลัก รองรับ i18n ในอนาคต)
- **ระดับเนื้อหา:** **18+ ระดับ A (Ecchi / Suggestive / Gravure)** ไม่มีภาพเปลือยโจ่งแจ้ง (Explicit NSFW)
- **งบประมาณคลาวด์:** **0 บาท (Zero-Cost Stack)** บน Cloudflare Free Tiers:
  - **Cloudflare Workers**: รัน Game API, Studio API และเว็บแอป
  - **Cloudflare D1 (SQLite)**: ฐานข้อมูลหลัก
  - **Cloudflare R2**: คลังสื่อภาพ `.webp` และคลิปสั้น `.mp4`/`.webm` (10–15 วินาที, ขนาด 2–5 MB) พร้อม CDN Cache
  - **Cloudflare Access Zero Trust**: ป้องกันทางเข้า `/studio` ของผู้ดูแลระบบ
  - **Off-Site Backup**: ส่งออก D1 SQL dump และซิงก์ R2 ลงเครื่อง Local Master Archive (Mac Mini M4 Pro) และ Private Git

---

## 2. กฎหลักของระบบ (Core Invariants & Business Logic)
1. **Energy Token & Comment Farming Cap ([ADR-0004](./docs/adr/0004-script-revision-pinning-and-per-post-comment-cap.md)):**
   - ผู้เล่นเริ่มด้วยฟรี 3 Energy, คอมเมนต์สำเร็จหัก 1 Energy และได้ +1 ความสัมพันธ์กับ Creator ของโพสต์
   - **จำกัดสิทธิ์คอมเมนต์เพื่อรับแต้ม +1 ได้สูงสุด 1 ครั้งต่อ 1 โพสต์ต่อผู้เล่น** (ป้องกันการปั๊มแต้มซ้ำ)
   - ฟื้นฟูฟรีเต็ม 3 หน่วยทุก 4 ชั่วโมงนับจากการใช้ครั้งแรก ยอดซื้อแยกเก็บใน `Token Ledger` แบบ Append-Only
   - กรณีดึงเงินคืน (Chargeback): ปรับลดยอดซื้อใน Ledger โดย **ไม่หักค่าความสัมพันธ์หรือล็อกเนื้อเรื่องย้อนหลัง**
2. **ระบบ Stories 2 แบบ ([GLOSSARY.md](./GLOSSARY.md)):**
   - `Broadcast Story`: นับถอยหลัง 24 ชม. ตามเวลาเซิร์ฟเวอร์สำหรับทุกคน (ย้ายเข้า Highlight ได้)
   - `Unlockable Story`: สตอรี่ปลดล็อกตามเนื้อเรื่อง **เริ่มนับเวลาหมดอายุ 24 ชม. เมื่อผู้เล่นกดเปิดดูครั้งแรก (`firstViewedAt`) เท่านั้น** ป้องกันการพลาดเนื้อหาขณะออฟไลน์
3. **การแก้บทแชท (Immutable Script Revision Pinning - [ADR-0004](./docs/adr/0004-script-revision-pinning-and-per-post-comment-cap.md)):**
   - เธรดแชท DM ผูกกับ `revisionId` ของบทที่ผู้เล่นเริ่มเล่นจนจบเธรด ป้องกันสถานะพังจากการแก้ทางเลือกใน Studio
4. **ความยินยอมและการลบบัญชี (Age Gate & PDPA):**
   - ยืนยันอายุ 18+ ผ่าน `AgeConsentModal` ตอนเข้าสู่ระบบครั้งแรก (บันทึก `ageVerifiedAt`, `consentVersion` ใน D1 ไม่เก็บสำเนาบัตร)
   - เมื่อผู้เล่นขอลบบัญชี: ลบข้อมูลส่วนบุคคล ประวัติแชท และ **ลบคอมเมนต์ของผู้เล่นออกจากหน้าโพสต์ทั้งหมดทันที**

---

## 3. รายการงานที่ Codex ต้องสร้างให้เสร็จ (Implementation Checklist)

### 🔹 Phase 1: Database Schema & Zero-Cost Infrastructure Scaffold
- [ ] ออกแบบ D1 SQLite Migration (`schema.sql`):
  - `users` (id, email, google_id, role, age_verified_at, consent_version, created_at)
  - `creators` (id, slug, name, bio, avatar_url, banner_url, is_default, unlock_conditions)
  - `posts` (id, creator_id, media_urls, caption, pinned, simulated_likes, visibility_rules, published_at)
  - `comments` (id, post_id, user_id, content, is_hidden, created_at)
  - `stories` (id, creator_id, type ['broadcast' | 'unlockable'], media_url, expires_at, unlock_conditions)
  - `user_story_views` (user_id, story_id, first_viewed_at)
  - `chat_revisions` (id, creator_id, version, nodes_json, is_published)
  - `user_chat_states` (user_id, creator_id, revision_id, current_node_id, choice_history)
  - `relationships` (user_id, creator_id, score, unlocked_events)
  - `token_ledgers` (id, user_id, delta_free, delta_purchased, reason, audit_note, created_at)
  - `user_energy_states` (user_id, free_balance, purchased_balance, last_free_used_at, next_free_refill_at)
- [ ] ตั้งค่า Wrangler configuration (`wrangler.toml`) สำหรับ Workers + D1 bindings + R2 bucket bindings
- [ ] สคริปต์สำรองข้อมูลออฟไลน์ (`scripts/backup_d1_r2.sh`): ส่งออก D1 SQL dump และ sync R2 assets

### 🔹 Phase 2: Authentication & Studio Security
- [ ] Auth Handler บน Worker: รองรับ Google OAuth และ Email Magic Link/OTP พร้อมจัดการ Session Token บน D1
- [ ] คอมโพเนนต์ `AgeConsentModal` และ Middleware ตรวจสอบ `age_verified_at`
- [ ] คอนฟิก Cloudflare Access (Zero Trust) ครอบเส้นทาง `/studio/*` สำหรับบัญชีผู้ดูแล

### 🔹 Phase 3: Creator & Content Studio (หลังบ้านผู้ดูแลคนเดียว)
- [ ] **Creator Management:** เพิ่ม/แก้ Creator, กำหนด `Default` หรือ `Unlockable`
- [ ] **Content & Media Library:** อัปโหลดและจัดการสื่อภาพ (`.webp`) และคลิปสั้น (`.mp4`/`.webm` 10–15s / 2–5MB) ขึ้น R2
- [ ] **Post & Story Editor:** สร้างโพสต์พร้อมปักหมุด, Broadcast Stories, Unlockable Stories และ Reels
- [ ] **Dialogue & Script Editor:** เขียนบทแชท ตัวเลือก เงื่อนไขความสัมพันธ์ และเผยแพร่แบบออกหมายเลข `Script Revision`
- [ ] **Moderation & Token Ledger:** ดูรายงานและซ่อน/ลบคอมเมนต์, เครื่องมือ Admin Ledger Adjustment ปรับยอด Energy/ความสัมพันธ์พร้อมบันทึกเหตุผล

### 🔹 Phase 4: Social Frontend Experience (ปรับจาก `src/modules/insta-chat/`)
- [ ] **Feed & Profile:** ดึงโพสต์ตามสิทธิ์การมองเห็น, แสดงผลยอดไลก์จริงรวมกับไลก์จำลอง
- [ ] **Comment System:** บังคับสิทธิ์คอมเมนต์ 1 ครั้งต่อโพสต์/ผู้เล่น เพื่อหัก 1 Energy และได้ +1 ความสัมพันธ์
- [ ] **Dual-Story Bar & Viewer:**
  - แถบ Story ด้านบนแยกสีวงแหวน
  - ตัวนับถอยหลัง 24 ชม. สำหรับ Broadcast Story
  - ตัวนับถอยหลัง 24 ชม. หลังคลิกดูครั้งแรกสำหรับ Unlockable Story
- [ ] **In-App Notification Center:** กระดิ่งแจ้งเตือนเมื่อ Creator โพสต์ใหม่ หรือตอบแชท

### 🔹 Phase 5: DM Chat Runtime & Energy Loop
- [ ] ตัวประมวลผลบทสนทนา (Graph Interpreter) อิงตาม `revisionId`
- [ ] ระบบนับถอยหลังฟื้นฟู Energy 4 ชั่วโมงใน Worker Transaction
- [ ] ตรวจจับเงื่อนไขปลดล็อกอีเวนต์ความสัมพันธ์

---

## 4. แหล่งโค้ดต้นแบบที่นำมาต่อยอดได้ทันที
- คอมโพเนนต์ UI (Feed, Story Viewer, DM Bubbles, Quick Replies): [`src/modules/insta-chat/components/`](./src/modules/insta-chat/components)
- ข้อมูล Mock Data ตัวละคร: [`src/modules/insta-chat/mockData.ts`](./src/modules/insta-chat/mockData.ts)
- กราฟิก Asset ตัวละครและภาพประกอบ: โฟลเดอร์ `art/` และ [`src/demo/overtimeSecretsAssets.ts`](./src/demo/overtimeSecretsAssets.ts)
