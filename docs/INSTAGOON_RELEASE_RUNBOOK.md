# Instagoon Release Runbook

> **อัปเดต 31 ต.ค. 2026 (หลังตัดสินใจ):** เว็บ Studio ถูกลบออกทั้งหมดแล้ว (commit `a8900d8`) ไม่มี `/studio` บน staging, ไม่มี `dist-studio`, ไม่มี `STUDIO_KEY`/`POST /auth/login` และไม่มี `/api/admin` ที่เขียนเนื้อหา ส่วนที่ระบุถึง Studio ในเอกสารนี้จึงไม่มีผลแล้ว
> ระบบจริง: เนื้อหาอยู่ใน git ที่ `apps/Instagoon/content/` (`creators/<id>/character.json`, `posts.json`, `stories.json`, `media/<key>` ดู `content/README.md`) · build รวมเข้า `dist/_content` และ Worker sync เข้า D1 เองเมื่อเวอร์ชันเปลี่ยน (ตัวละคร/โพสต์ที่หายไปเป็น `suspended`) · รูปเสิร์ฟผ่าน `/api/media` เท่านั้น · merge เข้า `main` → deploy staging อัตโนมัติ → prod รออนุมัติใน GitHub environment `production` · ข้อที่ยังมีผล: git เป็นต้นฉบับ, AI agent ฝั่ง Content มีสิทธิ์ git เท่านั้น, ทุกการเปลี่ยนผ่าน PR, prod ต้องอนุมัติ

31 ต.ค. 2026 · ผู้รันขั้นตอนที่แตะ Cloudflare/GitHub production ต้องเป็นเจ้าของบัญชี (jirapat.chumee) เท่านั้น · อ้างอิงการตัดสินใจ [ADR 0007](adr/0007-studio-surface-on-staging-host-and-git-driven-content-pipeline.md) และ contract [api-contract.md](api-contract.md)

## ส่วน A — เคลียร์งานค้างบน prod ก่อน (ทำก่อนเรื่อง Studio)

`apps/Instagoon/instagoon-status.md` ระบุว่า `main` นำหน้า `origin/main` 2 commit (`5816f59`, `e0f48c5`) และ CI จะ deploy worker ทันทีเมื่อ push แต่ **ไม่รัน migration ให้**

ลำดับที่ต้องเป็นแบบนี้เท่านั้น:

1. ตรวจว่า migration `0006_dm_threads_and_metrics.sql` ถูก apply บน prod แล้ว
   `pnpm --dir apps/Instagoon exec wrangler d1 migrations apply froststory --remote`
   ตรวจซ้ำด้วย `wrangler d1 migrations list froststory --remote` (รายการ pending ต้องว่าง) หรือ
   `wrangler d1 execute froststory --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('dm_threads','ai_turn_metrics')"` ถ้าไม่มีสองตารางนี้ แชท DM บน prod จะพัง
2. ตั้ง secret ที่ยังขาดบน worker `froststory-api`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (ระวังห้าม echo ค่า secret ออกจอ)
3. ตรวจ model names ที่ฝังในโค้ดด้วย `/api/dev/test-models` **บน staging** เท่านั้น (prod จะไม่มี `/api/dev/*` หลังจบส่วน C)
4. push `main` แล้วดู GitHub Actions ว่า deploy สำเร็จ
5. smoke test: ล็อกอิน Gmail 1 ครั้ง + ส่ง DM 1 ข้อความบน `instagoon.app`

## ส่วน B — เปิด Studio บน environment ทดสอบ

ยังไม่ต้องแตะ Cloudflare DNS/Access เลยในเฟส 1 (ไม่มีการสร้างโดเมนใหม่)

1. **แยก build** เพิ่ม mode `studio` ใน `apps/Instagoon/vite.config.ts` ให้ `dist` มี `index.html` เป็น input เดียว และ `dist-studio` มี `studio.html` (เปลี่ยนชื่อเป็น `index.html` ในผลลัพธ์) ตรวจว่า `dist/assets/` ไม่มี chunk ของ `FrostStoryStudio` หรือ `CloudStudio` เหลืออยู่
2. **แก้ `worker/src/staging.mjs`** ให้เสิร์ฟ `dist-studio` ที่ `/studio` และเปิดเฉพาะ `/api/studio/*` + endpoint ที่ contract ระบุ โดยยังปิด `/auth/login`, `/auth/demo`, `/auth/register` ไว้เหมือนเดิม
3. **เพิ่ม allowlist** ใช้ `STAGING_EMAILS` ชุดเดียว (ตามข้อตัดสิน) และเพิ่มอีเมลของทีม Content ที่ได้รับอนุญาตเข้าไปใน var นี้ของ worker staging
4. **แก้ UI ล็อกอิน** ของ `FrostStoryStudio.tsx:363` และ `CloudStudio.tsx:21` ให้ใช้ session จาก Gmail เลิกส่ง `studioKey` และลบปุ่ม "สมัคร" ที่เรียก `/auth/register`
5. **migration `0007`** (additive เท่านั้น: `audit_log`, `published_revisions`) apply บน `instagoon-staging` ก่อน:
   `pnpm --dir apps/Instagoon exec wrangler d1 migrations apply instagoon-staging --remote --config worker/wrangler.staging.toml`
6. **ตรวจผลจริง** เข้า `staging.instagoon.app/studio` ด้วยบัญชีที่อยู่ใน allowlist แล้วเปิดหน้า health ที่แสดง commit sha + เวลา sync ล่าสุด + ผล validate ตาม contract

## ส่วน C — ปิดเส้นทางของ Studio และ passcode บน prod

ทำหลังส่วน B ใช้ได้แล้วเท่านั้น (ห้ามตัดทางก่อนที่เครื่องมือใหม่จะทำงานได้)

1. deploy worker `froststory-api` ที่ให้ `/studio`, `/api/studio/*`, `/api/admin/*`, `/api/dev/*`, `POST /auth/login`, `/auth/demo` ตอบ **404** ทั้งหมด
2. ลบ secret `STUDIO_KEY` ออกจากทั้ง prod และ staging
3. ตรวจว่า `https://instagoon.app/studio` ตอบ 404 และไม่มี studio chunk ใน `instagoon.app` bundle (grep ชื่อไฟล์ใน `dist/assets/` ของ build จริง)
4. อัปเดต `docs/TEAM_CONTENT_DEV_GUIDE.md` ที่ยังชี้ URL สาธารณะของ Studio

งานแอดมินที่เคยทำผ่านหน้าเว็บ (เพิ่ม/ระงับ invite, ตั้ง energy) ให้รันเป็น job ของ CI หรือ `wrangler d1 execute` ตามสคริปต์ใน repository โดย owner เท่านั้น

## ส่วน D — Pipeline เนื้อหา (หลังทีม Content ตอบ OQ-1, OQ-2)

1. PR ที่แตะ `content/**` → CI รัน validate แบบ dry-run (`invalid_schema`, `duplicate_id`, `media_too_large`, `orphan_revision`) ห้าม merge ถ้าไม่ผ่าน
2. merge `main` → job sync upsert-by-id เข้า D1 `instagoon-staging` ด้วย `Idempotency-Key` + `X-Content-Sha` และเขียน `audit_log`
3. ทั้งสองทีมเล่นเกมจริงบน staging (UI, gameplay, ตัวละคร, สื่อ, แชท AI) และดู sha ที่ footer เพื่อยืนยันว่ากำลังตรวจชุดไหน
4. อนุมัติผ่าน GitHub environment approval ต้องมี **1 จากทีม Game UI + 1 จากทีม Content** (รายชื่อผูกกับ `.github/CODEOWNERS`)
5. job publish เขียน D1 `froststory` + บันทึก `published_revisions` + `audit_log` ผู้เล่นที่สนทนาค้างอยู่ยังผูก revision เดิม (`chat_states.revision_id`) ผู้เล่นใหม่ได้ revision ใหม่
6. ห้ามใช้การ restore ฐานข้อมูลเป็นการ rollback มาตรฐาน เพราะจะทำให้ความทรงจำและความสัมพันธ์ของผู้เล่นหาย

## ส่วน E — ฉุกเฉิน / ย้อนกลับ

- ย้อนเนื้อหา: รัน job publish ด้วย commit sha ของชุดก่อน (snapshot คือ git sha ไม่ใช่ ZIP)
- หยุดกลางคัน: ตั้ง `status = suspended` บน revision ที่มีปัญหา ผ่าน CI job ไม่ใช่ผ่านเว็บ prod
- migration ที่ทำข้อมูลหาย: ยังไม่มีแผนสำรองที่พิสูจน์แล้ว ห้ามรัน migration แบบไม่ additive บน prod จนกว่า [ADR 0005](adr/0005-cloudflare-zero-cost-stack-and-offsite-backup.md) ว่าด้วยการ backup นอกที่จะถึงจะมีผลจริง
- เพดาน AI บน environment ทดสอบ: ต้องตั้งจำนวน request/งบต่อวันก่อนให้ agent ฝั่ง Content ทดสอบแชทจริง

## checklist ก่อนบอกทีม Content ว่าใช้การได้

- [ ] prod ไม่มี `/studio` และไม่มี studio chunk ใน bundle
- [ ] `STUDIO_KEY` ไม่เหลือใน env ใด และ `POST /auth/login` ไม่สร้าง session role admin
- [ ] ทุกบัญชีที่เข้า Studio ใช้ Gmail ส่วนตัวของตัวเอง (audit ต้องระบุตัวคนได้)
- [ ] sync job รันซ้ำสองครั้งแล้วข้อมูลไม่เปลี่ยน
- [ ] audit_log มีแถวของ sync และ publish ทุกครั้ง พร้อม commit sha
- [ ] approval ต้องครบสองทีมจริงตาม CODEOWNERS และทดสอบกรณีอนุมัติไม่ครบแล้ว
- [ ] OQ-1 และ OQ-2 ได้รับคำตอบ (กำหนด 4 พ.ย. 2026)
