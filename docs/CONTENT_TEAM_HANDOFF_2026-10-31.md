# ส่งงานให้ AI agent ทีม Content — ระบบเนื้อหาผ่าน Git

31 ต.ค. 2026 · จากฝั่ง Game UI/backend · **ใช้เอกสารนี้แทนเอกสารเก่าทั้งหมด** ที่พูดถึง Studio บน staging, การ sync D1, OQ-1/OQ-2 หรือ `STUDIO_KEY` (ยกเลิกแล้ว)

## 1. ระบบตอนนี้ (ขึ้นเว็บจริงแล้ว)

```
เครื่อง Local ของทีม Content (Studio/ระบบของทีมเอง)
  → แก้ไฟล์ใน apps/Instagoon/content/ และ/หรือ apps/Instagoon/worker/src/gameplay/
  → push ขึ้น branch → เปิด PR เข้า main
  → CI "PR check (Instagoon)": เทสต์ worker + ตรวจเนื้อหา + build
  → merge → deploy staging อัตโนมัติ (https://staging.instagoon.app)
  → เจ้าของโปรเจกต์ทดสอบแล้วกดอนุมัติ → deploy production (https://instagoon.app)
```

- **git คือต้นฉบับของเนื้อหาเกมทั้งหมด** Worker อ่านเนื้อหาจาก build แล้วอัปเดตฐานข้อมูลเอง
- **Studio บนเว็บถูกลบแล้ว** (`/studio`, login ด้วยรหัส, API แก้เนื้อหา) แก้เนื้อหาได้ทางเดียวคือ git
- agent ใช้ **สิทธิ์ git อย่างเดียว** ไม่มีและไม่ต้องขอ Cloudflare token

## 2. ไฟล์ที่ทีม Content ดูแล

| ส่วน | ที่อยู่ | คู่มือ |
| --- | --- | --- |
| ตัวละคร, โพสต์, สตอรี่, รูป | `apps/Instagoon/content/` | `apps/Instagoon/content/README.md` |
| กฎ gameplay ของ DM (คะแนน 3 แกน, Level, rule, cooldown, ความลับ, รางวัล) | `apps/Instagoon/worker/src/gameplay/index.mjs` | คอมเมนต์ในไฟล์ + `worker/tests/gameplay.test.mjs` |
| schema ตัวละคร | `src/modules/npc-studio/lib/npc/schema.ts` (NpcSchema v1.0) | เปลี่ยน schema ต้องคุยกับฝั่ง UI ก่อน |

โครงไฟล์เนื้อหา:
```
apps/Instagoon/content/
  creators/<id>/character.json   # NpcSchema v1.0 · id ต้องตรงชื่อโฟลเดอร์
  creators/<id>/posts.json       # ไม่บังคับ
  creators/<id>/stories.json     # ไม่บังคับ
  media/<key>                    # key ที่อ้างใน JSON เช่น avatars/noey_avatar.webp
```

## 3. คำสั่งที่ใช้

```sh
# แตก ZIP ที่ export จากระบบ Local เข้า content/ (ตรวจ ZIP ก่อน ถ้าผิดจะไม่เขียนอะไร)
node --experimental-strip-types apps/Instagoon/scripts/import-npc-zip.mjs <file.zip>

# ตรวจเนื้อหาก่อนเปิด PR (บอกไฟล์และเหตุผลถ้าผิด)
node --experimental-strip-types apps/Instagoon/scripts/build-content.mjs apps/Instagoon/content /tmp/content-check

# เทสต์ทั้งหมด (CI รันชุดเดียวกัน)
node --experimental-strip-types --test apps/Instagoon/worker/tests/*.test.mjs
node apps/Instagoon/worker/tests/api.mjs
```

## 4. กฎที่ต้องทำตาม

1. ทำงานบน branch แล้วเปิด PR เข้า `main` เท่านั้น **ห้าม push ตรงเข้า `main`** และ **ห้าม deploy เอง**
2. PR ต้องผ่าน CI ก่อน merge ถ้า CI ไม่ผ่านให้แก้ใน PR เดิม
3. โค้ดใน `worker/src/gameplay/` ต้องเป็นฟังก์ชันล้วน: ห้ามใช้ `env`, ฐานข้อมูล, `fetch`, secret หรือ import จากนอกโฟลเดอร์ (มีเทสต์บล็อก) ถ้าต้องการข้อมูลใหม่จากฐานข้อมูล ให้เปิด issue ให้ฝั่ง UI ต่อสายให้
4. ห้ามแก้ไฟล์นอก `content/` และ `worker/src/gameplay/` (รวม tests ของ gameplay) ถ้าจำเป็นต้องแก้ ให้แยก PR และขอให้ฝั่ง UI review
5. **ห้ามเปลี่ยน id** ของตัวละคร โพสต์ หรือสตอรี่ที่ปล่อยไปแล้ว (ข้อมูลผู้เล่นอ้างอิงอยู่) ลบโพสต์ออกจากไฟล์ = ระบบซ่อน (`suspended`) ไม่ได้ลบจริง
6. ห้ามใส่ secret, ข้อมูลผู้เล่นจริง หรือเนื้อหาลับที่ยังไม่ควรเปิดเผยใน PR description/รายงาน (ไฟล์ใน repo เป็น public)
7. รูปทุกไฟล์ไม่เกิน 25 MiB และควรเป็น `.webp` ขนาดเหมาะกับมือถือ

## 5. งานที่ต้องทำ (เรียงตามลำดับ)

### งาน 1 — ย้ายตัวละครเดิม (มิระ, น้องเนย, พี่พิม) เข้า git ⚠️ ระวังที่สุด
ตอนนี้ข้อมูล 3 ตัวนี้อยู่ในฐานข้อมูลเว็บจริงเท่านั้น เมื่อโฟลเดอร์ `creators/<id>` ของตัวไหนขึ้น prod ระบบจะถือว่าไฟล์คือทั้งหมด **โพสต์/สตอรี่เดิมที่ไม่มีในไฟล์จะถูกซ่อนทันที**

- ใช้ข้อมูลต้นฉบับจากระบบ Local ของทีม และ **ต้องใช้ id เดิมให้ตรงกับเว็บจริง** (id ตัวละคร: ตามที่ใช้อยู่ เช่น `noey`, `pim`, `mira` · id โพสต์/สตอรี่ต้องครบทุกตัวที่อยู่บนเว็บ)
- ถ้าไม่แน่ใจรายการ id บนเว็บจริง ให้ขอเจ้าของโปรเจกต์รันคำสั่งอ่านอย่างเดียวด้านล่าง แล้วส่งผลให้ (เป็นข้อมูลเนื้อหาเท่านั้น ไม่มีข้อมูลผู้เล่น):
  ```sh
  cd apps/Instagoon
  pnpm exec wrangler d1 execute froststory --remote --json --command "SELECT id,name,bio,avatar_key FROM creators; SELECT id,creator_id,caption,media_key,published_at,relationship_required,simulated_likes,status FROM posts; SELECT id,creator_id,type,media_key,published_at,relationship_required,status FROM stories; SELECT creator_id,definition_json FROM npc_definitions"
  ```
- รูปที่หายอยู่ 6 ไฟล์ ใส่ใน `content/media/` ด้วย: `avatars/noey_avatar.webp`, `avatars/pim_avatar.webp`, `posts/noey_desk.webp`, `posts/pim_office.webp`, `stories/noey_secret.webp`, `stories/noey_snack.webp` (รายละเอียด: `docs/CONTENT_MISSING_MEDIA_2026-10-31.md`) · รูปของมิระที่อยู่ในฐานข้อมูลตอนนี้ ให้ใส่ไฟล์ต้นฉบับใน `content/media/` ด้วย key เดิม
- แยก PR ทีละตัวละคร และใน PR description ให้ระบุว่า id โพสต์/สตอรี่ครบเทียบกับเว็บจริงแล้ว
- **merge ได้ แต่แจ้งเจ้าของให้ตรวจบน staging ก่อนอนุมัติ prod** (staging ใช้ฐานข้อมูลแยก จึงเห็นแค่เนื้อหาจาก git)

### งาน 2 — ตัวละคร/เนื้อหาใหม่
ทำได้ทันที ไม่มีความเสี่ยงกับข้อมูลเดิม ใช้ `import-npc-zip.mjs` หรือสร้างไฟล์ตาม `content/README.md`

### งาน 3 — gameplay
งานที่ค้างจาก PR #1 (ข้อความภาพพิเศษ, cooldown) ทำต่อได้ใน `worker/src/gameplay/` พร้อมเพิ่มเทสต์ใน `worker/tests/gameplay.test.mjs`

### งาน 4 — ทดสอบบน staging
หลัง merge ให้ทดสอบที่ https://staging.instagoon.app (บัญชีที่อยู่ในรายชื่อ staging: jirapat.chumee@gmail.com, taychinsgo@gmail.com) staging มี Gemini key แล้ว คุย DM ได้จริง (โควตาใช้ร่วมกับเว็บจริง อย่ายิงทดสอบอัตโนมัติจำนวนมาก)

## 6. รายงานกลับ (ต่อ PR)

- PR / branch / commit
- เปลี่ยนอะไร (ตัวละคร, โพสต์, รูป, gameplay)
- ผลเทสต์บนเครื่องและ CI
- สิ่งที่ต้องให้เจ้าของตรวจบน staging ก่อนอนุมัติ prod
- คำถามหรือสิ่งที่ต้องให้ฝั่ง UI ทำ (เช่น field ใหม่ใน schema, ข้อมูลใหม่ที่ gameplay ต้องใช้)

## 7. สิ่งที่ฝั่ง UI ยังไม่ได้ทำ (ไม่ต้องรอ)
- auto-merge สำหรับ PR ที่แตะเฉพาะ `content/` และ `gameplay/` (ตอนนี้เจ้าของ merge เอง)
- เพดานจำนวน request/งบ AI ต่อวันบน staging
