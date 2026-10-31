# Studio Surface on Staging Host and Git-Driven Content Pipeline

> **อัปเดต 31 ต.ค. 2026 (หลังตัดสินใจ):** เว็บ Studio ถูกลบออกทั้งหมดแล้ว (commit `a8900d8`) ไม่มี `/studio` บน staging, ไม่มี `dist-studio`, ไม่มี `STUDIO_KEY`/`POST /auth/login` และไม่มี `/api/admin` ที่เขียนเนื้อหา ส่วนที่ระบุถึง Studio ในเอกสารนี้จึงไม่มีผลแล้ว
> ระบบจริง: เนื้อหาอยู่ใน git ที่ `apps/Instagoon/content/` (`creators/<id>/character.json`, `posts.json`, `stories.json`, `media/<key>` ดู `content/README.md`) · build รวมเข้า `dist/_content` และ Worker sync เข้า D1 เองเมื่อเวอร์ชันเปลี่ยน (ตัวละคร/โพสต์ที่หายไปเป็น `suspended`) · รูปเสิร์ฟผ่าน `/api/media` เท่านั้น · merge เข้า `main` → deploy staging อัตโนมัติ → prod รออนุมัติใน GitHub environment `production` · ข้อที่ยังมีผล: git เป็นต้นฉบับ, AI agent ฝั่ง Content มีสิทธิ์ git เท่านั้น, ทุกการเปลี่ยนผ่าน PR, prod ต้องอนุมัติ

Status: accepted (31 ต.ค. 2026) — supersede เฉพาะข้อ 1 (air-gapped) ของ [ADR 0006](0006-air-gapped-npc-studio-and-server-side-runtime.md) ส่วนการ isolate runtime ฝั่งเซิร์ฟเวอร์ของ 0006 ยังคงผลทั้งหมด

เจ้าของการตัดสินใจ: เจ้าของผลิตภัณฑ์ (Game UI) สรุปผ่านการซักถาม 7 รอบร่วมกับ Codex รายละเอียดการส่งต่อให้ทีม Content อยู่ที่ [CONTENT_TEAM_AGENT_HANDOFF.md ภาคผนวก ก](../CONTENT_TEAM_AGENT_HANDOFF.md) สัญญาจุดเชื่อมต่ออยู่ที่ [docs/api-contract.md](../api-contract.md) ขั้นตอนปล่อยจริงอยู่ที่ [INSTAGOON_RELEASE_RUNBOOK.md](../INSTAGOON_RELEASE_RUNBOOK.md)

## บริบท

- ระบบมีสอง environment ที่แยก worker และแยก D1 อยู่แล้ว: `froststory-api` + D1 `froststory` บน `instagoon.app` และ `instagoon-staging` (`worker/src/staging.mjs`) + D1 `instagoon-staging` บน `staging.instagoon.app`
- ADR 0006 สั่งให้ Studio เป็น air-gapped บนเครื่องและส่งงานเป็น ZIP เท่านั้น ขณะที่ `HANDOFF_CODEX_2026-10-31.md` เสนอ Studio ออนไลน์บนโดเมนแยกใหม่ `studio.instagoon.app` แผนทำงานร่วมกันของทีมระบุชัดว่า "ต้องตัดสินใจว่าข้อใดใช้ต่อ ก่อนแก้หรือแทนที่ ADR" (ข้อ 48)
- สภาพปัจจุบันที่ตรวจจริง: `studio.html` เป็น build input ร่วมกับ `index.html` ใน `apps/Instagoon/vite.config.ts` ทำให้ `instagoon.app/studio` เสิร์ฟ Studio bundle เต็ม และ `POST /auth/login` ด้วย `STUDIO_KEY` ให้ session ที่มี role `admin` บน host ของผู้เล่น (`worker/src/index.mjs:173-188`) ซึ่งขัดกับความต้องการ "ไม่มีเส้นทางจาก instagoon.app ถึง Studio" ของเจ้าของผลิตภัณฑ์
- `staging.mjs:32` เป็นฝ่ายปิดกั้นเส้นทาง `/studio`, `/studio.html`, `/api/admin/*`, `/api/dev/*`, `/auth/login`, `/auth/demo` บน staging ไว้ตั้งแต่แรก
- repo ยังไม่มีโฟลเดอร์ `content/`, ยังไม่มี `docs/api-contract.md`, `migrations/` ถึง `0006` และไม่มีตาราง audit หรือ published revision

## การตัดสินใจ

1. **ไม่สร้างโดเมนใหม่ในเฟส 1.** ไม่มี `studio.instagoon.app` และไม่ต้องเพิ่ม DNS record/Access app/worker ใหม่ ชื่อ `studio.instagoon.app` ถูกจองไว้สำหรับเฟส 2 คือวันที่เครื่องมือจำเป็นต้องดูหรือคุมข้อมูลจริง (analytics, liveops) เท่านั้น
2. **Surface ของเครื่องมือไปอยู่บน host ทดสอบ** ที่ `staging.instagoon.app/studio` โดยแก้ `staging.mjs` ให้เปิดเฉพาะเส้นทางนี้ + endpoint ที่จำเป็น และให้ใช้ allowlist ชุดเดียวกับ `STAGING_EMAILS` (staging ถูกสร้างมาเพื่อทีมพัฒนา)
3. **Build แยกสองผลลัพธ์** `dist` มีเฉพาะผู้เล่น (ใช้ทั้ง prod และ staging) และ `dist-studio` สำหรับเครื่องมือ (เสิร์ฟเฉพาะบน staging) prod bundle ต้องไม่มี Studio code ตามเจตนาเดิมของ 0006
4. **ไฟล์ใน git เป็นต้นฉบับ** โครง `content/creators/<id>/` ที่ validate ด้วย `NpcSchema` v1.0 (`src/modules/npc-studio/lib/npc/schema.ts`) D1 เป็นสำเนาที่ระบบ sync เข้าไป การลบหรือเปลี่ยน id ไม่ลบข้อมูลจริง เปลี่ยนเป็น `status = suspended`
5. **เส้นทางข้อมูล** PR → CI dry-run validate → merge `main` → job sync upsert-by-id เข้า D1 `instagoon-staging` → ตรวจเกมจริงบน staging → อนุมัติผ่าน GitHub environment approval (1 จาก Game UI + 1 จาก Content ตาม `CODEOWNERS`) → job เดียวกันนั้นเขียน D1 `froststory` และ apply migration ตาม runbook
6. **ไม่มี credential ของระบบอยู่ในเครื่องมือสำหรับคนนอก.** ตัด `STUDIO_KEY` ออกจากทุก environment ปิด `POST /auth/login` แบบ passcode บน prod และให้ Studio UI ใช้ session จาก Gmail เท่านั้น AI agent ฝั่ง Content มีสิทธิ์ git เท่านั้น ไม่ต้องมี token ของ studio
7. **การย้อนกลับไม่ใช่การ restore ฐานข้อมูล.** snapshot ของชุดเนื้อหาที่เผยแพร่คือ commit sha/tag และถูกบันทึกในตาราง `published_revisions` การ rollback คือการรัน job เผยแพร่ sha เดิมใหม่
8. **งานแอดมินบน prod** (เพิ่ม/ระงับ invite, ตั้ง energy) ย้ายจากหน้าเว็บไปเป็น CI job หรือสคริปต์ที่เจ้าของบัญชีสั่งรันผ่าน `wrangler` + GitHub Actions ที่ต้องอนุมัติ

## ผลที่ตามมา

- คำถามตั้งต้น "ควรมี `studio.instagoon.app` ไหม" ได้คำตอบว่า **ยังไม่มีในเฟส 1** เพราะสิ่งที่ขาดจริงไม่ใช่โดเมน แต่คือ (ก) เส้นทาง sync จาก git เข้า D1 (ข) audit และ published revision (ค) การปิด Studio บน host ผู้เล่น การสร้างโดเมนใหม่ตอนนี้จะจ่ายค่า setup ซ้ำซ้อนกับ staging โดยไม่มีผู้ใช้จริง
- ผู้ที่ทดสอบเล่นเกมบน staging ได้ จะมีสิทธิ์เข้าหน้าเครื่องมือบน staging ด้วย (allowlist ชุดเดียว) ข้อนี้ยอมรับโดยเจตนา เพราะ environment ทดสอบไม่มีข้อมูลผู้เล่นจริง และจะทบทวนเมื่อ `STUDIO_EMAILS` แยกชุดมีความจำเป็น
- การปิด `STUDIO_KEY` ทำให้ต้องแก้อันดับแรกคือ `FrostStoryStudio.tsx:363` และ `CloudStudio.tsx:21` ที่ยังล็อกอินด้วย passcode รวมถึงลบปุ่ม "สมัคร" ที่เรียก `/auth/register` ซึ่งถูกลบไปแล้ว
- migration ใหม่เป็น `0007` แบบ additive เท่านั้น (`audit_log`, `published_revisions`) และต้อง apply ที่ staging ก่อน prod ตาม runbook เพราะ workflow ปัจจุบัน deploy worker เมื่อ push `main` โดยไม่รัน migration
- `docs/TEAM_CONTENT_DEV_GUIDE.md` ยังชี้ URL ของ Studio สาธารณะ ต้องแก้พร้อมกันไม่งั้นทีม Content จะกลับไปใช้เส้นทางที่จะถูกปิด
- ข้อจำกัดที่ยอมรับ: audit บน staging จะไม่แยกว่าใครเป็นใครถ้าคนในทีมใช้บัญชี Gmail ร่วมกัน ต้องใช้บัญชีตัวเองเท่านั้น (ระบุไว้ใน runbook)

## คำถามเปิดที่มีกำหนดเวลา

`content/` ควรอยู่ pathไหนและสื่อส่งเข้า environment ทดสอบอย่างไร ถูกยกให้เป็นคำถามสำรวจของ AI agent ฝั่ง Content (OQ-1, OQ-2) กำหนดตอบ 4 พ.ย. 2026 พร้อมค่า default ชั่วคราวและหลักฐานที่ต้องการ ดู ภาคผนวก ก ของ `CONTENT_TEAM_AGENT_HANDOFF.md` งานเขียน sync script เริ่มได้หลังคำตอบนี้หรือหลังพ้นกำหนด

## สิ่งที่ไม่เปลี่ยน

- runtime isolation ตาม ADR 0006 ข้อ 2-4 ยังอยู่: system prompt, secrets, กฎความสัมพันธ์, เงื่อนไข reward ที่ยังปลดล็อกไม่ได้ ทำงานบน Worker เท่านั้น
- ZIP import ยังใช้ได้เป็น fallback สำหรับงาน bulk แต่ไม่ใช่เส้นทางหลักของ pipeline
- Google OAuth เป็นทางเข้าเดียวของผู้เล่น และการยืนยันอายุ 18+ ยังบังคับกับบัญชีใหม่ทุกบัญชี
